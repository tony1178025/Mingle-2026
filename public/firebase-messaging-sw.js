/* eslint-disable no-undef */
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.10.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: self.FIREBASE_API_KEY || "",
  authDomain: self.FIREBASE_AUTH_DOMAIN || "",
  projectId: self.FIREBASE_PROJECT_ID || "",
  storageBucket: self.FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || "",
  appId: self.FIREBASE_APP_ID || ""
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Mingle";
  const options = {
    body: payload.notification?.body || "새 알림이 도착했습니다.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png"
  };

  self.registration.showNotification(title, options);
});
