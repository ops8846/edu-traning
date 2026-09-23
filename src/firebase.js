// Firebase 설정 파일

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA47InPXXiEmtWfxrXiJ8dDFgSqHWgKicU",
  authDomain: "green-oil-training-9b015.firebaseapp.com",
  projectId: "green-oil-training-9b015",
  storageBucket: "green-oil-training-9b015.firebasestorage.app",
  messagingSenderId: "854839834183",
  appId: "1:854839834183:web:8e8edb0b56a916c186e362",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
