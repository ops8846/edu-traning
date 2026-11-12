import { useState, useEffect, useCallback, useRef, Fragment } from "react";
import "./index.css";
import { db } from "./firebase";
import certTemplate from "./assets/cert-template.webp";
import loginScene from "./assets/login-scene.webp";
import logoImg from "./assets/logo.png";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

/* ============================================================
   모듈 메타데이터 (실제 회사 교육자료 기준, 2026)
   본문(챕터/세부타이틀/이미지/영상)은 각 모듈 진입 시
   /module{N}/content_m{N}.json 을 fetch하여 불러옵니다.
   ============================================================ */
const MODULES = [
  {
    id: "m1",
    no: 1,
    code: "ORIENT",
    folder: "module1",
    title: "오리엔테이션 & 근무수칙",
    subtitle:
      "신규/재직 운전자 교육 · 회사소개 · 근무시간 규정 · 기초 안전교육(WSIB·WHMIS)",
    color: "#C4872E",
    objectives: [
      "Green Oil Inc.의 교육 목적·목표와 교육 구성을 설명할 수 있다.",
      "운전자가 완료·소지해야 하는 문서, 신규 운전자 훈련 절차, 업무 중 부상 시 보고 절차를 알 수 있다.",
      "출·퇴근 시간 기록, 근무 전 준비, 재교육 조치 기준 등 근무수칙을 지킬 수 있다.",
    ],
  },
  {
    id: "m2",
    no: 2,
    code: "ROAD",
    folder: "module2",
    title: "도로 운행 안전수칙",
    subtitle:
      "운전 중 준수사항 · 자전거/보행자와의 도로 공유 · 동절기 안전 · 최근 사고·벌금 사례",
    color: "#5C7C96",
    objectives: [
      "운전 중 휴대폰·태블릿 사용 금지와 407 하이웨이 이용 기준을 지킬 수 있다.",
      "출근현황판 사용법과 동절기 Tire Gripper 설치 등 안전 운행 절차를 수행할 수 있다.",
      "자전거의 법규상 움직임을 예측하고 안전거리를 지켜 방어운전을 할 수 있다.",
    ],
  },
  {
    id: "m3",
    no: 3,
    code: "UCO",
    folder: "module3",
    title: "오일 수거·언로딩 및 현장업무 대응",
    subtitle:
      "Used Cooking Oil 기본지식 · 계약서류 · 언로딩 절차 · 현장 발생 상황별 대처법",
    color: "#2C9B68",
    objectives: [
      "UCO와 컨테이너 종류, 계약 서류, 가격·Pay 방법을 설명할 수 있다.",
      "언로딩(Unloading) 작업 절차를 순서대로 수행할 수 있다.",
      "오일 유출, Sludge, 도난, 고객 불만, 설비 문제 등 현장 상황별 첫 행동을 알고 실행할 수 있다.",
    ],
  },
  {
    id: "m4",
    no: 4,
    code: "MAINT",
    folder: "module4",
    title: "차량 점검 및 정비관리",
    subtitle:
      "필수 소지서류 · 히노트럭 배출가스 시스템(DPF/DEF/DPR) · 타이어 점검 · 일일점검 체크리스트 · 차량관리",
    color: "#8C689B",
    objectives: [
      "차량에 비치할 서류와 DPF·DPR·SCR(DEF) 배출가스 장치의 역할을 설명할 수 있다.",
      "자동·수동 Regen과 DEF 경고등에 맞게 대응할 수 있다.",
      "허브 오일, 타이어 이상 마모, 일일 점검 체크리스트로 차량 상태를 점검하고 청결을 유지할 수 있다.",
    ],
  },
  {
    id: "m5",
    no: 5,
    code: "SAMSARA",
    folder: "module5",
    title: "Samsara 사용법",
    subtitle:
      "앱 로그인·차량선택·DVIR(사전/사후점검)·HOS 근무시간 관리·도로단속 대응·DVIR 법규 준수",
    color: "#AD4438",
    objectives: [
      "Samsara 앱에 로그인해 차량을 선택하고 운행 전·후 DVIR 점검을 할 수 있다.",
      "HOS 근무 상태와 Drive·Shift·Cycle 시간 한도, 도로 단속 대응 방법을 알고 지킬 수 있다.",
      "결함 발견 시 DVIR 제출과 Major 결함 규칙을 지킬 수 있다.",
    ],
  },
  {
    id: "m6",
    no: 6,
    code: "INCIDENT",
    folder: "module6",
    title: "사고 및 위험상황 대응",
    subtitle:
      "교통사고 초동대응 · 경찰신고/CRC/토잉 절차 · 2년 누적 페널티 정책 · 누유(Oil Spill) 대응",
    color: "#3D5A8C",
    objectives: [
      "사고 직후 안전 확보, 신고 대상 판단, 상대방 정보 확보를 순서대로 할 수 있다.",
      "사고 분류와 2년 누적 페널티 정책, 토잉·CRC 이용 절차를 이해한다.",
      "오일 누유 시 대응 방법을 알고 실행할 수 있다.",
    ],
  },
];

// 모듈 본문 파일 경로: 예) module1 폴더의 content_m1.json
// (모듈마다 파일명이 달라서, 여러 파일을 한꺼번에 올려도 서로 덮어써지지 않습니다)
// public 폴더의 파일을 가리키는 경로를 항상 배포 위치에 맞게 만들어줍니다.
// (로컬 개발 중에는 BASE_URL이 "/"이고, GitHub Pages처럼 하위 폴더에 배포되면
//  vite.config.js의 base 설정값이 자동으로 앞에 붙어서 404를 방지합니다)
const withBase = (path) => {
  const base = import.meta.env.BASE_URL || "/";
  const cleanBase = base.endsWith("/") ? base : `${base}/`;
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `${cleanBase}${cleanPath}`;
};

// 배포마다 달라지는 값(__BUILD_ID__)을 붙여, 브라우저/CDN에 남은 이전 문제 파일이 읽히지 않게 함
const contentUrl = (mod) => withBase(`${mod.folder}/content_${mod.id}.json`) + `?v=${__BUILD_ID__}`;

// 관리자 통계·부서별 현황표에서 제외할 부서 (테스트 계정용). 필요 없으면 [] 로 비우세요.
const STATS_EXCLUDED_DEPARTMENTS = ["TEST"];

// 명단 파일 형식: 부서별 묶음("departments") 또는 기존 평면 목록("employees") 모두 지원.
// 어느 형식이든 { id, name, code, department } 목록(employees)으로 통일해서 사용합니다.
// 관리자 화면에서 수정한 명단은 employees 컬렉션의 _roster 문서 하나에 저장합니다. (보안 규칙은 그대로 사용)
const ROSTER_DOC_ID = "_roster";
function cleanRosterEmployee(e) {
  return {
    id: String(e.id || "").trim(),
    name: String(e.name || "").trim(),
    department: String(e.department || "").trim() || "미지정",
    code: String(e.code || "").trim(),
    active: e.active !== false,
  };
}

function normalizeAllowList(data) {
  let employees = [];
  if (Array.isArray(data.departments)) {
    employees = data.departments.flatMap((d) =>
      (d.employees || []).map((e) => ({ ...e, department: d.name }))
    );
  } else if (Array.isArray(data.employees)) {
    employees = data.employees.map((e) => ({
      ...e,
      department: e.department || "미지정",
    }));
  }
  return { ...data, employees };
}

/* ============================================================
   새로고침 복원 (대시보드 · 교육/문제 화면에서 "새로고침"했을 때만)
   - sessionStorage 사용: 탭/창을 닫으면 자동으로 지워져 로그아웃(초기화)됩니다.
   - 새로고침이 아닌 경우(주소로 새로 열기, 다른 페이지 갔다가 뒤로가기 등)에는
     저장값을 지우고 복원하지 않습니다.
   ============================================================ */
const SESSION_KEY = "goi_session_v3";

function readSavedSession() {
  try {
    // 이전 버전이 남겨둔 직원 정보는 삭제 (공용 PC 보호)
    localStorage.removeItem("goi_session_v1");
    sessionStorage.removeItem("goi_session_v2");

    const nav = performance.getEntriesByType("navigation")[0];
    const isReload = nav ? nav.type === "reload" : true;
    if (!isReload) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || !s.employee) return null;
    if (s.screen !== "employee" && s.screen !== "module") return null;
    if (s.screen === "module" && !MODULES[s.moduleIdx]) return null;
    if (!["learn", "quiz", "result"].includes(s.phase)) s.phase = "learn";
    if (!Array.isArray(s.lockedCorrect)) s.lockedCorrect = [];
    return s;
  } catch (_) {
    return null;
  }
}

const TOTAL_MODULES = MODULES.length;

/* ============================================================
   유틸
   ============================================================ */
// 문제 구성(문항 수 + 문제 문구)을 짧은 값으로 만든 것: 문제를 추가/삭제하면 값이 달라져서,
// 이전 문제 구성으로 저장된 1차 결과(맞힌 문제 번호)를 새 문제에 잘못 적용하지 않도록 비교합니다.
function quizSignature(questions) {
  let h = 0;
  const s = questions.map((q) => q.q).join("|");
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return `${questions.length}:${h.toString(36)}`;
}
function nowISO() {
  return new Date().toISOString();
}
function fmtDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(
    d.getDate()
  ).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}
// Firestore 문서 ID로는 allowed-users.json의 고정 id(goi001 등)를 그대로 사용합니다.


const Icon = {
  Leaf: (p) => (
    <svg viewBox="0 0 100 100" fill="currentColor" {...p}>
      <path d="M50 2C82 20 98 52 50 98C2 52 18 20 50 2Z" />
      <path
        d="M50 8Q40 50 50 92"
        fill="none"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth="3"
      />
    </svg>
  ),
  Truck: (p) => (
    <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path
        d="M4 30V14a2 2 0 0 1 2-2h20v18"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M26 20h9l7 7v3h-16" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="13" cy="34" r="4" />
      <circle cx="35" cy="34" r="4" />
      <path d="M4 30h5M39 30h5v-3" strokeLinecap="round" />
    </svg>
  ),
  Check: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" {...p}>
      <path d="M4 12l5 5L20 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Lock: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <rect x="5" y="11" width="14" height="9" rx="1.5" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  ),
  Arrow: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  Drum: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <rect x="5" y="4" width="14" height="16" rx="2" />
      <path d="M5 9h14M5 15h14" />
    </svg>
  ),
  Trash: (p) => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...p}>
      <path
        d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-1 13a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 7h14Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M10 11v6M14 11v6" strokeLinecap="round" />
    </svg>
  ),
};

/* ============================================================
   메인 컴포넌트
   ============================================================ */
export default function App() {
  // 대시보드 또는 교육/문제 화면에서 새로고침한 경우에만 값이 있음 (그 외에는 null → 로그인 화면)
  const [saved] = useState(readSavedSession);

  const [screen, setScreen] = useState(saved ? saved.screen : "login"); // login | employee | module | complete | admin
  const [role, setRole] = useState("employee"); // employee | admin

  // 로그인 입력
  const [codeInput, setCodeInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [adminIdInput, setAdminIdInput] = useState("");
  const [adminPwInput, setAdminPwInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  // 사번/이름 허용목록 & 관리자 계정 (public/data/allowed-users.json)
  const [allowList, setAllowList] = useState(null);
  const [allowListStatus, setAllowListStatus] = useState("loading"); // loading | ready | error

  // 임직원 상태
  const [employee, setEmployee] = useState(saved ? saved.employee : null);
  const [moduleIdx, setModuleIdx] = useState(saved ? saved.moduleIdx : 0);
  const [phase, setPhase] = useState(saved ? saved.phase : "learn"); // learn | quiz | result
  // 복습 모드: 완료한 모듈을 문제 없이 다시 읽어보기만 함 (결과/점수는 변경하지 않음)
  const [reviewOnly, setReviewOnly] = useState(saved ? !!saved.reviewOnly : false);
  const [sectionIdx, setSectionIdx] = useState(saved ? saved.sectionIdx || 0 : 0);
  // 이 모듈에서 지금까지 도달한 가장 먼 학습 페이지 (목차에서 되돌아가기용)
  const [maxSection, setMaxSection] = useState(
    saved && Number.isInteger(saved.maxSection) ? saved.maxSection : 0
  );
  // 문제 힌트에서 학습 페이지로 이동했을 때, 돌아갈 문제 번호(없으면 null)
  const [returnQ, setReturnQ] = useState(
    saved && Number.isInteger(saved.returnQ) ? saved.returnQ : null
  );
  const [answers, setAnswers] = useState(
    saved && Array.isArray(saved.answers) ? saved.answers : []
  );
  const [lastResult, setLastResult] = useState(saved ? saved.lastResult || null : null);
  // 이번 모듈 퀴즈에서 이미 맞춘 문제 인덱스 누적 (만점 재시도용)
  const [lockedCorrect, setLockedCorrect] = useState(
    saved && Array.isArray(saved.lockedCorrect) ? saved.lockedCorrect : []
  );
  // 이 모듈에서 이미 응시한 횟수 (0·1·2). 모듈당 최대 2번만 응시할 수 있고, 마지막 결과가 최종 점수입니다.
  const [attemptsUsed, setAttemptsUsed] = useState(
    saved
      ? Number.isInteger(saved.attemptsUsed)
        ? saved.attemptsUsed
        : saved.hasSubmitted
          ? 1
          : 0
      : 0
  );
  // 최소 한 번 채점했는지 (이 값이 true여야 틀린 문제 아래 힌트가 보임)
  const [hasSubmitted, setHasSubmitted] = useState(saved ? !!saved.hasSubmitted : false);
  // true면: 채점 결과(정답+오답 전부) 보여주는 중. false면: 틀린 문제만 편집 가능한 상태
  const [editingRetry, setEditingRetry] = useState(saved ? !!saved.editingRetry : false);
  // 가장 최근에 "채점한" 문제 번호만 기억 (결과보기 화면에 이 문제들만 표시하기 위함)
  const [lastRoundIndices, setLastRoundIndices] = useState(
    saved && Array.isArray(saved.lastRoundIndices) ? saved.lastRoundIndices : []
  );

  // 모듈 본문(챕터/세부타이틀) - 진입 시 /module{N}/content_m{N}.json 을 fetch
  const [moduleContent, setModuleContent] = useState(null);
  const [contentStatus, setContentStatus] = useState(
    saved && saved.screen === "module" ? "loading" : "idle"
  ); // idle | loading | ready | error
  // 영상을 끝까지 본 블록만 기록 (key: "섹션인덱스_블록인덱스")
  const [watchedVideos, setWatchedVideos] = useState({});
  // "자세한 설명 보기"를 열어 본 기록 (키: "섹션인덱스_d블록인덱스")
  const [openedDetails, setOpenedDetails] = useState({});

  // 관리자 상태
  const [adminList, setAdminList] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  useEffect(() => {
    fetch(withBase("data/allowed-users.json"))
      .then((res) => {
        if (!res.ok) throw new Error("허용목록 파일을 불러올 수 없습니다.");
        return res.json();
      })
      .then(async (data) => {
        const fromFile = normalizeAllowList(data);
        fromFile.employees = fromFile.employees.map(cleanRosterEmployee);
        let result = { ...fromFile, source: "file", fileEmployees: fromFile.employees };
        // 관리자 화면에서 저장한 명단이 있으면 그것을 우선 사용 (실패하거나 비어 있으면 파일 명단 사용)
        try {
          const snap = await getDoc(doc(db, "employees", ROSTER_DOC_ID));
          if (snap.exists()) {
            const r = snap.data();
            if (Array.isArray(r.employees) && r.employees.length > 0) {
              result = {
                ...result,
                employees: r.employees.map(cleanRosterEmployee),
                source: "database",
                rosterUpdatedAt: r.updatedAt || null,
              };
            }
          }
        } catch (err) {
          console.error("명단(데이터베이스) 조회 실패 - 파일 명단 사용", err);
        }
        setAllowList(result);
        setAllowListStatus("ready");
      })
      .catch((err) => {
        console.error("허용목록 로드 실패", err);
        setAllowListStatus("error");
      });
  }, []);

  // 관리자 화면에서 수정한 명단을 데이터베이스에 저장하고 바로 적용
  async function saveRoster(employees) {
    const cleaned = employees.map(cleanRosterEmployee);
    const updatedAt = nowISO();
    await setDoc(doc(db, "employees", ROSTER_DOC_ID), { employees: cleaned, updatedAt });
    setAllowList((prev) => ({
      ...prev,
      employees: cleaned,
      source: "database",
      rosterUpdatedAt: updatedAt,
    }));
    await loadAdminList(cleaned);
  }

  // 현재 명단 파일(allowed-users.json)의 내용을 데이터베이스로 옮김
  async function importRosterFromFile() {
    const res = await fetch(withBase("data/allowed-users.json") + `?v=${Date.now()}`);
    if (!res.ok) throw new Error("명단 파일을 불러올 수 없습니다.");
    const fromFile = normalizeAllowList(await res.json());
    const list = fromFile.employees.map(cleanRosterEmployee);
    if (list.length === 0) throw new Error("명단 파일에 임직원이 없습니다.");
    await saveRoster(list);
    return list.length;
  }

  // 저장 실패 표시 (학습 기록이 서버에 저장되지 않았을 때 화면 위에 안내)
  const [saveError, setSaveError] = useState(false);
  const unsavedRef = useRef(null);
  const saveEmployee = useCallback(async (rec) => {
    // Firestore는 undefined 값을 저장하지 못하므로(빈 칸이 있는 배열 포함) 저장 전에 모두 정리합니다.
    const clean = JSON.parse(JSON.stringify(rec));
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await setDoc(doc(db, "employees", rec.id), clean);
        unsavedRef.current = null;
        setSaveError(false);
        return true;
      } catch (e) {
        console.error("저장 실패", e);
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
      }
    }
    unsavedRef.current = rec;
    setSaveError(true);
    return false;
  }, []);
  async function retrySave() {
    const rec = unsavedRef.current || employee;
    if (rec) await saveEmployee(rec);
  }

  /* ---------------- 로그인 처리 ---------------- */
  async function handleEmployeeLogin(e) {
    e.preventDefault();
    setLoginError("");
    const code = codeInput.trim();
    const name = nameInput.trim();
    if (!code || !name) {
      setLoginError("이름과 접속코드를 모두 입력해 주세요.");
      return;
    }
    if (allowListStatus === "loading") {
      setLoginError("허용목록을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (allowListStatus === "error" || !allowList) {
      setLoginError("허용목록을 불러오지 못했습니다. 관리자에게 문의해 주세요.");
      return;
    }

    // 0) 이름+접속코드가 허용목록(public/data/allowed-users.json)에 있는지 확인
    // (분실 대비) 마스터 키: allowed-users.json 의 masterCode 로는 이름만 맞으면 누구나 로그인됩니다. (관리자 로그인은 제외)
    const masterCode = String(allowList.masterCode || "").trim();
    const matched = (allowList.employees || []).find(
      (u) =>
        u.active !== false &&
        String(u.name).trim() === name &&
        (String(u.code).trim() === code || (masterCode && code === masterCode))
    );
    if (!matched) {
      setLoginError(
        "등록되지 않은 이름 또는 접속코드입니다. 다시 확인하거나 관리자에게 문의해 주세요."
      );
      return;
    }

    setLoading(true);

    // 1) 기존 기록 조회 (best-effort, 없으면 신규로 처리)
    //    저장 기준은 항상 고정 id(goi001 등) — 접속코드가 재발급되어도 기록이 끊기지 않습니다.
    let rec = null;
    try {
      const snap = await getDoc(doc(db, "employees", matched.id));
      if (snap.exists()) rec = snap.data();
    } catch (err) {
      console.error("조회 실패", err);
      rec = null; // 조회 실패 -> 신규 응시자로 간주
    }

    if (rec) {
      // 허용목록의 최신 이름으로 동기화 (이름이 바뀐 경우 대비)
      rec = { ...rec, name, lastLoginAt: nowISO() };
    } else {
      rec = {
        id: matched.id,
        name,
        loginAt: nowISO(),
        lastLoginAt: nowISO(),
        currentModuleIdx: 0,
        moduleResults: [],
        status: "in_progress",
        submittedAt: null,
      };
    }

    // 2) 화면 전환은 저장 완료 여부와 상관없이 즉시 진행
    setEmployee(rec);
    setScreen("employee");
    setLoading(false);

    // 3) 저장은 백그라운드로 시도 (실패해도 화면 진행에는 영향 없음)
    saveEmployee(rec).catch((err) => console.error("직원 기록 저장 실패", err));
  }

  function handleAdminLogin(e) {
    e.preventDefault();
    setLoginError("");
    if (allowListStatus === "loading") {
      setLoginError("설정을 불러오는 중입니다. 잠시 후 다시 시도해 주세요.");
      return;
    }
    if (allowListStatus === "error" || !allowList || !allowList.admin) {
      setLoginError("관리자 계정 설정을 불러오지 못했습니다.");
      return;
    }
    const admin = allowList.admin;
    if (adminIdInput.trim().toUpperCase() !== String(admin.id).trim().toUpperCase()) {
      setLoginError(`관리자 계정(${admin.id})으로만 로그인할 수 있습니다.`);
      return;
    }
    if (adminPwInput.trim() !== String(admin.password)) {
      setLoginError("비밀번호가 올바르지 않습니다.");
      return;
    }
    setScreen("admin");
    loadAdminList();
  }

  function logout() {
    try {
      sessionStorage.removeItem(SESSION_KEY);
    } catch (_) {}
    setScreen("login");
    setRole("employee");
    setEmployee(null);
    setCodeInput("");
    setNameInput("");
    setAdminIdInput("");
    setAdminPwInput("");
    setLoginError("");
    setModuleIdx(0);
    setReviewOnly(false);
    setPhase("learn");
    setSectionIdx(0);
    setAnswers([]);
    setLastResult(null);
    setLockedCorrect([]);
    setHasSubmitted(false);
    setEditingRetry(false);
    setLastRoundIndices([]);
    setOpenedDetails({});
    setWatchedVideos({});
    setSelectedEmp(null);
  }

  /* ---------------- 임직원 : 모듈 진행 ---------------- */
  function startModule(idx, review = false) {
    setReviewOnly(review === true);
    setModuleIdx(idx);
    setPhase("learn");
    setSectionIdx(0);
    setMaxSection(0);
    setReturnQ(null);
    setAnswers([]);
    // 1차 응시 후 중간에 나갔다 돌아온 경우: 1차 결과를 이어받아 마지막(2번째) 시도부터 시작
    const savedQuiz =
      !review && employee && employee.quizState ? employee.quizState[MODULES[idx].id] : null;
    if (savedQuiz && Array.isArray(savedQuiz.lockedCorrect)) {
      setLockedCorrect(savedQuiz.lockedCorrect);
      setAttemptsUsed(1);
      setHasSubmitted(true);
      setEditingRetry(true);
    } else {
      setLockedCorrect([]);
      setAttemptsUsed(0);
      setHasSubmitted(false);
      setEditingRetry(false);
    }
    setLastRoundIndices([]);
    setScreen("module");
    setModuleContent(null);
    setContentStatus("loading");
    setWatchedVideos({});
    setOpenedDetails({});

    fetch(contentUrl(MODULES[idx]))
      .then((res) => {
        if (!res.ok) throw new Error("콘텐츠를 불러올 수 없습니다.");
        return res.json();
      })
      .then((data) => {
        setModuleContent(data);
        setContentStatus("ready");
        // 저장해 둔 1차 결과가 지금 문제 구성과 맞지 않으면(문제가 바뀜) 버리고 처음 응시로 시작
        if (savedQuiz) {
          const qs = Array.isArray(data.questions) ? data.questions : [];
          const stale =
            (savedQuiz.sig && savedQuiz.sig !== quizSignature(qs)) ||
            (savedQuiz.lockedCorrect || []).some((i) => !(i >= 0 && i < qs.length));
          if (stale) {
            setLockedCorrect([]);
            setAttemptsUsed(0);
            setHasSubmitted(false);
            setEditingRetry(false);
          }
        }
        // 이전에 읽던 페이지가 있으면 거기서 이어서 시작 (복습 모드는 처음부터)
        if (!review) {
          const total = (data.chapters || []).reduce((n, c) => n + c.sections.length, 0);
          const prog = employee && employee.progress && employee.progress[MODULES[idx].id];
          if (prog && prog.maxSection > 0 && total > 0) {
            const resume = Math.min(prog.maxSection, total - 1);
            setSectionIdx(resume);
            setMaxSection(resume);
          }
        }
      })
      .catch((err) => {
        console.error("모듈 콘텐츠 로드 실패", err);
        setContentStatus("error");
      });
  }

  // 챕터 > 섹션(세부타이틀) 구조를 한 페이지씩 넘길 수 있도록 평탄화
  function flattenSections(content) {
    if (!content || !content.chapters) return [];
    const flat = [];
    for (const ch of content.chapters) {
      for (const s of ch.sections) {
        flat.push({ chapterTitle: ch.chapterTitle, ...s });
      }
    }
    return flat;
  }

  function nextSection() {
    const flat = flattenSections(moduleContent);
    if (sectionIdx < flat.length - 1) {
      setSectionIdx((i) => i + 1);
    } else if (reviewOnly) {
      // 복습 모드: 문제를 풀지 않고 대시보드로 돌아감
      setScreen("employee");
    } else {
      setPhase("quiz");
    }
    window.scrollTo(0, 0);
  }

  // 문제 힌트 → 해당 학습 페이지로 이동 (풀던 답은 그대로 유지)
  function goStudy(qIdx, secIdx) {
    setReturnQ(qIdx);
    setSectionIdx(secIdx);
    setPhase("learn");
    window.scrollTo(0, 0);
  }

  // 학습 페이지 → 풀던 문제로 복귀
  function backToQuiz() {
    const q = returnQ;
    setReturnQ(null);
    setPhase("quiz");
    setTimeout(() => {
      const el = document.getElementById(`q-${q}`);
      if (el) el.scrollIntoView({ block: "center" });
    }, 60);
  }

  // 목차에서 이미 읽은 페이지로 이동
  function goSection(i) {
    setSectionIdx(i);
    window.scrollTo(0, 0);
  }

  function prevSection() {
    if (sectionIdx > 0) {
      setSectionIdx((i) => i - 1);
    }
    window.scrollTo(0, 0);
  }

  useEffect(() => {
    setMaxSection((m) => (sectionIdx > m ? sectionIdx : m));
  }, [sectionIdx]);

  // 읽은 페이지가 늘어날 때마다 진행 상황을 기록에 저장 (복습·완료한 모듈은 제외)
  useEffect(() => {
    if (screen !== "module" || reviewOnly || !employee || !moduleContent) return;
    if (phase !== "learn" || maxSection < 1) return;
    const id = MODULES[moduleIdx].id;
    if (employee.moduleResults.some((r) => r.moduleId === id)) return;
    const total = flattenSections(moduleContent).length;
    const prev = employee.progress && employee.progress[id];
    if (prev && prev.maxSection >= maxSection && prev.total === total) return;
    const rec = {
      ...employee,
      progress: { ...(employee.progress || {}), [id]: { maxSection, total } },
    };
    setEmployee(rec);
    saveEmployee(rec).catch((err) => console.error("진행 저장 실패", err));
  }, [maxSection, screen, moduleContent, phase, reviewOnly, moduleIdx, employee]); // eslint-disable-line react-hooks/exhaustive-deps

  // 영상을 끝까지 재생했을 때 호출 (key: "섹션인덱스_블록인덱스")
  function markVideoWatched(key) {
    setWatchedVideos((prev) => ({ ...prev, [key]: true }));
  }

  function markDetailOpened(key) {
    setOpenedDetails((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }

  function selectAnswer(qIdx, optIdx) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  }

  async function submitQuiz() {
    window.scrollTo(0, 0);
    const mod = MODULES[moduleIdx];
    const questions = moduleContent.questions;
    const total = questions.length;

    // 이번 라운드에 새로 채점할 문제 = 아직 lockedCorrect에 없는 문제들
    const roundIndices = questions
      .map((_, i) => i)
      .filter((i) => !lockedCorrect.includes(i));
    const newlyCorrect = roundIndices.filter((i) => answers[i] === questions[i].correct);
    const updatedLocked = [...lockedCorrect, ...newlyCorrect];
    setLockedCorrect(updatedLocked);
    setLastRoundIndices(roundIndices); // 결과보기 화면에는 "이번에 채점한 문제"만 표시
    setHasSubmitted(true);
    setEditingRetry(false); // 채점 직후에는 항상 "정답+오답 전체 보기" 모드로
    // 화면 전환 없이 같은 퀴즈 화면에서 그대로 채점 결과(맞음/틀림+힌트)를 보여줍니다.

    const attemptNo = attemptsUsed + 1; // 이번이 몇 번째 응시인지 (1 또는 2)
    setAttemptsUsed(attemptNo);

    const isPerfect = updatedLocked.length === total;
    if (!isPerfect && attemptNo < 2) {
      // 1차에서 틀린 문제가 남음 -> 1차 결과를 저장해 두고(나갔다 와도 2번째 시도로 이어짐) 마지막 시도를 기다림
      const rec1 = {
        ...employee,
        quizState: {
          ...(employee.quizState || {}),
          [mod.id]: {
            attempts: 1,
            lockedCorrect: updatedLocked,
            firstScore: updatedLocked.length,
            sig: quizSignature(questions),
          },
        },
      };
      setEmployee(rec1);
      saveEmployee(rec1).catch((err) => console.error("1차 결과 저장 실패", err));
      return;
    }

    // 만점이거나 2번째(마지막) 응시를 마침 -> 이번 모듈 최종 점수를 기록하고 저장
    // 점수 = 1차에서 맞힌 문항 + 2차에서 맞힌 문항
    const result = {
      moduleId: mod.id,
      moduleNo: mod.no,
      moduleTitle: mod.title,
      score: updatedLocked.length,
      total,
      attempts: attemptNo,
      firstScore: attemptNo === 1 ? updatedLocked.length : lockedCorrect.length,
      answers: questions.map((_, i) => (answers[i] !== undefined ? answers[i] : updatedLocked.includes(i) ? questions[i].correct : null)),
      completedAt: nowISO(),
    };
    const rec = { ...employee };
    const others = rec.moduleResults.filter((r) => r.moduleId !== mod.id);
    rec.moduleResults = [...others, result].sort((a, b) => a.moduleNo - b.moduleNo);
    rec.currentModuleIdx = Math.max(rec.currentModuleIdx, moduleIdx + 1);
    const qs = { ...(rec.quizState || {}) };
    delete qs[mod.id];
    rec.quizState = qs;

    const isLastModule = moduleIdx === TOTAL_MODULES - 1;
    if (isLastModule) {
      rec.status = "submitted";
      rec.submittedAt = nowISO();
    }

    setEmployee(rec);
    setLastResult(result);
    saveEmployee(rec).catch((err) => console.error("퀴즈 결과 저장 실패", err));
  }

  // "틀린 문제 다시 풀기" 클릭 -> 정답은 화면에서 사라지고 틀린 문제만 다시 답할 수 있게 전환
  function startRetryEdit() {
    window.scrollTo(0, 0);
    setEditingRetry(true);
  }

  // 문제가 아직 준비되지 않은 모듈 -> 학습 완료로 처리하고 다음 모듈로 진행
  // (실제 채점 결과가 아니므로 moduleResults에는 기록하지 않습니다)
  function skipQuizStub() {
    const isLastModule = moduleIdx === TOTAL_MODULES - 1;
    const rec = { ...employee };
    rec.currentModuleIdx = Math.max(rec.currentModuleIdx, moduleIdx + 1);
    if (isLastModule) {
      rec.status = "submitted";
      rec.submittedAt = nowISO();
    }
    setEmployee(rec);
    saveEmployee(rec).catch((err) => console.error("진행 저장 실패", err));
    if (isLastModule) {
      setScreen("complete");
    } else {
      startModule(moduleIdx + 1);
    }
  }

  function afterResult() {
    const isLastModule = moduleIdx === TOTAL_MODULES - 1;
    if (isLastModule) {
      setScreen("complete");
    } else {
      startModule(moduleIdx + 1);
    }
  }

  /* ---------------- 관리자 : 목록 로드 ---------------- */
  async function loadAdminList(rosterArg) {
    setAdminLoading(true);
    try {
      const roster = Array.isArray(rosterArg)
        ? rosterArg
        : (allowList && allowList.employees) || [];
      const records = [];
      for (const u of roster) {
        let rec = null;
        try {
          const snap = await getDoc(doc(db, "employees", u.id));
          if (snap.exists()) rec = snap.data();
        } catch (_) {
          rec = null; // 아직 한 번도 로그인하지 않음
        }
        if (rec) {
          records.push({ ...rec, department: u.department, active: u.active !== false });
        } else {
          records.push({
            id: u.id,
            name: u.name,
            department: u.department,
            active: u.active !== false,
            loginAt: null,
            lastLoginAt: null,
            currentModuleIdx: 0,
            moduleResults: [],
            status: "not_started",
            submittedAt: null,
          });
        }
      }
      records.sort((a, b) => {
        if (!a.lastLoginAt && !b.lastLoginAt) return 0;
        if (!a.lastLoginAt) return 1;
        if (!b.lastLoginAt) return -1;
        return new Date(b.lastLoginAt) - new Date(a.lastLoginAt);
      });
      setAdminList(records);
    } catch (e) {
      console.error("목록 로드 실패", e);
    } finally {
      setAdminLoading(false);
    }
  }

  /* 선택한 인원의 학습 기록을 삭제 -> 다음 로그인 시 처음부터 다시 응시 */
  async function deleteEmployeeRecords(ids) {
    for (const id of ids) {
      try {
        await deleteDoc(doc(db, "employees", id));
      } catch (e) {
        console.error("삭제 실패", id, e);
      }
    }
    await loadAdminList();
  }

  useEffect(() => {
    if (screen === "admin") loadAdminList();
    // eslint-disable-next-line
  }, [screen]);

  /* ---------------- 새로고침 복원 (대시보드 · 교육/문제 화면에서만) ---------------- */

  // 대시보드 또는 교육/문제 화면에 있을 때만 "지금 어디 있는지"를 저장합니다.
  // 관리자·완료·로그인 화면에서는 저장하지 않고 지웁니다 → 새로고침하면 로그인 화면.
  useEffect(() => {
    try {
      if ((screen === "employee" || screen === "module") && employee) {
        sessionStorage.setItem(
          SESSION_KEY,
          JSON.stringify({
            screen,
            employee,
            moduleIdx,
            sectionIdx,
            maxSection,
            returnQ,
            phase,
            reviewOnly,
            answers,
            lastResult,
            lockedCorrect,
            attemptsUsed,
            hasSubmitted,
            editingRetry,
            lastRoundIndices,
          })
        );
      } else {
        sessionStorage.removeItem(SESSION_KEY);
      }
    } catch (_) {
      /* 저장소 사용 불가 환경은 조용히 무시 */
    }
  }, [screen, employee, moduleIdx, sectionIdx, maxSection, returnQ, phase, reviewOnly, answers, lastResult, lockedCorrect, attemptsUsed, hasSubmitted, editingRetry, lastRoundIndices]);

  // 교육/문제 화면으로 복원된 경우: 교육 자료를 다시 불러옵니다. (대시보드는 불필요)
  useEffect(() => {
    if (!saved || saved.screen !== "module") return;
    fetch(contentUrl(MODULES[saved.moduleIdx]))
      .then((res) => {
        if (!res.ok) throw new Error("콘텐츠를 불러올 수 없습니다.");
        return res.json();
      })
      .then((data) => {
        setModuleContent(data);
        setContentStatus("ready");
        // 자료가 수정되어 섹션 수가 줄었더라도 화면이 비지 않도록 보정
        const total = (data.chapters || []).reduce((n, ch) => n + ch.sections.length, 0);
        setSectionIdx((i) => Math.max(0, Math.min(i, total - 1)));
      })
      .catch(() => setContentStatus("error"));
    // eslint-disable-next-line
  }, []);

  /* ============================================================
     렌더링
     ============================================================ */
  return (
    <div className="app-root">
      {saveError && employee && (screen === "employee" || screen === "module" || screen === "complete") && (
        <div className="save-error-bar" role="alert">
          <span>
            학습 기록을 서버에 저장하지 못했습니다. 인터넷 연결을 확인한 뒤 "다시 저장"을 눌러 주세요.
            (이 화면을 닫거나 새로고침하지 마세요)
          </span>
          <button onClick={retrySave}>다시 저장</button>
        </div>
      )}
      {screen === "login" && (
        <LoginScreen
          role={role}
          setRole={setRole}
          codeInput={codeInput}
          setCodeInput={setCodeInput}
          nameInput={nameInput}
          setNameInput={setNameInput}
          adminIdInput={adminIdInput}
          setAdminIdInput={setAdminIdInput}
          adminPwInput={adminPwInput}
          setAdminPwInput={setAdminPwInput}
          loginError={loginError}
          loading={loading}
          onEmployeeSubmit={handleEmployeeLogin}
          onAdminSubmit={handleAdminLogin}
        />
      )}

      {screen === "employee" && employee && (
        <EmployeeDashboard
          employee={employee}
          onStartModule={(idx) => startModule(idx)}
          onReviewModule={(idx) => startModule(idx, true)}
          onLogout={logout}
        />
      )}

      {screen === "module" && employee && (
        <ModuleScreen
          mod={MODULES[moduleIdx]}
          moduleIdx={moduleIdx}
          moduleContent={moduleContent}
          contentStatus={contentStatus}
          phase={phase}
          reviewOnly={reviewOnly}
          sectionIdx={sectionIdx}
          maxSection={maxSection}
          onGoSection={goSection}
          returnQ={returnQ}
          onGoStudy={goStudy}
          onBackToQuiz={backToQuiz}
          answers={answers}
          lastResult={lastResult}
          lockedCorrect={lockedCorrect}
          attemptsUsed={attemptsUsed}
          hasSubmitted={hasSubmitted}
          editingRetry={editingRetry}
          lastRoundIndices={lastRoundIndices}
          onStartRetryEdit={startRetryEdit}
          watchedVideos={watchedVideos}
          onVideoWatched={markVideoWatched}
          openedDetails={openedDetails}
          onDetailOpened={markDetailOpened}
          onNextSection={nextSection}
          onPrevSection={prevSection}
          onSelectAnswer={selectAnswer}
          onSubmitQuiz={submitQuiz}
          onSkipQuizStub={skipQuizStub}
          onAfterResult={afterResult}
          onBackToDashboard={() => setScreen("employee")}
        />
      )}

      {screen === "complete" && employee && (
        <CompleteScreen employee={employee} onClose={() => setScreen("employee")} />
      )}

      {screen === "admin" && (
        <AdminDashboard
          list={adminList}
          loading={adminLoading}
          onRefresh={loadAdminList}
          selected={selectedEmp}
          setSelected={setSelectedEmp}
          onLogout={logout}
          allowList={allowList}
          onDelete={deleteEmployeeRecords}
          onSaveRoster={saveRoster}
          onImportRoster={importRosterFromFile}
        />
      )}
    </div>
  );
}

/* ============================================================
   로그인 화면
   ============================================================ */
function LoginScreen(props) {
  const {
    role,
    setRole,
    codeInput,
    setCodeInput,
    nameInput,
    setNameInput,
    adminIdInput,
    setAdminIdInput,
    adminPwInput,
    setAdminPwInput,
    loginError,
    loading,
    onEmployeeSubmit,
    onAdminSubmit,
  } = props;

  return (
    <div className="login-shell">
      <div className="login-scene" aria-hidden="true">
        <img src={loginScene} alt="" />
      </div>
      <div className="login-hero">
        <div className="hero-content">
          <div className="hero-logo-badge">
            <img src={logoImg} alt="Green Oil Inc." />
          </div>
          <div className="hero-code">TRAINING PORTAL</div>
          <h1 className="hero-title">Safe Work, Responsible Growth</h1>
          <p className="hero-desc">
            Green Oil Inc. training on company policies, regulations, and workplace safety for
            every team member.
          </p>
          <div className="hero-rule" />
          <h2 className="hero-title-ko">안전하게 일하고, 책임 있게 성장합니다</h2>
          <p className="hero-desc-ko">
            Green Oil 전 임직원을 위한 회사 내규, 관련 법규, 안전 수칙 교육 사이트입니다.
          </p>
        </div>
      </div>

      <div className="login-panel">
        <div className="role-toggle">
          <button
            className={role === "employee" ? "active" : ""}
            onClick={() => setRole("employee")}
          >
            임직원 로그인
          </button>
          <button
            className={role === "admin" ? "active" : ""}
            onClick={() => setRole("admin")}
          >
            관리자 로그인
          </button>
        </div>

        {role === "employee" ? (
          <div className="login-form">
            <h2>임직원 로그인</h2>
            <p className="form-hint">
              이름과 접속코드를 입력하면 이어서 학습할 수 있습니다.
            </p>
            <label>
              이름
              <input
                type="text"
                placeholder="예: 홍길동"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onEmployeeSubmit(e)}
                autoComplete="off"
              />
            </label>
            <label>
              접속코드
              <input
                type="text"
                placeholder="관리자에게 안내받은 접속코드"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onEmployeeSubmit(e)}
                autoComplete="off"
              />
            </label>
            {loginError && <div className="form-error">{loginError}</div>}
            <button
              type="button"
              className="submit-btn"
              disabled={loading}
              onClick={onEmployeeSubmit}
            >
              {loading ? "확인 중..." : "교육 시작하기"}
              <Icon.Arrow className="icon-sm" />
            </button>
          </div>
        ) : (
          <div className="login-form">
            <h2>관리자 로그인</h2>
            <p className="form-hint">전체 임직원의 교육 현황을 조회합니다.</p>
            <label>
              관리자 계정
              <input
                type="text"
                placeholder="ADMIN"
                value={adminIdInput}
                onChange={(e) => setAdminIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAdminSubmit(e)}
                autoComplete="off"
              />
            </label>
            <label>
              접속 코드
              <input
                type="password"
                placeholder="비밀번호 입력"
                value={adminPwInput}
                onChange={(e) => setAdminPwInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onAdminSubmit(e)}
                autoComplete="off"
              />
            </label>
            {loginError && <div className="form-error">{loginError}</div>}
            <button type="button" className="submit-btn admin" onClick={onAdminSubmit}>
              관리자 화면으로 이동
              <Icon.Lock className="icon-sm" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   임직원 대시보드
   ============================================================ */
function EmployeeDashboard({ employee, onStartModule, onReviewModule, onLogout }) {
  const completedCount = employee.moduleResults.length;
  const isSubmitted = employee.status === "submitted";

  return (
    <div className="dash-shell">
      <TopBar
        left={
          <>
            <span className="topbar-logo-badge">
              <img src={logoImg} alt="Green Oil Inc." />
            </span>
            <span>안전·근무수칙 교육</span>
          </>
        }
        right={
          <>
            <span className="user-chip">{employee.name} 님</span>
            <button className="logout-btn" onClick={onLogout}>
              로그아웃
            </button>
          </>
        }
      />

      <div className="dash-body">
        <div className="dash-header">
          <div className="dash-eyebrow">LEARNING ROADMAP</div>
          <h1>내 교육 진행 현황</h1>
          <p>
            {isSubmitted
              ? "모든 모듈 학습과 응시를 완료하여 관리자에게 결과가 제출되었습니다."
              : `총 ${TOTAL_MODULES}개 모듈 중 ${completedCount}개 모듈을 완료했습니다. 순서대로 학습을 진행해 주세요.`}
          </p>
          <div className="dash-legal-note">
            본 교육은 Green Oil Inc. 사내 안전관리규정에 근거하여 제공되며, 전 과정 이수는
            입사 필수 요건입니다.
          </div>
          <div className="progress-head">
            <span>전체 진행</span>
            <strong>
              {completedCount}
              <em> / {TOTAL_MODULES} 모듈 완료</em>
            </strong>
          </div>
          <div className="progress-segments" role="img" aria-label={`${TOTAL_MODULES}개 모듈 중 ${completedCount}개 완료`}>
            {MODULES.map((m, i) => (
              <span
                key={m.id}
                className={
                  i < completedCount ? "seg done" : i === completedCount ? "seg current" : "seg"
                }
              />
            ))}
          </div>
        </div>

        <div className="module-timeline">
          {MODULES.map((m, idx) => {
            const result = employee.moduleResults.find((r) => r.moduleId === m.id);
            const isDone = !!result;
            const isUnlocked = idx <= employee.currentModuleIdx;
            const isCurrent = isUnlocked && !isDone;
            const isLast = idx === MODULES.length - 1;
            const prog = employee.progress && employee.progress[m.id];
            const pct = isDone
              ? 100
              : prog && prog.total > 0
                ? Math.min(99, Math.round((prog.maxSection / prog.total) * 100))
                : 0;
            const hasProgress = !isDone && !!prog && prog.maxSection > 0;

            return (
              <div
                key={m.id}
                className={`timeline-row ${isDone ? "done" : ""} ${
                  isCurrent ? "current" : ""
                } ${!isUnlocked ? "locked" : ""}`}
              >
                <div className="timeline-rail">
                  <div className="timeline-node">
                    {isDone ? (
                      <Icon.Check className="icon-sm" />
                    ) : !isUnlocked ? (
                      <Icon.Lock className="icon-xs" />
                    ) : (
                      String(m.no).padStart(2, "0")
                    )}
                  </div>
                  {!isLast && <div className="timeline-line" />}
                </div>

                <div className="timeline-card">
                  <div className="timeline-main">
                    <div className="timeline-badge-row">
                      <span className="timeline-no">MODULE {String(m.no).padStart(2, "0")}</span>
                      <span
                        className={`timeline-pill ${
                          isDone ? "done" : isCurrent ? "current" : "locked"
                        }`}
                      >
                        {isDone ? "완료" : hasProgress ? "학습 중" : isCurrent ? "학습 가능" : "잠김"}
                      </span>
                    </div>
                    <div className="timeline-title">{m.title}</div>
                    <div className="timeline-sub">{m.subtitle}</div>
                    <div className="timeline-meta">
                      학습목표 {m.objectives ? m.objectives.length : 0}개
                      {isDone && (
                        <>
                          {" "}
                          · 점수 {result.score}/{result.total} ·{" "}
                          {fmtDate(result.completedAt)}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="timeline-action">
                    <div className="timeline-progress" aria-label={`진행률 ${pct}%`}>
                      <div className="timeline-progress-track">
                        <div
                          className="timeline-progress-fill"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span>{pct}%</span>
                    </div>
                    {isDone ? (
                      <>
                        <button className="review-btn" onClick={() => onReviewModule(idx)}>
                          복습하기
                        </button>
                      </>
                    ) : isUnlocked ? (
                      <button className="start-btn" onClick={() => onStartModule(idx)}>
                        {hasProgress ? "이어서 학습" : "학습 시작"}
                        <Icon.Arrow className="icon-sm" />
                      </button>
                    ) : (
                      <span className="timeline-status locked">이전 모듈을 완료하면 열립니다</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {isSubmitted && (
          <div className="submitted-banner">
            <Icon.Check className="icon-sm" />
            교육을 모두 완료했습니다. 결과는 관리자 화면에서 확인 가능합니다. (제출일시:{" "}
            {fmtDate(employee.submittedAt)})
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   모듈 학습 / 퀴즈 화면
   ============================================================ */
function ModuleScreen({
  mod,
  moduleIdx,
  moduleContent,
  contentStatus,
  phase,
  reviewOnly,
  sectionIdx,
  maxSection,
  onGoSection,
  returnQ,
  onGoStudy,
  onBackToQuiz,
  answers,
  lastResult,
  lockedCorrect,
  attemptsUsed,
  hasSubmitted,
  editingRetry,
  lastRoundIndices,
  watchedVideos,
  onVideoWatched,
  openedDetails,
  onDetailOpened,
  onNextSection,
  onPrevSection,
  onSelectAnswer,
  onSubmitQuiz,
  onStartRetryEdit,
  onSkipQuizStub,
  onAfterResult,
  onBackToDashboard,
}) {
  const isLastModule = moduleIdx === TOTAL_MODULES - 1;
  const hasQuiz = !!(
    moduleContent &&
    moduleContent.questions &&
    moduleContent.questions.length
  );
  const quizTotal = hasQuiz ? moduleContent.questions.length : 0;
  // 이번 라운드에 풀어야 하는(=아직 못 맞춘) 문제
  const activeQuizIndices = hasQuiz
    ? moduleContent.questions.map((_, i) => i).filter((i) => !lockedCorrect.includes(i))
    : [];
  const isPerfect = hasQuiz && lockedCorrect.length === quizTotal;
  // 3가지 화면 상태: ① 최초(아직 한 번도 채점 안 함) ② 결과보기(정답+오답 전부 표시)
  // ③ 편집중(틀린 문제만 남겨서 다시 답을 고르는 중)
  // 모듈당 최대 2번만 응시: 2번 응시했으면(finalized) 더 이상 다시 풀 수 없고 그 점수가 최종 점수입니다.
  const finalized = attemptsUsed >= 2;
  const reviewMode = hasSubmitted && !editingRetry && !isPerfect;
  const editMode = hasSubmitted && editingRetry && !isPerfect && !finalized;
  // 이번 라운드에 보여지는(아직 안 맞은) 문항에 전부 답을 골랐을 때만 제출 가능
  const allAnswered =
    hasQuiz &&
    activeQuizIndices.every((i) => answers[i] !== null && answers[i] !== undefined);

  const flat = (() => {
    if (!moduleContent || !moduleContent.chapters) return [];
    const out = [];
    for (const ch of moduleContent.chapters) {
      for (const s of ch.sections) out.push({ chapterTitle: ch.chapterTitle, ...s });
    }
    return out;
  })();
  const current = flat[sectionIdx];

  // 현재 섹션에 영상이 있으면, 전부 끝까지 시청해야만 다음으로 넘어갈 수 있음
  const sectionVideoBlocks = current
    ? current.blocks.map((b, i) => ({ b, i })).filter(({ b }) => b.type === "video")
    : [];
  const allVideosWatched = sectionVideoBlocks.every(
    ({ i }) => watchedVideos[`${sectionIdx}_${i}`]
  );
  const videoLocked = !reviewOnly && sectionVideoBlocks.length > 0 && !allVideosWatched;

  // 현재 섹션의 "자세한 설명 보기"를 모두 열어 봐야 다음으로 넘어갈 수 있음
  const sectionDetailKeys = current
    ? current.blocks
        .map((b, i) => (b.type === "details" ? `${sectionIdx}_d${i}` : null))
        .filter(Boolean)
    : [];
  const unopenedDetails = sectionDetailKeys.filter((k) => !(openedDetails && openedDetails[k]));
  const detailsLocked = !reviewOnly && unopenedDetails.length > 0;
  const navLocked = videoLocked || detailsLocked;

  // 목차: 챕터별로 묶고, 도달한 페이지까지만 이동 가능 (복습 모드는 전체)
  const reachedMax = reviewOnly ? flat.length - 1 : maxSection;
  const tocGroups = [];
  flat.forEach((f, i) => {
    let g = tocGroups[tocGroups.length - 1];
    if (!g || g.title !== f.chapterTitle) {
      g = { title: f.chapterTitle, items: [] };
      tocGroups.push(g);
    }
    g.items.push({ i, title: f.sectionTitle });
  });
  const [tocOpen, setTocOpen] = useState(false);

  return (
    <div className="dash-shell">
      <TopBar
        left={
          <>
            <span className="topbar-logo-badge">
              <img src={logoImg} alt="Green Oil Inc." />
            </span>
            <span>
              모듈 {mod.no} · {mod.title}
            </span>
          </>
        }
        right={
          <button className="logout-btn" onClick={onBackToDashboard}>
            대시보드로
          </button>
        }
      />

      <div className="module-body">
        {contentStatus === "loading" && (
          <div className="content-loading">학습 자료를 불러오는 중입니다...</div>
        )}
        {contentStatus === "error" && (
          <div className="content-error">
            학습 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        )}

        {contentStatus === "ready" && phase === "learn" && current && (
          <div className={`learn-layout ${returnQ === null ? "with-toc" : ""}`}>
            {returnQ === null && (
              <nav className="learn-toc" aria-label={`모듈 ${mod.no} 목차`}>
                <button
                  type="button"
                  className="toc-toggle"
                  aria-expanded={tocOpen}
                  onClick={() => setTocOpen((o) => !o)}
                >
                  목차 · {sectionIdx + 1} / {flat.length}
                  <span aria-hidden="true">{tocOpen ? "▴" : "▾"}</span>
                </button>
                <div className={`toc-body ${tocOpen ? "open" : ""}`}>
                  <div className="toc-label">목차 · {sectionIdx + 1} / {flat.length}</div>
                  {tocGroups.map((g) => (
                    <div className="toc-group" key={g.title}>
                      <div className="toc-group-title">{g.title}</div>
                      {g.items.map((it) => {
                        const isCur = it.i === sectionIdx;
                        const isDoneItem = it.i < sectionIdx || (it.i <= reachedMax && !isCur);
                        const canGo = it.i <= reachedMax && !isCur;
                        return (
                          <button
                            type="button"
                            key={it.i}
                            className={`toc-item ${isCur ? "current" : ""} ${
                              isDoneItem ? "done" : ""
                            }`}
                            aria-current={isCur ? "page" : undefined}
                            disabled={!canGo && !isCur}
                            onClick={() => {
                              if (canGo) {
                                setTocOpen(false);
                                onGoSection(it.i);
                              }
                            }}
                          >
                            <span className="toc-mark" aria-hidden="true">
                              {isDoneItem && !isCur ? <Icon.Check className="icon-xs" /> : null}
                            </span>
                            <span>{it.title}</span>
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </nav>
            )}
          <div className="learn-panel">
            <div className="learn-progress-bar">
              <div
                className="learn-progress-fill"
                style={{ width: `${((sectionIdx + 1) / flat.length) * 100}%` }}
              />
            </div>
            <div className="learn-tag">
              {current.chapterTitle} · {sectionIdx + 1} / {flat.length}
            </div>
            {sectionIdx === 0 && mod.objectives && (
              <div className="objectives-box">
                <div className="objectives-title">이 모듈의 학습목표</div>
                <ul className="objectives-list">
                  {mod.objectives.map((o, i) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>
            )}
            {returnQ !== null && (
              <button className="return-quiz-btn" onClick={onBackToQuiz}>
                <Icon.Arrow className="icon-sm icon-flip" />
                문제 {returnQ + 1}번으로 돌아가기
              </button>
            )}
            <h2>{current.sectionTitle}</h2>
            <ContentBlocks
              blocks={current.blocks}
              folder={mod.folder}
              sectionIdx={sectionIdx}
              watchedVideos={watchedVideos}
              onVideoWatched={onVideoWatched}
              onDetailOpened={onDetailOpened}
              openAll={returnQ !== null}
              autoPlayFirst={returnQ === null}
            />
            {videoLocked && (
              <div className="video-lock-notice">
                이 섹션의 영상을 끝까지 시청해야 다음으로 넘어갈 수 있습니다. (구간
                이동/빨리감기는 되지 않습니다)
              </div>
            )}
            {detailsLocked && returnQ === null && (
              <div className="video-lock-notice">
                이 페이지의 '자세한 설명 보기'를 모두 열어서 확인해야 다음으로 넘어갈 수
                있습니다. (아직 열지 않은 항목 {unopenedDetails.length}개)
              </div>
            )}
            {returnQ !== null ? (
              <div className="learn-nav">
                <button className="submit-btn" onClick={onBackToQuiz}>
                  <Icon.Arrow className="icon-sm icon-flip" />
                  문제 {returnQ + 1}번으로 돌아가기
                </button>
              </div>
            ) : (
            <div className="learn-nav">
              {sectionIdx > 0 && (
                <button className="submit-btn ghost" onClick={onPrevSection}>
                  <Icon.Arrow className="icon-sm icon-flip" />
                  이전 학습
                </button>
              )}
              <button
                className="submit-btn"
                disabled={navLocked}
                onClick={onNextSection}
              >
                {sectionIdx < flat.length - 1
                  ? "다음 학습"
                  : reviewOnly
                    ? "복습 완료 · 대시보드로"
                    : "문제 풀기"}
                <Icon.Arrow className="icon-sm" />
              </button>
            </div>
            )}
          </div>
          </div>
        )}

        {contentStatus === "ready" && phase === "quiz" && !hasQuiz && (
          <div className="quiz-stub">
            <div className="quiz-stub-icon">
              <Icon.Check className="icon-lg" />
            </div>
            <h2>학습을 완료했습니다</h2>
            <p>
              이 모듈의 확인 문제는 현재 준비 중입니다. 문제가 등록되면 이어서 응시하실 수
              있습니다.
            </p>
            <button className="submit-btn" onClick={onSkipQuizStub}>
              {isLastModule ? "교육 완료 화면으로" : "다음 모듈로 이동"}
              <Icon.Arrow className="icon-sm" />
            </button>
          </div>
        )}

        {contentStatus === "ready" && phase === "quiz" && hasQuiz && (
          <div className="quiz-panel">
            <div className="learn-tag">
              {finalized || isPerfect
                ? `최종 점수 · 모듈 ${mod.no} (${lockedCorrect.length} / ${quizTotal})`
                : reviewMode
                  ? `1차 채점 결과 · 모듈 ${mod.no} (${lockedCorrect.length} / ${quizTotal} 맞음)`
                  : editMode
                    ? `마지막 시도 (2/2) · 모듈 ${mod.no} (${activeQuizIndices.length}문항)`
                    : `확인 문제 · 모듈 ${mod.no}`}
            </div>

            {!hasSubmitted && (
              <div className="retry-notice">
                문제는 모듈당 최대 2번 풀 수 있습니다. 1차에서 틀린 문제만 한 번 더 풀 수 있고,
                마지막 결과가 최종 점수입니다.
              </div>
            )}
            {reviewMode && !finalized && (
              <div className="retry-notice">
                1차 채점: {lastRoundIndices.length}문항 중 정답{" "}
                {lastRoundIndices.filter((i) => lockedCorrect.includes(i)).length}개, 오답{" "}
                {lastRoundIndices.filter((i) => !lockedCorrect.includes(i)).length}개입니다.
                오답 아래 힌트를 확인하신 뒤 "틀린 문제 다시 풀기"로 마지막 시도(2/2)를
                해 주세요. 2번째 결과가 최종 점수입니다.
              </div>
            )}
            {editMode && (
              <div className="retry-notice">
                마지막 시도입니다. 맞힌 문제는 화면에서 사라지고, 틀린{" "}
                {activeQuizIndices.length}문항만 남았습니다. 답을 고른 뒤 제출하면 최종 점수가
                확정됩니다.
              </div>
            )}
            {finalized && !isPerfect && (
              <div className="retry-notice">
                2번의 응시가 모두 끝났습니다. 최종 점수는 {lockedCorrect.length} /{" "}
                {quizTotal}점입니다. 오답 아래 힌트로 복습하신 뒤 다음으로 이동하세요.
              </div>
            )}
            {isPerfect && (
              <div className="retry-notice perfect">
                전 문항을 맞혔습니다! 최종 점수 {lockedCorrect.length} / {quizTotal}점입니다.
                아래 버튼으로 다음으로 이동하세요.
              </div>
            )}

            {!isPerfect &&
              (reviewMode ? lastRoundIndices : moduleContent.questions.map((_, i) => i))
                .slice()
                .sort((a, b) => a - b)
                .map((qi) => {
                  const q = moduleContent.questions[qi];
                  const isLocked = lockedCorrect.includes(qi);
                  // 편집중(틀린 문제만 다시 풀기)일 때는 이미 맞힌 문제를 화면에서 완전히 숨김
                  if (editMode && isLocked) return null;
                  const isWrong = hasSubmitted && !isLocked;
                  const isReadOnly = reviewMode; // 결과보기 화면에서는 선택지를 고를 수 없음(확인만)
                  return (
                    <div
                      className={`quiz-question ${isLocked ? "locked-correct" : ""} ${
                        isWrong ? "graded-wrong" : ""
                      }`}
                      key={qi}
                      id={`q-${qi}`}
                    >
                      <div className="quiz-q-title">
                        Q{qi + 1}. {q.q}
                        {isLocked && <span className="quiz-q-badge">✓ 정답</span>}
                      </div>

                      {isLocked ? (
                        <div className="quiz-locked-answer">{q.options[q.correct]}</div>
                      ) : (
                        <>
                          <div className={`quiz-options ${isReadOnly ? "readonly" : ""}`}>
                            {q.options.map((opt, oi) => {
                              const isPicked = answers[qi] === oi;
                              return (
                                <label
                                  key={oi}
                                  className={`quiz-option ${isPicked ? "selected" : ""} ${
                                    isWrong && isPicked ? "wrong" : ""
                                  }`}
                                >
                                  <input
                                    type="radio"
                                    name={`q-${qi}`}
                                    checked={isPicked}
                                    disabled={isReadOnly}
                                    onChange={() => onSelectAnswer(qi, oi)}
                                  />
                                  {opt}
                                </label>
                              );
                            })}
                          </div>
                          {isWrong && (
                            <div className="quiz-hint">
                              <strong>오답입니다.</strong> {q.explain}
                              {(() => {
                                const target = q.ref
                                  ? flat.findIndex((f) =>
                                      (f.sectionTitle || "").startsWith(q.ref + ".")
                                    )
                                  : -1;
                                return target >= 0 ? (
                                  <button
                                    type="button"
                                    className="hint-go-btn"
                                    onClick={() => onGoStudy(qi, target)}
                                  >
                                    학습 페이지에서 확인하기
                                    <Icon.Arrow className="icon-sm" />
                                  </button>
                                ) : null;
                              })()}
                            </div>
                          )}
                      </>
                    )}
                  </div>
                );
              })}

            {isPerfect || finalized ? (
              <button className="submit-btn" onClick={onAfterResult}>
                {isLastModule ? "교육 완료 화면으로" : "다음 모듈로 이동"}
                <Icon.Arrow className="icon-sm" />
              </button>
            ) : reviewMode ? (
              <button className="submit-btn" onClick={onStartRetryEdit}>
                틀린 문제 다시 풀기
                <Icon.Arrow className="icon-sm" />
              </button>
            ) : (
              <button className="submit-btn" disabled={!allAnswered} onClick={onSubmitQuiz}>
                {editMode ? "최종 제출하기" : "답안 제출"}
                <Icon.Arrow className="icon-sm" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* 학습 섹션의 본문 블록(text/bullets/subheading/image/video/table)을 순서대로 렌더링 */
/* 영상을 끝까지 봐야 완료 처리되고, 이미 본 지점보다 앞으로는 이동할 수 없는 재생 컴포넌트 */
function VideoGuard({ src, watched, onComplete, autoPlay, registerRef, playFn, onEndedNext }) {
  const maxTimeRef = useRef(watched ? Infinity : 0);
  const vref = useRef(null);

  // 영상 요소를 부모에 등록하고, 첫 영상이면 열리자마자 재생합니다
  useEffect(() => {
    if (registerRef) registerRef(vref.current);
    if (autoPlay && playFn && vref.current) playFn(vref.current);
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  // 다른 영상으로 바뀌거나(=src 변경), 이미 완료 처리된 영상이면 잠금을 풉니다
  useEffect(() => {
    maxTimeRef.current = watched ? Infinity : 0;
  }, [src, watched]);

  function handleTimeUpdate(e) {
    if (watched) return;
    if (e.target.currentTime > maxTimeRef.current) {
      maxTimeRef.current = e.target.currentTime;
    }
  }

  function handleSeeking(e) {
    if (watched) return;
    // 아직 보지 않은 구간(현재까지 본 지점 + 약간의 오차)보다 앞으로 이동하면 되돌림
    if (e.target.currentTime > maxTimeRef.current + 0.75) {
      e.target.currentTime = maxTimeRef.current;
    }
  }

  function handleRateChange(e) {
    // 배속(빨리감기 재생)도 항상 1배속으로 고정
    if (e.target.playbackRate !== 1) e.target.playbackRate = 1;
  }

  function handleEnded() {
    maxTimeRef.current = Infinity;
    onComplete();
    if (onEndedNext) onEndedNext(); // 다음 영상이 있으면 이어서 재생
  }

  return (
    <video
      key={src}
      ref={vref}
      src={src}
      controls
      controlsList="nodownload noplaybackrate"
      preload="none"
      playsInline
      onTimeUpdate={handleTimeUpdate}
      onSeeking={handleSeeking}
      onRateChange={handleRateChange}
      onEnded={handleEnded}
    />
  );
}

/* ============================================================
   본문 표시 — 웹 주소(예: wsib.on.ca/reporting)는 자동으로 링크 처리합니다.
   (본문 내용에는 강조 표시를 사용하지 않습니다)
   ============================================================ */
const URL_RE = new RegExp(
  "((?:https?:\\/\\/)?(?:www\\.)?[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:ca|com|org|net|gov)(?:\\/[^\\s,)]*[^\\s,).])?)",
  "gi"
);

function renderText(text) {
  if (typeof text !== "string" || !text) return text;
  const out = [];
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(URL_RE)) {
    if (m.index > last) out.push(text.slice(last, m.index));
    out.push(
      <a
        className="text-link"
        key={k++}
        href={/^https?:\/\//i.test(m[0]) ? m[0] : `https://${m[0]}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        {m[0]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function ContentBlocks({
  blocks,
  folder,
  sectionIdx,
  watchedVideos,
  onVideoWatched,
  onDetailOpened,
  openAll,
  autoPlayFirst,
}) {
  // 이 페이지의 영상 목록(순서대로): 첫 영상은 바로 재생, 끝나면 다음 영상을 이어서 재생
  const videoIdxs = blocks.map((b, i) => (b.type === "video" ? i : -1)).filter((i) => i >= 0);
  const videoEls = useRef([]);
  const mutedRef = useRef(false);
  const [autoMuted, setAutoMuted] = useState(false);

  function playVideo(el) {
    if (!el) return;
    el.muted = mutedRef.current;
    const p = el.play();
    if (p && p.catch) {
      p.catch((err) => {
        // 브라우저가 소리 있는 자동재생을 막은 경우(NotAllowedError)에만,
        // 소리를 끈 채로라도 시작합니다
        if (mutedRef.current || !err || err.name !== "NotAllowedError") return;
        mutedRef.current = true;
        el.muted = true;
        setAutoMuted(true);
        const p2 = el.play();
        if (p2 && p2.catch) p2.catch(() => {});
      });
    }
  }

  return (
    <div className="content-blocks">
      {autoMuted && (
        <div className="video-guard-tag">
          브라우저 설정으로 소리가 꺼진 채 시작되었습니다. 영상의 스피커 버튼을 눌러 소리를 켜세요.
        </div>
      )}
      {blocks.map((b, i) => {
        if (b.type === "subheading") {
          return (
            <div className="block-subheading" key={i}>
              {b.text}
            </div>
          );
        }
        if (b.type === "details") {
          return (
            <details
              className="block-details"
              key={`${sectionIdx}-${i}-${openAll ? "o" : "c"}`}
              open={!!openAll}
              onToggle={(e) => {
                if (e.currentTarget.open && !openAll && onDetailOpened)
                  onDetailOpened(`${sectionIdx}_d${i}`);
              }}
            >
              <summary>{b.title || "자세히 보기"}</summary>
              <ContentBlocks
                blocks={b.blocks}
                folder={folder}
                sectionIdx={sectionIdx}
                watchedVideos={watchedVideos}
                onVideoWatched={onVideoWatched}
                openAll={openAll}
              />
            </details>
          );
        }
        if (b.type === "text") {
          return (
            <p className="block-text" key={i}>
              {renderText(b.text)}
            </p>
          );
        }
        if (b.type === "bullets") {
          return (
            <ul className="block-bullets" key={i}>
              {b.items.map((it, j) => (
                <li key={j}>{renderText(it.text)}</li>
              ))}
            </ul>
          );
        }
        if (b.type === "image") {
          return (
            <figure
              className={`block-image size-${(b.size || "full").toLowerCase()}`}
              key={i}
            >
              <img src={withBase(`${folder}/${b.file}`)} alt={b.caption || ""} loading="lazy" />
              {b.caption && <figcaption>{b.caption}</figcaption>}
            </figure>
          );
        }
        if (b.type === "video") {
          const videoKey = `${sectionIdx}_${i}`;
          const isWatched = !!(watchedVideos && watchedVideos[videoKey]);
          return (
            <figure
              className={`block-video size-${(b.size || "full").toLowerCase()}`}
              key={i}
            >
              <VideoGuard
                src={withBase(`${folder}/${b.file}`)}
                watched={isWatched}
                onComplete={() => onVideoWatched && onVideoWatched(videoKey)}
                autoPlay={!!autoPlayFirst && videoIdxs.indexOf(i) === 0}
                registerRef={(el) => {
                  videoEls.current[videoIdxs.indexOf(i)] = el;
                }}
                playFn={playVideo}
                onEndedNext={() => {
                  const next = videoEls.current[videoIdxs.indexOf(i) + 1];
                  if (next) {
                    next.scrollIntoView({ block: "center", behavior: "smooth" });
                    playVideo(next);
                  }
                }}
              />
              {b.caption && <figcaption>{b.caption}</figcaption>}
              {!isWatched && (
                <div className="video-guard-tag">
                  ⚠ 끝까지 시청해야 완료로 표시됩니다 (구간 이동 불가)
                </div>
              )}
            </figure>
          );
        }
        if (b.type === "steps") {
          return (
            <ol className="block-steps" key={i}>
              {b.items.map((it, j) => (
                <li key={j}>
                  <span className="step-no">{String(j + 1).padStart(2, "0")}</span>
                  <span className="step-text">{renderText(it.text)}</span>
                </li>
              ))}
            </ol>
          );
        }
        if (b.type === "flow") {
          return (
            <div
              className={`block-flow ${b.tone === "warn" ? "warn" : ""} ${b.nodes.length > 3 ? "many" : ""}`}
              key={i}
            >
              <div className="flow-row">
                {b.nodes.map((nd, j) => (
                  <Fragment key={j}>
                    {j > 0 && (
                      <span className="flow-arrow" aria-hidden="true">
                        →
                      </span>
                    )}
                    <div className="flow-node">
                      <div className="flow-title">{nd.title}</div>
                      <ul>
                        {nd.lines.map((ln, k) => (
                          <li key={k}>{renderText(ln)}</li>
                        ))}
                      </ul>
                    </div>
                  </Fragment>
                ))}
              </div>
              {b.note && <p className="flow-note">{b.note}</p>}
            </div>
          );
        }
        if (b.type === "table") {
          const [head, ...rows] = b.rows;
          const cw = b.colWidths || [];
          const colInfo = (head || rows[0] || []).map((_, ci) => {
            const w = cw[ci];
            if (typeof w === "string" && w.startsWith("fit:"))
              return { fit: true, min: parseInt(w.slice(4), 10) };
            return { w };
          });
          const hasFit = colInfo.some((c) => c.fit);
          const wrapStyle = {};
          if (b.maxWidth) wrapStyle.maxWidth = b.maxWidth;
          if (b.align === "center") wrapStyle.margin = "0 auto 20px";
          const cards = b.mobile === "cards";
          return (
            <Fragment key={i}>
              <div
                className={"block-table-wrap" + (cards ? " has-cards" : "")}
                style={wrapStyle}
              >
                <table className={"block-table" + (hasFit || !b.colWidths ? "" : " fixed")}>
                  {b.colWidths && (
                    <colgroup>
                      {colInfo.map((c, ci) => (
                        <col
                          key={ci}
                          style={
                            c.fit
                              ? { width: "1%" }
                              : c.w == null
                                ? undefined
                                : { width: typeof c.w === "number" ? c.w + "%" : c.w }
                          }
                        />
                      ))}
                    </colgroup>
                  )}
                  {head && (
                    <thead>
                      <tr>
                        {head.map((c, j) => (
                          <th key={j} className={colInfo[j]?.fit ? "f" : undefined} style={colInfo[j]?.fit ? { minWidth: colInfo[j].min } : undefined}>{c}</th>
                        ))}
                      </tr>
                    </thead>
                  )}
                  <tbody>
                    {rows.map((r, ri) => (
                      <tr key={ri}>
                        {r.map((c, ci) => (
                          <td key={ci} className={colInfo[ci]?.fit ? "f" : undefined} style={colInfo[ci]?.fit ? { minWidth: colInfo[ci].min } : undefined}>{renderText(c)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {cards && (
                <div className="table-cards">
                  {rows.map((r, ri) => (
                    <div className="table-card" key={ri}>
                      {r.map((c, ci) => (
                        <div className="table-card-line" key={ci}>
                          <span className="table-card-h">{head?.[ci]}</span>
                          <span>{renderText(c)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </Fragment>
          );
        }
        return null;
      })}
    </div>
  );
}

/* ============================================================
   최종 완료 화면
   ============================================================ */
function CompleteScreen({ employee, onClose }) {
  const [showSent, setShowSent] = useState(false);
  const totalModules = employee.moduleResults.length;
  const sortedResults = [...employee.moduleResults].sort((a, b) => a.moduleNo - b.moduleNo);

  return (
    <div className="cert-shell">
      {/* 배경(로고·제목·잎사귀·테두리)은 템플릿 이미지, 이름/점수/이수일만 코드로 채움 */}
      <div className="cert-card" style={{ backgroundImage: `url(${certTemplate})` }}>
        <div className="cert-body">
          <div className="cert-name">{employee.name}</div>

          <p className="cert-statement">
            위 사람은 Green Oil Inc.의 안전·근무수칙 교육과정
            <br />
            전 {totalModules}개 모듈을 이수하였음을 증명합니다.
          </p>

          <div className="cert-modules">
            {sortedResults.map((r) => (
              <div className="cert-module-row" key={r.moduleId}>
                <span className="cert-check-badge">
                  <Icon.Check className="icon-xs" />
                </span>
                <span className="cert-module-title">
                  모듈 {r.moduleNo}. {r.moduleTitle}
                </span>
                <span className="cert-module-score">
                  {r.score} / {r.total}
                </span>
              </div>
            ))}
          </div>

          <div className="cert-date-small">이수일 {fmtDate(employee.submittedAt)}</div>
        </div>
      </div>

      <button className="cert-close-btn" onClick={() => setShowSent(true)}>
        제출 후 닫기
      </button>

      {showSent && (
        <div className="cert-modal-backdrop" role="dialog" aria-modal="true">
          <div className="cert-modal">
            <div className="cert-modal-icon">
              <Icon.Check className="icon-lg" />
            </div>
            <p>관리자에게 수료증이 전달되었습니다.</p>
            <button className="submit-btn" onClick={onClose}>
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   관리자 대시보드
   ============================================================ */
function AdminDashboard({
  list,
  loading,
  onRefresh,
  selected,
  setSelected,
  onLogout,
  allowList,
  onDelete,
  onSaveRoster,
  onImportRoster,
}) {
  const roster = (allowList && allowList.employees) || [];
  const activeRoster = roster.filter((u) => u.active !== false); // 비활성 임직원은 통계에서 제외
  const [showRoster, setShowRoster] = useState(false);
  const deptOf = (u) => u.department || "미지정";

  // 모듈별 문항 수 (교육 자료 파일에서 읽어옴 → 문제를 추가/삭제해도 자동 반영)
  const [questionCounts, setQuestionCounts] = useState(null);
  useEffect(() => {
    let alive = true;
    Promise.all(
      MODULES.map((m) =>
        fetch(contentUrl(m))
          .then((res) => (res.ok ? res.json() : null))
          .then((d) => (d && Array.isArray(d.questions) ? d.questions.length : null))
          .catch(() => null)
      )
    ).then((counts) => {
      if (alive && counts.every((n) => n !== null)) setQuestionCounts(counts);
    });
    return () => {
      alive = false;
    };
  }, []);
  const totalQuestions = questionCounts ? questionCounts.reduce((a, n) => a + n, 0) : 0;

  // 현재 문항 수 기준 점수. 문제를 삭제해 응시 당시보다 문항이 줄었다면 점수도 현재 문항 수를 넘지 않게 맞춥니다.
  // (예: 11문항 중 10개 정답 → 틀린 문제를 삭제하면 10/10)
  // 응시 후 문제가 줄어든 경우, 틀린/맞힌 문제 중 어느 것이 삭제됐는지는 기록에 없으므로 점수는 현재 문항 수를 넘지 않는 선까지만 인정합니다.
  // (문항 수를 아직 못 불러왔으면 저장된 문항 수로 대신 표시)
  const curCount = (m, x) => (questionCounts ? questionCounts[m.no - 1] : x ? x.total : 0) || 0;
  const modScore = (m, x) => (x ? Math.min(x.score || 0, curCount(m, x)) : 0);
  function scoreInfo(r) {
    let sum = 0;
    let max = 0;
    let lost = 0; // 응시한 모듈에서 틀린 문항 수 (아직 안 푼 모듈은 감점으로 보지 않음)
    for (const m of MODULES) {
      const x = r.moduleResults.find((y) => y.moduleId === m.id);
      const sc = modScore(m, x);
      sum += sc;
      max += curCount(m, x);
      if (x) lost += curCount(m, x) - sc;
    }
    const allDone = MODULES.every((m) => r.moduleResults.some((y) => y.moduleId === m.id));
    return { sum, max, lost, perfect: allDone && max > 0 && lost === 0, pct: max ? Math.floor((sum / max) * 100) : 0 };
  }

  // Firestore 기록(r.id)에 해당하는 최신 접속코드를 allowed-users.json에서 실시간으로 찾아옵니다.
  const codeOf = (id) => {
    const found = roster.find((u) => u.id === id);
    return found ? found.code : "-";
  };

  // 부서 목록 (명단 파일에 나온 순서). 통계 제외 부서(TEST)는 부서별 현황표에서 뺍니다.
  const deptOrder = [...new Set(activeRoster.map(deptOf))];
  const statDepts = deptOrder.filter((d) => !STATS_EXCLUDED_DEPARTMENTS.includes(d));

  const [showKey, setShowKey] = useState(false); // 문제·정답 보기 창
  const [deptSel, setDeptSel] = useState([]); // 선택한 부서들 (비어 있으면 전체)
  const [checkedIds, setCheckedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);

  // ---- 부서별 집계 (인원은 명단 기준, 상태는 학습 기록 기준) ----
  const statusById = new Map(list.map((r) => [r.id, r.status]));
  function summarize(members) {
    let done = 0;
    let prog = 0;
    for (const u of members) {
      const s = statusById.get(u.id);
      if (s === "submitted") done += 1;
      else if (s === "in_progress") prog += 1;
    }
    const total = members.length;
    return {
      total,
      done,
      prog,
      idle: total - done - prog,
      rate: total ? Math.round((done / total) * 100) : 0,
    };
  }
  const overall = summarize(
    activeRoster.filter((u) => !STATS_EXCLUDED_DEPARTMENTS.includes(deptOf(u)))
  );
  const deptRows = statDepts.map((d) => ({
    name: d,
    ...summarize(activeRoster.filter((u) => deptOf(u) === d)),
  }));
  const isAll = deptSel.length === 0;
  const scopeMembers = isAll
    ? activeRoster.filter((u) => !STATS_EXCLUDED_DEPARTMENTS.includes(deptOf(u)))
    : activeRoster.filter((u) => deptSel.includes(deptOf(u)));
  const scope = isAll ? overall : summarize(scopeMembers);
  const scopeLabel = isAll ? "전체" : deptSel.join(", ");
  // 만점자 수 (모든 모듈 완료 + 틀린 문항 없음)
  const recById = new Map(list.map((r) => [r.id, r]));
  const perfectCount = scopeMembers.filter((u) => {
    const r = recById.get(u.id);
    return r && scoreInfo(r).perfect;
  }).length;

  // ---- 표에 보이는 인원 (선택한 부서만) ----
  const visible = isAll ? list : list.filter((r) => deptSel.includes(deptOf(r)));
  const visibleIds = visible.map((r) => r.id);
  const allChecked =
    visible.length > 0 && visibleIds.every((id) => checkedIds.includes(id));
  const someChecked = checkedIds.length > 0;

  // 부서를 바꾸면 선택을 비웁니다 (안 보이는 부서 사람이 실수로 삭제되는 것을 방지)
  function selectDept(d) {
    setDeptSel(d === "ALL" ? [] : [d]);
    setCheckedIds([]);
  }
  // 부서를 여러 개 중복 선택/해제
  function toggleDept(d) {
    setDeptSel((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));
    setCheckedIds([]);
  }
  function toggleOne(id) {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }
  function toggleAll() {
    setCheckedIds(allChecked ? [] : visibleIds);
  }

  async function handleDeleteSelected() {
    if (checkedIds.length === 0) return;
    const names = list
      .filter((r) => checkedIds.includes(r.id))
      .map((r) => r.name)
      .join(", ");
    const ok = window.confirm(
      `선택한 ${checkedIds.length}명(${names})의 학습 기록을 삭제할까요?\n` +
        `삭제하면 완료/진행중 여부와 관계없이 초기화되어, 다음 로그인 시 처음부터 다시 응시하게 됩니다.`
    );
    if (!ok) return;
    setDeleting(true);
    try {
      await onDelete(checkedIds);
      setCheckedIds([]);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="dash-shell admin">
      <TopBar
        left={
          <>
            <span className="topbar-logo-badge">
              <img src={logoImg} alt="Green Oil Inc." />
            </span>
            <span>관리자 · 전체 교육 현황</span>
          </>
        }
        right={
          <>
            <button className="logout-btn" onClick={() => setShowRoster(true)}>
              임직원 관리
            </button>
            <button className="logout-btn" onClick={() => setShowKey(true)}>
              문제·정답 보기
            </button>
            <button className="logout-btn" onClick={onRefresh}>
              새로고침
            </button>
            <button className="logout-btn" onClick={onLogout}>
              로그아웃
            </button>
          </>
        }
      />

      <div className="admin-body">
        {/* ── 부서별 현황표 ── */}
        {!loading && (
          <div className="dept-panel">
            <div className="dept-panel-head">
              <h3>부서별 현황</h3>
              <span className="dept-panel-note">
                실시율 = 완료 인원 ÷ 부서 인원 · 부서를 여러 개 눌러 함께 볼 수 있고,
                아래 명단도 선택한 부서만 표시됩니다
                {STATS_EXCLUDED_DEPARTMENTS.length > 0 &&
                  ` · ${STATS_EXCLUDED_DEPARTMENTS.join(", ")} 계정은 통계에서 제외`}
              </span>
            </div>
            <div className="dept-table-wrap">
              <table className="dept-table">
                <thead>
                  <tr>
                    <th>부서</th>
                    <th className="num">인원</th>
                    <th className="num">완료</th>
                    <th className="num">진행중</th>
                    <th className="num">미시작</th>
                    <th>실시율</th>
                  </tr>
                </thead>
                <tbody>
                  {[{ name: "전체", key: "ALL", ...overall }, ...deptRows].map((row) => {
                    const key = row.key || row.name;
                    const isSel = key === "ALL" ? isAll : deptSel.includes(key);
                    return (
                      <tr
                        key={key}
                        className={`dept-row ${key === "ALL" ? "total" : ""} ${
                          isSel ? "selected" : ""
                        }`}
                        onClick={() => (key === "ALL" ? selectDept("ALL") : toggleDept(key))}
                      >
                        <td>{row.name}</td>
                        <td className="num">{row.total}</td>
                        <td className="num">{row.done}</td>
                        <td className="num">{row.prog}</td>
                        <td className="num">{row.idle}</td>
                        <td>
                          <div className="dept-rate">
                            <div className="dept-rate-track">
                              <div
                                className="dept-rate-fill"
                                style={{ width: `${row.rate}%` }}
                              />
                            </div>
                            <span>{row.rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <p className="scope-note">
          <strong>{scopeLabel}</strong> 기준
          {isAll &&
            STATS_EXCLUDED_DEPARTMENTS.length > 0 &&
            ` (${STATS_EXCLUDED_DEPARTMENTS.join(", ")} 계정 제외)`}
        </p>
        <div className="admin-stats">
          <StatCard label="전체 인원" value={scope.total} />
          <StatCard label="완료" value={scope.done} />
          <StatCard label="미완료" value={scope.total - scope.done} />
          <StatCard label="완료율" value={`${scope.rate}%`} />
          <StatCard label="만점자" value={perfectCount} />
        </div>

        <div className="admin-toolbar">
          <div className="admin-toolbar-left">
            <select
              className="dept-select"
              value={deptSel.length === 0 ? "ALL" : deptSel.length === 1 ? deptSel[0] : "MULTI"}
              onChange={(e) => selectDept(e.target.value)}
            >
              <option value="ALL">전체 부서</option>
              {deptSel.length > 1 && (
                <option value="MULTI" disabled>
                  {deptSel.length}개 부서 선택
                </option>
              )}
              {deptOrder.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <div className="admin-toolbar-info">
              {someChecked
                ? `${checkedIds.length}명 선택됨`
                : `${isAll ? "전체 부서" : deptSel.join(", ")} · 표시 ${
                    visible.length
                  }명`}
            </div>
          </div>
          <button
            className="danger-btn"
            disabled={!someChecked || deleting}
            onClick={handleDeleteSelected}
          >
            <Icon.Trash className="icon-sm" />
            {deleting ? "삭제 중..." : "선택 삭제(초기화)"}
          </button>
        </div>

        {loading ? (
          <div className="admin-loading">불러오는 중...</div>
        ) : visible.length === 0 ? (
          <div className="admin-empty">해당 부서에 등록된 임직원이 없습니다.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                  </th>
                  <th>
                    이름
                    <small className="th-sub">부서</small>
                  </th>
                  <th>
                    ID
                    <small className="th-sub">접속코드</small>
                  </th>
                  <th>최근 로그인</th>
                  <th>완료 모듈</th>
                  <th>
                    총점
                    <small className="th-sub">정답 수 / 전체 문항</small>
                  </th>
                  <th>
                    모듈별 점수
                    <small className="th-sub">M1 ~ M6</small>
                  </th>
                  <th>상태</th>
                  <th>제출일시</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const done = r.moduleResults.length;
                  const sc = scoreInfo(r);
                  const isChecked = checkedIds.includes(r.id);
                  const statusLabel =
                    r.status === "submitted"
                      ? "제출완료"
                      : r.status === "not_started"
                        ? "미시작"
                        : "진행중";
                  const statusClass =
                    r.status === "submitted"
                      ? "done"
                      : r.status === "not_started"
                        ? "idle"
                        : "prog";
                  return (
                    <tr
                      key={r.id}
                      className={isChecked ? "row-checked" : ""}
                      onClick={() => setSelected(r)}
                    >
                      <td className="checkbox-col" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOne(r.id)}
                        />
                      </td>
                      <td>
                        <div className="cell-main">
                          {r.name}
                          {r.active === false && <span className="inactive-tag">비활성</span>}
                        </div>
                        <div className="cell-sub">{deptOf(r)}</div>
                      </td>
                      <td>
                        <div className="cell-main id-cell">{r.id}</div>
                        <div className="cell-sub id-cell">{codeOf(r.id)}</div>
                      </td>
                      <td>{fmtDate(r.lastLoginAt)}</td>
                      <td>
                        {done} / {TOTAL_MODULES}
                      </td>
                      <td className="score-total">
                        {questionCounts ? (
                          <>
                            <div>
                              {sc.sum} / {sc.max}
                              {sc.perfect ? (
                                <span className="score-badge perfect">만점</span>
                              ) : sc.lost > 0 && r.moduleResults.length ? (
                                <span className="score-badge lost">-{sc.lost}</span>
                              ) : null}
                            </div>
                            <div className="cell-sub">{sc.pct}%</div>
                          </>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td>
                        <div className="score-chips">
                          {MODULES.map((m) => {
                            const x = r.moduleResults.find((y) => y.moduleId === m.id);
                            return (
                              <span
                                key={m.id}
                                className={`score-chip ${x ? (modScore(m, x) === curCount(m, x) ? "has" : "miss") : ""}`}
                                title={`모듈 ${m.no}`}
                              >
                                {x ? `${modScore(m, x)}/${curCount(m, x)}` : "-"}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td>
                        <span className={`status-pill ${statusClass}`}>
                          {statusLabel}
                        </span>
                      </td>
                      <td>{r.submittedAt ? fmtDate(r.submittedAt) : "-"}</td>
                      <td className="detail-link">상세보기</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showKey && <AnswerKeyModal onClose={() => setShowKey(false)} />}
      {showRoster && (
        <RosterManager
          allowList={allowList}
          onSave={onSaveRoster}
          onImportFile={onImportRoster}
          onClose={() => setShowRoster(false)}
        />
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>
                  {selected.name} <span className="modal-empid">{selected.id}</span>
                </h2>
                <div className="modal-sub">
                  부서 {deptOf(selected)} · 접속코드 {codeOf(selected.id)} · 최초 로그인{" "}
                  {fmtDate(selected.loginAt)} · 최근 로그인{" "}
                  {fmtDate(selected.lastLoginAt)}
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>
                닫기
              </button>
            </div>
            <div className="modal-total">
              {(() => {
                const sc = scoreInfo(selected);
                return (
                  <>
                    <strong>
                      총점 {sc.sum} / {sc.max || "-"}
                    </strong>
                    {sc.max ? ` (${sc.pct}%)` : ""}
                    {sc.perfect ? (
                      <span className="score-badge perfect">만점</span>
                    ) : sc.lost > 0 && selected.moduleResults.length ? (
                      <span className="score-badge lost">-{sc.lost}</span>
                    ) : null}{" "}
                    · 완료 {selected.moduleResults.length} / {TOTAL_MODULES}개 모듈
                  </>
                );
              })()}
            </div>
            <div className="modal-modules">
              {MODULES.map((m) => {
                const r = selected.moduleResults.find((x) => x.moduleId === m.id);
                return (
                  <div
                    className={`modal-module-row ${r ? "done" : ""}`}
                    key={m.id}
                    style={{ "--accent": m.color }}
                  >
                    <div className="modal-module-no">{String(m.no).padStart(2, "0")}</div>
                    <div className="modal-module-title">
                      {m.title}
                      <span>{m.subtitle}</span>
                    </div>
                    <div className="modal-module-score">
                      {r ? `${modScore(m, r)} / ${curCount(m, r)}` : "미응시"}
                      {r && r.attempts ? (
                        <small className="modal-module-attempt">
                          {r.attempts === 1
                            ? "1회 응시"
                            : `1차 ${r.firstScore ?? "-"} → 최종 ${r.score} · 2회 응시`}
                        </small>
                      ) : null}
                    </div>
                    <div className="modal-module-date">
                      {r ? fmtDate(r.completedAt) : "-"}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* 관리자용: 임직원 이름·부서·접속코드 관리 (추가 / 수정 / 코드 재발급 / 비활성 / 삭제 / 일괄 등록 / CSV) */
function RosterManager({ allowList, onSave, onImportFile, onClose }) {
  const employees = (allowList && allowList.employees) || [];
  const masterCode = String((allowList && allowList.masterCode) || "").trim();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });
  const [query, setQuery] = useState("");
  const [deptFilter, setDeptFilter] = useState("ALL");
  const [mode, setMode] = useState(""); // "" | "add" | "bulk"
  const [form, setForm] = useState({ name: "", department: "", code: "" });
  const [bulkText, setBulkText] = useState("");
  const [editId, setEditId] = useState(null);
  const [edit, setEdit] = useState({ name: "", department: "", code: "" });

  const depts = [...new Set(employees.map((u) => u.department || "미지정"))];

  function genCode(list) {
    const used = new Set(list.map((u) => String(u.code)));
    for (let i = 0; i < 1000; i++) {
      const c = String(Math.floor(100000 + Math.random() * 900000));
      if (!used.has(c) && c !== masterCode) return c;
    }
    return String(Date.now()).slice(-6);
  }
  function nextId(list) {
    const nums = list.map((u) => /^goi(\d+)$/.exec(u.id)).filter(Boolean).map((m) => Number(m[1]));
    const n = (nums.length ? Math.max(...nums) : 0) + 1;
    return `goi${String(n).padStart(3, "0")}`;
  }
  async function run(label, next, okText) {
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      await onSave(next);
      setMsg({ type: "ok", text: okText || `${label} 완료 · 바로 적용되었습니다.` });
      return true;
    } catch (e) {
      console.error(e);
      setMsg({ type: "err", text: `${label} 실패: 저장하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.` });
      return false;
    } finally {
      setBusy(false);
    }
  }
  const codeTaken = (code, exceptId) =>
    !code ||
    code === masterCode ||
    employees.some((u) => u.id !== exceptId && String(u.code) === String(code));

  async function addOne(e) {
    e.preventDefault();
    const name = form.name.trim();
    const department = form.department.trim() || "미지정";
    if (!name) return setMsg({ type: "err", text: "이름을 입력해 주세요." });
    let code = form.code.trim();
    if (code && codeTaken(code)) return setMsg({ type: "err", text: "이미 사용 중인 접속코드입니다." });
    if (employees.some((u) => u.name === name) &&
        !window.confirm(`같은 이름(${name})이 이미 있습니다. 동명이인으로 추가할까요?\n(마스터 키 로그인은 먼저 등록된 사람이 우선됩니다)`)) return;
    if (!code) code = genCode(employees);
    const ok = await run("추가", [...employees, { id: nextId(employees), name, department, code, active: true }], `${name}님을 추가했습니다 · 접속코드 ${code}`);
    if (ok) {
      setForm({ name: "", department: form.department, code: "" });
    }
  }
  async function saveEdit(id) {
    const name = edit.name.trim();
    if (!name) return setMsg({ type: "err", text: "이름을 입력해 주세요." });
    const code = edit.code.trim();
    if (codeTaken(code, id)) return setMsg({ type: "err", text: "비어 있거나 이미 사용 중인(또는 마스터 키와 같은) 접속코드입니다." });
    const next = employees.map((u) => (u.id === id ? { ...u, name, department: edit.department.trim() || "미지정", code } : u));
    if (await run("수정", next)) setEditId(null);
  }
  function reissue(u) {
    if (!window.confirm(`${u.name}님의 접속코드를 새로 발급할까요?\n이전 코드는 바로 사용할 수 없게 됩니다. (학습 기록은 그대로 유지)`)) return;
    const code = genCode(employees);
    run("코드 재발급", employees.map((x) => (x.id === u.id ? { ...x, code } : x)), `${u.name}님의 새 접속코드: ${code}`);
  }
  function toggleActive(u) {
    const act = u.active === false;
    if (!act && !window.confirm(`${u.name}님을 비활성 처리할까요?\n로그인이 막히고 통계에서 제외됩니다. (학습 기록은 보존)`)) return;
    run(act ? "활성화" : "비활성 처리", employees.map((x) => (x.id === u.id ? { ...x, active: act } : x)));
  }
  function removeOne(u) {
    if (!window.confirm(`${u.name}님을 명단에서 삭제할까요?\n(이미 저장된 학습 기록은 지워지지 않습니다. 퇴사자는 '비활성'을 권장합니다)`)) return;
    run("삭제", employees.filter((x) => x.id !== u.id));
  }
  async function bulkAdd() {
    const lines = bulkText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let list = [...employees];
    let added = 0;
    const skipped = [];
    lines.forEach((line, idx) => {
      const cells = (line.includes("\t") ? line.split("\t") : line.split(",")).map((c) => c.trim());
      if (idx === 0 && /^(이름|name)$/i.test(cells[0])) return; // 머리글 줄
      const name = cells[0];
      if (!name) return;
      const department = cells[1] || "미지정";
      let code = cells[2] || "";
      if (code && (list.some((u) => String(u.code) === code) || code === masterCode)) {
        skipped.push(`${name}(코드 중복)`);
        return;
      }
      if (list.some((u) => u.name === name && u.department === department)) {
        skipped.push(`${name}(이미 등록됨)`);
        return;
      }
      if (!code) code = genCode(list);
      list = [...list, { id: nextId(list), name, department, code, active: true }];
      added += 1;
    });
    if (added === 0) return setMsg({ type: "err", text: `추가된 사람이 없습니다.${skipped.length ? " 건너뜀: " + skipped.join(", ") : " 형식: 이름, 부서, (접속코드) 한 줄에 한 명"}` });
    const ok = await run("일괄 등록", list, `${added}명을 추가했습니다.${skipped.length ? " 건너뜀: " + skipped.join(", ") : ""}`);
    if (ok) {
      setBulkText("");
      setMode("");
    }
  }
  function downloadCsv() {
    const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = [["이름", "부서", "ID", "접속코드", "상태"], ...employees.map((u) => [u.name, u.department, u.id, u.code, u.active === false ? "비활성" : "사용"])];
    const csv = "\uFEFF" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `임직원_명단_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setMsg({ type: "ok", text: "명단 CSV를 내려받았습니다. 접속코드가 들어 있으니 보관에 주의해 주세요." });
  }
  async function importFromFile() {
    if (!window.confirm("명단 파일(allowed-users.json)의 내용으로 데이터베이스 명단을 덮어씁니다.\n관리자 화면에서 수정한 내용은 사라집니다. 계속할까요?")) return;
    setBusy(true);
    setMsg({ type: "", text: "" });
    try {
      const n = await onImportFile();
      setMsg({ type: "ok", text: `파일에서 ${n}명을 가져와 적용했습니다.` });
    } catch (e) {
      console.error(e);
      setMsg({ type: "err", text: "가져오기에 실패했습니다. 잠시 후 다시 시도해 주세요." });
    } finally {
      setBusy(false);
    }
  }

  const q = query.trim().toLowerCase();
  const shown = employees.filter(
    (u) =>
      (deptFilter === "ALL" || (u.department || "미지정") === deptFilter) &&
      (!q || u.name.toLowerCase().includes(q) || u.id.toLowerCase().includes(q))
  );
  const activeCount = employees.filter((u) => u.active !== false).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card key-modal roster-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>임직원 관리</h2>
            <div className="modal-sub">
              전체 {employees.length}명 (사용 {activeCount}명) ·{" "}
              {allowList && allowList.source === "database"
                ? `데이터베이스 명단 사용 중${allowList.rosterUpdatedAt ? " · 마지막 저장 " + fmtDate(allowList.rosterUpdatedAt) : ""}`
                : "지금은 명단 파일을 사용 중입니다. 아래 수정을 저장하면 데이터베이스 명단으로 전환됩니다."}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>닫기</button>
        </div>

        <div className="roster-actions">
          <button className="roster-btn primary" disabled={busy} onClick={() => setMode(mode === "add" ? "" : "add")}>+ 임직원 추가</button>
          <button className="roster-btn" disabled={busy} onClick={() => setMode(mode === "bulk" ? "" : "bulk")}>일괄 등록</button>
          <button className="roster-btn" disabled={busy} onClick={downloadCsv}>CSV 내려받기</button>
          <button className="roster-btn" disabled={busy} onClick={importFromFile}>파일에서 가져오기</button>
        </div>

        {msg.text && <div className={`roster-msg ${msg.type}`}>{msg.text}</div>}

        {mode === "add" && (
          <form className="roster-form" onSubmit={addOne}>
            <input placeholder="이름 (로그인에 쓰는 표기 그대로)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <input placeholder="부서" list="roster-depts" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
            <input placeholder="접속코드 (비우면 자동 생성)" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
            <button className="roster-btn primary" disabled={busy} type="submit">추가</button>
          </form>
        )}
        {mode === "bulk" && (
          <div className="roster-bulk">
            <textarea
              rows={6}
              placeholder={"한 줄에 한 명: 이름, 부서, (접속코드)\n엑셀에서 복사해 붙여넣어도 됩니다.\n예) 홍길동, UCO\n예) 김영희, Plant, 482913"}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
            />
            <button className="roster-btn primary" disabled={busy || !bulkText.trim()} onClick={bulkAdd}>등록</button>
          </div>
        )}
        <datalist id="roster-depts">{depts.map((d) => <option key={d} value={d} />)}</datalist>

        <div className="roster-filter">
          <input placeholder="이름·ID 검색" value={query} onChange={(e) => setQuery(e.target.value)} />
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="ALL">전체 부서</option>
            {depts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
          <span>{shown.length}명 표시</span>
        </div>

        <div className="roster-table-wrap">
          <table className="roster-table">
            <thead>
              <tr><th>이름</th><th>부서</th><th>ID</th><th>접속코드</th><th>상태</th><th></th></tr>
            </thead>
            <tbody>
              {shown.map((u) => {
                const isEdit = editId === u.id;
                return (
                  <tr key={u.id} className={u.active === false ? "off" : ""}>
                    {isEdit ? (
                      <>
                        <td><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></td>
                        <td><input list="roster-depts" value={edit.department} onChange={(e) => setEdit({ ...edit, department: e.target.value })} /></td>
                        <td className="id-cell">{u.id}</td>
                        <td><input value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} /></td>
                        <td>-</td>
                        <td className="roster-row-actions">
                          <button disabled={busy} onClick={() => saveEdit(u.id)}>저장</button>
                          <button disabled={busy} onClick={() => setEditId(null)}>취소</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="cell-main">{u.name}</td>
                        <td>{u.department}</td>
                        <td className="id-cell">{u.id}</td>
                        <td className="id-cell">{u.code}</td>
                        <td>{u.active === false ? <span className="inactive-tag">비활성</span> : "사용"}</td>
                        <td className="roster-row-actions">
                          <button disabled={busy} onClick={() => { setEditId(u.id); setEdit({ name: u.name, department: u.department, code: u.code }); }}>수정</button>
                          <button disabled={busy} onClick={() => reissue(u)}>코드 재발급</button>
                          <button disabled={busy} onClick={() => toggleActive(u)}>{u.active === false ? "활성화" : "비활성"}</button>
                          <button disabled={busy} className="del" onClick={() => removeOne(u)}>삭제</button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* 관리자용: 모듈별 문제와 정답(·보기·힌트)을 한눈에 확인하는 창 */
function AnswerKeyModal({ onClose }) {
  const [modIdx, setModIdx] = useState(0);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");

  // 모듈 1~6 전체 정답을 한 개의 txt 파일로 내려받기 (현재 배포된 문제 파일을 그대로 읽음)
  const [downloading, setDownloading] = useState(false);
  async function downloadAllAnswers() {
    setDownloading(true);
    try {
      const mods = await Promise.all(
        MODULES.map((m) =>
          fetch(contentUrl(m)).then((res) => (res.ok ? res.json() : Promise.reject(new Error("load"))))
        )
      );
      const total = mods.reduce((a, d) => a + (d.questions || []).length, 0);
      const lines = [`모듈별 정답 (총 ${total}문항)`, `내려받은 날짜: ${new Date().toLocaleDateString("ko-KR")}`, ""];
      mods.forEach((d, mi) => {
        const qs = d.questions || [];
        lines.push(`■ 모듈 ${MODULES[mi].no}. ${MODULES[mi].title} (${qs.length}문항)`);
        qs.forEach((q, qi) => {
          lines.push(`Q${qi + 1}. ${q.q}`);
          lines.push(`   정답 ${circled[q.correct] || q.correct + 1} ${q.options[q.correct]}`);
        });
        lines.push("");
      });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/plain;charset=utf-8" }));
      a.download = `answer_key_all_modules_${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      alert("정답 파일을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    let alive = true;
    setStatus("loading");
    setData(null);
    fetch(contentUrl(MODULES[modIdx]))
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("load"))))
      .then((d) => {
        if (!alive) return;
        setData(d);
        setStatus("ready");
      })
      .catch(() => alive && setStatus("error"));
    return () => {
      alive = false;
    };
  }, [modIdx]);

  const qs = (data && data.questions) || [];
  const circled = ["①", "②", "③", "④", "⑤", "⑥"];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card key-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <h2>문제 · 정답 보기</h2>
            <div className="modal-sub">
              관리자용입니다. 초록색 표시가 정답이며, 힌트는 오답일 때 임직원에게 보이는 문구입니다.
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>
            닫기
          </button>
        </div>
        <button className="roster-btn primary key-download" disabled={downloading} onClick={downloadAllAnswers}>
          {downloading ? "만드는 중..." : "전체 모듈 정답 다운로드 (TXT)"}
        </button>

        <div className="key-tabs">
          {MODULES.map((m, i) => (
            <button
              key={m.id}
              className={`key-tab ${i === modIdx ? "active" : ""}`}
              onClick={() => setModIdx(i)}
            >
              모듈 {m.no}
            </button>
          ))}
        </div>
        <div className="key-title">
          모듈 {MODULES[modIdx].no} · {MODULES[modIdx].title}
          {status === "ready" && <span> · 총 {qs.length}문항</span>}
        </div>

        {status === "loading" && <div className="admin-loading">불러오는 중...</div>}
        {status === "error" && (
          <div className="admin-empty">문제 자료를 불러오지 못했습니다.</div>
        )}
        {status === "ready" && (
          <div className="key-list">
            {qs.map((q, qi) => (
              <div className="key-q" key={qi}>
                <div className="key-q-title">
                  Q{qi + 1}. {q.q}
                  {q.ref && <span className="key-ref">{q.ref}</span>}
                </div>
                <ol className="key-options">
                  {q.options.map((o, oi) => (
                    <li key={oi} className={oi === q.correct ? "correct" : ""}>
                      <span className="key-no">{circled[oi] || oi + 1}</span>
                      {o}
                      {oi === q.correct && <b className="key-badge">정답</b>}
                    </li>
                  ))}
                </ol>
                {q.explain && <div className="key-hint">힌트: {q.explain}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function TopBar({ left, right }) {
  return (
    <div className="topbar">
      <div className="topbar-left">{left}</div>
      <div className="topbar-right">{right}</div>
    </div>
  );
}
