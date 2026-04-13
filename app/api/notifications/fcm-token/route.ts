import { NextResponse } from "next/server";
import { createId } from "@/lib/mingle";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const { token, sessionId, participantId } = (await request.json()) as {
    token?: string;
    sessionId?: string | null;
    participantId?: string | null;
  };

  if (!token) {
    return new NextResponse("FCM token is required.", {
      status: 400
    });
  }

  const supabase = getSupabaseServerClient();
  if (supabase) {
    const { error } = await supabase.from("device_push_tokens").upsert(
      {
        id: createId("push"),
        token,
        session_id: sessionId ?? null,
        participant_id: participantId ?? null,
        platform: "web"
      },
      {
        onConflict: "token"
      }
    );

    if (error) {
      return new NextResponse(error.message, {
        status: 500
      });
    }
  }

  return NextResponse.json({
    ok: true,
    token
  });
}
