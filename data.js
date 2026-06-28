// ==========================================
// data.js — 키성장 퀘스트 앱 콘텐츠 데이터
// ==========================================

// ---------- 이미지 경로 ----------
const IMAGES = {
  avatar:    'images/avatar.jpg',       // 기본 프로필 사진
  character: 'images/character.png',    // AI 생성 캐릭터
};

const QUEST_POOL = [
  // warmup
  {id:'w1',cat:'warmup',name:'취침 9시간 이상 확보',icon:'🌙',stars:1,desc:'작전명: 야간 호르몬 자동 분비 시스템 가동\n\n수면 중 성장호르몬이 최대치로 방출됩니다. 지정 시간 내 취침 완료 후 9시간 이상의 수면을 확보하십시오.',pts:100},
  {id:'w2',cat:'warmup',name:'성장호르몬 주사 맞기',icon:'✨',stars:1,desc:'작전명: 호르몬 강제 주입 및 세포 활성화\n\n신체 기능의 임계치를 개방하는 특수 약품 투여 과정입니다. 고통을 인내하고 정량의 호르몬을 완벽히 투여하십시오.',pts:100},
  // core nutrition
  {id:'c1',cat:'core',name:'우유 한 잔 마시기',icon:'🥛',stars:2,desc:'작전명: 골격 요새화를 위한 칼슘 보급품 전량 섭취\n\n골밀도를 극한으로 끌어올려 신장 성장의 기반을 다지는 필수 과정입니다. 잔류량을 남기지 말고 보급된 유제품을 신속히 소화하십시오.',pts:200},
  {id:'c2',cat:'core',name:'계란노른자 먹기',icon:'🍳',stars:2,desc:'작전명: 아연 핵 투입을 통한 세포 분열 강제 가속\n\n황금빛 핵에 농축된 아연 성분이 체내 세포 분열 속도를 대폭 끌어올립니다. 완전 섭취를 명합니다.',pts:200},
  {id:'c3',cat:'core',name:'치즈 한 조각 섭취',icon:'🧀',stars:2,desc:'작전명: 아연 농축 전투식량 보급 및 흡수\n\n소량이나 고농도 아연 및 단백질이 함유된 전투식량입니다. 잔류량 없이 완전 소화하십시오.',pts:200},
  {id:'c4',cat:'core',name:'두부 섭취',icon:'🫘',stars:2,desc:'작전명: 식물성 단백질 보급을 통한 근골격 동시 강화\n\n근육 조직과 골격 계통을 동시에 강화하는 필수 보급품입니다. 지시된 분량을 완전히 소화하십시오.',pts:200},
  {id:'c5',cat:'core',name:'소고기 섭취',icon:'🥩',stars:3,desc:'작전명: 철·아연 복합 성분 집중 투입\n\n신장 성장에 직결되는 핵심 원소가 집약된 최상급 보급품입니다. 완전 섭취 후 체내 흡수 과정이 정상 진행되도록 하십시오.',pts:280},
  {id:'c6',cat:'core',name:'견과류 한 줌 섭취',icon:'🥜',stars:2,desc:'작전명: 뇌 기능 및 신장 성장 동시 지원 보급\n\n뇌와 골격 계통을 동시에 지원하는 복합 영양소가 함유되어 있습니다. 경량이나 효과를 경시하지 마십시오.',pts:200},
  {id:'c7',cat:'core',name:'콩나물국 섭취',icon:'🥣',stars:2,desc:'작전명: 장내 환경 정비 및 영양 흡수 기반 구축\n\n신장 성장은 장내 환경 정비 없이 불가합니다. 보급된 식이섬유 보급품을 잔량 없이 소화하십시오.',pts:200},
  // exercise (weekend)
  {id:'e1',cat:'exercise',name:'수영 30분',icon:'🏊',stars:3,desc:'작전명: 수중 침투 및 전신 근지력 한계 돌파\n\n심폐 기능과 전신 근육을 한계까지 가동하는 고강도 수중 작전입니다. 낙오 및 타협은 용납되지 않으니 30분간의 수중 훈련을 완벽히 완수하십시오.',pts:300,weekend:true},
  {id:'e2',cat:'exercise',name:'산책 또는 달리기',icon:'🏃',stars:2,desc:'작전명: 하중 부하를 통한 골격 강화 및 성장판 자극\n\n골격에 지속적 부하를 가해야 신장이 증가합니다. 지정 구간을 낙오 없이 완주하십시오.',pts:250,weekend:true},
  {id:'e3',cat:'exercise',name:'배드민턴 — 어머니 격파',icon:'🏸',stars:4,desc:'작전명: 가문 내 서열 증명 — 어머니와의 전면전\n\n전방에 최종 보스급 개체가 식별되었습니다. 라켓을 쥐고 전력으로 맞서 가문의 서열을 증명하십시오. 낙오는 서열 하락을 의미합니다.',pts:400,weekend:true},
  // rare
  {id:'r1',cat:'rare',name:'도서관 — 독서 10분',icon:'📖',stars:5,desc:'작전명: 지식 요새 10분 주둔 및 뇌 기능 강제 확장\n\n최상위 등급의 희귀 임무가 발령되었습니다. 지식의 요새에 10분 주둔하여 뇌 기능 확장 작전을 완수하십시오.',pts:700},
  {id:'r2',cat:'rare',name:'수영장 원정',icon:'🌊',stars:4,desc:'작전명: 성장의 바다 원정 및 전신 기능 극한 가동\n\n원거리 작전 명령이 하달되었습니다. 성장의 바다로 출정하여 전신 기능을 극한으로 가동하십시오.',pts:600},
  {id:'r3',cat:'rare',name:'아이스스케이팅 원정',icon:'⛸️',stars:5,desc:'작전명: 빙판 위 균형 감각 훈련 및 전신 협응 능력 극한 개방\n\n최고 난이도 임무가 발령되었습니다. 빙판 위에서 전신 협응 능력을 극한까지 끌어올리십시오. 완수자에게만 최상급 보상이 수여됩니다.',pts:700},
];

// Daily storytelling messages (rotate by day + streak)
const STORY_POOL = [
  {icon:'📋', title:'금일 작전 브리핑', msg:'금일 성장 과업이 정상 하달되었습니다.\n각 과업을 순서대로 완수하십시오.\n미완수 항목은 신체 기여도에 반영되지 않습니다.\n낙오 없이 전 과업을 완수하길 바랍니다.'},
  {icon:'🎖️', title:'상급자 훈시', msg:'매일 과업을 완수하는 자만이 신장의 정점에 도달할 수 있습니다.\n단 하루의 이탈도 누적 기여도에 공백을 남깁니다.\n흔들리지 말고 오늘의 과업을 완수하십시오.'},
  {icon:'📊', title:'신체 기여도 현황 보고', msg:'현재까지의 과업 완수 기록이 신체 기여도에 정상 반영 중입니다.\n전설의 취사병도 처음엔 훈련병이었습니다.\n오늘의 과업이 내일의 계급을 결정합니다.'},
  {icon:'⚙️', title:'성장 시스템 가동 현황', msg:'신체 성장 시스템 정상 가동 중입니다.\n영양 보급, 신체 훈련, 수면 확보 —\n세 항목 중 하나라도 미완수 시 성장 효율이 저하됩니다.\n전 항목 완수를 권고합니다.'},
  {icon:'🌙', title:'야간 작전 사전 브리핑', msg:'야간 수면 중 성장호르몬 자동 분비 시스템이 가동됩니다.\n금일 과업을 완수한 후 취침하십시오.\n수면 시간 9시간 이상을 권고합니다.'},
  {icon:'📈', title:'누적 기여도 경과 보고', msg:'일일 과업 완수 기록이 지속 누적되고 있습니다.\n단기간에 가시적 변화가 없더라도\n체내 성장 데이터는 정상 축적 중입니다.\n정진하십시오.'},
  {icon:'📣', title:'일일 과업 점호 실시', msg:'금일 점호를 실시합니다.\n과업을 완수한 날과 미완수한 날의 기여도 격차가\n1년 후 신장 격차로 이어집니다.\n낙오자 없이 전 과업을 완수하십시오. 이상입니다.'},
];


const SHOP_ITEMS = [
  {id:'s2',icon:'🎮',name:'게임 추가 1시간',cost:300,desc:'오늘 하루 게임 1시간 추가'},
  {id:'s5',icon:'💸',name:'게임 현질 5,000원',cost:1500,desc:'한 달 최대 30,000원'},
  {id:'s8',icon:'🐹',name:'햄스터',cost:30000,desc:'🏆 최종 목표 보상! 함께 키우자!'},
];

// Level thresholds (by accumulated points)
const LEVEL_TABLE = [
  {lv:1, minPts:0,    maxPts:499,   title:'성장 훈련병',  emoji:'🌱', rank:'4급'},
  {lv:2, minPts:500,  maxPts:1499,  title:'성장 이병',    emoji:'🌿', rank:'3급'},
  {lv:3, minPts:1500, maxPts:3499,  title:'성장 일병',    emoji:'⚡', rank:'2급'},
  {lv:4, minPts:3500, maxPts:6999,  title:'성장 상병',    emoji:'🌙', rank:'1급'},
  {lv:5, minPts:7000, maxPts:12999, title:'성장 병장',    emoji:'🌟', rank:'특급'},
  {lv:6, minPts:13000,maxPts:99999, title:'전설의 취사병',emoji:'👑', rank:'전설급'},
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

// Dynamic nickname patterns based on recent quest activity
const NICK_PATTERNS = [
  {questCat:'c2',text:'계란노른자 특기병'},
  {questCat:'c3',text:'치즈 돌격대원'},
  {questCat:'c5',text:'소고기 격파왕'},
  {questCat:'e1',text:'수영장 제압 병사'},
  {questCat:'e3',text:'배드민턴 보스 킬러'},
  {questCat:'r1',text:'지식의 요새 점령병'},
  {questCat:'c1',text:'우유 일등사수'},
];

function getDefaultState() {
  return {
    profile: {name:'',pin:'1234',points:0,streak:0,lastActiveDate:null,avatar:null,totalApproved:0},
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

const GACHA_MESSAGES = [
  ['🎊','대박!','럭키!'],
  ['✨','굿!','잘했어!'],
  ['🔥','파이어!','퀘스트 완료!'],
  ['⚡','찌릿!','에너지 충전!'],
];
