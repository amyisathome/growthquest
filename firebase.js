// ==========================================
// firebase.js — Firebase 연결 및 저장/불러오기
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyBnzNIwNZWST0LQr3ujcwdUtbtPwdm_lt0",
  authDomain: "growthquest-1e1f8.firebaseapp.com",
  projectId: "growthquest-1e1f8",
  storageBucket: "growthquest-1e1f8.firebasestorage.app",
  messagingSenderId: "292996933251",
  appId: "1:292996933251:web:3eb283efeda091a97f9db6"
};

firebase.initializeApp(firebaseConfig);

const db      = firebase.firestore();
const storage = firebase.storage();

// 기기별 고유 ID — localStorage에 영구 저장
function getUid() {
  let uid = localStorage.getItem('gq_device_id');
  if (!uid) {
    uid = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('gq_device_id', uid);
  }
  return uid;
}

// STATE 전체를 Firestore에 저장
async function fbSaveState(state) {
  try {
    await db.collection('users').doc(getUid()).set(state);
  } catch (e) {
    console.error('[Firebase] 저장 실패:', e);
  }
}

// Firestore에서 STATE 불러오기
async function fbLoadState() {
  try {
    const doc = await db.collection('users').doc(getUid()).get();
    return doc.exists ? doc.data() : null;
  } catch (e) {
    console.error('[Firebase] 불러오기 실패:', e);
    return null;
  }
}

// 인증 사진을 Firebase Storage에 업로드하고 다운로드 URL 반환
async function uploadPhoto(dataUrl, approvalId) {
  const ref = storage.ref(`photos/${getUid()}/${approvalId}`);
  await ref.putString(dataUrl, 'data_url');
  return await ref.getDownloadURL();
}
