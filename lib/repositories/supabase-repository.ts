import {
  createSeedSnapshot,
  mapAuditRow,
  mapAuditToRow,
  mapHeartRow,
  mapHeartToRow,
  mapParticipantRow,
  mapParticipantToRow,
  mapReportRow,
  mapReportToRow,
  mapSeatingAssignmentRow,
  mapSeatingAssignmentToRow,
  mapSessionRow,
  mapSessionToRow
} from "@/lib/mingle";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SessionSnapshot } from "@/types/mingle";
import type { MingleRepository } from "@/lib/repositories";

export function createSupabaseRepository(): MingleRepository {
  return {
    async getSessionSnapshot() {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        return createSeedSnapshot();
      }

      const { data: sessionRows } = await supabase.from("sessions").select("*").limit(1);
      const sessionRow = sessionRows?.[0];
      if (!sessionRow) {
        return createSeedSnapshot();
      }

      const sessionId = sessionRow.id as string;
      const [participantsResult, heartsResult, reportsResult, auditResult, seatingResult] =
        await Promise.all([
          supabase.from("participants").select("*").eq("session_id", sessionId),
          supabase.from("hearts").select("*").eq("session_id", sessionId),
          supabase.from("reports").select("*").eq("session_id", sessionId),
          supabase.from("audit_logs").select("*").eq("session_id", sessionId).order("created_at", { ascending: false }),
          supabase.from("seating_assignments").select("*").eq("session_id", sessionId)
        ]);

      const base = mapSessionRow(sessionRow);

      return {
        session: base.session,
        activeContentIds: base.activeContentIds,
        version: base.version,
        participants: (participantsResult.data ?? []).map(mapParticipantRow),
        hearts: (heartsResult.data ?? []).map(mapHeartRow),
        reports: (reportsResult.data ?? []).map(mapReportRow),
        auditLogs: (auditResult.data ?? []).map(mapAuditRow),
        seatingAssignments: (seatingResult.data ?? []).map(mapSeatingAssignmentRow)
      };
    },

    async saveSessionSnapshot(snapshot) {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) {
        return snapshot;
      }

      const sessionRow = mapSessionToRow(snapshot);
      await supabase.from("sessions").upsert(sessionRow);
      await supabase.from("participants").upsert(
        snapshot.participants.map((participant) => mapParticipantToRow(snapshot.session.id, participant))
      );
      await supabase.from("hearts").upsert(snapshot.hearts.map(mapHeartToRow));
      await supabase.from("reports").upsert(snapshot.reports.map(mapReportToRow));
      await supabase.from("audit_logs").upsert(snapshot.auditLogs.map(mapAuditToRow));
      await supabase.from("seating_assignments").upsert(
        snapshot.seatingAssignments.map(mapSeatingAssignmentToRow)
      );

      return snapshot;
    },

    async resetDemo() {
      return createSeedSnapshot();
    }
  };
}
