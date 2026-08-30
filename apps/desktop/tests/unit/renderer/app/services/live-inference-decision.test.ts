import { describe, expect, it } from "vitest";
import { decideActionExecution } from "../../../../../src/renderer/app/services/live-inference-decision";
import type { GestureDefinition } from "../../../../../src/renderer/app/types/gestures";

const gesture: GestureDefinition = {
  actionTarget: "Safari",
  actionType: "open-app",
  confidenceTarget: 92,
  createdAt: "2026-08-30T00:00:00.000Z",
  description: "Test gesture",
  id: "gesture-1",
  name: "Open Palm",
  sampleFiles: [],
  samples: 12,
  status: "trained"
};

describe("decideActionExecution", () => {
  it("does not execute without a prediction", () => {
    expect(
      decideActionExecution({
        actionCooldownMs: 4_000,
        actionsArmed: true,
        lastActionAtByGestureId: {},
        minConfidence: 0.92,
        now: 10_000,
        prediction: undefined,
        trainedGestures: [gesture]
      })
    ).toEqual({ reason: "missing-prediction", shouldExecute: false });
  });

  it("does not execute low-confidence predictions", () => {
    expect(
      decideActionExecution({
        actionCooldownMs: 4_000,
        actionsArmed: true,
        lastActionAtByGestureId: {},
        minConfidence: 0.92,
        now: 10_000,
        prediction: {
          confidence: 0.8,
          gestureId: gesture.id,
          label: gesture.name
        },
        trainedGestures: [gesture]
      })
    ).toMatchObject({ reason: "low-confidence", shouldExecute: false });
  });

  it("does not execute when actions are disarmed", () => {
    expect(
      decideActionExecution({
        actionCooldownMs: 4_000,
        actionsArmed: false,
        lastActionAtByGestureId: {},
        minConfidence: 0.92,
        now: 10_000,
        prediction: {
          confidence: 0.96,
          gestureId: gesture.id,
          label: gesture.name
        },
        trainedGestures: [gesture]
      })
    ).toMatchObject({ reason: "actions-disarmed", shouldExecute: false });
  });

  it("does not execute while the gesture is cooling down", () => {
    expect(
      decideActionExecution({
        actionCooldownMs: 4_000,
        actionsArmed: true,
        lastActionAtByGestureId: {
          [gesture.id]: 8_000
        },
        minConfidence: 0.92,
        now: 10_000,
        prediction: {
          confidence: 0.96,
          gestureId: gesture.id,
          label: gesture.name
        },
        trainedGestures: [gesture]
      })
    ).toMatchObject({ reason: "cooldown", remainingMs: 2_000, shouldExecute: false });
  });

  it("executes confident predictions for trained gestures", () => {
    expect(
      decideActionExecution({
        actionCooldownMs: 4_000,
        actionsArmed: true,
        lastActionAtByGestureId: {},
        minConfidence: 0.92,
        now: 10_000,
        prediction: {
          confidence: 0.96,
          gestureId: gesture.id,
          label: gesture.name
        },
        trainedGestures: [gesture]
      })
    ).toMatchObject({
      gesture,
      reason: "ready",
      shouldExecute: true
    });
  });
});
