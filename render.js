// ==========================================
// render.js — APP_DATA를 읽어 DOM에 주입
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  const d = APP_DATA;

  // ── 공통: 코인 배지 ──────────────────────
  const coinStr = '🪙 ' + d.character.coins.toLocaleString();
  document.querySelectorAll('.coin-display').forEach(el => { el.textContent = coinStr; });

  // ── HOME 화면 ────────────────────────────
  document.querySelector('#home .title').textContent = d.character.worldTitle;

  const avatarImg = document.getElementById('avatarImg');
  if (avatarImg) avatarImg.src = d.images.avatar;

  document.querySelector('.char-title').textContent = 'LV.' + d.character.level;
  document.querySelector('.char-nick').textContent = d.character.nickname;

  const { streak, weeklyProgress: wp } = d.character;
  document.querySelector('.day-row .streak').textContent = 'DAY ' + streak + ' 연속 접속';
  document.querySelector('.day-row .today-label').textContent = '오늘 진행률';
  document.querySelector('.progress-fill').style.width = wp.percent + '%';
  document.querySelector('.progress-label').textContent = wp.completed + ' / ' + wp.total + ' 완료';

  // 퀘스트 목록
  const questContainer = document.getElementById('quest-list');
  questContainer.innerHTML = d.quests.map(q => `
    <div class="quest-card${q.rare ? ' rare' : ''}">
      <div class="q-icon">${q.icon}</div>
      <div class="q-body"><div class="q-name">${q.name}</div></div>
      <div class="q-stars">+${q.points}P</div>
    </div>`).join('');

  // ── GACHA 화면 ───────────────────────────
  document.querySelector('#gacha .title').textContent = '🎁 보상함';

  const rewardList = document.getElementById('reward-list');
  rewardList.innerHTML = d.rewards.map(r => `
    <div class="reward-row">${r.label} <span class="pt">${r.points.toLocaleString()}P</span></div>`
  ).join('');

  // ── REPORT 화면 ──────────────────────────
  document.querySelector('.gb').textContent = d.report.hero.headline;
  document.querySelector('.gs').textContent = d.report.hero.subtext;

  const statContainer = document.getElementById('stat-cards');
  statContainer.innerHTML = d.report.stats.map(s => `
    <div class="gr-mini">
      <div class="ge">${s.icon}</div>
      <div class="gv">${s.value}</div>
      <div class="gl">${s.label}</div>
      <div class="gu">${s.delta}</div>
    </div>`).join('');

  const insightContainer = document.getElementById('insight-list');
  insightContainer.innerHTML = d.report.insights.map(ins => `
    <div class="quest-card${ins.rare ? ' rare' : ''}" style="margin-bottom:10px;">
      <div class="q-icon">${ins.icon}</div>
      <div class="q-body"><div class="q-name">${ins.text}</div></div>
    </div>`).join('');

  // ── PARENT 화면 ──────────────────────────
  const { pendingApprovals, childSummary } = d.parentView;

  document.querySelector('#parent .coin').textContent = '승인 대기 ' + pendingApprovals.length + '건';

  const approvalContainer = document.getElementById('approval-list');
  approvalContainer.innerHTML = pendingApprovals.map(a => `
    <div class="approve-row">
      <div class="thumb">📷</div>
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:700;">${a.title}</div>
        <div style="font-size:10px;color:#9694b8;">${a.submittedAt}</div>
      </div>
      <button class="approve-btn">승인</button>
    </div>`).join('');

  const parentCard = document.getElementById('parent-char-card');
  parentCard.innerHTML = `
    <div class="char-title">LV.${childSummary.level}</div>
    <div class="char-nick">${childSummary.nickname}</div>
    <div class="day-row"><span>이번주 이행률</span><span>${childSummary.weeklyCompliancePercent}%</span></div>
    <div class="progress-track">
      <div class="progress-fill" style="width:${childSummary.weeklyCompliancePercent}%"></div>
    </div>`;
});
