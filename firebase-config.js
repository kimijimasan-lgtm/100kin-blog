// Firebase SDK 初期化（apps100kin プロジェクト）
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDKywWBCyCig6unFK3aNjL81hg8p4yEqTk",
  authDomain: "apps100kin.firebaseapp.com",
  projectId: "apps100kin",
  storageBucket: "apps100kin.firebasestorage.app",
  messagingSenderId: "579269645791",
  appId: "1:579269645791:web:31535dfe2d537d6527e06a"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
