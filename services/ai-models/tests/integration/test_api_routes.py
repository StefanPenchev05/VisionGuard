from fastapi.testclient import TestClient


def create_dataset(client: TestClient) -> dict:
    response = client.post(
        "/datasets",
        json={
            "name": "Desktop Gestures",
            "labels": [
                {
                    "id": "gesture-open-palm",
                    "name": "Open Palm",
                    "actionType": "open-app",
                    "actionTarget": "Safari",
                }
            ],
            "samples": [
                {
                    "id": "sample-1",
                    "gestureId": "gesture-open-palm",
                    "capturedAt": "2026-08-26T00:00:00+00:00",
                    "filePath": "/tmp/open-palm.jpg",
                    "source": "desktop-camera",
                    "width": 1920,
                    "height": 1080,
                }
            ],
        },
    )
    assert response.status_code == 201
    return response.json()


def test_health_endpoint(client: TestClient) -> None:
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "service": "visionguard-ai-models",
        "status": "ok",
    }


def test_create_and_list_datasets(client: TestClient) -> None:
    assert client.get("/datasets").json() == []

    dataset = create_dataset(client)

    assert dataset["id"].startswith("dataset-")
    assert dataset["name"] == "Desktop Gestures"
    assert dataset["sampleCount"] == 1
    assert dataset["labels"][0]["actionType"] == "open-app"

    listed = client.get("/datasets")
    assert listed.status_code == 200
    assert listed.json() == [dataset]


def test_training_job_lifecycle(client: TestClient) -> None:
    missing_dataset = client.post("/training-jobs", json={"datasetId": "missing"})
    assert missing_dataset.status_code == 404

    dataset = create_dataset(client)
    created_job = client.post(
        "/training-jobs",
        json={"datasetId": dataset["id"], "modelConfig": {"epochs": 3}},
    )

    assert created_job.status_code == 201
    job = created_job.json()
    assert job["id"].startswith("job-")
    assert job["datasetId"] == dataset["id"]
    assert job["modelFamily"] == "gesture-recognition"
    assert job["status"] == "queued"
    assert job["progress"] == 0

    fetched_job = client.get(f"/training-jobs/{job['id']}")
    assert fetched_job.status_code == 200
    assert fetched_job.json() == job


def test_model_status_defaults_to_not_trained(client: TestClient) -> None:
    response = client.get("/models/default/status")

    assert response.status_code == 200
    assert response.json() == {
        "accuracy": None,
        "errorMessage": None,
        "latencyMs": None,
        "loadedAt": None,
        "modelFamily": "gesture-recognition",
        "modelId": "default",
        "status": "not-trained",
        "version": None,
    }


def test_gesture_inference_returns_contract_shape(client: TestClient) -> None:
    response = client.post(
        "/inference/gesture",
        json={
            "frame": {
                "capturedAt": "2026-08-26T00:00:00+00:00",
                "frameId": "frame-1",
            },
            "minConfidence": 0.75,
            "modelId": "default",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["id"].startswith("inference-")
    assert body["frameId"] == "frame-1"
    assert body["modelId"] == "default"
    assert body["predictions"] == []
    assert body["bestPrediction"] is None
    assert body["inferenceTimeMs"] == 0
    assert isinstance(body["createdAt"], str)
