import type { GesturePrediction } from "@visionguard/shared-kernel/contracts/ai";
import type { GestureDefinition } from "../types/gestures";

export type ActionDecision =
  | {
      reason: "missing-prediction";
      shouldExecute: false;
    }
  | {
      prediction: GesturePrediction;
      reason: "missing-trained-gesture" | "low-confidence" | "cooldown";
      shouldExecute: false;
    }
  | {
      gesture: GestureDefinition;
      prediction: GesturePrediction;
      reason: "ready";
      shouldExecute: true;
    };

type DecideActionExecutionParams = {
  actionCooldownMs: number;
  minConfidence: number;
  now: number;
  prediction: GesturePrediction | undefined;
  trainedGestures: GestureDefinition[];
  lastActionAtByGestureId: Record<string, number>;
};

export function decideActionExecution({
  actionCooldownMs,
  lastActionAtByGestureId,
  minConfidence,
  now,
  prediction,
  trainedGestures
}: DecideActionExecutionParams): ActionDecision {
  if (!prediction) {
    return { reason: "missing-prediction", shouldExecute: false };
  }

  const gesture = trainedGestures.find((item) => item.id === prediction.gestureId);

  if (!gesture) {
    return { prediction, reason: "missing-trained-gesture", shouldExecute: false };
  }

  if (prediction.confidence < minConfidence) {
    return { prediction, reason: "low-confidence", shouldExecute: false };
  }

  const lastActionAt = lastActionAtByGestureId[gesture.id] ?? 0;

  if (now - lastActionAt < actionCooldownMs) {
    return { prediction, reason: "cooldown", shouldExecute: false };
  }

  return {
    gesture,
    prediction,
    reason: "ready",
    shouldExecute: true
  };
}
