// ==========================================
// data.js — 키성장 퀘스트 앱 콘텐츠 데이터
// ==========================================

const APP_DATA = {

  // ---------- 이미지 경로 ----------
  images: {
    avatar: "images/avatar.jpg",   // 아이 프로필 사진 (base64 또는 파일 경로로 교체 가능)
    generatedCharacter: "images/character.png",  // AI 생성 캐릭터 이미지
  },

  // ---------- 캐릭터 / 홈 화면 ----------
  character: {
    worldTitle: "⛅ 그린포레스트",
    level: 3,
    nickname: "아연을 무섭게 먹어대는 우리민준",
    coins: 1240,
    streak: 18,           // DAY 연속 접속
    weeklyProgress: {
      completed: 2,
      total: 3,
      percent: 67,
    },
  },

  // ---------- 오늘의 퀘스트 ----------
  quests: [
    {
      icon: "🥛",
      name: "우유 한 컵 마시기",
      points: 30,
      rare: false,
    },
    {
      icon: "🧀",
      name: "치즈 한 조각 도전",
      points: 50,
      rare: false,
    },
    {
      icon: "🌟",
      name: "전설급 퀘스트: 수영장 외출",
      points: 800,
      rare: true,
    },
  ],

  // ---------- 가챠 보상 목록 ----------
  rewards: [
    { label: "🍜 라면 한 그릇",     points: 300 },
    { label: "🎮 게임 2시간",        points: 500 },
    { label: "📺 TV 2시간",          points: 400 },
    { label: "💳 현질 5,000원권",    points: 1200 },
    { label: "💳 현질 30,000원권",   points: 3000 },
    { label: "🐹 햄스터 (최종)",     points: 15000 },
  ],

  // ---------- 성장 리포트 ----------
  report: {
    hero: {
      headline: "+1.1cm 쑥쑥!",
      subtext: "한 달 전보다 키가 자랐어요",
    },
    stats: [
      { icon: "📏", value: "138.2cm", label: "지금 키",      delta: "▲ +1.1cm" },
      { icon: "⚖️", value: "33.6kg",  label: "지금 몸무게", delta: "▲ +0.5kg" },
    ],
    insights: [
      { icon: "🔍", text: "아연 챌린지를 열심히 한 주에 키가 가장 많이 자랐어요!", rare: true },
      { icon: "🎯", text: "새 퀘스트 등장: 아연 마스터 챌린지",                  rare: false },
    ],
  },

  // ---------- 차트 데이터 ----------
  chartData: {
    height: [
      { label: "3월", value: 137.1, activity: 60 },
      { label: "4월", value: 137.4, activity: 68 },
      { label: "5월", value: 137.7, activity: 72 },
      { label: "6월", value: 138.2, activity: 88 },
    ],
    weight: [
      { label: "3월", value: 32.6, activity: 60 },
      { label: "4월", value: 32.9, activity: 68 },
      { label: "5월", value: 33.2, activity: 72 },
      { label: "6월", value: 33.6, activity: 88 },
    ],
  },

  // ---------- 부모뷰 ----------
  parentView: {
    pendingApprovals: [
      { title: "치즈 한 조각 도전",   submittedAt: "오늘 18:42 제출" },
      { title: "배드민턴 엄마 이기기", submittedAt: "오늘 19:10 제출" },
    ],
    childSummary: {
      level: 3,
      nickname: "아연을 무섭게 먹어대는 우리민준",
      weeklyCompliancePercent: 71,
    },
  },

};
