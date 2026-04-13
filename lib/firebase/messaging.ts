import { getToken, isSupported, getMessaging } from "firebase/messaging";
import { getFirebaseApp } from "@/lib/firebase/client";

export async function registerPushToken(payload?: {
  sessionId?: string | null;
  participantId?: string | null;
}) {
  const app = getFirebaseApp();
  if (!app) {
    throw new Error("Firebase 환경 변수가 아직 설정되지 않았습니다.");
  }

  const supported = await isSupported();
  if (!supported) {
    throw new Error("현재 브라우저에서는 웹 푸시를 지원하지 않습니다.");
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error("알림 권한이 허용되지 않았습니다.");
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
    scope: "/firebase-cloud-messaging-push-scope"
  });

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    throw new Error("FCM VAPID 키가 없습니다.");
  }

  const messaging = getMessaging(app);
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration
  });

  if (!token) {
    throw new Error("FCM 토큰을 발급받지 못했습니다.");
  }

  const response = await fetch("/api/notifications/fcm-token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      token,
      sessionId: payload?.sessionId ?? null,
      participantId: payload?.participantId ?? null
    })
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return token;
}
