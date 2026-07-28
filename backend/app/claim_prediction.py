"""
Scikit-learn multinomial classifier: P(blocked), P(monetized), P(allowed).

Model artifact: ml/artifacts/claim_outcome_model.joblib (train with ml/train_claim_model.py).
If missing, a tiny in-memory baseline is fitted so the API still responds.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Literal

import joblib
import pandas as pd
from pydantic import BaseModel, Field
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

log = logging.getLogger(__name__)

BACKEND_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = BACKEND_ROOT / "ml" / "artifacts" / "claim_outcome_model.joblib"

Outcome = Literal["blocked", "monetized", "allowed"]


class ClaimPredictionInput(BaseModel):
    label: str = Field(default="", description="Record label or rights umbrella text")
    artist: str = Field(default="", description="Artist name")
    previous_claim_history: float = Field(
        ge=0,
        default=0,
        description="Numeric prior claim signal (e.g. count of past claims on channel/catalog)",
    )


class ClaimPredictionJSON(BaseModel):
    probabilities: dict[Outcome, float]
    predicted_class: Outcome
    model: str = Field(description="artifact path or 'baseline_in_memory'")


_pipeline: Pipeline | None = None


def _build_pipeline() -> Pipeline:
    preprocess = ColumnTransformer(
        transformers=[
            ("label_tfidf", TfidfVectorizer(max_features=120, ngram_range=(1, 2)), "label"),
            ("artist_tfidf", TfidfVectorizer(max_features=120, ngram_range=(1, 2)), "artist"),
            ("history", "passthrough", ["previous_claim_history"]),
        ],
        remainder="drop",
    )
    clf = LogisticRegression(
        max_iter=2000,
        multi_class="multinomial",
        random_state=42,
        class_weight="balanced",
    )
    return Pipeline([("prep", preprocess), ("clf", clf)])


def _fit_baseline() -> Pipeline:
    """Minimal synthetic rows so inference works before the user trains."""
    df = pd.DataFrame(
        {
            "label": ["Independent", "Universal Music Group", "Warner Music Group", "Independent"],
            "artist": ["", "Star", "Band", "DJ"],
            "previous_claim_history": [0.0, 8.0, 3.0, 0.0],
            "outcome": ["allowed", "blocked", "monetized", "allowed"],
        }
    )
    pipe = _build_pipeline()
    pipe.fit(
        df[["label", "artist", "previous_claim_history"]],
        df["outcome"],
    )
    log.warning("Using in-memory baseline claim model; run ml/train_claim_model.py for real weights")
    return pipe


def get_pipeline() -> Pipeline:
    global _pipeline
    if _pipeline is None:
        if MODEL_PATH.is_file():
            _pipeline = joblib.load(MODEL_PATH)
            log.info("Loaded claim model from %s", MODEL_PATH)
        else:
            _pipeline = _fit_baseline()
    return _pipeline


def predict_claim_outcome(inp: ClaimPredictionInput) -> ClaimPredictionJSON:
    pipe = get_pipeline()
    X = pd.DataFrame(
        [
            {
                "label": (inp.label or "").strip(),
                "artist": (inp.artist or "").strip(),
                "previous_claim_history": float(inp.previous_claim_history),
            }
        ]
    )
    proba = pipe.predict_proba(X)[0]
    classes = list(pipe.classes_)
    raw = dict(zip(classes, [float(p) for p in proba]))

    probs: dict[Outcome, float] = {
        "blocked": float(raw.get("blocked", 0.0)),
        "monetized": float(raw.get("monetized", 0.0)),
        "allowed": float(raw.get("allowed", 0.0)),
    }
    s = sum(probs.values())
    if s > 0:
        probs = {k: round(v / s, 6) for k, v in probs.items()}

    pred_idx = int(proba.argmax())
    predicted = classes[pred_idx]
    if predicted not in ("blocked", "monetized", "allowed"):
        predicted = "allowed"
    model_ref = str(MODEL_PATH) if MODEL_PATH.is_file() else "baseline_in_memory"

    return ClaimPredictionJSON(
        probabilities=probs,
        predicted_class=predicted,  # type: ignore[arg-type]
        model=model_ref,
    )
