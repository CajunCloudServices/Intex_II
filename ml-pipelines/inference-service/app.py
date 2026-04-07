from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from fastapi import FastAPI
from pydantic import BaseModel


APP_DIR = Path(__file__).resolve().parent
MODEL_PATH = APP_DIR / "reintegration_model.pkl"

app = FastAPI(title="Intex ML Inference Service", version="1.0.0")


class ReintegrationFeaturePayload(BaseModel):
    residentId: int
    initialRiskScore: int
    isTrafficked: int
    isPhysicalAbuseCase: int
    isSexualAbuseCase: int
    hasSpecialNeeds: int
    familyIs4Ps: int
    familySoloParent: int
    familyInformalSettler: int
    avgHealthScore: float
    healthTrend: float
    avgEducationProgress: float
    educationTrend: float
    sessionCount: int
    avgSessionDuration: float
    avgEmotionShift: float
    progressNotedRate: float
    concernsFlaggedRate: float
    incidentCount: int
    highSeverityIncidentCount: int


class ReintegrationPredictionRequest(BaseModel):
    features: ReintegrationFeaturePayload


def _safe_prob(value: float) -> float:
    return max(0.0, min(1.0, value))


def _fallback_predict(payload: ReintegrationFeaturePayload) -> dict[str, Any]:
    risk_raw = (
        0.12 * payload.initialRiskScore
        + 0.25 * (1.0 if payload.incidentCount > 0 else 0.0)
        + 0.15 * payload.concernsFlaggedRate
        + 0.10 * (1.0 if payload.hasSpecialNeeds else 0.0)
        - 0.12 * payload.progressNotedRate
        - 0.08 * (1.0 if payload.healthTrend > 0 else 0.0)
        - 0.08 * (1.0 if payload.educationTrend > 0 else 0.0)
    )
    risk_score = _safe_prob(risk_raw)
    positive_probability = _safe_prob(1.0 - risk_score)

    factors: list[str] = []
    if payload.incidentCount > 0:
        factors.append("Recent incident volume")
    if payload.highSeverityIncidentCount > 0:
        factors.append("High-severity incidents")
    if payload.concernsFlaggedRate >= 0.40:
        factors.append("Frequent counseling concerns")
    if payload.healthTrend < 0:
        factors.append("Negative health trend")
    if payload.educationTrend < 0:
        factors.append("Negative education trend")
    if not factors:
        factors.append("Stable profile with no major risk spikes")

    if risk_score >= 0.65:
        recommendation = "Escalate to multidisciplinary case conference and weekly monitoring."
    elif risk_score >= 0.40:
        recommendation = "Maintain biweekly follow-up and targeted intervention plans."
    else:
        recommendation = "Continue standard plan cadence and monthly monitoring."

    return {
        "residentId": payload.residentId,
        "riskScore": round(risk_score, 4),
        "positiveProbability": round(positive_probability, 4),
        "topRiskFactors": factors[:3],
        "recommendedAction": recommendation,
        "modelVersion": "fallback-v1",
        "scoredAtUtc": datetime.now(UTC).isoformat(),
        "source": "python-fallback",
    }


def _predict_with_model(payload: ReintegrationFeaturePayload) -> dict[str, Any]:
    import pickle

    with MODEL_PATH.open("rb") as fh:
        bundle = pickle.load(fh)

    model = bundle["model"] if isinstance(bundle, dict) and "model" in bundle else bundle
    feature_names = (
        bundle.get("features")
        if isinstance(bundle, dict) and isinstance(bundle.get("features"), list)
        else list(payload.model_dump().keys())
    )

    row = payload.model_dump()
    df = pd.DataFrame([{name: row.get(name, 0) for name in feature_names}])

    if hasattr(model, "predict_proba"):
        positive_probability = float(model.predict_proba(df)[0, 1])
    else:
        raw = float(model.predict(df)[0])
        positive_probability = _safe_prob(raw)

    risk_score = _safe_prob(1.0 - positive_probability)
    return {
        "residentId": payload.residentId,
        "riskScore": round(risk_score, 4),
        "positiveProbability": round(positive_probability, 4),
        "topRiskFactors": ["Model-derived signal", "See feature importance artifact", "Review latest incidents"],
        "recommendedAction": "Use case conference review for high-risk residents.",
        "modelVersion": "artifact-v1",
        "scoredAtUtc": datetime.now(UTC).isoformat(),
        "source": "python-model-artifact",
    }


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/predict/reintegration")
def predict_reintegration(request: ReintegrationPredictionRequest) -> dict[str, Any]:
    payload = request.features
    if MODEL_PATH.exists():
        try:
            return _predict_with_model(payload)
        except Exception:
            return _fallback_predict(payload)
    return _fallback_predict(payload)
