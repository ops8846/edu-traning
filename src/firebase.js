// Firebase 설정 파일
//
// 아래 값은 Firebase 콘솔(https://console.firebase.google.com)에서
// 프로젝트 생성 후 [프로젝트 설정 > 일반 > 내 앱 > SDK 설정 및 구성]에서
// 그대로 복사해 붙여넣으면 됩니다. (README.md 참고)
//
// 이 값들은 "비밀키"가 아니라 프론트엔드에 노출되어도 되는
// 공개 식별자입니다. 실제 데이터 보호는 Firestore 보안 규칙에서 합니다.

import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "여기에_API_KEY_붙여넣기",
  authDomain: "여기에_PROJECT_ID.firebaseapp.com",
  projectId: "여기에_PROJECT_ID",
  storageBucket: "여기에_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "여기에_SENDER_ID",
  appId: "여기에_APP_ID",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
