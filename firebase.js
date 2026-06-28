// ==========================================
// firebase.js — Firebase 연결 및 저장/불러오기
//
// Firestore 구조:
//   users/{uid}                         ← 핵심 문서 (bounded)
//     profile, weekCycle, gachaQueue, purchasedItems, parentUnlocked
//
//   users/{uid}/questLog/{auto}         ← 퀘스트 완료 기록 (무한 성장)
//     questId, date, pointsAwarded, timestamp, photoUrl?
//
//   users/{uid}/heights/{date}          ← 키 기록 (날짜 키, upsert)
//     value, recordedAt
//
//   users/{uid}/weights/{date}          ← 몸무게 기록 (날짜 키, upsert)
//     value, recordedAt
//
//   users/{uid}/pendingApprovals/{auto} ← 승인 대기 항목
//     questId, date, pts, photo, submittedAt
//
//   users/{uid}/rewards/{auto}          ← 보상 이력 (무한 성장)
//     icon, name, pts, date, timestamp
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

function getUid() {
  let uid = localStorage.getItem('gq_device_id');
  if (!uid) {
    uid = 'dev_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem('gq_device_id', uid);
  }
  return uid;
}

function userRef() {
  return db.collection('users').doc(getUid());
}

// ── 핵심 상태 저장 (profile, weekCycle 등 bounded 데이터만) ──
async function fbSaveState(state) {
  try {
    const core = {
      profile:        state.profile        || {},
      weekCycle:      state.weekCycle      || {},
      gachaQueue:     state.gachaQueue     || 0,
      purchasedItems: state.purchasedItems || [],
      parentUnlocked: state.parentUnlocked || false,
    };
    await userRef().set(core);
  } catch (e) {
    console.error('[Firebase] 저장 실패:', e);
  }
}

// ── 전체 상태 불러오기 (서브컬렉션 포함) ──
async function fbLoadState() {
  try {
    const ref = userRef();
    const [coreDoc, questSnap, heightSnap, weightSnap, pendingSnap, rewardSnap] = await Promise.all([
      ref.get(),
      ref.collection('questLog').orderBy('timestamp').get(),
      ref.collection('heights').orderBy('date').get(),
      ref.collection('weights').orderBy('date').get(),
      ref.collection('pendingApprovals').orderBy('submittedAt').get(),
      ref.collection('rewards').orderBy('timestamp', 'desc').limit(100).get(),
    ]);

    if (!coreDoc.exists) return null;

    const core = coreDoc.data();

    // 구버전 마이그레이션: 루트 문서에 배열이 있으면 서브컬렉션으로 이전
    if (Array.isArray(core.questLog) && core.questLog.length > 0) {
      await _migrateOldData(ref, core);
      return fbLoadState(); // 마이그레이션 후 재로드
    }

    return {
      ...core,
      questLog:         questSnap.docs.map(d => ({ ...d.data(), _fid: d.id })),
      heightHistory:    heightSnap.docs.map(d => d.data()),
      weightHistory:    weightSnap.docs.map(d => d.data()),
      pendingApprovals: pendingSnap.docs.map(d => ({ ...d.data(), id: d.id })),
      rewardHistory:    rewardSnap.docs.map(d => d.data()).reverse(),
    };
  } catch (e) {
    console.error('[Firebase] 불러오기 실패:', e);
    return null;
  }
}

// ── 구버전 → 신버전 마이그레이션 ──
async function _migrateOldData(ref, old) {
  try {
    const batch = db.batch();

    (old.questLog || []).forEach(entry => {
      batch.set(ref.collection('questLog').doc(), {
        questId: entry.questId, date: entry.date,
        pointsAwarded: entry.pointsAwarded, timestamp: entry.timestamp || Date.now(),
      });
    });
    (old.heightHistory || []).forEach(h => {
      batch.set(ref.collection('heights').doc(h.date), { value: h.value, date: h.date, recordedAt: Date.now() });
    });
    (old.weightHistory || []).forEach(w => {
      batch.set(ref.collection('weights').doc(w.date), { value: w.value, date: w.date, recordedAt: Date.now() });
    });
    (old.pendingApprovals || []).forEach(p => {
      batch.set(ref.collection('pendingApprovals').doc(), {
        questId: p.questId, date: p.date || '', pts: p.pts || 0,
        photo: p.photo || null, submittedAt: p.submittedAt || '',
      });
    });
    (old.rewardHistory || []).forEach(r => {
      batch.set(ref.collection('rewards').doc(), {
        icon: r.icon, name: r.name, pts: r.pts, date: r.date, timestamp: Date.now(),
      });
    });

    // 구버전 배열 필드 루트 문서에서 제거
    batch.update(ref, {
      questLog: firebase.firestore.FieldValue.delete(),
      heightHistory: firebase.firestore.FieldValue.delete(),
      weightHistory: firebase.firestore.FieldValue.delete(),
      pendingApprovals: firebase.firestore.FieldValue.delete(),
      rewardHistory: firebase.firestore.FieldValue.delete(),
    });

    await batch.commit();
    console.log('[Firebase] 구버전 데이터 마이그레이션 완료');
  } catch (e) {
    console.error('[Firebase] 마이그레이션 실패:', e);
  }
}

// ── 퀘스트 완료 기록 추가 ──
async function fbAddQuestLog(entry) {
  try {
    await userRef().collection('questLog').add({
      questId: entry.questId, date: entry.date,
      pointsAwarded: entry.pointsAwarded, timestamp: entry.timestamp,
      photoUrl: entry.photoUrl || null,
    });
  } catch (e) { console.error('[Firebase] questLog 저장 실패:', e); }
}

// ── 키 기록 저장 (날짜 키 upsert) ──
async function fbSetHeight(date, value) {
  try {
    await userRef().collection('heights').doc(date).set({ value, date, recordedAt: Date.now() });
  } catch (e) { console.error('[Firebase] height 저장 실패:', e); }
}

// ── 몸무게 기록 저장 (날짜 키 upsert) ──
async function fbSetWeight(date, value) {
  try {
    await userRef().collection('weights').doc(date).set({ value, date, recordedAt: Date.now() });
  } catch (e) { console.error('[Firebase] weight 저장 실패:', e); }
}

// ── 승인 대기 항목 추가 → Firestore 문서 ID 반환 ──
async function fbAddPendingApproval(entry) {
  try {
    const doc = await userRef().collection('pendingApprovals').add({
      questId: entry.questId, date: entry.date,
      pts: entry.pts || 0, photo: entry.photo || null,
      submittedAt: entry.submittedAt || '',
    });
    return doc.id;
  } catch (e) {
    console.error('[Firebase] pendingApproval 저장 실패:', e);
    return null;
  }
}

// ── 승인 대기 항목 삭제 ──
async function fbRemovePendingApproval(firestoreId) {
  try {
    await userRef().collection('pendingApprovals').doc(firestoreId).delete();
  } catch (e) { console.error('[Firebase] pendingApproval 삭제 실패:', e); }
}

// ── 보상 이력 추가 ──
async function fbAddReward(entry) {
  try {
    await userRef().collection('rewards').add({
      icon: entry.icon, name: entry.name,
      pts: entry.pts, date: entry.date,
      timestamp: Date.now(),
    });
  } catch (e) { console.error('[Firebase] reward 저장 실패:', e); }
}

// ── 유저 데이터 전체 초기화 ──
async function fbResetUser() {
  const ref = userRef();
  const collections = ['questLog', 'heights', 'weights', 'pendingApprovals', 'rewards'];
  for (const col of collections) {
    const snap = await ref.collection(col).get();
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    if (snap.docs.length > 0) await batch.commit();
  }
  await ref.delete();
}

// ── 인증 사진 Storage 업로드 ──
async function uploadPhoto(dataUrl, approvalId) {
  const ref = storage.ref(`photos/${getUid()}/${approvalId}`);
  await ref.putString(dataUrl, 'data_url');
  return await ref.getDownloadURL();
}
