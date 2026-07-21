# Python capability service stub

ADR-0001 places analytics/ML/heavy compute in Python services — not in the MERN system of record.

```bash
# Example local run (after adding FastAPI/Flask dependencies)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

Keep a separate Dockerfile for this service when it becomes real work; do not share databases across boundaries.
