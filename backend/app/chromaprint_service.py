"""
Segment audio, fingerprint with Chromaprint (fpcalc), match against a catalog.

Requires on PATH:
  - ffmpeg / ffprobe (segment extraction)
  - fpcalc (Chromaprint CLI; ships with Chromaprint)

Matching uses pyacoustid's ``compare_fingerprints``, which loads **libchromaprint**
(via the ``chromaprint`` module bundled with pyacoustid). Install the Chromaprint
library for your OS if imports fail.
"""

from __future__ import annotations

import base64
import logging
import os
import subprocess
import tempfile
from dataclasses import dataclass
from pathlib import Path
from typing import Sequence

from pydantic import BaseModel, Field

log = logging.getLogger(__name__)


class CatalogTrackFingerprint(BaseModel):
    """Precomputed Chromaprint fingerprint for one reference track (from ``fingerprint_file``)."""

    track_id: str
    title: str | None = None
    artist: str | None = None
    duration_sec: float = Field(..., ge=0)
    fingerprint: bytes

    @classmethod
    def from_encoded(
        cls,
        *,
        track_id: str,
        duration_sec: float,
        fingerprint_b64: str,
        title: str | None = None,
        artist: str | None = None,
    ) -> CatalogTrackFingerprint:
        raw = base64.standard_b64decode(fingerprint_b64.encode("ascii"))
        return cls(
            track_id=track_id,
            title=title,
            artist=artist,
            duration_sec=duration_sec,
            fingerprint=raw,
        )


class DetectedTrack(BaseModel):
    """A catalog track detected in the mix with timestamps (mix timeline)."""

    track_id: str
    title: str | None = None
    artist: str | None = None
    start_sec: float
    end_sec: float
    confidence: float = Field(..., ge=0.0, le=1.0)


@dataclass
class _SegmentFP:
    start_sec: float
    end_sec: float
    duration: float
    fingerprint: bytes


def _which_or_env(name: str, env_var: str) -> str:
    return os.environ.get(env_var, name)


def _run(cmd: list[str], *, timeout: int = 120) -> None:
    proc = subprocess.run(cmd, capture_output=True, timeout=timeout, text=True)
    if proc.returncode != 0:
        err = (proc.stderr or proc.stdout or "").strip()
        raise RuntimeError(f"Command failed ({proc.returncode}): {' '.join(cmd)}\n{err}")


def get_audio_duration_sec(audio_path: Path, *, ffprobe_bin: str | None = None) -> float:
    bin_name = ffprobe_bin or _which_or_env("ffprobe", "FFPROBE_PATH")
    cmd = [
        bin_name,
        "-v",
        "error",
        "-show_entries",
        "format=duration",
        "-of",
        "default=noprint_wrappers=1:nokey=1",
        str(audio_path),
    ]
    proc = subprocess.run(cmd, capture_output=True, timeout=60, text=True)
    if proc.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {(proc.stderr or proc.stdout).strip()}")
    try:
        return float((proc.stdout or "").strip())
    except ValueError as e:
        raise RuntimeError(f"Invalid duration from ffprobe: {proc.stdout!r}") from e


def _extract_wav_segment(
    src: Path,
    start_sec: float,
    duration_sec: float,
    out_wav: Path,
    *,
    ffmpeg_bin: str | None = None,
) -> None:
    bin_name = ffmpeg_bin or _which_or_env("ffmpeg", "FFMPEG_PATH")
    cmd = [
        bin_name,
        "-y",
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        f"{start_sec:.3f}",
        "-i",
        str(src),
        "-t",
        f"{duration_sec:.3f}",
        "-ac",
        "1",
        "-ar",
        "44100",
        "-f",
        "wav",
        str(out_wav),
    ]
    _run(cmd, timeout=180)


def _fingerprint_wav(
    wav_path: Path,
    *,
    max_length_sec: int = 120,
    force_fpcalc: bool = True,
) -> tuple[float, bytes]:
    import acoustid

    return acoustid.fingerprint_file(
        str(wav_path),
        maxlength=max_length_sec,
        force_fpcalc=force_fpcalc,
    )


def _compare_pairs(a: tuple[float, bytes], b: tuple[float, bytes]) -> float:
    import acoustid

    return float(acoustid.compare_fingerprints(a, b))


def _segment_and_fingerprint(
    audio_path: Path,
    *,
    segment_sec: float,
    hop_sec: float,
    max_length_sec: int,
    max_segments: int,
    ffmpeg_bin: str | None,
) -> list[_SegmentFP]:
    import acoustid

    duration = get_audio_duration_sec(audio_path)
    if duration <= 0:
        return []

    out: list[_SegmentFP] = []
    start = 0.0
    count = 0
    while start + 0.5 < duration and count < max_segments:
        win = min(segment_sec, duration - start)
        if win < 1.0:
            break
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp_path = Path(tmp.name)
        try:
            _extract_wav_segment(audio_path, start, win, tmp_path, ffmpeg_bin=ffmpeg_bin)
            try:
                seg_dur, fp = _fingerprint_wav(tmp_path, max_length_sec=max_length_sec)
            except acoustid.FingerprintGenerationError as e:
                log.warning("Fingerprint skip [%.2f–%.2f]: %s", start, start + win, e)
                start += hop_sec
                count += 1
                continue
            out.append(
                _SegmentFP(
                    start_sec=start,
                    end_sec=start + win,
                    duration=float(seg_dur),
                    fingerprint=fp,
                )
            )
        finally:
            tmp_path.unlink(missing_ok=True)
        start += hop_sec
        count += 1
    return out


def _best_catalog_match(
    seg: _SegmentFP,
    catalog: Sequence[CatalogTrackFingerprint],
) -> tuple[CatalogTrackFingerprint | None, float]:
    best: CatalogTrackFingerprint | None = None
    best_score = -1.0
    seg_pair = (seg.duration, seg.fingerprint)
    for ref in catalog:
        ref_pair = (ref.duration_sec, ref.fingerprint)
        try:
            score = _compare_pairs(seg_pair, ref_pair)
        except Exception as e:
            log.debug("compare failed vs %s: %s", ref.track_id, e)
            continue
        if score > best_score:
            best_score = score
            best = ref
    return best, best_score


def _merge_detections(
    hits: list[DetectedTrack],
    *,
    hop_sec: float,
) -> list[DetectedTrack]:
    if not hits:
        return []
    hits = sorted(hits, key=lambda h: h.start_sec)
    merged: list[DetectedTrack] = []
    cur = hits[0]
    for nxt in hits[1:]:
        if nxt.track_id == cur.track_id and nxt.start_sec <= cur.end_sec + hop_sec + 0.01:
            cur = DetectedTrack(
                track_id=cur.track_id,
                title=cur.title,
                artist=cur.artist,
                start_sec=cur.start_sec,
                end_sec=max(cur.end_sec, nxt.end_sec),
                confidence=max(cur.confidence, nxt.confidence),
            )
        else:
            merged.append(cur)
            cur = nxt
    merged.append(cur)
    return merged


def get_analysis_catalog() -> list[CatalogTrackFingerprint]:
    """Hook for DB-backed catalog; empty until you wire storage."""
    return []


def detect_tracks_in_audio(
    audio_path: str | Path,
    catalog: Sequence[CatalogTrackFingerprint],
    *,
    segment_sec: float = 12.0,
    hop_sec: float = 6.0,
    match_threshold: float = 0.35,
    max_fpcalc_length_sec: int = 120,
    max_segments: int = 400,
    ffmpeg_bin: str | None = None,
) -> list[DetectedTrack]:
    """
    Split *audio_path* into overlapping windows, fingerprint each with Chromaprint,
    and match each window to the best catalog entry using ``compare_fingerprints``.

    Returns merged intervals per ``track_id`` with confidence in [0, 1].
    """
    path = Path(audio_path).expanduser().resolve()
    if not path.is_file():
        raise FileNotFoundError(f"Audio not found: {path}")
    if segment_sec <= 0 or hop_sec <= 0:
        raise ValueError("segment_sec and hop_sec must be positive")

    if not catalog:
        log.info("Empty catalog; skipping segmentation for %s", path)
        return []

    import acoustid

    if not getattr(acoustid, "have_chromaprint", False):
        raise RuntimeError(
            "libchromaprint is required to compare fingerprints. "
            "Install Chromaprint (https://acoustid.org/chromaprint) so the "
            "pyacoustid ``chromaprint`` module can load."
        )

    segments = _segment_and_fingerprint(
        path,
        segment_sec=segment_sec,
        hop_sec=hop_sec,
        max_length_sec=max_fpcalc_length_sec,
        max_segments=max_segments,
        ffmpeg_bin=ffmpeg_bin,
    )

    raw: list[DetectedTrack] = []
    for seg in segments:
        ref, score = _best_catalog_match(seg, catalog)
        if ref is None or score < match_threshold:
            continue
        raw.append(
            DetectedTrack(
                track_id=ref.track_id,
                title=ref.title,
                artist=ref.artist,
                start_sec=seg.start_sec,
                end_sec=seg.end_sec,
                confidence=round(score, 4),
            )
        )

    return _merge_detections(raw, hop_sec=hop_sec)


def fingerprint_reference_file(
    audio_path: str | Path,
    *,
    track_id: str,
    title: str | None = None,
    artist: str | None = None,
    max_length_sec: int = 120,
) -> CatalogTrackFingerprint:
    """Build a catalog row by fingerprinting a whole reference file (library track)."""
    path = Path(audio_path).expanduser().resolve()
    duration, fp = _fingerprint_wav(path, max_length_sec=max_length_sec)
    return CatalogTrackFingerprint(
        track_id=track_id,
        title=title,
        artist=artist,
        duration_sec=float(duration),
        fingerprint=fp,
    )
