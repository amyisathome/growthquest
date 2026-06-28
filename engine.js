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

  const rarePool = QUEST_POOL.filter(q => q.cat === 'rare');
  const showRare = Math.random() < rareChance;
  const rareQuest = showRare ? [rarePool[dow % rarePool.length]] : [];

  const exPool = QUEST_POOL.filter(q => q.cat === 'exercise');
  const exerciseQuest = isWeekend() ? [exPool[dow % exPool.length]] : [];

  const specialSlots = rareQuest.length + exerciseQuest.length;
  const remaining = 3 - specialSlots;

  const warmup = [QUEST_POOL.find(q => q.id === 'w2')];

  const coreSlots = Math.max(0, remaining - 1);
  const corePool = [
    QUEST_POOL.find(q => q.id === 'c1'),
    ...[QUEST_POOL.filter(q => q.cat === 'core' && q.id !== 'c1')[dow % 6]].filter(Boolean),
  ];
  const core = corePool.slice(0, coreSlots);

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
    const newNick = getWeeklyNickname(catCount);
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
  renderGachaScreen();
  renderReportScreen();
}

function renderTopbar() {
  const coinEl = document.getElementById('coinDisplay');
  if (coinEl) coinEl.textContent = (STATE.profile.totalEarnedPoints || 0).toLocaleString();
  const titleEl = document.getElementById('topbarTitle');
  if (titleEl) {
    const name = STATE.profile.name;
    titleEl.textContent = "Jake's Grand Journey";
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

function renderHomeScreen() {
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
  document.getElementById('gachaCount').textContent = count;
  document.getElementById('gachaBtn').disabled = count === 0;
  document.getElementById('gachaSection').style.display = count > 0 ? '' : 'none';

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
  const heightPoints = STATE.heightHistory.slice(-6);
  const weightPoints = STATE.weightHistory.slice(-6);

  const actByMonth = {};
  (STATE.questLog||[]).forEach(l => {
    const mon = l.date.slice(0,7);
    actByMonth[mon] = (actByMonth[mon]||0) + (l.pointsAwarded||0);
  });

  function buildData(histArr) {
    return histArr.map(h => {
      const mon = h.date.slice(0,7);
      const label = `${parseInt(h.date.slice(5,7))}월`;
      const act = Math.min(100, Math.round((actByMonth[mon]||0) / 10));
      return [label, h.value, act];
    });
  }

  const hData = buildData(heightPoints);
  const wData = buildData(weightPoints);

  if (hData.length >= 1) drawLineChart('heightChart', hData, '#ffd76a', true);
  if (wData.length >= 1) drawLineChart('weightChart', wData, '#ff9d8a', false);
}

function drawLineChart(svgId, data, color, showActivity) {
  const svg = document.getElementById(svgId);
  if (!svg) return;
  const W = svg.getBoundingClientRect().width || svg.clientWidth || 300, H = 200;
  const padL=36, padR=10, padT=14, padB=20;
  const innerW = W-padL-padR, innerH = H-padT-padB;
  const n = data.length;
  if (n === 0) return;

  const xs = n === 1 ? [padL + innerW/2] : data.map((_,i) => padL + innerW*i/(n-1));
  const vals = data.map(d=>d[1]);
  const vMin = Math.min(...vals), vMax = Math.max(...vals);
  const vRange = vMax-vMin || 1;
  const ys = vals.map(v => padT + innerH*(1-(v-vMin+vRange*.2)/(vRange*1.4)));

  let s = `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H-padB}" stroke="rgba(255,255,255,.12)" stroke-width="1"/>
<line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" stroke="rgba(255,255,255,.12)" stroke-width="1"/>`;

  if (showActivity && data[0][2] !== undefined) {
    const pts2 = data.map(d=>d[2]);
    const maxP = Math.max(...pts2, 1);
    const ysP = pts2.map(p => padT + innerH*(1-p/maxP));
    s += `<polyline points="${xs.map((x,i)=>`${x},${ysP[i]}`).join(' ')}" fill="none" stroke="#5ad1ff" stroke-width="1.5" stroke-dasharray="4 3" opacity=".8"/>`;
    xs.forEach((x,i) => { s += `<circle cx="${x}" cy="${ysP[i]}" r="2" fill="#5ad1ff"/>`; });
  }

  if (n > 1) {
    s += `<polyline points="${xs.map((x,i)=>`${x},${ys[i]}`).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  xs.forEach((x,i) => {
    const r = i===n-1?4:3;
    s += `<circle cx="${x}" cy="${ys[i]}" r="${r}" fill="${color}"/>`;
    s += `<text x="${x}" y="${H-6}" font-size="8" fill="#9694b8" text-anchor="middle">${data[i][0]}</text>`;
  });
  const last = data[n-1];
  s += `<text x="${xs[n-1]+4}" y="${ys[n-1]-7}" font-size="9" font-weight="700" fill="${color}" text-anchor="start">${last[1]}</text>`;

  const yLabel1 = (vMin + vRange*.2).toFixed(n>1?1:0);
  const yLabel2 = (vMax + vRange*.2*.2).toFixed(n>1?1:0);
  s += `<text x="${padL-4}" y="${H-padB}" font-size="8" fill="#9694b8" text-anchor="end">${yLabel1}</text>`;
  s += `<text x="${padL-4}" y="${padT+4}" font-size="8" fill="#9694b8" text-anchor="end">${yLabel2}</text>`;

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

  html += `<div class="section-label" style="margin-top:12px;">✅ 승인 대기 (${pending.length}건)</div>`;
  if (pending.length === 0) {
    html += `<div style="text-align:center;color:var(--text4);font-size:16px;padding:16px;">승인 대기 중인 퀘스트가 없어요 🎉</div>`;
  } else {
    pending.forEach(p => {
      const q = QUEST_POOL.find(q=>q.id===p.questId);
      if (!q) return;
      html += `
        <div class="approve-row">
          <div class="thumb">${p.photo ? `<img src="${p.photo}">` : q.icon}</div>
          <div style="flex:1;">
            <div style="font-size:16px;font-weight:700;">${q.name}</div>
            <div style="font-size:14px;color:var(--text3);">${p.date} ${p.submittedAt}</div>
          </div>
          <button class="reject-btn" onclick="rejectQuest('${p.id}')">✕</button>
          <button class="approve-btn" onclick="approveQuest('${p.id}')">승인 ✓</button>
        </div>
      `;
    });
  }

  html += `
    <div class="char-card" style="margin-top:18px;">
      <div class="char-title">${lvInfo.emoji} ${lvInfo.title}</div>
      <div class="char-nick">${getDynamicNick()}</div>
      <div class="day-row"><span>이번주 이행일</span><span>${STATE.weekCycle.completedDays.length}일 / 7일</span></div>
      <div class="progress-track"><div class="progress-fill" style="width:${weekPct}%"></div></div>
      <div class="progress-label">${weekPct}% — 5일 이상이면 주간 보상!</div>
    </div>
  `;

  const recentLog = [...(STATE.questLog||[])].reverse().slice(0,5);
  if (recentLog.length > 0) {
    html += `<div class="section-label">📋 최근 승인 기록</div>`;
    recentLog.forEach(l => {
      const q = QUEST_POOL.find(q=>q.id===l.questId);
      if (!q) return;
      html += `<div class="reward-row"><span style="font-size:22px;">${q.icon}</span><span style="flex:1;">${q.name}</span><span style="font-size:14px;color:var(--text3);">${l.date}</span><span class="pt">+${l.pointsAwarded}P</span></div>`;
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
  if (name === 'gacha') renderGachaScreen();
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
        // 8초 타임아웃 — Storage hang 방지
        const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 8000));
        photoUrl = await Promise.race([uploadPhoto(pendingPhotoData, approvalId), timeout]);
      } catch(e) {
        console.error('[Firebase] 사진 업로드 실패:', e);
        photoUrl = null; // base64는 Firestore 1MB 한도 초과 → null
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

  saveState();

  const lvEvent = getLevelUpEventType(prevPts, STATE.profile.totalEarnedPoints);
  if (lvEvent) {
    if (lvEvent.type === 'levelUp') pushEvent('levelUp', { nextLevelTitle: lvEvent.nextLevelTitle });
    else pushEvent('subLevelUp', { nextLv: lvEvent.nextLv });
  }
  if (q.cat === 'rare') pushEvent('rareQuestClear', { questName: q.name, points: pts, stars: q.stars });

  showToast(`[시스템] 과업 완수가 확인되었습니다. 기여도 +${pts}P가 반영됩니다.`);
  renderParentScreen();
  renderTopbar();
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
  const gachaReward = {icon: rewardIcon, name: rewardName, pts, date: todayLabel()};
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
  const weekReward = {icon:'🏆', name:'주간 달성 보상', pts, date:todayLabel()};
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
  const purchaseReward = {icon:item.icon, name:item.name+' 교환', pts: -item.cost, date:todayLabel()};
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
function saveRecord() {
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
  const hasThisWeek = (STATE.questLog||[]).some(l=>getWeekKey(l.date)===weekKey && l.questId==='__record__');
  if (!hasThisWeek) {
    const bonus = 300;
    STATE.profile.points = (STATE.profile.points||0) + bonus;
    STATE.profile.totalEarnedPoints = (STATE.profile.totalEarnedPoints||0) + bonus;
    STATE.questLog = STATE.questLog||[];
    STATE.questLog.push({date, questId:'__record__', pointsAwarded:bonus, timestamp:Date.now()});
    toast.style.color = 'var(--green)';
    toast.textContent = `저장 완료! 이번 주 첫 기록 +${bonus}P 🎉`;
    pushEvent('reportSubmitted', { points: bonus });
  } else {
    toast.style.color = 'var(--text2)';
    toast.textContent = '저장 완료! (이번 주 기록 보상은 이미 받았어요)';
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
  eventQueue.push({
    title: fillEventVars(def.title, vars),
    msg: fillEventVars(def.msg, vars),
  });
  if (!eventShowing) showNextEvent();
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

// ── START ──
init();
