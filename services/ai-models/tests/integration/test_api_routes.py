from pathlib import Path
from time import sleep

import cv2
import numpy as np
from fastapi.testclient import TestClient


def write_hand_image(path: Path, variant: int) -> None:
    image = np.zeros((360, 640, 3), dtype=np.uint8)
    image[:, :] = (35, 35, 35)
    center_x = 430 + (variant % 3) * 18
    center_y = 248 + (variant % 2) * 12
    cv2.rectangle(
        image,
        (center_x - 34, center_y - 8),
        (center_x + 42, center_y + 78),
        (80, 140, 200),
        -1,
    )
    for finger_index, x_offset in enumerate([-32, -10, 12, 34]):
        cv2.rectangle(
            image,
            (center_x + x_offset, center_y - 100 + finger_index * 4),
            (center_x + x_offset + 13, center_y + 2),
            (80, 140, 200),
            -1,
        )
    assert cv2.imwrite(str(path), image)


def write_sample_files(tmp_path: Path, count: int = 12) -> list[dict]:
    sample_files = []

    for index in range(1, count + 1):
        sample_path = tmp_path / f"open-palm-{index}.jpg"
        write_hand_image(sample_path, index)
        sample_files.append(
            {
                "id": f"sample-{index}",
                "gestureId": "gesture-open-palm",
                "capturedAt": "2026-08-26T00:00:00+00:00",
                "filePath": str(sample_path),
                "source": "desktop-camera",
                "width": 1920,
                "height": 1080,
            }
        )

    return sample_files


def create_dataset(client: TestClient, samples: list[dict] | None = None) -> dict:
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
            "samples": samples
            or [
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


def wait_for_terminal_job(client: TestClient, job_id: str) -> dict:
    terminal_statuses = {"completed", "failed", "cancelled"}

    for _ in range(50):
        job = client.get(f"/training-jobs/{job_id}").json()
        if job["status"] in terminal_statuses:
            return job
        sleep(0.02)

    raise AssertionError(f"Training job did not finish: {job_id}")


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


def test_training_job_lifecycle(client: TestClient, tmp_path: Path) -> None:
    missing_dataset = client.post("/training-jobs", json={"datasetId": "missing"})
    assert missing_dataset.status_code == 404

    dataset = create_dataset(client, write_sample_files(tmp_path))
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

    completed_job = wait_for_terminal_job(client, job["id"])
    assert completed_job["status"] == "completed"
    assert completed_job["progress"] == 1
    assert completed_job["modelArtifactPath"]
    assert Path(completed_job["modelArtifactPath"]).exists()


def test_training_job_records_failures(client: TestClient) -> None:
    dataset = create_dataset(client)
    created_job = client.post(
        "/training-jobs",
        json={"datasetId": dataset["id"]},
    ).json()

    failed_job = wait_for_terminal_job(client, created_job["id"])
    assert failed_job["status"] == "failed"
    assert failed_job["errorMessage"]


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
    assert body["inferenceTimeMs"] >= 0
    assert isinstance(body["createdAt"], str)


def test_hand_presence_endpoint_detects_usable_hand_frame(
    client: TestClient,
    tmp_path: Path,
) -> None:
    hand_frame = tmp_path / "hand.jpg"
    background_frame = tmp_path / "background.jpg"
    write_hand_image(hand_frame, 1)
    background = np.zeros((360, 640, 3), dtype=np.uint8)
    background[:, :] = (35, 35, 35)
    assert cv2.imwrite(str(background_frame), background)

    hand_response = client.post(
        "/inference/hand-presence",
        json={
            "frame": {
                "capturedAt": "2026-08-26T00:00:00+00:00",
                "frameId": "frame-hand",
                "filePath": str(hand_frame),
            },
        },
    )
    background_response = client.post(
        "/inference/hand-presence",
        json={
            "frame": {
                "capturedAt": "2026-08-26T00:00:00+00:00",
                "frameId": "frame-background",
                "filePath": str(background_frame),
            },
        },
    )

    assert hand_response.status_code == 200
    assert hand_response.json() == {
        "boundingBox": hand_response.json()["boundingBox"],
        "confidence": hand_response.json()["confidence"],
        "frameId": "frame-hand",
        "handDetected": True,
        "landmarkCount": hand_response.json()["landmarkCount"],
        "reason": None,
    }
    assert hand_response.json()["boundingBox"]
    assert hand_response.json()["confidence"] is not None
    assert hand_response.json()["landmarkCount"] is not None
    assert background_response.status_code == 200
    assert background_response.json()["handDetected"] is False


def test_gesture_inference_uses_completed_model(client: TestClient, tmp_path: Path) -> None:
    samples = write_sample_files(tmp_path)
    dataset = create_dataset(client, samples)
    created_job = client.post("/training-jobs", json={"datasetId": dataset["id"]}).json()
    completed_job = wait_for_terminal_job(client, created_job["id"])
    assert completed_job["status"] == "completed"

    model_status = client.get("/models/default/status")
    assert model_status.status_code == 200
    assert model_status.json()["status"] == "ready"

    response = client.post(
        "/inference/gesture",
        json={
            "frame": {
                "capturedAt": "2026-08-26T00:00:00+00:00",
                "frameId": "frame-1",
                "filePath": samples[0]["filePath"],
            },
            "minConfidence": 0.1,
            "modelId": "default",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["bestPrediction"]["gestureId"] == "gesture-open-palm"
    assert body["predictions"][0]["confidence"] > 0.1
