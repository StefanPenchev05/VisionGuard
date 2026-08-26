export type GestureLabel = {
  id: string;
  name: string;
  actionType:
    | "open-app"
    | "volume-down"
    | "volume-up"
    | "mute"
    | "keyboard-shortcut"
    | "mouse-click";
  actionTarget: string;
};

export type GestureSampleReference = {
  id: string;
  gestureId: string;
  capturedAt: string;
  filePath: string;
  width?: number;
  height?: number;
  source: "desktop-camera";
};

export type TrainingDataset = {
  id: string;
  name: string;
  labels: GestureLabel[];
  sampleCount: number;
  createdAt: string;
  updatedAt: string;
};

export type TrainingJobStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type TrainingJob = {
  id: string;
  datasetId: string;
  modelFamily: "gesture-recognition";
  status: TrainingJobStatus;
  progress: number;
  startedAt?: string;
  completedAt?: string;
  modelArtifactPath?: string;
  errorMessage?: string;
};

export type ModelStatus = {
  modelId: string;
  modelFamily: "gesture-recognition" | "continuous-authentication";
  status: "not-trained" | "loading" | "ready" | "degraded" | "error";
  version?: string;
  accuracy?: number;
  latencyMs?: number;
  loadedAt?: string;
  errorMessage?: string;
};

export type InferenceFrameReference = {
  capturedAt: string;
  frameId: string;
  filePath?: string;
};

export type GesturePrediction = {
  gestureId: string;
  label: string;
  confidence: number;
};

export type InferenceResult = {
  id: string;
  frameId: string;
  modelId: string;
  predictions: GesturePrediction[];
  bestPrediction?: GesturePrediction;
  inferenceTimeMs: number;
  createdAt: string;
};

export type PredictionEvent = {
  id: string;
  resultId: string;
  gestureId?: string;
  label: string;
  confidence: number;
  accepted: boolean;
  createdAt: string;
};

export type CreateTrainingDatasetRequest = {
  name: string;
  labels: GestureLabel[];
  samples: GestureSampleReference[];
};

export type TrainGestureModelRequest = {
  datasetId: string;
  modelConfig?: {
    epochs?: number;
    batchSize?: number;
    learningRate?: number;
  };
};

export type RunGestureInferenceRequest = {
  frame: InferenceFrameReference;
  modelId?: string;
  minConfidence?: number;
};

export interface AiModelServiceContract {
  createTrainingDataset(request: CreateTrainingDatasetRequest): Promise<TrainingDataset>;
  getModelStatus(modelId?: string): Promise<ModelStatus>;
  getTrainingJob(jobId: string): Promise<TrainingJob>;
  listDatasets(): Promise<TrainingDataset[]>;
  runGestureInference(request: RunGestureInferenceRequest): Promise<InferenceResult>;
  trainGestureModel(request: TrainGestureModelRequest): Promise<TrainingJob>;
}
