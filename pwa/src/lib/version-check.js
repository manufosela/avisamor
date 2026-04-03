import { db } from './firebase.js';
import { doc, onSnapshot } from 'firebase/firestore';

const CURRENT_VERSION = __APP_VERSION__;

export function initVersionCheck() {
  onSnapshot(doc(db, 'config', 'app'), (snap) => {
    if (!snap.exists()) return;
    const latestVersion = snap.data()?.pwaVersion;
    if (latestVersion && latestVersion !== CURRENT_VERSION) {
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
    }
  });
}
