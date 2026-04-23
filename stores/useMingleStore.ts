"use client";

import { create } from "zustand";
import { buildTableSummaries } from "@/engine/heat";
import { buildInterventionRecommendations } from "@/engine/intervention";
import { buildRevealState } from "@/engine/reveal";
import { createAdminSlice } from "@/stores/slices/admin-slice";
import { createCheckinSlice } from "@/stores/slices/checkin-slice";
import { createContentSlice } from "@/stores/slices/content-slice";
import { createSessionSlice } from "@/stores/slices/session-slice";
import { createUiSlice } from "@/stores/slices/ui-slice";
import { createViewerSlice } from "@/stores/slices/viewer-slice";
import type { MingleStoreState } from "@/stores/types";

export const useMingleStore = create<MingleStoreState>()((...args) => ({
  ...createSessionSlice(...args),
  ...createUiSlice(...args),
  ...createCheckinSlice(...args),
  ...createViewerSlice(...args),
  ...createAdminSlice(...args),
  ...createContentSlice(...args)
}));

export const selectCurrentParticipant = (state: MingleStoreState) =>
  state.snapshot?.participants.find((participant) => participant.id === state.currentParticipantId) ?? null;

export const selectTableSummaries = (state: MingleStoreState) =>
  state.snapshot
    ? buildTableSummaries(
        state.snapshot.participants,
        state.snapshot.session.tableCount,
        state.snapshot.session.tableCapacity,
        state.snapshot.session.updatedAt
      )
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
        status: "?몄뀡 ?뺣낫瑜?遺덈윭?ㅻ뒗 以묒엯?덈떎.",
        receivedCount: 0,
        heartsRemaining: 0,
        visibleSenders: []
      };

export const selectInterventionRecommendations = (state: MingleStoreState) =>
  state.snapshot ? buildInterventionRecommendations(state.snapshot) : [];

