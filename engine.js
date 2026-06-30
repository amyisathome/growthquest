// ==========================================
// engine.js — 키성장 퀘스트 앱 엔진
// 담당: 개발자
// ==========================================

const COIN_SVG = `<svg width="14" height="14" viewBox="0 0 24 24" style="vertical-align:middle;margin-right:2px;"><circle cx="12" cy="12" r="9" fill="#f6c945" stroke="#a86a00" stroke-width="2"/><circle cx="12" cy="12" r="4.5" fill="#ffe089"/></svg>`;

let STATE = getDefaultState();
let currentPinBuffer = '';
let pendingScreen = null;
let activeQuestId = null;
let pendingPhotoData = null;

// 이벤트 팝업 큐
let eventQueue = [];
let eventShowing = false;
let dailyAllClearFiredDate = null;

// ═══════════════════════════════════════
// PERSISTENCE (Firebase)
// ═══════════════════════════════════════
function saveState() {
  fbSaveState(STATE);
}
async function loadState() {
  const remote = await fbLoadState();
  if (remote) {
    STATE = {...getDefaultState(), ...remote};
    // 기존 유저 joinDate 소급 적용
    if (!STATE.profile.joinDate && STATE.profile.name) {
      STATE.profile.joinDate = today();
      saveState();
    }
    STATE._meta = STATE._meta || { migrations: [] };
  } else {
    try {
      const raw = localStorage.getItem('growthquest_v2');
      if (raw) {
        STATE = {...getDefaultState(), ...JSON.parse(raw)};
        saveState();
        localStorage.removeItem('growthquest_v2');
      }
    } catch(e) {}
  }
}

// ═══════════════════════════════════════
// INIT
// ═══════════════════════════════════════
async function init() {
  document.getElementById('inDate').value = today();

  // 저장된 로그인 이름이 있으면 자동 로그인
  const savedName = localStorage.getItem('gq_user_name');
  if (savedName) {
    await loadState();
    if (STATE.profile.name) { render(); return; }
  }

  // 로그인 화면 표시
  document.getElementById('loginScreen').classList.remove('hidden');
}

async function loginWithName() {
  const name = document.getElementById('loginName').value.trim();
  if (!name) { showToast('이름을 입력해주세요!'); return; }

  document.getElementById('loginName').disabled = true;
  showToast('확인 중...');

  setUid(name);
  const exists = await fbCheckUserExists(name);

  if (exists) {
    // 기존 유저 → 데이터 로드
    await loadState();
    document.getElementById('loginScreen').classList.add('hidden');
    render();
  } else {
    // 신규 유저 → 온보딩
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('onboardNameDisplay').textContent = name;
    document.getElementById('onboard').classList.remove('hidden');
  }
  document.getElementById('loginName').disabled = false;
}

function finishOnboard() {
  const name = localStorage.getItem('gq_user_name');
  const h = parseFloat(document.getElementById('onboardHeight').value);
  const w = parseFloat(document.getElementById('onboardWeight').value);
  const pin = document.getElementById('onboardPin').value.trim();
  if (!pin || pin.length < 4) { alert('PIN 4자리를 입력해주세요!'); return; }
  STATE.profile.name = name;
  STATE.profile.pin = pin;
  if (!STATE.profile.joinDate) STATE.profile.joinDate = today();
  if (!isNaN(h) && h > 0) { const d = today(); STATE.heightHistory.push({date: d, value: h}); fbSetHeight(d, h); }
  if (!isNaN(w) && w > 0) { const d = today(); STATE.weightHistory.push({date: d, value: w}); fbSetWeight(d, w); }
  saveState();
  document.getElementById('onboard').classList.add('hidden');
  render();
}

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function today() {
  return new Date().toISOString().slice(0,10);
}
function todayLabel() {
  const d = new Date();
  return `${d.getMonth()+1}/${d.getDate()}`;
}
function isWeekend() {
  const d = new Date().getDay();
  return d === 0 || d === 6;
}
function rand(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomPts(quest) {
  return quest.pts;
}
function getCurrentHeight() {
  if (!STATE.heightHistory.length) return 0;
  return STATE.heightHistory[STATE.heightHistory.length-1].value;
}
function getCurrentWeight() {
  if (!STATE.weightHistory.length) return 0;
  return STATE.weightHistory[STATE.weightHistory.length-1].value;
}
function starsStr(n) {
  return '★'.repeat(n);
}
function getTodayApproved() {
  const t = today();
  return STATE.questLog.filter(l => l.date === t);
}
function getQuestStatusToday(questId) {
  if (STATE.pendingApprovals.find(p => p.questId === questId && p.date === today())) return 'pending';
  if (STATE.questLog.find(l => l.questId === questId && l.date === today())) return 'approved';
  return 'available';
}

// ═══════════════════════════════════════
// DAILY QUEST SELECTION
// ═══════════════════════════════════════
function getDailyQuests() {
  const missDays = calcMissDays();
  const rareChance = Math.min(0.5, 0.12 + missDays * 0.08);
  const dow = new Date().getDay();

  // rare 출현 여부를 오늘 하루 고정 (렌더링마다 바뀌지 않도록)
  const t = today();
  if (!STATE.dailyRoll || STATE.dailyRoll.date !== t) {
    const showRare = Math.random() < rareChance;
    STATE.dailyRoll = { date: t, showRare, rareNotified: false };
    saveState();
  }

  const rarePool = QUEST_POOL.filter(q => q.cat === 'rare');
  const rareQuest = STATE.dailyRoll.showRare ? [rarePool[dow % rarePool.length]] : [];

  // rare 출현 시 최초 1회만 팝업 알림
  if (STATE.dailyRoll.showRare && !STATE.dailyRoll.rareNotified && rareQuest[0]) {
    STATE.dailyRoll.rareNotified = true;
    saveState();
    setTimeout(() => pushEvent('rareQuestAppear', { questName: rareQuest[0].name }), 800);
  }

  const exPool = QUEST_POOL.filter(q => q.cat === 'exercise');
  const exerciseQuest = isWeekend() ? [exPool[dow % exPool.length]] : [];

  // rare는 3개 제한과 무관하게 항상 추가, 나머지 슬롯으로 warmup/core 구성
  const warmup = [QUEST_POOL.find(q => q.id === 'w2')];
  const remaining = Math.max(0, 3 - exerciseQuest.length - 1);
  const corePool = [
    QUEST_POOL.find(q => q.id === 'c1'),
    ...[QUEST_POOL.filter(q => q.cat === 'core' && q.id !== 'c1')[dow % 6]].filter(Boolean),
  ];
  const core = corePool.slice(0, remaining);

  return {
    warmup: warmup.filter(Boolean),
    core,
    exercise: exerciseQuest,
    rare: rareQuest,
  };
}

function calcMissDays() {
  if (!STATE.profile.lastActiveDate) return 0;
  const last = new Date(STATE.profile.lastActiveDate);
  const now = new Date();
  return Math.floor((now - last) / 86400000);
}

// ═══════════════════════════════════════
// STREAK & CYCLE
// ═══════════════════════════════════════
function updateStreak() {
  const t = today();
  const todayApproved = getTodayApproved();
  if (todayApproved.length === 0) return;
  if (STATE.profile.lastActiveDate === t) return;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yStr = yesterday.toISOString().slice(0,10);

  if (STATE.profile.lastActiveDate === yStr) {
    STATE.profile.streak = (STATE.profile.streak || 0) + 1;
  } else if (STATE.profile.lastActiveDate !== t) {
    STATE.profile.streak = 1;
  }
  STATE.profile.lastActiveDate = t;
}

function checkWeeklyCycle() {
  const now = new Date();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekStart = monday.toISOString().slice(0,10);

  if (STATE.weekCycle.startDate !== weekStart) {
    STATE.weekCycle = {startDate: weekStart, completedDays: [], weeklyRewardPending: false, weeklyRewardClaimed: false, weeklyBonusUsed: false};
    STATE.profile.currentNickname = null;
  }

  const t = today();
  const todayApproved = getTodayApproved();
  if (todayApproved.length > 0 && !STATE.weekCycle.completedDays.includes(t)) {
    STATE.weekCycle.completedDays.push(t);
  }

  if (STATE.weekCycle.completedDays.length >= 5 && !STATE.weekCycle.weeklyRewardClaimed) {
    STATE.weekCycle.weeklyRewardPending = true;
  }
}

// ═══════════════════════════════════════
// DYNAMIC NICKNAME
// ═══════════════════════════════════════
function getDynamicNick() {
  const now = new Date();
  const weekAgo = now - 7 * 86400000;
  const recent = STATE.questLog.filter(l => new Date(l.date) >= weekAgo);
  const catCount = {};
  recent.forEach(l => {
    const q = QUEST_POOL.find(q => q.id === l.questId);
    if (q) catCount[q.cat] = (catCount[q.cat] || 0) + 1;
  });

  const name = STATE.profile.name || '용사';

  // 이번 주 칭호가 아직 없을 때만 새로 뽑아서 저장 (확정 후 고정)
  if (!STATE.profile.currentNickname) {
    const weekSeed = STATE.weekCycle?.startDate || today();
    const newNick = getWeeklyNickname(catCount, weekSeed);
    if (newNick) {
      pushEvent('newNickname', { nickname: newNick });
      STATE.profile.currentNickname = newNick;
      saveState();
    }
  }

  const nick = STATE.profile.currentNickname;
  if (nick) return `${nick} ${name}`;
  if (STATE.profile.streak >= 7) return `${name} — 7일 연속 달성자`;
  if (STATE.profile.totalApproved >= 20) return `성장에 진심인 ${name}`;
  return `성장을 시작한 ${name}`;
}

// ═══════════════════════════════════════
// RENDER
// ═══════════════════════════════════════
function render() {
  renderTopbar();
  renderHomeScreen();
  fbSyncGachaQueue().then(() => renderGachaScreen());
  renderReportScreen();
  renderMailboxBadge();
}

function renderTopbar() {
  const coinEl = document.getElementById('coinDisplay');
  if (coinEl) coinEl.textContent = (STATE.profile.totalEarnedPoints || 0).toLocaleString();
  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) titleEl.textContent = "Jake's Epic Journey";

  // 가챠 대기 뱃지
  const badge = document.getElementById('gachaBadge');
  if (badge) {
    const count = STATE.gachaQueue || 0;
    if (count > 0) {
      badge.textContent = count;
      badge.style.display = 'inline-block';
    } else {
      badge.style.display = 'none';
    }
  }
}

function renderStoryCard() {
  const t = today();
  if (!STATE.profile.todayStory || STATE.profile.todayStory.date !== t) {
    const story = getStoryByStreak(STATE.profile.streak || 0);
    STATE.profile.todayStory = { date: t, icon: story.icon, title: story.title, msg: story.msg };
    saveState();
  }
  const s = STATE.profile.todayStory;
  document.getElementById('storyIcon').textContent = s.icon;
  document.getElementById('storyTitle').textContent = s.title;
  document.getElementById('storyMsg').textContent = s.msg;
}

function flushPendingEvents() {
  if (STATE.parentUnlocked) return;
  const events = STATE.pendingEvents || [];
  if (events.length === 0) return;
  STATE.pendingEvents = [];
  saveState();
  events.forEach(e => pushEvent(e.type, e.vars));
}

function getJoinCycleKey() {
  // 가입일 기준 7일 단위 사이클 번호 반환
  const joinDate = STATE.profile.joinDate || today();
  const diff = Math.floor((new Date(today()) - new Date(joinDate)) / 86400000);
  const cycle = Math.floor(diff / 7);
  return `${joinDate}-c${cycle}`;
}

function checkBodyRecordReminder() {
  const cycleKey = getJoinCycleKey();
  // 이번 사이클에 기록이 있으면 skip
  const cycleStart = new Date(STATE.profile.joinDate || today());
  const diff = Math.floor((new Date(today()) - cycleStart) / 86400000);
  const cycleStartOffset = Math.floor(diff / 7) * 7;
  const cycleStartDate = new Date(cycleStart);
  cycleStartDate.setDate(cycleStartDate.getDate() + cycleStartOffset);
  const cycleStartStr = cycleStartDate.toISOString().slice(0, 10);
  const cycleEndDate = new Date(cycleStartDate);
  cycleEndDate.setDate(cycleEndDate.getDate() + 6);
  const cycleEndStr = cycleEndDate.toISOString().slice(0, 10);

  const hasRecord = (STATE.questLog||[]).some(l =>
    l.questId === '__record__' && l.date >= cycleStartStr && l.date <= cycleEndStr
  );
  if (hasRecord) return;
  // 매주 토요일에만 알림
  if (new Date(today()).getDay() !== 6) return;
  if (STATE.bodyReminderCycle === cycleKey) return;
  STATE.bodyReminderCycle = cycleKey;
  saveState();
  setTimeout(() => pushEvent('bodyRecordReminder'), 1200);
}

function checkAndGrantDailyGacha() {
  const t = today();
  if (STATE.profile.gachaGivenDate === t) return;
  const {warmup, core, exercise, rare} = getDailyQuests();
  const todayQuests = [...warmup, ...core, ...exercise, ...rare];
  if (todayQuests.length === 0) return;
  const allApproved = todayQuests.every(q => (STATE.questLog||[]).find(l => l.questId === q.id && l.date === t));
  if (allApproved) {
    STATE.gachaQueue = (STATE.gachaQueue||0) + 1;
    STATE.profile.gachaGivenDate = t;
    saveState();
    renderTopbar();
  }
}

function renderHomeScreen() {
  flushPendingEvents();
  checkBodyRecordReminder();
  checkAndGrantDailyGacha();
  const pts = STATE.profile.points || 0;
  const totalPts = STATE.profile.totalEarnedPoints || pts;
  const lvInfo = getLevelByPts(totalPts);
  const xp = getXpProgress(totalPts);
  const h = getCurrentHeight();
  const w = getCurrentWeight();

  document.getElementById('charLvBadge').textContent = `LV.${lvInfo.lv}`;
  const charRankEl = document.getElementById('charRank');
  if (charRankEl) charRankEl.textContent = `${lvInfo.emoji} ${lvInfo.title}`;
  document.getElementById('charNick').textContent = getDynamicNick();

  document.getElementById('statHeight').innerHTML = (h ? h : '0') + '<span class="sv-unit">cm</span>';
  document.getElementById('statWeight').innerHTML = (w ? w : '0') + '<span class="sv-unit">kg</span>';
  const ptsVal = pts >= 1000 ? (pts/1000).toFixed(1)+'k' : pts;
  document.getElementById('statPoints').innerHTML = ptsVal + '<span class="sv-unit">p</span>';

  // XP 바 (픽셀 세그먼트)
  const xpTrack = document.getElementById('xpTrack');
  const SEG = 10;
  const filled = xp.nextLv ? Math.round(xp.pct / 100 * SEG) : SEG;
  xpTrack.innerHTML = Array.from({length:SEG},(_,i)=>{
    let cls = 'xp-seg';
    if(i < filled){ cls += i < SEG*0.4 ? ' on' : i < SEG*0.7 ? ' on-c' : ' on-g'; }
    return `<div class="${cls}"></div>`;
  }).join('');
  if (xp.nextLv) {
    document.getElementById('xpLabel').textContent = `LV.${xp.nextLv.lv} [${xp.nextLv.title}] 진급까지`;
    document.getElementById('xpNext').textContent = `${xp.current.toLocaleString()} / ${xp.needed.toLocaleString()}P`;
  } else {
    document.getElementById('xpLabel').textContent = '👑 전설의 취사병 — 최고 계급';
    document.getElementById('xpNext').textContent = `${pts.toLocaleString()}P`;
  }

  // 아바타
  const avatarEl = document.getElementById('avatarEl');
  if (avatarEl && STATE.profile.avatar) {
    avatarEl.src = STATE.profile.avatar;
  }

  renderStoryCard();

  // 일일 퀘스트
  const {warmup, core, exercise, rare} = getDailyQuests();
  let totalQ = warmup.length + core.length + exercise.length + rare.length;
  let doneQ = 0;

  function renderQuestList(containerId, quests) {
    const el = document.getElementById(containerId);
    el.innerHTML = '';
    quests.forEach(q => {
      const status = getQuestStatusToday(q.id);
      if (status === 'approved') { doneQ++; return; }
      el.appendChild(makeQuestCard(q, status));
    });
  }

  renderQuestList('warmupQuests', warmup);
  renderQuestList('coreQuests', core);

  const allDoneEl = document.getElementById('allQuestsDone');

  const exSec = document.getElementById('exerciseSection');
  if (exercise.length > 0) {
    exSec.classList.remove('hidden');
    renderQuestList('exerciseQuests', exercise);
  } else {
    exSec.classList.add('hidden');
  }

  const rareSec = document.getElementById('rareSection');
  if (rare.length > 0) {
    rareSec.classList.remove('hidden');
    renderQuestList('rareQuests', rare);
  } else {
    rareSec.classList.add('hidden');
  }

  if (allDoneEl) {
    if (totalQ > 0 && doneQ === totalQ) {
      allDoneEl.classList.remove('hidden');
      if (dailyAllClearFiredDate !== today()) {
        dailyAllClearFiredDate = today();
        pushEvent('dailyAllClear');
      }
    } else {
      allDoneEl.classList.add('hidden');
    }
  }

  // 오늘 진행률
  const pct = totalQ > 0 ? Math.round(doneQ/totalQ*100) : 0;
  const progressFill = document.getElementById('homeProgress');
  const progressLabel = document.getElementById('homeProgressLabel');
  if (progressFill) progressFill.style.width = pct + '%';
  if (progressLabel) progressLabel.textContent = `오늘의 진행률 ${pct}%`;

  checkWeeklyCycle();
  const banner = document.getElementById('weeklyBanner');
  if (STATE.weekCycle.weeklyRewardPending && !STATE.weekCycle.weeklyRewardClaimed) {
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }
}

function makeQuestCard(q, status) {
  const div = document.createElement('div');
  let cls = 'quest-card';
  if (q.cat === 'rare') cls += ' rare';
  if (status === 'approved') cls += ' approved';
  if (status === 'pending') cls += ' pending';

  let badgeHtml = '';
  if (status === 'pending') badgeHtml = '<span class="q-badge pending">대기중</span>';
  if (status === 'approved') badgeHtml = '<span class="q-badge approved">✓ 승인</span>';

  div.className = cls;
  const rareBadge = q.cat==='rare' ? '<span class="q-rare-badge">RARE</span>' : '';
  div.innerHTML = `
    <div class="q-icon cat-${q.cat}">${q.icon}</div>
    <div class="q-body">
      <div style="display:flex;align-items:center;gap:5px;margin-bottom:2px;">
        <span class="q-name">${q.name}</span>${rareBadge}
      </div>
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
        <span class="q-stars">${starsStr(q.stars)}</span>
        ${badgeHtml}
      </div>
      <div style="font-size:11px;color:var(--text4);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${q.desc.split('\n\n')[0]}</div>
    </div>
    <div style="text-align:right;flex-shrink:0;"><div class="q-pts">+${q.pts}P</div></div>
  `;
  if (status === 'available') {
    div.onclick = () => openQuestModal(q.id);
  }
  return div;
}

// ── 가챠 화면 ──
function renderGachaScreen() {
  const count = STATE.gachaQueue || 0;

  // 도착 메시지 (선물상자 아래)
  const arrivalEl = document.getElementById('gachaArrivalMsg');
  if (arrivalEl) {
    if (count > 0) {
      arrivalEl.textContent = `임무 완수 포상으로 보급품 ${count}개가 지급 대기 중입니다. 충성!`;
      arrivalEl.classList.remove('hidden');
    } else {
      arrivalEl.classList.add('hidden');
    }
  }

  // 상자+버튼 vs 빈 메시지 전환
  const stageEl = document.getElementById('gachaStageWithBox');
  const emptyEl = document.getElementById('gachaEmptyMsg');
  if (stageEl) stageEl.classList.toggle('hidden', count === 0);
  if (emptyEl) emptyEl.classList.toggle('hidden', count > 0);

  document.getElementById('gachaBtn').disabled = count === 0;
  document.getElementById('gachaSection').style.display = '';

  const shopPtsEl = document.getElementById('shopPointsDisplay');
  if (shopPtsEl) shopPtsEl.textContent = ((STATE.profile.points || 0).toLocaleString()) + 'P';

  const shopEl = document.getElementById('shopList');
  shopEl.innerHTML = '';
  const allShopItems = [...SHOP_ITEMS.final, ...SHOP_ITEMS.mid, ...SHOP_ITEMS.daily]
    .sort((a, b) => b.cost - a.cost);
  allShopItems.forEach(item => {
      const can = (STATE.profile.points || 0) >= item.cost;
      const div = document.createElement('div');
      div.className = 'shop-card';
      div.innerHTML = `
        <div class="shop-icon">${item.icon}</div>
        <div class="shop-body">
          <div class="shop-name">${item.name}</div>
          <div class="shop-cost">${COIN_SVG} ${item.cost.toLocaleString()}P</div>
        </div>
        <button class="shop-btn" ${can?'':'disabled'} onclick="purchaseItem('${item.id}')">교환</button>
      `;
      shopEl.appendChild(div);
  });

  const histEl = document.getElementById('rewardHistory');
  histEl.innerHTML = '';
  const hist = [...(STATE.rewardHistory||[])].reverse().slice(0,10);
  if (hist.length === 0) {
    histEl.innerHTML = '<div style="text-align:center;color:var(--text4);font-size:16px;padding:12px;">아직 보상 기록이 없어요</div>';
  }
  hist.forEach(r => {
    const div = document.createElement('div');
    div.className = 'reward-row';
    div.innerHTML = `<span style="font-size:22px;">${r.icon}</span><span style="flex:1;">${r.name}</span><span style="font-size:14px;color:var(--text3);">${r.date}</span><span class="pt">${r.pts < 0 ? '' : '+'}${r.pts}P</span>`;
    histEl.appendChild(div);
  });
}

// ── 리포트 화면 ──
function renderReportScreen() {
}

function drawCharts() {
  const MAX_WEEKS = 13; // 3개월
  const now = new Date(today());

  // 최근 MAX_WEEKS주 이내의 모든 기록을 날짜별로 표시 (한 주에 여러 건이어도 모두 표시)
  function getWeeklyData(history) {
    const cutoff = new Date(now);
    cutoff.setDate(now.getDate() - MAX_WEEKS * 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return (history || [])
      .filter(h => h.date >= cutoffStr)
      .map(h => {
        const m = parseInt(h.date.slice(5, 7));
        const d = parseInt(h.date.slice(8, 10));
        return { label: `${m}/${d}`, value: h.value, date: h.date };
      });
  }

  // 날짜별 활동포인트 집계
  function getDailyAct() {
    const map = {};
    (STATE.questLog || []).forEach(l => {
      map[l.date] = (map[l.date] || 0) + (l.pointsAwarded || 0);
    });
    return map;
  }
  const actMap = getDailyAct();

  const hData = getWeeklyData(STATE.heightHistory);
  const wData = getWeeklyData(STATE.weightHistory);

  if (hData.length >= 1) drawLineChart('heightChart', hData, '#ffd76a', actMap, true);
  if (wData.length >= 1) drawLineChart('weightChart', wData, '#ff9d8a', actMap, false);
}

function drawLineChart(svgId, data, color, actMap, showActivity) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const W = svg.getBoundingClientRect().width || svg.clientWidth || 340, H = 200;
  const padL = 38, padR = 34, padT = 14, padB = 22;
  const innerW = W - padL - padR, innerH = H - padT - padB;
  const n = data.length;
  if (n === 0) return;

  // Y축: 5단위 고정 범위
  const vals = data.map(d => d.value);
  const minVal = Math.min(...vals), maxVal = Math.max(...vals);
  const yMin = Math.floor(minVal / 5) * 5;
  const yMax = Math.max(yMin + 5, Math.ceil(maxVal / 5) * 5);
  const yRange = yMax - yMin;

  const toY = v => padT + innerH * (1 - (v - yMin) / yRange);
  const xs = n === 1 ? [padL + innerW / 2] : data.map((_, i) => padL + innerW * i / (n - 1));
  const ys = vals.map(toY);

  let s = `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="rgba(255,255,255,.12)" stroke-width="1"/>
<line x1="${padL}" y1="${H - padB}" x2="${W - padR}" y2="${H - padB}" stroke="rgba(255,255,255,.12)" stroke-width="1"/>`;

  // Y축 눈금선 (yMin, 중간, yMax)
  [yMin, yMin + yRange / 2, yMax].forEach(v => {
    const y = toY(v);
    s += `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="rgba(255,255,255,.06)" stroke-width="1"/>`;
    s += `<text x="${padL - 4}" y="${y + 3}" font-size="8" fill="#9694b8" text-anchor="end">${v % 1 === 0 ? v : v.toFixed(1)}</text>`;
  });

  // 활동포인트 보조선
  if (showActivity && n > 1) {
    const actVals = data.map(d => actMap[d.date] || 0);
    const maxAct = Math.max(...actVals, 1);
    const ysA = actVals.map(p => padT + innerH * (1 - p / maxAct));
    s += `<polyline points="${xs.map((x, i) => `${x},${ysA[i]}`).join(' ')}" fill="none" stroke="#5ad1ff" stroke-width="1.5" stroke-dasharray="4 3" opacity=".7"/>`;
    xs.forEach((x, i) => { s += `<circle cx="${x}" cy="${ysA[i]}" r="2" fill="#5ad1ff"/>`; });
  }

  // 메인 라인
  if (n > 1) {
    s += `<polyline points="${xs.map((x, i) => `${x},${ys[i]}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }

  // 데이터 포인트 & X축 레이블 (많으면 격주로)
  const step = n > 8 ? 2 : 1;
  xs.forEach((x, i) => {
    const isLast = i === n - 1;
    s += `<circle cx="${x}" cy="${ys[i]}" r="${isLast ? 4 : 3}" fill="${color}"/>`;
    if (i % step === 0 || isLast) {
      s += `<text x="${x}" y="${H - 6}" font-size="8" fill="#9694b8" text-anchor="middle">${data[i].label}</text>`;
    }
  });

  // 마지막값 레이블
  const lastY = ys[n - 1];
  const labelY = lastY < padT + 14 ? lastY + 14 : lastY - 6;
  s += `<text x="${xs[n - 1] + 5}" y="${labelY}" font-size="9" font-weight="700" fill="${color}" text-anchor="start">${vals[n - 1]}</text>`;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = s;
}

function renderWeekBars() {
  const barsEl = document.getElementById('weekBars');
  barsEl.innerHTML = '';
  const days = ['월','화','수','목','금','토','일'];
  const now = new Date();
  const dow = (now.getDay()+6)%7;

  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - dow);

  let maxCount = 1;
  const counts = days.map((_,i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    const dStr = d.toISOString().slice(0,10);
    const c = STATE.questLog.filter(l=>l.date===dStr).length;
    if (c > maxCount) maxCount = c;
    return {label: days[i], count: c, isToday: i === dow};
  });

  counts.forEach(({label, count, isToday}) => {
    const pct = Math.round(count/maxCount*100);
    const div = document.createElement('div');
    div.className = 'week-bar-wrap';
    div.innerHTML = `
      <div class="week-bar${isToday?' today':''}" style="height:${Math.max(4,pct*0.5)}px;"></div>
      <div class="week-bar-label">${label}${count>0?`<br><b style="color:var(--text2);">${count}</b>`:''}</div>
    `;
    barsEl.appendChild(div);
  });

  const insightEl = document.getElementById('weekInsight');
  const weekApproved = STATE.weekCycle.completedDays.length;
  if (weekApproved >= 3) {
    insightEl.classList.remove('hidden');
    insightEl.innerHTML = `이번 주 <b>${weekApproved}일</b> 퀘스트 완료! ${weekApproved>=5?'<b>주간 보상 달성! 🎉</b>':'5일 달성하면 주간 보상을 받아요!'}`;
  } else {
    insightEl.classList.add('hidden');
  }
}

// ── 부모 화면 ──
function renderParentScreen() {
  const el = document.getElementById('parentContent');
  const pending = STATE.pendingApprovals || [];
  const lvInfo = getLevelByPts(STATE.profile.totalEarnedPoints||STATE.profile.points||0);
  const weekPct = Math.round((STATE.weekCycle.completedDays.length/7)*100);

  let html = '';

  // ① 기본 정보 (최상단)
  html += `
    <div class="char-card" style="margin-top:12px;">
      <div class="char-title">${lvInfo.emoji} ${lvInfo.title}</div>
      <div class="char-nick">${getDynamicNick()}</div>
      <div class="day-row"><span>이번주 이행일</span><span>${STATE.weekCycle.completedDays.length}일 / 7일</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${weekPct}%"></div></div>
      <div class="progress-label">${weekPct}% — 5일 이상이면 주간 보상!</div>
    </div>
  `;

  // ② 승인 대기 — QUEST_POOL에 있는 유효한 항목만 카운트
  const validPending = pending.filter(p => QUEST_POOL.find(q => q.id === p.questId));
  html += `<div class="section-label" style="margin-top:18px;">✅ 승인 대기 (${validPending.length}건)</div>`;
  if (validPending.length === 0) {
    html += `<div style="text-align:center;color:var(--text4);font-size:15px;padding:14px;">승인 대기 중인 퀘스트가 없습니다.</div>`;
  } else {
    validPending.forEach(p => {
      const q = QUEST_POOL.find(q=>q.id===p.questId);
      html += `
        <div class="approve-row" onclick="showPhotoModal('${p.id}')" style="cursor:pointer;">
          <div class="thumb">${p.photo ? `<img src="${p.photo}">` : q.icon}</div>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:700;">${q.name}</div>
            <div style="font-size:14px;color:var(--text3);">${p.date} ${p.submittedAt}</div>
            ${p.photo ? `<div style="font-size:12px;color:var(--gold);margin-top:2px;">📷 사진 있음 — 탭하여 확인</div>` : `<div style="font-size:12px;color:var(--text4);margin-top:2px;">사진 없음</div>`}
          </div>
          <button class="reject-btn" onclick="event.stopPropagation();rejectQuest('${p.id}')">✕</button>
          <button class="approve-btn" onclick="event.stopPropagation();approveQuest('${p.id}')">승인 ✓</button>
        </div>
      `;
    });
  }

  // ②-2 신체 기록 보상 승인 대기
  const recordPending = pending.filter(p => p.type === 'record');
  html += `<div class="section-label" style="margin-top:18px;">📏 신체 기록 보상 승인 대기 (${recordPending.length}건)</div>`;
  if (recordPending.length === 0) {
    html += `<div style="text-align:center;color:var(--text4);font-size:15px;padding:14px;">승인 대기 중인 신체 기록이 없습니다.</div>`;
  } else {
    recordPending.forEach(p => {
      const parts = [];
      if (p.height != null) parts.push(`키 ${p.height}cm`);
      if (p.weight != null) parts.push(`몸무게 ${p.weight}kg`);
      html += `
        <div class="approve-row">
          <div class="thumb">📏</div>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:700;">${parts.join(' · ')}</div>
            <div style="font-size:14px;color:var(--text3);">${p.date} ${p.submittedAt}</div>
            <div style="font-size:12px;color:var(--gold);margin-top:2px;">보상 +${p.pts}P</div>
          </div>
          <button class="reject-btn" onclick="rejectRecord('${p.id}')">✕</button>
          <button class="approve-btn" onclick="approveRecord('${p.id}')">승인 ✓</button>
        </div>
      `;
    });
  }

  const seen = new Set();
  const recentLog = [...(STATE.questLog||[])].reverse().filter(l => {
    const key = `${l.date}-${l.questId}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0,5);
  html += `<div class="section-label">📋 최근 승인 기록</div>`;
  if (recentLog.length === 0) {
    html += `<div style="text-align:center;color:var(--text4);font-size:15px;padding:14px;">승인된 퀘스트 기록이 없습니다.</div>`;
  } else {
    recentLog.forEach(l => {
      const q = QUEST_POOL.find(q=>q.id===l.questId);
      if (!q) return;
      html += `<div class="reward-row">
        <span style="font-size:22px;">${q.icon}</span>
        <span style="flex:1;">${q.name}</span>
        <span style="font-size:14px;color:var(--text3);">${l.date}</span>
        <span class="pt">+${l.pointsAwarded}P</span>
        <button onclick="deleteQuestLog('${l.timestamp}')" style="margin-left:8px;background:rgba(248,113,113,.15);border:1px solid rgba(248,113,113,.4);color:#f87171;font-size:12px;font-weight:700;border-radius:8px;padding:4px 8px;cursor:pointer;">삭제</button>
      </div>`;
    });
  }

  const recentRewards = [...(STATE.rewardHistory||[])].reverse().slice(0,5);
  html += `<div class="section-label">🎁 최근 보상 사용 기록</div>`;
  if (recentRewards.length === 0) {
    html += `<div style="text-align:center;color:var(--text4);font-size:15px;padding:14px;">아직 사용된 보상이 없습니다.</div>`;
  } else {
    recentRewards.forEach(r => {
      const ptColor = r.pts < 0 ? '#f87171' : 'var(--gold)';
      const ptText = r.pts < 0 ? `${r.pts}P` : `+${r.pts}P`;
      html += `<div class="reward-row">
        <span style="font-size:22px;">${r.icon}</span>
        <span style="flex:1;">${r.name}</span>
        <span style="font-size:14px;color:var(--text3);">${r.date}</span>
        <span class="pt" style="color:${ptColor};">${ptText}</span>
        <button onclick="deleteRewardLog('${r.timestamp||r.date+r.name}')" style="margin-left:8px;background:rgba(248,113,113,.15);border:1px solid rgba(248,113,113,.4);color:#f87171;font-size:12px;font-weight:700;border-radius:8px;padding:4px 8px;cursor:pointer;">삭제</button>
      </div>`;
    });
  }

  html += `
    <div style="margin-top:20px;padding:14px;background:rgba(255,255,255,.05);border-radius:14px;">
      <div style="font-size:16px;font-weight:700;margin-bottom:8px;">⚙️ 부모 설정</div>
      <div style="font-size:15px;color:var(--text3);margin-bottom:8px;">현재 PIN: ${'*'.repeat((STATE.profile.pin||'').length)}</div>
      <div style="display:flex;gap:8px;box-sizing:border-box;width:100%;">
        <input id="newPin" type="text" inputmode="numeric" maxlength="4" placeholder="새 PIN 4자리" style="flex:1;min-width:0;box-sizing:border-box;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);border-radius:9px;padding:8px;color:#fff;font-size:16px;font-family:inherit;">
        <button onclick="changePin()" style="flex-shrink:0;background:linear-gradient(135deg,var(--purple),var(--violet));color:#fff;font-size:15px;font-weight:700;border:none;border-radius:10px;padding:8px 13px;cursor:pointer;">변경</button>
      </div>
      <div style="margin-top:20px;padding-top:16px;border-top:1px solid rgba(255,255,255,.1);">
        <div style="font-size:13px;color:var(--text3);margin-bottom:10px;">⚠️ 모든 데이터(퀘스트 기록, 포인트, 신체 기록 등)가 삭제됩니다.</div>
        <button onclick="resetAllData()" style="width:100%;background:linear-gradient(135deg,#c0392b,#e74c3c);color:#fff;font-size:15px;font-weight:700;border:none;border-radius:10px;padding:10px;cursor:pointer;">🗑️ 데이터 초기화</button>
      </div>
    </div>
  `;

  el.innerHTML = html;
}

// ═══════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════
function switchScreen(name, navEl) {
  if (name === 'parent' && !STATE.parentUnlocked) {
    pendingScreen = name;
    showPin();
    return;
  }
  doSwitchScreen(name, navEl);
}

function doSwitchScreen(name, navEl) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`screen-${name}`).classList.add('active');
  if (navEl) navEl.classList.add('active');
  else {
    document.querySelectorAll('.nav-item').forEach(n => {
      if (n.dataset.screen === name) n.classList.add('active');
    });
  }

  if (name === 'home') renderHomeScreen();
  if (name === 'gacha') { fbSyncGachaQueue().then(() => renderGachaScreen()); }
  if (name === 'report') { renderReportScreen(); setTimeout(drawCharts, 50); }
  if (name === 'parent') { STATE.parentUnlocked = true; renderParentScreen(); }
}

// ═══════════════════════════════════════
// PIN
// ═══════════════════════════════════════
function showPin() {
  currentPinBuffer = '';
  updatePinDots();
  document.getElementById('pinErr').textContent = '';
  document.getElementById('pinOverlay').classList.remove('hidden');
}
function cancelPin() {
  document.getElementById('pinOverlay').classList.add('hidden');
  pendingScreen = null;
}
function pinInput(key) {
  if (key === 'del') {
    currentPinBuffer = currentPinBuffer.slice(0,-1);
  } else if (key === 'ok') {
    checkPin();
    return;
  } else {
    if (currentPinBuffer.length >= 4) return;
    currentPinBuffer += key;
    if (currentPinBuffer.length === 4) setTimeout(checkPin, 100);
  }
  updatePinDots();
}
function updatePinDots() {
  document.querySelectorAll('.pin-dot').forEach((d,i) => {
    d.classList.toggle('filled', i < currentPinBuffer.length);
  });
}
function checkPin() {
  if (currentPinBuffer === STATE.profile.pin) {
    document.getElementById('pinOverlay').classList.add('hidden');
    if (pendingScreen) { doSwitchScreen(pendingScreen, null); pendingScreen = null; }
  } else {
    document.getElementById('pinErr').textContent = '잘못된 PIN이에요. 다시 입력해주세요.';
    currentPinBuffer = '';
    updatePinDots();
  }
}
function changePin() {
  const np = document.getElementById('newPin').value.trim();
  if (np.length !== 4 || isNaN(np)) { showToast('PIN은 4자리 숫자여야 해요'); return; }
  STATE.profile.pin = np;
  saveState();
  showToast('PIN이 변경됐어요! 🔐');
  renderParentScreen();
}

async function resetAllData() {
  if (!confirm('정말로 모든 데이터를 초기화할까요?\n이 작업은 되돌릴 수 없습니다.')) return;
  try {
    await fbResetUser();
  } catch(e) {
    console.warn('Firebase 초기화 실패, 로컬만 초기화:', e);
  }
  localStorage.removeItem('gq_user_name');
  showToast('초기화 완료! 앱을 다시 시작합니다.');
  setTimeout(() => location.reload(), 1500);
}

// ═══════════════════════════════════════
// QUEST MODAL
// ═══════════════════════════════════════
function openQuestModal(questId) {
  const q = QUEST_POOL.find(q=>q.id===questId);
  if (!q) return;
  activeQuestId = questId;
  pendingPhotoData = null;
  document.getElementById('questModalTitle').textContent = `${q.icon} ${q.name}`;
  document.getElementById('questModalDesc').innerHTML = q.desc.replace(/\n/g, '<br>') + `<br><br>보상: ${COIN_SVG} ${q.pts}P`;
  document.getElementById('photoPreview').style.display = 'none';
  document.getElementById('photoPreview').src = '';
  document.getElementById('questPhoto').value = '';
  document.getElementById('questModal').classList.remove('hidden');
}
function closeQuestModal() {
  document.getElementById('questModal').classList.add('hidden');
  activeQuestId = null;
  pendingPhotoData = null;
}
function previewPhoto(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    pendingPhotoData = e.target.result;
    const prev = document.getElementById('photoPreview');
    prev.src = pendingPhotoData;
    prev.style.display = 'block';
    document.getElementById('photoUploadBtn').textContent = '📷 사진 변경';
  };
  reader.readAsDataURL(file);
}
function compressImage(dataUrl, maxSize = 800, quality = 0.7) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let w = img.width, h = img.height;
      if (w > maxSize || h > maxSize) {
        if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
        else { w = Math.round(w * maxSize / h); h = maxSize; }
      }
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function compressImageSmall(dataUrl) {
  return compressImage(dataUrl, 400, 0.5);
}

async function submitQuest() {
  if (!activeQuestId) return;
  const q = QUEST_POOL.find(q=>q.id===activeQuestId);
  if (!q) return;

  if (!pendingPhotoData) {
    showToast('사진을 등록해야 임무 보고가 가능해요 📷');
    return;
  }

  try {
    const approvalId = Date.now().toString();
    let photoUrl = null;

    if (pendingPhotoData) {
      showToast('[시스템] 사진 업로드 중...');
      try {
        const compressed = await compressImage(pendingPhotoData);
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 15000));
        photoUrl = await Promise.race([uploadPhoto(compressed, approvalId), timeout]);
      } catch(e) {
        console.warn('[Firebase] Storage 업로드 실패 — 압축 base64로 저장:', e.message);
        try { photoUrl = await compressImageSmall(pendingPhotoData); } catch(_) {}
      }
    }

    const approvalEntry = {
      id: approvalId,
      questId: activeQuestId,
      photo: photoUrl,
      date: today(),
      submittedAt: new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}),
    };
    STATE.pendingApprovals = STATE.pendingApprovals || [];
    const fid = await fbAddPendingApproval(approvalEntry);
    if (fid) approvalEntry.id = fid;
    STATE.pendingApprovals.push(approvalEntry);
    saveState();
  } catch(e) {
    console.error('[submitQuest] 오류:', e);
  } finally {
    closeQuestModal();
    showToast('[시스템] 과업 완수 보고서가 제출되었습니다. 상급자 검토를 대기하십시오.');
    renderHomeScreen();
  }
}

// ═══════════════════════════════════════
// APPROVAL
// ═══════════════════════════════════════
function showPhotoModal(approvalId) {
  const p = STATE.pendingApprovals.find(p => p.id === approvalId);
  if (!p) return;
  const q = QUEST_POOL.find(q => q.id === p.questId);
  const modal = document.getElementById('photoModal');
  document.getElementById('photoModalImg').src = p.photo || '';
  document.getElementById('photoModalImg').style.display = p.photo ? 'block' : 'none';
  document.getElementById('photoModalNoImg').style.display = p.photo ? 'none' : 'block';
  document.getElementById('photoModalTitle').textContent = q ? q.name : '';
  document.getElementById('photoModalApprove').onclick = () => { closePhotoModal(); approveQuest(approvalId); };
  document.getElementById('photoModalReject').onclick = () => { closePhotoModal(); rejectQuest(approvalId); };
  modal.classList.remove('hidden');
}
function closePhotoModal() {
  document.getElementById('photoModal').classList.add('hidden');
}

function approveQuest(approvalId) {
  const idx = STATE.pendingApprovals.findIndex(p=>p.id===approvalId);
  if (idx === -1) return;
  const approval = STATE.pendingApprovals[idx];
  const q = QUEST_POOL.find(q=>q.id===approval.questId);
  if (!q) return;

  const pts = randomPts(q);
  const logEntry = {date: approval.date, questId: approval.questId, pointsAwarded: pts, timestamp: Date.now()};
  STATE.questLog = STATE.questLog || [];
  STATE.questLog.push(logEntry);
  fbAddQuestLog(logEntry);
  const prevPts = STATE.profile.totalEarnedPoints || 0;
  STATE.profile.points = (STATE.profile.points||0) + pts;
  STATE.profile.totalEarnedPoints = (STATE.profile.totalEarnedPoints||0) + pts;
  STATE.profile.totalApproved = (STATE.profile.totalApproved||0) + 1;
  fbRemovePendingApproval(approval.id);
  STATE.pendingApprovals.splice(idx, 1);

  updateStreak();
  checkWeeklyCycle();

  // 오늘 모든 퀘스트 완료 시 가챠 1회 지급 (하루 1번만)
  const t = today();
  if (STATE.profile.gachaGivenDate !== t) {
    const {warmup, core, exercise, rare} = getDailyQuests();
    const todayQuests = [...warmup, ...core, ...exercise, ...rare];
    const allApproved = todayQuests.every(q => STATE.questLog.find(l => l.questId === q.id && l.date === t));
    if (allApproved) {
      STATE.gachaQueue = (STATE.gachaQueue||0) + 1;
      STATE.profile.gachaGivenDate = t;
    }
  }

  const lvEvent = getLevelUpEventType(prevPts, STATE.profile.totalEarnedPoints);
  if (lvEvent) {
    STATE.pendingEvents = STATE.pendingEvents || [];
    if (lvEvent.type === 'levelUp') {
      STATE.pendingEvents.push({ type: 'levelUp', vars: { nextLevelTitle: lvEvent.nextLevelTitle } });
    } else {
      STATE.pendingEvents.push({ type: 'subLevelUp', vars: { nextLv: lvEvent.nextLv } });
    }
  }
  if (q.cat === 'rare') {
    STATE.pendingEvents = STATE.pendingEvents || [];
    STATE.pendingEvents.push({ type: 'rareQuestClear', vars: { questName: q.name, points: pts, stars: q.stars } });
  }

  saveState();

  showToast(`[시스템] 과업 완수가 확인되었습니다. 기여도 +${pts}P가 반영됩니다.`);
  renderParentScreen();
  renderTopbar();
  renderGachaScreen();
}

function rejectQuest(approvalId) {
  const idx = STATE.pendingApprovals.findIndex(p=>p.id===approvalId);
  if (idx !== -1) {
    fbRemovePendingApproval(approvalId);
    STATE.pendingApprovals.splice(idx, 1);
    saveState();
    showToast('[시스템] 해당 과업 완수가 반려되었습니다. 재수행 후 재보고하십시오.');
    renderParentScreen();
  }
}

function approveRecord(approvalId) {
  const idx = STATE.pendingApprovals.findIndex(p=>p.id===approvalId);
  if (idx === -1) return;
  const approval = STATE.pendingApprovals[idx];
  const pts = approval.pts || 0;

  const recordEntry = {date: approval.date, questId:'__record__', pointsAwarded:pts, timestamp:Date.now()};
  STATE.questLog = STATE.questLog || [];
  STATE.questLog.push(recordEntry);
  fbAddQuestLog(recordEntry);

  STATE.profile.points = (STATE.profile.points||0) + pts;
  STATE.profile.totalEarnedPoints = (STATE.profile.totalEarnedPoints||0) + pts;
  fbRemovePendingApproval(approval.id);
  STATE.pendingApprovals.splice(idx, 1);

  saveState();
  pushEvent('reportSubmitted', { points: pts });
  showToast(`[시스템] 신체 기록 보상이 승인되었습니다. +${pts}P가 반영됩니다.`);
  renderParentScreen();
  renderTopbar();
}

function rejectRecord(approvalId) {
  const idx = STATE.pendingApprovals.findIndex(p=>p.id===approvalId);
  if (idx !== -1) {
    fbRemovePendingApproval(approvalId);
    STATE.pendingApprovals.splice(idx, 1);
    saveState();
    showToast('[시스템] 신체 기록 보상이 반려되었습니다.');
    renderParentScreen();
  }
}

function deleteQuestLog(timestamp) {
  if (!confirm('이 퀘스트 기록을 삭제하면 포인트가 차감됩니다. 삭제하시겠습니까?')) return;
  const ts = Number(timestamp);
  const idx = (STATE.questLog||[]).findIndex(l => l.timestamp === ts);
  if (idx === -1) return;
  const entry = STATE.questLog[idx];
  // 포인트 원복
  STATE.profile.points = Math.max(0, (STATE.profile.points||0) - (entry.pointsAwarded||0));
  STATE.profile.totalEarnedPoints = Math.max(0, (STATE.profile.totalEarnedPoints||0) - (entry.pointsAwarded||0));
  STATE.questLog.splice(idx, 1);
  if (entry._fid) fbRemoveQuestLog(entry._fid);
  else fbRemoveQuestLogByTimestamp(entry.timestamp);

  // 삭제된 퀘스트가 오늘 것이고, 올클리어 보상이 이미 지급됐으면 회수
  if (entry.date === today() && STATE.profile.gachaGivenDate === today()) {
    const {warmup, core, exercise, rare} = getDailyQuests();
    const todayQuests = [...warmup, ...core, ...exercise, ...rare];
    const stillAllClear = todayQuests.every(q => (STATE.questLog||[]).find(l => l.questId === q.id && l.date === today()));
    if (!stillAllClear) {
      STATE.gachaQueue = Math.max(0, (STATE.gachaQueue||0) - 1);
      STATE.profile.gachaGivenDate = '';
    }
  }

  saveState();
  renderParentScreen();
  renderTopbar();
  renderGachaScreen();
  showToast('[시스템] 기록이 삭제되고 포인트가 원복되었습니다.');
}

function deleteRewardLog(timestamp) {
  if (!confirm('이 보상 사용 기록을 삭제하면 포인트가 원복됩니다. 삭제하시겠습니까?')) return;
  const ts = Number(timestamp);
  const idx = (STATE.rewardHistory||[]).findIndex(r => r.timestamp === ts || (r.date+r.name) === timestamp);
  if (idx === -1) return;
  const entry = STATE.rewardHistory[idx];
  // 사용된 포인트 원복 (pts가 음수면 그만큼 복구)
  STATE.profile.points = (STATE.profile.points||0) - (entry.pts||0);
  STATE.rewardHistory.splice(idx, 1);
  if (entry._fid) fbRemoveReward(entry._fid);
  saveState();
  renderParentScreen();
  renderTopbar();
  showToast('[시스템] 보상 기록이 삭제되고 포인트가 원복되었습니다.');
}

// ═══════════════════════════════════════
// GACHA
// ═══════════════════════════════════════
function openGacha() {
  if ((STATE.gachaQueue||0) === 0) return;

  // 7일 풀클리어 당일 첫 번째 오픈 시 위클리 보너스 풀 사용
  const isWeeklyBonus = (STATE.weekCycle.completedDays || []).length === 7
    && !STATE.weekCycle.weeklyBonusUsed;
  const pool = isWeeklyBonus ? GACHA_POOL_WEEKLY : GACHA_POOL_DAILY;
  if (isWeeklyBonus) STATE.weekCycle.weeklyBonusUsed = true;

  const result = drawGacha(pool);
  const tier = result?.tier || 'miss';

  STATE.gachaQueue = Math.max(0, (STATE.gachaQueue||0) - 1);

  let pts = 0;
  let icon = '✨';
  let title = '';
  let msg = '';
  let physicalReward = null;

  if (tier === 'jackpot') {
    physicalReward = drawGachaReward();
    const m = rand(GACHA_MESSAGES.jackpot);
    icon = m.icon; title = m.title; msg = m.msg;
    pts = physicalReward.type === 'points' ? (physicalReward.amount || 0) : 0;
  } else if (tier === 'rare') {
    pts = pool.rare.points;
    const m = rand(GACHA_MESSAGES.rare);
    icon = m.icon; title = m.title; msg = m.msg;
  } else if (tier === 'common') {
    const [min, max] = pool.common.pointsRange;
    pts = Math.round(min + Math.random() * (max - min));
    const m = rand(GACHA_MESSAGES.common);
    icon = m.icon; title = m.title; msg = m.msg;
  } else {
    pts = pool.miss.points;
    const m = rand(GACHA_MESSAGES.miss);
    icon = m.icon; title = m.title; msg = m.msg;
  }

  STATE.profile.points = (STATE.profile.points||0) + pts;
  STATE.profile.totalEarnedPoints = (STATE.profile.totalEarnedPoints||0) + pts;
  STATE.rewardHistory = STATE.rewardHistory || [];
  const rewardName = physicalReward ? physicalReward.name : `가챠 보상 — ${title}`;
  const rewardIcon = physicalReward ? physicalReward.icon : icon;
  const gachaReward = {icon: rewardIcon, name: rewardName, pts, date: todayLabel(), timestamp: Date.now()};
  STATE.rewardHistory.push(gachaReward);
  fbAddReward(gachaReward);
  saveState();

  const box = document.getElementById('gachaBox');
  box.classList.add('spin');
  setTimeout(() => box.classList.remove('spin'), 600);

  document.getElementById('gachaRevealIcon').textContent = physicalReward ? physicalReward.icon : icon;
  document.getElementById('gachaRevealPts').textContent = pts > 0 ? `+${pts}P` : physicalReward?.name || '';
  document.getElementById('gachaRevealMsg').textContent = physicalReward ? (physicalReward.note || msg) : msg;
  document.getElementById('gachaRevealQuest').innerHTML = `총 포인트: ${COIN_SVG} ${(STATE.profile.points).toLocaleString()}P`;
  document.getElementById('gachaModal').classList.remove('hidden');

  renderGachaScreen();
  renderTopbar();
}
function closeGachaModal() {
  document.getElementById('gachaModal').classList.add('hidden');
}

function claimWeeklyReward() {
  const pts = 500;
  STATE.profile.points = (STATE.profile.points||0) + pts;
  STATE.profile.totalEarnedPoints = (STATE.profile.totalEarnedPoints||0) + pts;
  STATE.weekCycle.weeklyRewardClaimed = true;
  STATE.weekCycle.weeklyRewardPending = false;
  STATE.gachaQueue = (STATE.gachaQueue||0) + 3;
  STATE.rewardHistory = STATE.rewardHistory||[];
  const weekReward = {icon:'🏆', name:'주간 달성 보상', pts, date:todayLabel(), timestamp: Date.now()};
  STATE.rewardHistory.push(weekReward);
  fbAddReward(weekReward);
  saveState();
  showToast('[시스템] 주간 과업 완수 확인. 특별 보급품 3개 및 기여도 +500P가 지급되었습니다.');
  renderHomeScreen();
  renderTopbar();
}

function purchaseItem(itemId) {
  const item = [...SHOP_ITEMS.daily, ...SHOP_ITEMS.mid, ...SHOP_ITEMS.final].find(i=>i.id===itemId);
  if (!item) return;
  if ((STATE.profile.points||0) < item.cost) { showToast('[시스템] 기여도가 부족합니다.'); return; }
  if (!confirm(`"${item.name}"을(를) ${item.cost.toLocaleString()}P로 교환할까요?`)) return;
  STATE.profile.points -= item.cost;
  STATE.purchasedItems = STATE.purchasedItems||[];
  STATE.purchasedItems.push({itemId, date: today()});
  STATE.rewardHistory = STATE.rewardHistory||[];
  const purchaseReward = {icon:item.icon, name:item.name+' 교환', pts: -item.cost, date:todayLabel(), timestamp: Date.now()};
  STATE.rewardHistory.push(purchaseReward);
  fbAddReward(purchaseReward);
  saveState();
  showToast(`[시스템] "${item.name}" 보급 신청이 완료되었습니다.`);
  renderGachaScreen();
  renderTopbar();
}

// ═══════════════════════════════════════
// RECORD SAVE
// ═══════════════════════════════════════
async function saveRecord() {
  const date = document.getElementById('inDate').value;
  const h = parseFloat(document.getElementById('inHeight').value);
  const w = parseFloat(document.getElementById('inWeight').value);
  const toast = document.getElementById('toast');

  if (!date) { toast.style.color='var(--red)'; toast.textContent='날짜를 입력해주세요'; return; }
  if (isNaN(h) && isNaN(w)) { toast.style.color='var(--red)'; toast.textContent='키 또는 몸무게를 입력해주세요'; return; }
  if (!isNaN(h) && (h <= 0 || h >= 200)) { toast.style.color='var(--red)'; toast.textContent='키는 200cm 미만으로 입력해주세요'; return; }
  if (!isNaN(w) && (w <= 0 || w >= 100)) { toast.style.color='var(--red)'; toast.textContent='몸무게는 100kg 미만으로 입력해주세요'; return; }

  if (!isNaN(h) && h > 0) {
    STATE.heightHistory = STATE.heightHistory||[];
    STATE.heightHistory = STATE.heightHistory.filter(e=>e.date!==date);
    STATE.heightHistory.push({date, value:h});
    STATE.heightHistory.sort((a,b)=>a.date.localeCompare(b.date));
    fbSetHeight(date, h);
  }
  if (!isNaN(w) && w > 0) {
    STATE.weightHistory = STATE.weightHistory||[];
    STATE.weightHistory = STATE.weightHistory.filter(e=>e.date!==date);
    STATE.weightHistory.push({date, value:w});
    STATE.weightHistory.sort((a,b)=>a.date.localeCompare(b.date));
    fbSetWeight(date, w);
  }

  const weekKey = getWeekKey(date);
  const hasApprovedThisWeek = (STATE.questLog||[]).some(l=>getWeekKey(l.date)===weekKey && l.questId==='__record__');
  const hasPendingThisWeek = (STATE.pendingApprovals||[]).some(p=>p.type==='record' && getWeekKey(p.date)===weekKey);

  if (hasApprovedThisWeek) {
    toast.style.color = 'var(--text2)';
    toast.textContent = '저장 완료! (이번 주 기록 보상은 이미 받았어요)';
  } else if (hasPendingThisWeek) {
    toast.style.color = 'var(--text2)';
    toast.textContent = '저장 완료! (이번 주 기록 보상은 승인 대기 중이에요)';
  } else {
    const bonus = 300;
    const approvalEntry = {
      id: Date.now().toString(),
      type: 'record',
      date,
      height: !isNaN(h) ? h : null,
      weight: !isNaN(w) ? w : null,
      pts: bonus,
      submittedAt: new Date().toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}),
    };
    const fid = await fbAddPendingApproval(approvalEntry);
    if (fid) approvalEntry.id = fid;
    STATE.pendingApprovals = STATE.pendingApprovals || [];
    STATE.pendingApprovals.push(approvalEntry);
    toast.style.color = 'var(--green)';
    toast.textContent = `저장 완료! 이번 주 기록 보상(+${bonus}P)이 승인 대기 중이에요 📋`;
  }

  saveState();
  document.getElementById('inHeight').value = '';
  document.getElementById('inWeight').value = '';
  renderReportScreen();
  setTimeout(drawCharts, 50);
  renderTopbar();
}

function getWeekKey(dateStr) {
  const d = new Date(dateStr);
  const jan1 = new Date(d.getFullYear(),0,1);
  const week = Math.ceil(((d-jan1)/86400000 + jan1.getDay()+1)/7);
  return `${d.getFullYear()}-W${week}`;
}

// ═══════════════════════════════════════
// AVATAR
// ═══════════════════════════════════════
function changeAvatar(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    STATE.profile.avatar = e.target.result;
    saveState();
    const el = document.getElementById('avatarEl');
    if (el) el.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

// ═══════════════════════════════════════
// EVENT POPUP QUEUE
// ═══════════════════════════════════════
function fillEventVars(template, vars) {
  return template.replace(/\{(\w+)\}/g, (_, k) => vars[k] !== undefined ? vars[k] : `{${k}}`);
}

function pushEvent(type, vars = {}) {
  const def = EVENT_MESSAGES[type];
  if (!def) return;
  if (type === 'subLevelUp') {
    showToast(`⬆️ Lv.${vars.nextLv} 달성! 계속 정진하십시오.`);
    return;
  }
  const title = fillEventVars(def.title, vars);
  const msg   = fillEventVars(def.msg, vars);
  eventQueue.push({ title, msg });
  if (!eventShowing) showNextEvent();

  // 편지함 저장 (subLevelUp 제외, 7일 초과 항목 자동 정리, 당일 동일 제목 중복 방지)
  if (!STATE.mailbox) STATE.mailbox = [];
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
  STATE.mailbox = STATE.mailbox.filter(m => new Date(m.date) >= cutoff);
  const alreadyExists = STATE.mailbox.some(m => m.title === title && m.date === today());
  if (alreadyExists) return;
  STATE.mailbox.unshift({
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    title, msg,
    date: today(),
    timestamp: Date.now(),
    read: false,
  });
  saveState();
  renderMailboxBadge();
}

function showNextEvent() {
  if (eventQueue.length === 0) { eventShowing = false; return; }
  eventShowing = true;
  const ev = eventQueue.shift();
  const iconMatch = ev.title.match(/^(\p{Emoji}[️]?)\s*/u);
  document.getElementById('eventModalIcon').textContent = iconMatch ? iconMatch[1] : '🎯';
  document.getElementById('eventModalTitle').textContent = ev.title.replace(/^(\p{Emoji}[️]?)\s*/u, '');
  document.getElementById('eventModalMsg').textContent = ev.msg;
  document.getElementById('eventModal').classList.remove('hidden');
}

function closeEventModal() {
  document.getElementById('eventModal').classList.add('hidden');
  showNextEvent();
}

// ═══════════════════════════════════════
// MAILBOX
// ═══════════════════════════════════════
function renderMailboxBadge() {
  const unread = (STATE.mailbox || []).filter(m => !m.read).length;
  let badge = document.getElementById('mailboxBadge');
  if (!badge) {
    const wrap = document.getElementById('mailboxWrap');
    if (!wrap) return;
    badge = document.createElement('span');
    badge.id = 'mailboxBadge';
    badge.className = 'mailbox-badge';
    wrap.appendChild(badge);
  }
  badge.classList.toggle('hidden', unread === 0);
}

function openMailbox() {
  document.getElementById('mailboxModal').classList.remove('hidden');
  showMailboxList();
}

function closeMailboxModal() {
  document.getElementById('mailboxModal').classList.add('hidden');
}

function showMailboxList() {
  document.getElementById('mailboxListView').classList.remove('hidden');
  document.getElementById('mailboxDetailView').classList.add('hidden');

  const list = document.getElementById('mailboxList');
  const items = STATE.mailbox || [];

  if (items.length === 0) {
    list.innerHTML = '<div class="mailbox-empty">수신된 메시지가 없습니다</div>';
    return;
  }

  list.innerHTML = items.map(m => {
    const iconMatch = m.title.match(/^(\p{Emoji}[️]?)\s*/u);
    const icon  = iconMatch ? iconMatch[1] : '📋';
    const label = m.title.replace(/^(\p{Emoji}[️]?)\s*/u, '');
    return `
      <div class="mailbox-item" onclick="openMailboxItem('${m.id}')">
        <div class="mailbox-item-icon">${icon}</div>
        <div class="mailbox-item-body">
          <div class="mailbox-item-title" style="color:${m.read ? 'var(--text3)' : 'var(--text1)'}">${label}</div>
          <div class="mailbox-item-date">${m.date}</div>
        </div>
        <span class="mailbox-item-status ${m.read ? 'read' : 'unread'}">${m.read ? '읽음' : '안읽음'}</span>
      </div>`;
  }).join('');
}

function openMailboxItem(id) {
  const item = (STATE.mailbox || []).find(m => m.id === id);
  if (!item) return;

  // 읽음 처리
  if (!item.read) {
    item.read = true;
    saveState();
    renderMailboxBadge();
  }

  const iconMatch = item.title.match(/^(\p{Emoji}[️]?)\s*/u);
  const icon  = iconMatch ? iconMatch[1] : '📋';
  const label = item.title.replace(/^(\p{Emoji}[️]?)\s*/u, '');

  document.getElementById('mailboxDetailTitle').textContent = icon + ' ' + label;
  document.getElementById('mailboxDetailMsg').textContent   = item.msg;
  document.getElementById('mailboxDetailDate').textContent  = item.date + ' 수신';

  document.getElementById('mailboxListView').classList.add('hidden');
  document.getElementById('mailboxDetailView').classList.remove('hidden');
}

// ═══════════════════════════════════════
// TOAST
// ═══════════════════════════════════════
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById('toastPopup');
  t.textContent = msg;
  t.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2500);
}

function showCoinInfo() {
  const earned = (STATE.profile.totalEarnedPoints||0).toLocaleString();
  const remain = (STATE.profile.points||0).toLocaleString();
  showToast(`누적 ${earned}P · 잔여 ${remain}P`);
}

// 다른 화면으로 이동 시 부모 잠금
document.querySelectorAll('.nav-item').forEach(n => {
  n.addEventListener('click', () => {
    if (n.dataset.screen !== 'parent') STATE.parentUnlocked = false;
  });
});

// 모바일 :active 대체 — iOS Safari는 touchstart 없이 :active 미작동
document.addEventListener('touchstart', function(e) {
  const btn = e.target.closest('.pin-key, .quest-card');
  if (!btn) return;
  btn.classList.add('pressed');
  const end = () => { btn.classList.remove('pressed'); btn.removeEventListener('touchend', end); btn.removeEventListener('touchcancel', end); };
  btn.addEventListener('touchend', end);
  btn.addEventListener('touchcancel', end);
}, { passive: true });

// ── START ──
init();
