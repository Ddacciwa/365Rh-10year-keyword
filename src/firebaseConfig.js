// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getAnalytics } from "firebase/analytics";

// Firebase 프로젝트 설정 정보
const firebaseConfig = {
  apiKey: "AIzaSyBzaf9kUxsZxb_ZOXHiVcul38vwIyPu1qM",
  authDomain: "rh-10years-keywords.firebaseapp.com",
  projectId: "rh-10years-keywords",
  storageBucket: "rh-10years-keywords.firebasestorage.app",
  messagingSenderId: "236905921391",
  appId: "1:236905921391:web:0437e2d9136cd30f44c69a",
  measurementId: "G-851GRL6MKL",
  databaseURL: "https://rh-10years-keywords-default-rtdb.asia-southeast1.firebasedatabase.app/" // 여기에 실제 URL 추가
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 연결
export const firestore = getFirestore(app);

// Auth 연결
export const auth = getAuth(app);

// Realtime Database 연결
export const database = getDatabase(app);

// Analytics 연결
export const analytics = getAnalytics(app);

export default app;