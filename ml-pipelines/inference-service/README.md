# Inference Service (Pilot)

This FastAPI app serves reintegration predictions for the backend ML endpoint integration.

## Run locally

```bash
cd ml-pipelines/inference-service
python -m pip install -r requirements.txt
uvicorn app:app --host 0.0.0.0 --port 8000
```

## Endpoints

- `GET /health`
- `POST /predict/reintegration`

## Model artifact

If `reintegration_model.pkl` exists in this folder, the service tries to use it.
If missing (or load fails), service returns a deterministic fallback score.
