import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../firebaseConfig';
import { createAuth } from './authInit';

export const app = initializeApp(firebaseConfig);
export const auth = createAuth(app);
export const db = getFirestore(app);
