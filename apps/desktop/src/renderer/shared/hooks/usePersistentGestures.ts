import { useEffect, useRef, useState } from "react";
import type { GestureDefinition } from "../../app/types/gestures";

type PersistenceStatus = "loading" | "ready" | "saving" | "error";

const localStorageKey = "visionguard.gestures";

function normalizeGestureDefinition(value: unknown): GestureDefinition | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const gesture = value as Partial<GestureDefinition>;

  const isValid =
    typeof gesture.id === "string" &&
    typeof gesture.name === "string" &&
    typeof gesture.actionTarget === "string" &&
    typeof gesture.actionType === "string" &&
    typeof gesture.confidenceTarget === "number" &&
    typeof gesture.createdAt === "string" &&
    typeof gesture.description === "string" &&
    typeof gesture.samples === "number" &&
    typeof gesture.status === "string";

  if (!isValid) {
    return null;
  }

  return {
    actionTarget: gesture.actionTarget,
    actionType: gesture.actionType,
    confidenceTarget: gesture.confidenceTarget,
    createdAt: gesture.createdAt,
    description: gesture.description,
    id: gesture.id,
    name: gesture.name,
    sampleFiles: Array.isArray(gesture.sampleFiles) ? gesture.sampleFiles : [],
    samples: gesture.samples,
    status: gesture.status
  } as GestureDefinition;
}

function sanitizeGestures(value: unknown): GestureDefinition[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const gestures = value.map(normalizeGestureDefinition);

  return gestures.every(Boolean) ? (gestures as GestureDefinition[]) : null;
}

async function loadStoredGestures(): Promise<GestureDefinition[] | null> {
  if (window.visionGuard?.gestures) {
    return sanitizeGestures(await window.visionGuard.gestures.load());
  }

  const stored = window.localStorage.getItem(localStorageKey);

  return stored ? sanitizeGestures(JSON.parse(stored)) : null;
}

async function saveStoredGestures(gestures: GestureDefinition[]): Promise<void> {
  if (window.visionGuard?.gestures) {
    await window.visionGuard.gestures.save(gestures);
    return;
  }

  window.localStorage.setItem(localStorageKey, JSON.stringify(gestures));
}

export function usePersistentGestures(defaultGestures: GestureDefinition[]) {
  const [gestures, setGestures] = useState(defaultGestures);
  const [status, setStatus] = useState<PersistenceStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const storedGestures = await loadStoredGestures();

        if (cancelled) {
          return;
        }

        setGestures(storedGestures ?? defaultGestures);
        setStatus("ready");
        hasLoadedRef.current = true;
      } catch (error) {
        if (cancelled) {
          return;
        }

        setErrorMessage(error instanceof Error ? error.message : "Could not load gestures.");
        setStatus("error");
        hasLoadedRef.current = true;
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [defaultGestures]);

  useEffect(() => {
    if (!hasLoadedRef.current) {
      return;
    }

    let cancelled = false;

    async function save() {
      setStatus("saving");

      try {
        await saveStoredGestures(gestures);

        if (!cancelled) {
          setStatus("ready");
          setErrorMessage(null);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(error instanceof Error ? error.message : "Could not save gestures.");
          setStatus("error");
        }
      }
    }

    void save();

    return () => {
      cancelled = true;
    };
  }, [gestures]);

  return {
    errorMessage,
    gestures,
    setGestures,
    status
  };
}
