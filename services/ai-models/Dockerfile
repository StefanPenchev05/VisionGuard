FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/src
ENV VISIONGUARD_AI_MODEL_DIR=/data/models

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends libglib2.0-0 libgomp1 \
  && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
COPY src ./src

RUN python -m pip install --upgrade pip \
  && python -m pip install --no-cache-dir -e .

RUN mkdir -p /data/models

EXPOSE 8765

CMD ["python", "-m", "uvicorn", "interfaces.api.app:create_app", "--factory", "--host", "0.0.0.0", "--port", "8765"]
