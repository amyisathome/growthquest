// ==========================================
// data.js — 키성장 퀘스트 앱 콘텐츠 데이터
// ==========================================

// ---------- 이미지 경로 ----------
const IMAGES = {
  avatar: 'images/avatar.png',
};

const QUEST_POOL = [
  // warmup
  {id:'w1',cat:'warmup',name:'취침 9시간 이상 확보',icon:'🌙',stars:1,desc:'작전명: 야간 호르몬 자동 분비 시스템 가동\n\n수면 중 성장호르몬이 최대치로 방출됩니다. 지정 시간 내 취침 완료 후 9시간 이상의 수면을 확보하십시오.',pts:100},
  {id:'w2',cat:'warmup',name:'성장호르몬 주사 맞기',icon:'✨',stars:1,desc:'작전명: 호르몬 강제 주입 및 세포 활성화\n\n신체 기능의 임계치를 개방하는 특수 약품 투여 과정입니다. 고통을 인내하고 정량의 호르몬을 완벽히 투여하십시오.',pts:100},
  {id:'w3', cat:'warmup', name:'소고기 육포 먹기', icon:'🍖', stars:1, desc:'작전명: 고농축 전투 식량 즉시 보급\n\n간편하게 섭취 가능한 고농축 단백질 전투식량입니다. 별도의 조리 없이 즉시 보급하여 신속히 섭취하십시오.', pts:100},
  {id:'w4', cat:'warmup', name:'스트레칭 10분', icon:'🤸', stars:1,
   desc:'작전명: 관절 가동범위 사전 개방 및 성장판 예열\n\n경직된 신체는 성장 신호를 제대로 받아들이지 못합니다. 전신 관절과 척추 라인을 10분간 충분히 풀어 성장판이 자극에 반응할 준비 상태를 만드십시오.',
   pts:100},
  // core nutrition
  {id:'c1',cat:'core',name:'우유 한 잔 마시기',icon:'🥛',stars:2,desc:'작전명: 골격 요새화를 위한 칼슘 보급품 전량 섭취\n\n골밀도를 극한으로 끌어올려 신장 성장의 기반을 다지는 필수 과정입니다. 잔류량을 남기지 말고 보급된 유제품을 신속히 소화하십시오.',pts:200},
  {id:'c2',cat:'core',name:'계란노른자 먹기',icon:'🍳',stars:2,desc:'작전명: 아연 핵 투입을 통한 세포 분열 강제 가속\n\n황금빛 핵에 농축된 아연 성분이 체내 세포 분열 속도를 대폭 끌어올립니다. 완전 섭취를 명합니다.',pts:200},
  {id:'c3',cat:'core',name:'치즈 한 조각 섭취',icon:'🧀',stars:2,desc:'작전명: 아연 농축 전투식량 보급 및 흡수\n\n소량이나 고농도 아연 및 단백질이 함유된 전투식량입니다. 잔류량 없이 완전 소화하십시오.',pts:200},
  {id:'c4',cat:'core',name:'두부 섭취',icon:'🫘',stars:2,desc:'작전명: 식물성 단백질 보급을 통한 근골격 동시 강화\n\n근육 조직과 골격 계통을 동시에 강화하는 필수 보급품입니다. 지시된 분량을 완전히 소화하십시오.',pts:200},
  {id:'c5',cat:'core',name:'소고기 섭취',icon:'🥩',stars:3,desc:'작전명: 철·아연 복합 성분 집중 투입\n\n신장 성장에 직결되는 핵심 원소가 집약된 최상급 보급품입니다. 완전 섭취 후 체내 흡수 과정이 정상 진행되도록 하십시오.',pts:280},
  {id:'c6',cat:'core',name:'견과류 한 줌 섭취',icon:'🥜',stars:2,desc:'작전명: 뇌 기능 및 신장 성장 동시 지원 보급\n\n뇌와 골격 계통을 동시에 지원하는 복합 영양소가 함유되어 있습니다. 경량이나 효과를 경시하지 마십시오.',pts:200},
  {id:'c7',cat:'core',name:'콩나물국 섭취',icon:'🥣',stars:2,desc:'작전명: 장내 환경 정비 및 영양 흡수 기반 구축\n\n신장 성장은 장내 환경 정비 없이 불가합니다. 보급된 식이섬유 보급품을 잔량 없이 소화하십시오.',pts:200},
  {id:'c8', cat:'core', name:'멸치 섭취', icon:'🐟', stars:2,
   desc:'작전명: 골격 장갑판 강화용 칼슘 결정체 투하\n\n뼈를 갑옷처럼 단단하게 만드는 최고 농축 칼슘 보급품입니다. 작고 가볍지만 그 위력은 결코 작지 않으니, 잔량 없이 섭취 완료하십시오.',
   pts:200},
  {id:'c9', cat:'core', name:'김치 한 접시', icon:'🥬', stars:2,
   desc:'작전명: 골 정비 비타민K 발효탄 보급\n\n발효 과정에서 응축된 비타민K가 골격 회복과 정비를 지원합니다. 매콤한 자극은 임무의 일부이니 한 접시를 완수하십시오.',
   pts:200},
  {id:'c10', cat:'core', name:'나물 한 접시', icon:'🥗', stars:2,
   desc:'작전명: 다종 미네랄 채굴 보급\n\n한 가지가 아닌 여러 미네랄이 동시에 채굴된 복합 보급품입니다. 종류는 매일 달라질 수 있으나 임무의 본질은 동일합니다 — 완전 섭취.',
   pts:200},
  // exercise (weekend)
  {id:'e1',cat:'exercise',name:'수영 30분',icon:'🏊',stars:3,desc:'작전명: 수중 침투 및 전신 근지력 한계 돌파\n\n심폐 기능과 전신 근육을 한계까지 가동하는 고강도 수중 작전입니다. 낙오 및 타협은 용납되지 않으니 30분간의 수중 훈련을 완벽히 완수하십시오.',pts:300,weekend:true},
  {id:'e2',cat:'exercise',name:'산책 또는 달리기',icon:'🏃',stars:2,desc:'작전명: 하중 부하를 통한 골격 강화 및 성장판 자극\n\n골격에 지속적 부하를 가해야 신장이 증가합니다. 지정 구간을 낙오 없이 완주하십시오.',pts:250,weekend:true},
  {id:'e3',cat:'exercise',name:'배드민턴 — 어머니 격파',icon:'🏸',stars:4,desc:'작전명: 가문 내 서열 증명 — 어머니와의 전면전\n\n전방에 최종 보스급 개체가 식별되었습니다. 라켓을 쥐고 전력으로 맞서 가문의 서열을 증명하십시오. 낙오는 서열 하락을 의미합니다.',pts:400,weekend:true},
  {id:'e4', cat:'exercise', name:'줄넘기 100회', icon:'🪢', stars:3,
   desc:'작전명: 반복 충격을 통한 성장판 직격 자극\n\n점프 후 착지하는 순간의 충격이 성장판에 직접 신호를 보냅니다. 100회 반복, 중도 포기는 곧 신호 단절을 의미합니다.',
   pts:280, weekend:true},
  {id:'e5', cat:'exercise', name:'오전 공원 산책', icon:'🌳', stars:2,
   desc:'작전명: 야외 정찰 및 일광 비타민D 합성 작전\n\n실내에서는 합성되지 않는 비타민D는 오전 햇볕 아래서만 생성됩니다. 공원으로 정찰을 나가 일광에 노출되는 시간을 확보하십시오.',
   pts:250, weekend:true},
  // rare
  {id:'r1',cat:'rare',name:'도서관 — 독서 10분',icon:'📖',stars:5,desc:'작전명: 지식 요새 10분 주둔 및 뇌 기능 강제 확장\n\n최상위 등급의 희귀 임무가 발령되었습니다. 지식의 요새에 10분 주둔하여 뇌 기능 확장 작전을 완수하십시오.',pts:700},
  {id:'r2',cat:'rare',name:'수영장 원정',icon:'🌊',stars:4,desc:'작전명: 성장의 바다 원정 및 전신 기능 극한 가동\n\n원거리 작전 명령이 하달되었습니다. 성장의 바다로 출정하여 전신 기능을 극한으로 가동하십시오.',pts:600},
  {id:'r3',cat:'rare',name:'아이스스케이팅 원정',icon:'⛸️',stars:5,desc:'작전명: 빙판 위 균형 감각 훈련 및 전신 협응 능력 극한 개방\n\n최고 난이도 임무가 발령되었습니다. 빙판 위에서 전신 협응 능력을 극한까지 끌어올리십시오. 완수자에게만 최상급 보상이 수여됩니다.',pts:700},
];

// ==========================================
// 격려형 메시지 (배경 텍스트, 비강제 노출)
// streak(연속일) 구간에 따라 다른 풀에서 선택
// ==========================================

// 구간 A. 도입기 (streak 0~2일)
const STORY_POOL_INTRO = [
  {icon:'📋', title:'오늘의 작전 브리핑', tone:'정보형',
   msg:'금일 성장 과업이 정상 하달되었습니다.\n각 과업을 순서대로 완수하십시오.\n미완수 항목은 신체 기여도에 반영되지 않습니다.\n낙오 없이 전 과업을 완수하길 바랍니다.'},
  {icon:'🆕', title:'신병 훈련 개시', tone:'동기부여형',
   msg:'신병 한 명이 막 입대했습니다.\n첫 작전은 누구에게나 어색하고 낯섭니다.\n하지만 첫걸음을 뗀 자만이 정예가 될 자격을 얻습니다.\n오늘부터 시작입니다.'},
  {icon:'🎯', title:'사령부 첫 관찰 보고', tone:'정보형',
   msg:'신병의 첫 활동이 사령부 시스템에 기록되기 시작했습니다.\n아직 평가는 보류 상태입니다.\n앞으로의 행보를 지켜보겠습니다.'},
  {icon:'☕', title:'사령부 휴게실 잡담', tone:'유머형',
   msg:'"저 신병 며칠이나 버틸까?" — 사령부 내부 소문입니다.\n물론 본인이 직접 증명하면 될 일입니다.\n오늘 과업, 가볍게 시작해봅시다.'},
  {icon:'🔑', title:'첫 관문 통과 권고', tone:'동기부여형',
   msg:'모든 전설은 첫 관문에서 시작됩니다.\n아직 계급도, 칭호도 없는 지금이 가장 가능성 넘치는 시기입니다.\n오늘의 과업이 그 첫 관문입니다.'},
];

// 구간 B. 유지기 (streak 3~6일)
const STORY_POOL_SUSTAIN = [
  {icon:'🎖️', title:'상급자 훈시', tone:'동기부여형',
   msg:'매일 과업을 완수하는 자만이 신장의 정점에 도달할 수 있습니다.\n단 하루의 이탈도 누적 기여도에 공백을 남깁니다.\n흔들리지 말고 오늘의 과업을 완수하십시오.'},
  {icon:'📊', title:'신체 기여도 현황 보고', tone:'정보형',
   msg:'현재까지의 과업 완수 기록이 신체 기여도에 정상 반영 중입니다.\n모든 전설적인 정예 요원도 처음엔 이름 없는 훈련병이었습니다.\n오늘의 과업이 내일의 계급을 결정합니다.'},
  {icon:'⚙️', title:'성장 시스템 가동 현황', tone:'정보형',
   msg:'신체 성장 시스템 정상 가동 중입니다.\n영양 보급, 신체 훈련, 수면 확보 —\n세 항목 중 하나라도 미완수 시 성장 효율이 저하됩니다.\n전 항목 완수를 권고합니다.'},
  {icon:'😤', title:'고비 구간 진입 보고', tone:'동기부여형',
   msg:'대부분의 낙오는 지금 이 구간에서 발생합니다.\n초반의 긴장감이 풀리고 권태가 찾아오는 시점이기 때문입니다.\n바로 이 고비를 넘긴 자만이 정예 구간에 진입합니다.'},
  {icon:'🗣️', title:'사령부 휴게실 잡담', tone:'유머형',
   msg:'"저 병사, 3일 넘게 버티네?" — 사령부가 슬슬 주목하기 시작했습니다.\n소문이 평가로 바뀌는 건 한 끗 차이입니다.\n오늘도 증명해봅시다.'},
];

// 구간 C. 정예기 (streak 7일+)
const STORY_POOL_ELITE = [
  {icon:'👑', title:'정예 명단 등재 보고', tone:'동기부여형',
   msg:'귀관은 이제 사령부 정예 명단에 등재되었습니다.\n이 자리는 누구나 오를 수 있는 곳이 아닙니다.\n정예의 품격에 맞는 오늘을 완수하십시오.'},
  {icon:'📈', title:'누적 기여도 경과 보고', tone:'정보형',
   msg:'일일 과업 완수 기록이 지속 누적되고 있습니다.\n단기간에 가시적 변화가 없더라도\n체내 성장 데이터는 정상 축적 중입니다.\n정진하십시오.'},
  {icon:'📣', title:'일일 과업 점호 실시', tone:'정보형',
   msg:'금일 점호를 실시합니다.\n과업을 완수한 날과 미완수한 날의 기여도 격차가\n1년 후 신장 격차로 이어집니다.\n낙오자 없이 전 과업을 완수하십시오. 이상입니다.'},
  {icon:'🏆', title:'정예 자격 유지 경고', tone:'동기부여형',
   msg:'정예 자격은 영구적이지 않습니다.\n단 하루의 공백이 그 자격을 위태롭게 만듭니다.\n오늘도 정예답게, 흔들림 없이 완수하십시오.'},
  {icon:'😎', title:'사령부 휴게실 잡담', tone:'유머형',
   msg:'"저 병사, 이제 신병 시절 기억도 안 날걸?" — 사령부 공인 정예입니다.\n돌아갈 곳은 없습니다, 앞으로 나아갈 길만 있을 뿐.\n오늘도 정예의 하루를 시작합니다.'},
];

const STORY_POOL = {
  intro:   STORY_POOL_INTRO,    // streak 0~2일
  sustain: STORY_POOL_SUSTAIN,  // streak 3~6일
  elite:   STORY_POOL_ELITE,    // streak 7일+
};

// streak에 맞는 구간에서 랜덤으로 격려 메시지 1개 선택
function getStoryByStreak(streak) {
  if (streak <= 2) return STORY_POOL.intro[Math.floor(Math.random() * STORY_POOL.intro.length)];
  if (streak <= 6) return STORY_POOL.sustain[Math.floor(Math.random() * STORY_POOL.sustain.length)];
  return STORY_POOL.elite[Math.floor(Math.random() * STORY_POOL.elite.length)];
}

// ==========================================
// 성과형 메시지 (즉각 팝업, 인터럽트)
// levelUp / reportSubmitted / dailyAllClear / rareQuestClear
// 동시 발생 시 순차 팝업(큐)으로 처리
// ==========================================
const EVENT_MESSAGES = {

  // ① 계급(타이틀) 진급 시 — {nextLevelTitle} (타이틀이 바뀔 때만, 즉각 팝업)
  "levelUp": {
    "title": "🎉 진급 명령 하달!",
    "msg": "치열한 과업 완수를 통해 신체 기여도를 증명해냈습니다.\n이 시간부로 [{nextLevelTitle}] 진급을 명합니다!\n상급 정비령에 따라 신규 장비 및 칭호를 확인하십시오. 충성!"
  },

  // ①-2 같은 타이틀 내 레벨 상승 — {nextLv} (팝업이 아닌 경량 토스트/배지 알림용, 타이틀 불변)
  "subLevelUp": {
    "title": "⬆️ Lv.{nextLv}",
    "msg": "신체 기여도가 상승했습니다. 다음 진급까지 계속 정진하십시오."
  },

  // ② 키/몸무게 리포트 입력 시 — {points}
  "reportSubmitted": {
    "title": "📊 신체 스펙 데이터 동기화 완료",
    "msg": "현재 신장 및 체중 데이터가 사령부 메인 컴퓨터에 정상 등록되었습니다.\n데이터 정밀 보고 포상으로 [{points} XP]가 즉시 지급되었습니다.\n데이터 누적은 성장의 지름길입니다."
  },

  // ③ 오늘의 필수 퀘스트 올 클리어 시 (변수 없음, 가챠 준비 알림 포함)
  "dailyAllClear": {
    "title": "🔥 금일 작전 완전 성공!",
    "msg": "대단합니다! 오늘 하달된 모든 성장 과업을 완벽하게 완수하셨습니다.\n그림자 군단이 당신의 성장 속도에 경악하고 있습니다.\n🎁 특별 보급품이 준비되었습니다. 확인해보십시오!\n오늘 밤 최고의 호르몬 분비가 기대됩니다. 내일 작전에서 뵙겠습니다!"
  },

  // ④-0 rare 퀘스트 출현 시 — {questName}
  "rareQuestAppear": {
    "title": "🚨 희귀 작전 발령!",
    "msg": "최상위 등급의 희귀 임무 [{questName}]이(가) 오늘 단 하루만 발령되었습니다.\n이 기회를 놓치면 다시 기약할 수 없습니다.\n지금 즉시 임무를 확인하고 출격 준비를 완료하십시오!"
  },

  // ④ rare 등급 퀘스트 클리어 시 (매회 동일 노출) — {questName}, {points}, {stars}
  "rareQuestClear": {
    "title": "⭐ 희귀 작전 완수 보고",
    "msg": "[{questName}] 작전이 성공적으로 종료되었습니다.\n난이도 {stars}성급 임무를 완수한 자에게만 주어지는 특별 포상으로\n[{points} XP]가 즉시 지급되었습니다.\n희귀 작전 수행 능력, 인정합니다."
  },

  // ⑤-0 주간 신체 기록 미입력 알림 (주 1회)
  "bodyRecordReminder": {
    "title": "📏 신체 스펙 측정 명령 하달",
    "msg": "이번 주 신체 스펙 데이터가 아직 등록되지 않았습니다.\n사령부는 용사의 성장을 면밀히 추적 중입니다.\n\n지금 즉시 리포트 탭으로 이동하여 키·몸무게를 입력하십시오.\n데이터 등록 시 주간 활동 포상 [300P]가 즉시 지급됩니다. 충성!"
  },

  // ⑤ 주간 칭호(닉네임) 변경 시 — {nickname} (이전 주와 칭호가 달라졌을 때만 노출)
  "newNickname": {
    "title": "🏅 신규 칭호 획득!",
    "msg": "지난 한 주간의 활동 데이터를 분석한 결과,\n사령부가 새로운 칭호 [{nickname}]을 정식 승인했습니다.\n이번 주에도 칭호에 걸맞은 활약을 기대합니다!"
  }

};


const SHOP_ITEMS = {
  daily: [ // 즉시소비형 — 자주, 소액으로 구매
    {id:'s1', icon:'🎮', name:'게임 추가 1시간', cost:1000, desc:'오늘 하루 게임 1시간 추가'},
    {id:'s2', icon:'📺', name:'TV 추가 1시간', cost:800, desc:'오늘 하루 TV 시청 1시간 추가'},
    {id:'s5', icon:'🤸', name:'엄마와 놀기 1시간', cost:1000, desc:'엄마와 함께 1시간 놀기 찬스'},
  ],
  mid: [ // 중기목표형 — 모아서 구매
    {id:'s3', icon:'💸', name:'게임 현질 5,000원', cost:10000, desc:'한 달 최대 30,000원'},
  ],
  final: [ // 최종목표형 — 장기 목표
    {id:'s4', icon:'🐹', name:'햄스터', cost:50000, desc:'🏆 최종 목표 보상! 함께 키우자!'},
  ],
};

// Level thresholds (by accumulated points)
// 타이틀 6개 × 레벨 5단계 = 총 30레벨. 같은 타이틀 안에서도 레벨이 오르며,
// 구간 폭이 뒤로 갈수록 넓어지는 곡선(초반엔 자주 레벨업, 후반엔 꾸준함 요구)
const LEVEL_TABLE = [
  // 성장 훈련병 (1~5)
  {lv:1,  minPts:0,      maxPts:999,    title:'성장 훈련병', emoji:'🌱'},
  {lv:2,  minPts:1000,   maxPts:2499,   title:'성장 훈련병', emoji:'🌱'},
  {lv:3,  minPts:2500,   maxPts:4499,   title:'성장 훈련병', emoji:'🌱'},
  {lv:4,  minPts:4500,   maxPts:6999,   title:'성장 훈련병', emoji:'🌱'},
  {lv:5,  minPts:7000,   maxPts:9999,   title:'성장 훈련병', emoji:'🌱'},
  // 성장 이병 (6~10)
  {lv:6,  minPts:10000,  maxPts:13499,  title:'성장 이병',   emoji:'🌿'},
  {lv:7,  minPts:13500,  maxPts:17499,  title:'성장 이병',   emoji:'🌿'},
  {lv:8,  minPts:17500,  maxPts:21999,  title:'성장 이병',   emoji:'🌿'},
  {lv:9,  minPts:22000,  maxPts:26999,  title:'성장 이병',   emoji:'🌿'},
  {lv:10, minPts:27000,  maxPts:32499,  title:'성장 이병',   emoji:'🌿'},
  // 성장 일병 (11~15)
  {lv:11, minPts:32500,  maxPts:38499,  title:'성장 일병',   emoji:'⚡'},
  {lv:12, minPts:38500,  maxPts:44999,  title:'성장 일병',   emoji:'⚡'},
  {lv:13, minPts:45000,  maxPts:51999,  title:'성장 일병',   emoji:'⚡'},
  {lv:14, minPts:52000,  maxPts:59499,  title:'성장 일병',   emoji:'⚡'},
  {lv:15, minPts:59500,  maxPts:67499,  title:'성장 일병',   emoji:'⚡'},
  // 성장 상병 (16~20)
  {lv:16, minPts:67500,  maxPts:75999,  title:'성장 상병',   emoji:'🌙'},
  {lv:17, minPts:76000,  maxPts:84999,  title:'성장 상병',   emoji:'🌙'},
  {lv:18, minPts:85000,  maxPts:94499,  title:'성장 상병',   emoji:'🌙'},
  {lv:19, minPts:94500,  maxPts:104499, title:'성장 상병',   emoji:'🌙'},
  {lv:20, minPts:104500, maxPts:114999, title:'성장 상병',   emoji:'🌙'},
  // 성장 병장 (21~25)
  {lv:21, minPts:115000, maxPts:125999, title:'성장 병장',   emoji:'🌟'},
  {lv:22, minPts:126000, maxPts:137499, title:'성장 병장',   emoji:'🌟'},
  {lv:23, minPts:137500, maxPts:149499, title:'성장 병장',   emoji:'🌟'},
  {lv:24, minPts:149500, maxPts:161999, title:'성장 병장',   emoji:'🌟'},
  {lv:25, minPts:162000, maxPts:174999, title:'성장 병장',   emoji:'🌟'},
  // 전설의 정예병 (26~30, 마지막 구간은 상한 없음)
  {lv:26, minPts:175000, maxPts:188499, title:'전설의 정예병', emoji:'👑'},
  {lv:27, minPts:188500, maxPts:202499, title:'전설의 정예병', emoji:'👑'},
  {lv:28, minPts:202500, maxPts:216999, title:'전설의 정예병', emoji:'👑'},
  {lv:29, minPts:217000, maxPts:231999, title:'전설의 정예병', emoji:'👑'},
  {lv:30, minPts:232000, maxPts:Infinity, title:'전설의 정예병', emoji:'👑'},
];
function getLevelByPts(pts) {
  for (let i = LEVEL_TABLE.length-1; i >= 0; i--) {
    if (pts >= LEVEL_TABLE[i].minPts) return LEVEL_TABLE[i];
  }
  return LEVEL_TABLE[0];
}
function getXpProgress(pts) {
  const lv = getLevelByPts(pts);
  const next = LEVEL_TABLE.find(l => l.lv === lv.lv + 1);
  if (!next) return {pct:100, current:pts, needed:0, nextLv:null};
  const inLevel = pts - lv.minPts;
  const needed = next.minPts - lv.minPts;
  return {pct: Math.round(inLevel/needed*100), current:inLevel, needed, nextLv:next};
}

// 레벨업 발생 시 어떤 이벤트를 띄울지 판별
// - 타이틀이 바뀌면 'levelUp' (즉각 팝업, {nextLevelTitle})
// - 같은 타이틀 안에서 레벨만 오르면 'subLevelUp' (경량 알림, {nextLv})
function getLevelUpEventType(prevPts, newPts) {
  const prevLv = getLevelByPts(prevPts);
  const newLv = getLevelByPts(newPts);
  if (newLv.lv === prevLv.lv) return null; // 레벨업 없음
  if (newLv.title !== prevLv.title) return { type: 'levelUp', nextLevelTitle: newLv.title };
  return { type: 'subLevelUp', nextLv: newLv.lv };
}

// 주간 카테고리 집계 기반 닉네임 (옵션 B)
// 카테고리당 3개 후보 — 같은 카테고리가 1위여도 매주 다른 표현이 나올 수 있도록
const NICK_PATTERNS = {
  warmup:   ['수면 갓생러', '예열 만렙', '습관 장인'],
  core:     ['영양 만렙러', '밥상 위 레전드', '식판 킹'],
  exercise: ['운동 갓생러', '체력 만렙', '땀방울 장인'],
  rare:     ['희귀 작전 킹', '도전 레전드', '한정판 인간'],
};

// 주간 카테고리별 완료 횟수(예: {warmup:2, core:5, exercise:1, rare:0})를 받아
// 닉네임 1개를 결정. 주간 총 활동이 3회 미만이면 null(칭호 부여 보류, 기본 칭호로 대체)
function getWeeklyNickname(categoryCounts) {
  const total = Object.values(categoryCounts).reduce((a,b)=>a+b, 0);
  if (total < 3) return null;
  const maxCount = Math.max(...Object.values(categoryCounts));
  const topCats = Object.entries(categoryCounts)
    .filter(([,count]) => count === maxCount)
    .map(([cat]) => cat);
  const chosenCat = topCats[Math.floor(Math.random() * topCats.length)]; // 동률 시 랜덤
  const pool = NICK_PATTERNS[chosenCat];
  return pool[Math.floor(Math.random() * pool.length)];
}

// 이전 주 칭호와 비교해 변경됐을 때만 true 반환 (true일 때 EVENT_MESSAGES.newNickname 팝업 트리거)
function hasNicknameChanged(prevNickname, newNickname) {
  return newNickname !== null && newNickname !== prevNickname;
}

function getDefaultState() {
  return {
    profile: {name:'',pin:'1234',points:0,totalEarnedPoints:0,streak:0,lastActiveDate:null,avatar:null,totalApproved:0,currentNickname:null},
    heightHistory:[],
    weightHistory:[],
    questLog:[],       // {date, questId, pointsAwarded, timestamp}
    pendingApprovals:[], // {id, questId, photo, submittedAt}
    rewardHistory:[],  // {icon, name, pts, date}
    weekCycle:{startDate:null,completedDays:[],weeklyRewardPending:false,weeklyRewardClaimed:false},
    gachaQueue:0,      // number of gachas ready to open
    purchasedItems:[],
    parentUnlocked:false,
  };
}

// 등급별 가챠 결과 멘트
const GACHA_MESSAGES = {
  jackpot: [
    {icon:'🎊', title:'초특급 대박!', msg:'사령부 비상 보급 창고가 개방되었습니다!\n최상급 보급품이 당첨되었습니다. 축하합니다!'},
  ],
  rare: [
    {icon:'🎁', title:'럭키 보급!', msg:'행운의 보급함이 열렸습니다.\n[500 XP] 보너스가 즉시 지급되었습니다!'},
  ],
  common: [
    {icon:'✨', title:'정상 보급', msg:'평범하지만 알찬 보급품입니다.\n오늘도 수고했습니다!'},
    {icon:'🔥', title:'보급 완료', msg:'꾸준함이 곧 실력입니다.\n보급품을 챙기고 다음 작전을 준비하십시오.'},
    {icon:'⚡', title:'에너지 충전', msg:'소소하지만 확실한 보급입니다.\n내일도 기대하겠습니다!'},
  ],
  miss: [
    {icon:'💧', title:'다음 기회에', msg:'이번 보급함은 비었지만, 위로금이 지급되었습니다.\n내일 보급함은 다를 수 있습니다!'},
  ],
};

// 대박(jackpot) 등급 당첨 시 추첨할 실물/포인트 보상 풀
const GACHA_REWARDS = [
  {id:'gr1', icon:'🍜', name:'라면 시식권',         type:'item',   note:'평소엔 못 먹는 라면 찬스'},
  {id:'gr2', icon:'🍗', name:'치킨 시식권',         type:'item',   note:'주말 치킨 찬스'},
  {id:'gr3', icon:'🌶️', name:'떡볶이 시식권',       type:'item',   note:'분식 자유 찬스'},
  {id:'gr4', icon:'🍿', name:'과자 시식권',         type:'item',   note:'편의점/마트 과자 1개'},
  {id:'gr5', icon:'🍦', name:'아이스크림 시식권',   type:'item',   note:'편의점/마트 아이스크림 1개'},
  {id:'gr6', icon:'🎮', name:'게임 2시간 자유이용권', type:'item', note:'평소 1시간보다 2배'},
  {id:'gr7', icon:'📺', name:'TV 2시간 자유이용권',  type:'item',  note:'주말 시청 찬스'},
  {id:'gr8', icon:'💰', name:'보너스 포인트 +200',  type:'points', amount:200},
  {id:'gr9', icon:'💰', name:'보너스 포인트 +250',  type:'points', amount:250},
  {id:'gr10',icon:'💎', name:'보너스 포인트 +300',  type:'points', amount:300},
];

// 대박 당첨 시 GACHA_REWARDS에서 랜덤 1개 추첨
function drawGachaReward() {
  return GACHA_REWARDS[Math.floor(Math.random() * GACHA_REWARDS.length)];
}

// ==========================================
// 가챠 보상 테이블
// - 데일리: 매일 dailyAllClear 달성 시 1회
// - 위클리 보너스: 7일 연속 풀클리어 달성한 날, 데일리 가챠에 더해 추가 1회
//   (대박/럭키 등급은 위클리 보너스 풀에서만 등장)
// ==========================================

// 데일리 가챠 풀 — 평타/꽝만 존재
const GACHA_POOL_DAILY = {
  common: { rate: 0.75, label: '평타', pointsRange: [100, 200] },
  miss:   { rate: 0.25, label: '꽝',   points: 50 },
};

// 위클리 보너스 가챠 풀 — 7일 풀클리어 달성일 한정
const GACHA_POOL_WEEKLY = {
  jackpot: { rate: 0.10, label: '대박', type: 'physical' }, // 실물 보상 — GACHA_REWARDS 별도 정의 필요
  rare:    { rate: 0.30, label: '럭키', points: 500 },
  common:  { rate: 0.50, label: '평타', pointsRange: [100, 200] },
  miss:    { rate: 0.10, label: '꽝',   points: 50 },
};

// 풀(pool)에서 확률에 따라 등급 1개를 추첨
function drawGacha(pool) {
  const roll = Math.random();
  let cum = 0;
  for (const [key, tier] of Object.entries(pool)) {
    cum += tier.rate;
    if (roll <= cum) return { tier: key, ...tier };
  }
  return null; // fallback (확률 합 오차 방지용)
}

// 그날 적용할 가챠 풀 목록 반환 (7일 풀클리어 달성일은 데일리+위클리 2회)
function getGachaPoolsForToday(weekCycle) {
  const pools = [GACHA_POOL_DAILY];
  if (weekCycle && weekCycle.completedDays && weekCycle.completedDays.length === 7) {
    pools.push(GACHA_POOL_WEEKLY);
  }
  return pools;
}
