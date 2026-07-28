"""
Train a small multinomial model for YouTube-style outcomes from label/artist/history.

Usage (from repo root):
  python -m ml.train_claim_model

Or from backend/:
  python ml/train_claim_model.py
"""

from __future__ import annotations

import sys
from pathlib import Path

import joblib
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parent
DATA_CSV = ROOT / "data" / "train_claims.csv"
ARTIFACT_DIR = ROOT / "artifacts"
MODEL_PATH = ARTIFACT_DIR / "claim_outcome_model.joblib"


def build_pipeline() -> Pipeline:
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


def main() -> None:
    if not DATA_CSV.is_file():
        print(f"Missing training data: {DATA_CSV}", file=sys.stderr)
        sys.exit(1)

    df = pd.read_csv(DATA_CSV)
    df["label"] = df["label"].fillna("").astype(str)
    df["artist"] = df["artist"].fillna("").astype(str)

    X = df[["label", "artist", "previous_claim_history"]]
    y = df["outcome"]

    pipe = build_pipeline()
    pipe.fit(X, y)

    ARTIFACT_DIR.mkdir(parents=True, exist_ok=True)
    joblib.dump(pipe, MODEL_PATH)
    print(f"Saved pipeline ({len(df)} rows) -> {MODEL_PATH}")


if __name__ == "__main__":
    main()
