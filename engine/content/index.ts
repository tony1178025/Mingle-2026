import { getContentTemplate } from "@/features/content/library";
import type {
  AnonymousMessageRecord,
  LiveContentRecord,
  ParticipantRecord,
  RotationParticipantInstruction,
  SessionSnapshot
} from "@/types/mingle";

export type StageContentView = {
  liveContent: LiveContentRecord | null;
  templateTitle: string | null;
  options: string[];
  alreadyResponded: boolean;
  responseCount: number;
  inboxMessages: AnonymousMessageRecord[];
};

export function getEncounterParticipants(snapshot: SessionSnapshot, participant: ParticipantRecord) {
  const encounterOrder = [...participant.encounterHistory].sort(
    (left, right) => right.count - left.count || right.lastRoundSeen - left.lastRoundSeen
  );
  const encounterIds = new Set(encounterOrder.map((item) => item.participantId));
  const participantsById = new Map(snapshot.participants.map((candidate) => [candidate.id, candidate]));

  return encounterOrder
    .map((encounter) => participantsById.get(encounter.participantId))
    .filter((candidate): candidate is ParticipantRecord => Boolean(candidate && encounterIds.has(candidate.id)));
}

export function getRotationInstructionForParticipant(snapshot: SessionSnapshot, participantId: string) {
  return (
    snapshot.rotationInstruction?.assignments.find((assignment) => assignment.participantId === participantId) ??
    null
  );
}

export function buildStageContent(snapshot: SessionSnapshot, participant: ParticipantRecord): StageContentView {
  const liveContent = snapshot.liveContent;
  if (!liveContent || liveContent.status !== "LIVE") {
    return {
      liveContent: null,
      templateTitle: null,
      options: [],
      alreadyResponded: false,
      responseCount: 0,
      inboxMessages: []
    };
  }

  if (liveContent.targetTableId !== null && liveContent.targetTableId !== participant.tableId) {
    return {
      liveContent: null,
      templateTitle: null,
      options: [],
      alreadyResponded: false,
      responseCount: 0,
      inboxMessages: []
    };
  }

  const template = getContentTemplate(liveContent.templateId);
  const alreadyResponded = snapshot.contentResponses.some(
    (response) => response.contentId === liveContent.id && response.participantId === participant.id
  );
  const inboxMessages = snapshot.anonymousMessages.filter((message) => message.recipientId === participant.id);
  const responseCount = snapshot.contentResponses.filter(
    (response) => response.contentId === liveContent.id
  ).length;

  return {
    liveContent,
    templateTitle: template?.title ?? liveContent.title,
    options: liveContent.options,
    alreadyResponded,
    responseCount,
    inboxMessages
  };
}

export function buildMutualMatches(snapshot: SessionSnapshot, participantId: string) {
  const sentTo = new Set(
    snapshot.hearts.filter((heart) => heart.senderId === participantId).map((heart) => heart.recipientId)
  );
  const matchedIds = snapshot.hearts
    .filter((heart) => heart.recipientId === participantId && sentTo.has(heart.senderId))
    .map((heart) => heart.senderId);

  return snapshot.participants.filter((participant) => matchedIds.includes(participant.id));
}

export function getLatestAnnouncement(snapshot: SessionSnapshot) {
  return snapshot.announcements[0] ?? null;
}

export function isRotationInstructionActive(instruction: RotationParticipantInstruction | null) {
  return Boolean(instruction && instruction.acknowledgedAt === null);
}
