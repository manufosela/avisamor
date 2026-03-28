import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'REDACTED_API_KEY',
  authDomain: 'avisador-avisamor.firebaseapp.com',
  projectId: 'avisador-avisamor',
  storageBucket: 'avisador-avisamor.firebasestorage.app',
  messagingSenderId: '719215660005',
  appId: '1:719215660005:web:1079f69f3f2445c73afd0c',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
