type RotationEvent =
  | { type: "rotation:previewed"; sessionId: string }
  | { type: "rotation:applied"; sessionId: string }
  | { type: "participant:tableChanged"; sessionId: string; participantIds: string[] };

const listeners = new Set<(event: RotationEvent) => void>();

export function onRotationEvent(listener: (event: RotationEvent) => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function publishRotationEvent(event: RotationEvent) {
  for (const listener of listeners) {
    listener(event);
  }
}
