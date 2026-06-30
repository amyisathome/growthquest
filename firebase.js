// ==========================================
// firebase.js — Firebase 연결 및 데이터 관리
// 스키마 버전: 2
//
// ┌─ Firestore 구조 ──────────────────────────────────────────────────┐
// │  users/{uid}                       ← 핵심 문서                   │
// │    _v          : number            스키마 버전                    │
// │    profile     : { name, joinDate, pin }                          │
// │    gameState   : { points, totalEarnedPoints, totalApproved,      │
// │                    streak, lastActiveDate, gachaQueue,            │
// │                    gachaGivenDate, weekCycle, dailyRoll,          │
// │                    bodyReminderCycle, currentNickname,            │
// │                    todayStory, purchasedItems, parentUnlocked }   │
// │    _meta       : { migrations: string[] }  패치 플래그 보관      │
// │                                                                   │
// │  users/{uid}/questLog/{auto}                                      │
// │    questId, date, pointsAwarded, timestamp, photoUrl?             │
// │                                                                   │
// │  users/{uid}/bodyMeasurements/{date}   ← 키+몸무게 통합          │
// │    date, height?, weight?, recordedAt                             │
// │                                                                   │
// │  users/{uid}/pendingApprovals/{auto}                              │
// │    questId, date, photo?, submittedAt                             │
// │                                                                   │
// │  users/{uid}/rewards/{auto}           ← 가챠 지급 기록           │
// │    icon, name, pts, date, timestamp                               │
// └───────────────────────────────────────────────────────────────────┘
// ==========================================

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════

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

const SCHEMA_VERSION = 2;

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════

function getUid() {
  return localStorage.getItem('gq_user_name') || '';
}
function setUid(name) {
  localStorage.setItem('gq_user_name', name);
}
function userRef() {
  return db.collection('users').doc(getUid());
}

// ═══════════════════════════════════════
// AUTH
// ═══════════════════════════════════════

async function fbCheckUserExists(name) {
  try {
    const doc = await db.collection('users').doc(name).get();
    return doc.exists;
  } catch(e) { return false; }
}

// ═══════════════════════════════════════
// CORE STATE — 저장 / 불러오기
// ═══════════════════════════════════════

// STATE → 핵심 문서 직렬화
function _serializeCore(state) {
  const p = state.profile || {};
  // profile: 유저 기본정보만
  const profile = {
    name:             p.name             || '',
    joinDate:         p.joinDate         || '',
    pin:              p.pin              || '',
  };
  // gameState: 게임 진행 상태 전체
  const gameState = {
    points:            p.points            || 0,
    totalEarnedPoints: p.totalEarnedPoints  || 0,
    totalApproved:     p.totalApproved      || 0,
    streak:            p.streak             || 0,
    lastActiveDate:    p.lastActiveDate      || '',
    gachaQueue:        state.gachaQueue      || 0,
    gachaGivenDate:    p.gachaGivenDate      || '',
    weekCycle:         state.weekCycle       || {},
    dailyRoll:         state.dailyRoll       || null,
    bodyReminderCycle: state.bodyReminderCycle || '',
    currentNickname:   p.currentNickname     || null,
    todayStory:        p.todayStory          || null,
    purchasedItems:    state.purchasedItems  || [],
    parentUnlocked:    state.parentUnlocked  || false,
    mailbox:           state.mailbox         || [],
    rareCampaign:      state.rareCampaign    || null,
  };
  return { _v: SCHEMA_VERSION, profile, gameState };
}

// 핵심 문서 → STATE 역직렬화 (구버전 호환 포함)
function _deserializeCore(core) {
  const gs = core.gameState || {};
  const p  = core.profile   || {};

  // 구버전(v1): profile에 게임 상태가 섞여있던 형태
  const isLegacy = !core.gameState;
  const src = isLegacy ? (core.profile || core) : gs;

  return {
    profile: {
      name:              p.name              || core.name              || '',
      joinDate:          p.joinDate          || core.joinDate          || '',
      pin:               p.pin               || core.pin               || '',
      points:            src.points            || 0,
      totalEarnedPoints: src.totalEarnedPoints  || 0,
      totalApproved:     src.totalApproved      || 0,
      streak:            src.streak             || 0,
      lastActiveDate:    src.lastActiveDate      || '',
      gachaGivenDate:    src.gachaGivenDate      || '',
      currentNickname:   src.currentNickname     || null,
      todayStory:        src.todayStory          || null,
    },
    gachaQueue:        src.gachaQueue        || (isLegacy ? (core.gachaQueue||0) : 0),
    weekCycle:         src.weekCycle         || (isLegacy ? (core.weekCycle||{}) : {}),
    dailyRoll:         src.dailyRoll         || (isLegacy ? (core.dailyRoll||null) : null),
    bodyReminderCycle: src.bodyReminderCycle || (isLegacy ? (core.bodyReminderCycle||'') : ''),
    purchasedItems:    src.purchasedItems    || (isLegacy ? (core.purchasedItems||[]) : []),
    parentUnlocked:    src.parentUnlocked    || (isLegacy ? (core.parentUnlocked||false) : false),
    mailbox:           src.mailbox           || [],
    rareCampaign:      src.rareCampaign      || null,
    _meta:             core._meta            || { migrations: [] },
  };
}

async function fbSaveState(state) {
  try {
    const core = _serializeCore(state);
    // _meta 병합 (migrations 플래그 보존)
    core._meta = state._meta || { migrations: [] };
    await userRef().set(core);
  } catch(e) {
    console.error('[Firebase] 저장 실패:', e);
  }
}

// gachaQueue만 재확인 (기기 간 동기화 — 높은 값 우선)
async function fbSyncGachaQueue() {
  try {
    const doc = await userRef().get();
    if (doc.exists) {
      const core = doc.data();
      const q = (core.gameState ? core.gameState.gachaQueue : core.gachaQueue) || 0;
      if (q > (STATE.gachaQueue || 0)) STATE.gachaQueue = q;
    }
  } catch(e) {}
}

async function fbLoadState() {
  try {
    const ref = userRef();
    const [coreDoc, questSnap, measureSnap, heightSnap, weightSnap,
           pendingSnap, rewardSnap] = await Promise.all([
      ref.get(),
      ref.collection('questLog').orderBy('timestamp').get(),
      ref.collection('bodyMeasurements').orderBy('date').get(),
      ref.collection('heights').orderBy('date').get(),    // 구버전 — 삭제 안 함, 그냥 읽음
      ref.collection('weights').orderBy('date').get(),    // 구버전 — 삭제 안 함, 그냥 읽음
      ref.collection('pendingApprovals').orderBy('submittedAt').get(),
      ref.collection('rewards').orderBy('timestamp', 'desc').limit(100).get(),
    ]);

    if (!coreDoc.exists) return null;

    const core = coreDoc.data();

    // 루트 배열 구버전만 마이그레이션 (heights/weights 컬렉션은 건드리지 않음)
    if (Array.isArray(core.questLog) && core.questLog.length > 0) {
      await _migrateRootArrays(ref, core);
      return fbLoadState();
    }

    // bodyMeasurements(신버전) + heights/weights(구버전) 통합 읽기
    // 구버전 데이터를 먼저 깔고, 신버전이 있으면 덮어씀
    const byDate = {};
    heightSnap.docs.forEach(d => {
      const data = d.data();
      byDate[data.date] = { ...(byDate[data.date]||{}), height: data.value, date: data.date };
    });
    weightSnap.docs.forEach(d => {
      const data = d.data();
      byDate[data.date] = { ...(byDate[data.date]||{}), weight: data.value, date: data.date };
    });
    measureSnap.docs.forEach(d => {
      const data = d.data();
      byDate[data.date] = { ...(byDate[data.date]||{}), ...data };
    });

    const heightHistory = Object.values(byDate)
      .filter(m => m.height != null)
      .map(m => ({ date: m.date, value: m.height }))
      .sort((a, b) => a.date.localeCompare(b.date));
    const weightHistory = Object.values(byDate)
      .filter(m => m.weight != null)
      .map(m => ({ date: m.date, value: m.weight }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const deserialized = _deserializeCore(core);

    return {
      ...deserialized,
      questLog:         questSnap.docs.map(d => ({ ...d.data(), _fid: d.id })),
      heightHistory,
      weightHistory,
      pendingApprovals: pendingSnap.docs.map(d => ({ ...d.data(), id: d.id })),
      rewardHistory:    rewardSnap.docs.map(d => ({ ...d.data(), _fid: d.id })).reverse(),
    };
  } catch(e) {
    console.error('[Firebase] 불러오기 실패:', e);
    return null;
  }
}

// ═══════════════════════════════════════
// MIGRATIONS
// ═══════════════════════════════════════

// 루트 배열 → 서브컬렉션 마이그레이션만 (heights/weights는 건드리지 않음)
async function _migrateRootArrays(ref, core) {
  try {
    const batch = db.batch();

    (core.questLog || []).forEach(e => {
      batch.set(ref.collection('questLog').doc(), {
        questId: e.questId, date: e.date,
        pointsAwarded: e.pointsAwarded, timestamp: e.timestamp || Date.now(),
      });
    });
    (core.pendingApprovals || []).forEach(p => {
      batch.set(ref.collection('pendingApprovals').doc(), {
        questId: p.questId, date: p.date || '', pts: p.pts || 0,
        photo: p.photo || null, submittedAt: p.submittedAt || '',
      });
    });
    (core.rewardHistory || []).forEach(r => {
      batch.set(ref.collection('rewards').doc(), {
        icon: r.icon, name: r.name, pts: r.pts, date: r.date, timestamp: Date.now(),
      });
    });

    const legacyFields = ['questLog','heightHistory','weightHistory','pendingApprovals','rewardHistory'];
    const toDelete = {};
    legacyFields.forEach(f => { if (core[f]) toDelete[f] = firebase.firestore.FieldValue.delete(); });
    if (Object.keys(toDelete).length > 0) batch.update(ref, toDelete);

    await batch.commit();
    console.log('[Firebase] 루트 배열 마이그레이션 완료');
  } catch(e) {
    console.error('[Firebase] 마이그레이션 실패:', e);
  }
}

// ═══════════════════════════════════════
// QUEST LOG
// ═══════════════════════════════════════

async function fbAddQuestLog(entry) {
  try {
    await userRef().collection('questLog').add({
      questId:       entry.questId,
      date:          entry.date,
      pointsAwarded: entry.pointsAwarded,
      timestamp:     entry.timestamp,
      photoUrl:      entry.photoUrl || null,
    });
  } catch(e) { console.error('[Firebase] questLog 추가 실패:', e); }
}

async function fbRemoveQuestLog(fid) {
  try {
    await userRef().collection('questLog').doc(fid).delete();
  } catch(e) { console.error('[Firebase] questLog 삭제 실패:', e); }
}

async function fbRemoveQuestLogByTimestamp(ts) {
  try {
    const snap = await userRef().collection('questLog').where('timestamp', '==', ts).get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    if (snap.docs.length > 0) await batch.commit();
  } catch(e) { console.error('[Firebase] questLog timestamp 삭제 실패:', e); }
}

// ═══════════════════════════════════════
// BODY MEASUREMENTS (키/몸무게 통합)
// ═══════════════════════════════════════

async function fbSetHeight(date, value) {
  try {
    await userRef().collection('bodyMeasurements').doc(date).set(
      { date, height: value, recordedAt: Date.now() },
      { merge: true }
    );
  } catch(e) { console.error('[Firebase] height 저장 실패:', e); }
}

async function fbSetWeight(date, value) {
  try {
    await userRef().collection('bodyMeasurements').doc(date).set(
      { date, weight: value, recordedAt: Date.now() },
      { merge: true }
    );
  } catch(e) { console.error('[Firebase] weight 저장 실패:', e); }
}

// ═══════════════════════════════════════
// PENDING APPROVALS
// ═══════════════════════════════════════

async function fbAddPendingApproval(entry) {
  try {
    const doc = await userRef().collection('pendingApprovals').add({
      type:        entry.type      || 'quest',
      questId:     entry.questId   || null,
      date:        entry.date,
      pts:         entry.pts       || 0,
      photo:       entry.photo     || null,
      height:      entry.height    ?? null,
      weight:      entry.weight    ?? null,
      submittedAt: entry.submittedAt || '',
    });
    return doc.id;
  } catch(e) {
    console.error('[Firebase] pendingApproval 추가 실패:', e);
    return null;
  }
}

async function fbRemovePendingApproval(firestoreId) {
  try {
    await userRef().collection('pendingApprovals').doc(firestoreId).delete();
  } catch(e) { console.error('[Firebase] pendingApproval 삭제 실패:', e); }
}

// ═══════════════════════════════════════
// REWARDS (가챠 지급 기록)
// ═══════════════════════════════════════

async function fbAddReward(entry) {
  try {
    await userRef().collection('rewards').add({
      icon:      entry.icon,
      name:      entry.name,
      pts:       entry.pts,
      date:      entry.date,
      timestamp: Date.now(),
    });
  } catch(e) { console.error('[Firebase] reward 추가 실패:', e); }
}

async function fbRemoveReward(fid) {
  try {
    await userRef().collection('rewards').doc(fid).delete();
  } catch(e) { console.error('[Firebase] reward 삭제 실패:', e); }
}

// ═══════════════════════════════════════
// ADMIN — 전체 초기화
// ═══════════════════════════════════════

async function fbResetUser() {
  const ref = userRef();
  const collections = ['questLog', 'bodyMeasurements', 'pendingApprovals', 'rewards',
                       'heights', 'weights']; // heights/weights: 구버전 잔존 대비
  for (const col of collections) {
    const snap = await ref.collection(col).get();
    if (snap.docs.length === 0) continue;
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
  await ref.delete();
}

// ═══════════════════════════════════════
// PHOTO UPLOAD
// ═══════════════════════════════════════

async function uploadPhoto(dataUrl, approvalId) {
  const ref = storage.ref(`photos/${getUid()}/${approvalId}`);
  await ref.putString(dataUrl, 'data_url');
  return await ref.getDownloadURL();
}
