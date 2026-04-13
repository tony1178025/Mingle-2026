"use client";

import { create } from "zustand";
import { buildTableSummaries } from "@/engine/heat";
import { buildInterventionRecommendations } from "@/engine/intervention";
import { buildRevealState } from "@/engine/reveal";
import { summarizeCheckinModes } from "@/lib/mingle";
import { createAdminSlice } from "@/stores/slices/admin-slice";
import { createCheckinSlice } from "@/stores/slices/checkin-slice";
import { createSessionSlice } from "@/stores/slices/session-slice";
import { createUiSlice } from "@/stores/slices/ui-slice";
import { createViewerSlice } from "@/stores/slices/viewer-slice";
import type { MingleStoreState } from "@/stores/types";

export const useMingleStore = create<MingleStoreState>()((...args) => ({
  ...createSessionSlice(...args),
  ...createUiSlice(...args),
  ...createCheckinSlice(...args),
  ...createViewerSlice(...args),
  ...createAdminSlice(...args)
}));

export const selectCurrentParticipant = (state: MingleStoreState) =>
  state.snapshot?.participants.find((participant) => participant.id === state.viewerParticipantId) ?? null;

export const selectTableSummaries = (state: MingleStoreState) =>
  state.snapshot
    ? buildTableSummaries(state.snapshot.participants, state.snapshot.session.tableCount)
    : [];

export const selectHeartInbox = (state: MingleStoreState) =>
  state.snapshot
    ? buildRevealState(
        state.snapshot.session,
        selectCurrentParticipant(state),
        state.snapshot.hearts,
        state.snapshot.participants
      )
    : {
        key: "round1-count-only" as const,
        canReveal: false,
        status: "세션 정보를 불러오는 중입니다.",
        receivedCount: 0,
        remainingFreeHearts: 3,
        visibleSenders: []
      };

export const selectInterventionRecommendations = (state: MingleStoreState) =>
  state.snapshot ? buildInterventionRecommendations(state.snapshot) : [];

export const selectRevealReady = (state: MingleStoreState) => {
  const snapshot = state.snapshot;
  if (!snapshot) return 0;

  return snapshot.participants.filter(
    (participant) => participant.usedFreeHearts >= snapshot.session.freeHeartLimit
  ).length;
};

export const selectCheckinModeCounts = (state: MingleStoreState) =>
  state.snapshot
    ? summarizeCheckinModes(state.snapshot.participants)
    : { qr: 0, code: 0, staff: 0 };
