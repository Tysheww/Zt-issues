import { firebaseConfig } from './config.js';

// Використовуємо window.firebase, оскільки бібліотека завантажена в HTML
window.firebase.initializeApp(firebaseConfig);

export const auth = window.firebase.auth();
export const db = window.firebase.firestore();