// src/firebaseConfig.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // 이 줄 추가

// Firebase 프로젝트 설정 정보
const firebaseConfig = {
    apiKey: "AIzaSyCCofVDmSO6wAaoVbgdeUz6BeL1y3GMpDU",
    authDomain: "rh-10year-keyword.firebaseapp.com",
    projectId: "rh-10year-keyword",
    storageBucket: "rh-10year-keyword.firebasestorage.app",
    messagingSenderId: "843900221510",
    appId: "1:843900221510:web:e7926e23c972631e52b247",
    measurementId: "G-QDZLB0B6DR"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firestore 연결
export const firestore = getFirestore(app);

// Auth 연결 (이 부분 추가)
export const auth = getAuth(app);