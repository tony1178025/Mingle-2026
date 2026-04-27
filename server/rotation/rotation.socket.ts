type RotationEvent =
  | { type: "rotation:previewed"; sessionId: string }
  | { type: "rotation:applied"; sessionId: string }
  | { type: "participant:tableChanged"; sessionId: string; participantIds: string[] }
  | { type: "table-pick:opened"; sessionId: string; rotationIndex: 0 | 1 }
  | { type: "table-pick:closed"; sessionId: string; rotationIndex: 0 | 1 }
  | { type: "session:phaseChanged"; sessionId: string; phase: string }
  | { type: "participant:updated"; sessionId: string; participantId: string }
  | { type: "heart:sent"; sessionId: string; senderId: string; recipientId: string }
  | { type: "match:created"; sessionId: string; participantAId: string; participantBId: string }
  | { type: "content:updated"; sessionId: string; contentKind?: string }
  | { type: "report:created"; sessionId: string; reportId: string };

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
