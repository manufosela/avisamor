import { db } from './firebase.js';
import { doc, onSnapshot } from 'firebase/firestore';

const STORAGE_KEY = 'avisablue_last_version';

export function initVersionCheck() {
  const lastSeen = localStorage.getItem(STORAGE_KEY);

  onSnapshot(doc(db, 'config', 'app'), (snap) => {
    if (!snap.exists()) return;
    const latestVersion = snap.data()?.pwaVersion;
    if (!latestVersion) return;

    if (lastSeen && lastSeen === latestVersion) return;

    if (lastSeen && lastSeen !== latestVersion) {
      localStorage.setItem(STORAGE_KEY, latestVersion);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          regs.forEach((r) => r.unregister());
        });
      }
      if ('caches' in window) {
        caches.keys().then((keys) => {
          keys.forEach((k) => caches.delete(k));
        });
      }
      window.location.reload();
      return;
    }

    localStorage.setItem(STORAGE_KEY, latestVersion);
  });
}
