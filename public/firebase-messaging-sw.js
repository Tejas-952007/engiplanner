// Give the service worker access to Firebase Messaging.
// Note: This file MUST be at the root of the domain (e.g., /firebase-messaging-sw.js)
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.0/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in
// your app's Firebase config object.
// https://firebase.google.com/docs/web/setup#config-object
firebase.initializeApp({
  apiKey: "AIzaSyCjgiFVMsh0MASFvqQGGEGlFn5QLeks1sY",
  authDomain: "device-streaming-cf9762b2.firebaseapp.com",
  projectId: "device-streaming-cf9762b2",
  storageBucket: "device-streaming-cf9762b2.firebasestorage.app",
  messagingSenderId: "1046835391674",
  appId: "1:1046835391674:web:b5c583d38f90a727342683"
});

// Retrieve an instance of Firebase Messaging so that it can handle background
// messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  // Customize notification here
  const notificationTitle = payload.notification.title || 'EngiPlanner';
  const notificationOptions = {
    body: payload.notification.body || 'New notification from your workspace!',
    icon: '/icon-192.png',
    badge: '/icon-192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
