import { useState, useEffect, useCallback } from "react";
import "./index.css";
import { db } from "./firebase";
import { doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";

/* ============================================================
   모듈 메타데이터 (실제 회사 교육자료 기준, 2026)
   본문(챕터/세부타이틀/이미지/영상)은 각 모듈 진입 시
   /module{N}/content.json 을 fetch하여 불러옵니다.
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
      "Green Oil Inc.의 회사 소개와 교육 목적·목표를 설명할 수 있다.",
      "WSIB·WHMIS 관련 문서 의무와 산업재해 발생 시 보고 절차를 수행할 수 있다.",
      "출퇴근 기록, 근무 전 준비, 재교육 조치 기준 등 사내 근무수칙을 준수할 수 있다.",
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
      "운전 중 휴대폰 사용 금지 등 기본 준수사항과 Samsara 감지 기준을 이해한다.",
      "동절기 Tire Gripper 설치 등 계절별 안전 운행 절차를 수행할 수 있다.",
      "자전거·보행자 등 도로 위 취약 이용자에 대한 법적 예측 의무를 설명할 수 있다.",
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
      "UCO(폐식용유)의 정의와 컨테이너 종류, 계약에 필요한 서류를 파악할 수 있다.",
      "언로딩(Unloading) 표준 절차를 순서대로 수행할 수 있다.",
      "오일 유출, 도난, 고객 불만 등 현장에서 발생 가능한 상황별 대처법을 설명할 수 있다.",
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
      "차량 필수 서류와 일일 점검(Truck Daily Inspection) 항목을 빠짐없이 확인할 수 있다.",
      "배출가스 시스템(DPR/DEF)과 타이어 이상 마모 유형을 식별할 수 있다.",
      "차량 청결 유지 등 일상 유지관리 의무를 준수할 수 있다.",
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
      "Samsara 앱의 운행 전/중/후 필수 절차(Pre-Trip·Post-Trip)를 수행할 수 있다.",
      "DVIR 점검표 작성 방법과 HOS(근무시간) 규정을 준수할 수 있다.",
      "도로 단속 시 대응 화면 사용법과 회사 책임 범위를 설명할 수 있다.",
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
      "교통사고 발생 시 초동 대응 절차와 신고 기준을 수행할 수 있다.",
      "사고 신고 센터(CRC) 이용 절차와 필요 서류를 파악할 수 있다.",
      "사고·티켓 페널티 정책과 누유(Oil Spill) 대응 매뉴얼을 설명할 수 있다.",
    ],
  },
];

const LOGO_WHITE_BG =
  "data:image/png;base64,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";
const LOGO_GREEN_BG =
  "data:image/png;base64,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";

const TOTAL_MODULES = MODULES.length;

/* ============================================================
   유틸
   ============================================================ */
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

/* ============================================================
   아이콘 (인라인 SVG, 라인 스타일)
   ============================================================ */
const Icon = {
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
  const [screen, setScreen] = useState("login"); // login | employee | module | complete | admin
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
  const [employee, setEmployee] = useState(null);
  const [moduleIdx, setModuleIdx] = useState(0);
  const [phase, setPhase] = useState("learn"); // learn | quiz | result
  const [sectionIdx, setSectionIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [lastResult, setLastResult] = useState(null);

  // 모듈 본문(챕터/세부타이틀) - 진입 시 /module{N}/content.json 을 fetch
  const [moduleContent, setModuleContent] = useState(null);
  const [contentStatus, setContentStatus] = useState("idle"); // idle | loading | ready | error

  // 관리자 상태
  const [adminList, setAdminList] = useState([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState(null);

  useEffect(() => {
    fetch("/data/allowed-users.json")
      .then((res) => {
        if (!res.ok) throw new Error("허용목록 파일을 불러올 수 없습니다.");
        return res.json();
      })
      .then((data) => {
        setAllowList(data);
        setAllowListStatus("ready");
      })
      .catch((err) => {
        console.error("허용목록 로드 실패", err);
        setAllowListStatus("error");
      });
  }, []);

  const saveEmployee = useCallback(async (rec) => {
    try {
      await setDoc(doc(db, "employees", rec.id), rec);
    } catch (e) {
      console.error("저장 실패", e);
    }
  }, []);

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
    const matched = (allowList.employees || []).find(
      (u) => String(u.name).trim() === name && String(u.code).trim() === code
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
    setScreen("login");
    setRole("employee");
    setEmployee(null);
    setCodeInput("");
    setNameInput("");
    setAdminIdInput("");
    setAdminPwInput("");
    setLoginError("");
    setModuleIdx(0);
    setPhase("learn");
    setSectionIdx(0);
    setAnswers([]);
    setLastResult(null);
    setSelectedEmp(null);
  }

  /* ---------------- 임직원 : 모듈 진행 ---------------- */
  function startModule(idx) {
    setModuleIdx(idx);
    setPhase("learn");
    setSectionIdx(0);
    setAnswers([]);
    setScreen("module");
    setModuleContent(null);
    setContentStatus("loading");

    const folder = MODULES[idx].folder;
    fetch(`/${folder}/content.json`)
      .then((res) => {
        if (!res.ok) throw new Error("콘텐츠를 불러올 수 없습니다.");
        return res.json();
      })
      .then((data) => {
        setModuleContent(data);
        setContentStatus("ready");
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
    } else {
      setPhase("quiz");
    }
  }

  function prevSection() {
    if (sectionIdx > 0) {
      setSectionIdx((i) => i - 1);
    }
  }

  function selectAnswer(qIdx, optIdx) {
    setAnswers((prev) => {
      const next = [...prev];
      next[qIdx] = optIdx;
      return next;
    });
  }

  async function submitQuiz() {
    const mod = MODULES[moduleIdx];
    const questions = moduleContent.questions;
    const score = questions.reduce(
      (acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0),
      0
    );
    const total = questions.length;
    const result = {
      moduleId: mod.id,
      moduleNo: mod.no,
      moduleTitle: mod.title,
      score,
      total,
      answers: [...answers],
      completedAt: nowISO(),
    };
    const rec = { ...employee };
    const others = rec.moduleResults.filter((r) => r.moduleId !== mod.id);
    rec.moduleResults = [...others, result].sort((a, b) => a.moduleNo - b.moduleNo);
    rec.currentModuleIdx = Math.max(rec.currentModuleIdx, moduleIdx + 1);

    const isLastModule = moduleIdx === TOTAL_MODULES - 1;
    if (isLastModule) {
      rec.status = "submitted";
      rec.submittedAt = nowISO();
    }

    // 결과 화면 전환은 즉시 진행하고, 저장은 백그라운드로 처리
    setEmployee(rec);
    setLastResult(result);
    setPhase("result");
    saveEmployee(rec).catch((err) => console.error("퀴즈 결과 저장 실패", err));
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
  async function loadAdminList() {
    setAdminLoading(true);
    try {
      const roster = (allowList && allowList.employees) || [];
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
          records.push(rec);
        } else {
          records.push({
            id: u.id,
            name: u.name,
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

  /* ============================================================
     렌더링
     ============================================================ */
  return (
    <div className="app-root">
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
          onStartModule={startModule}
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
          sectionIdx={sectionIdx}
          answers={answers}
          lastResult={lastResult}
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
        <CompleteScreen employee={employee} onLogout={logout} />
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
      <div className="login-hero">
        <div className="hero-stripes" />
        <div className="hero-content">
          <div className="hero-logo-badge">
            <img src={LOGO_WHITE_BG} alt="Green Oil Inc." />
          </div>
          <div className="hero-code">GREEN OIL INC. · FLEET SAFETY TRAINING</div>
          <h1 className="hero-title">
            안전 &amp; 근무수칙
            <br />
            <span className="hero-title-accent">교육 플랫폼</span>
          </h1>
          <p className="hero-desc">
            신규 입사자를 위한 안전·정비·사고대응·현장 근무수칙 교육입니다.
            <br />
            6개 모듈을 순서대로 학습·응시합니다.
          </p>
          <ul className="hero-modules">
            {MODULES.map((m) => (
              <li key={m.id}>
                <span className="hero-modules-no" style={{ color: m.color }}>
                  {String(m.no).padStart(2, "0")}
                </span>
                <span className="hero-modules-title">{m.title}</span>
              </li>
            ))}
          </ul>
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
function EmployeeDashboard({ employee, onStartModule, onLogout }) {
  const completedCount = employee.moduleResults.length;
  const isSubmitted = employee.status === "submitted";

  return (
    <div className="dash-shell">
      <TopBar
        left={
          <>
            <span className="topbar-logo-badge">
              <img src={LOGO_WHITE_BG} alt="Green Oil Inc." />
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
          <div className="dash-eyebrow">신입사원 필수 교육 과정</div>
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
          <div className="progress-track">
            <div
              className="progress-fill"
              style={{ width: `${(completedCount / TOTAL_MODULES) * 100}%` }}
            />
          </div>
        </div>

        <div className="module-timeline">
          {MODULES.map((m, idx) => {
            const result = employee.moduleResults.find((r) => r.moduleId === m.id);
            const isDone = !!result;
            const isUnlocked = idx <= employee.currentModuleIdx;
            const isCurrent = isUnlocked && !isDone;
            const isLast = idx === MODULES.length - 1;

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
                    <div className="timeline-title">
                      {m.title}
                      <span className="timeline-code" style={{ color: m.color }}>
                        {m.code}
                      </span>
                    </div>
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
                    {isDone ? (
                      <span className="timeline-status done">완료</span>
                    ) : isUnlocked ? (
                      <button className="start-btn" onClick={() => onStartModule(idx)}>
                        학습 시작
                        <Icon.Arrow className="icon-sm" />
                      </button>
                    ) : (
                      <span className="timeline-status locked">잠김</span>
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
  sectionIdx,
  answers,
  lastResult,
  onNextSection,
  onPrevSection,
  onSelectAnswer,
  onSubmitQuiz,
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
  const allAnswered = hasQuiz && answers.every((a) => a !== null && a !== undefined);

  const flat = (() => {
    if (!moduleContent || !moduleContent.chapters) return [];
    const out = [];
    for (const ch of moduleContent.chapters) {
      for (const s of ch.sections) out.push({ chapterTitle: ch.chapterTitle, ...s });
    }
    return out;
  })();
  const current = flat[sectionIdx];

  return (
    <div className="dash-shell">
      <TopBar
        left={
          <>
            <span className="topbar-logo-badge">
              <img src={LOGO_WHITE_BG} alt="Green Oil Inc." />
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

      <div className="module-body" style={{ "--accent": mod.color }}>
        {contentStatus === "loading" && (
          <div className="content-loading">학습 자료를 불러오는 중입니다...</div>
        )}
        {contentStatus === "error" && (
          <div className="content-error">
            학습 자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </div>
        )}

        {contentStatus === "ready" && phase === "learn" && current && (
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
            <h2>{current.sectionTitle}</h2>
            <ContentBlocks blocks={current.blocks} folder={mod.folder} />
            <div className="learn-nav">
              {sectionIdx > 0 && (
                <button className="submit-btn ghost" onClick={onPrevSection}>
                  <Icon.Arrow className="icon-sm icon-flip" />
                  이전 학습
                </button>
              )}
              <button className="submit-btn" onClick={onNextSection}>
                {sectionIdx < flat.length - 1 ? "다음 학습" : "문제 풀기"}
                <Icon.Arrow className="icon-sm" />
              </button>
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
            <div className="learn-tag">확인 문제 · 모듈 {mod.no}</div>
            {moduleContent.questions.map((q, qi) => (
              <div className="quiz-question" key={qi}>
                <div className="quiz-q-title">
                  Q{qi + 1}. {q.q}
                </div>
                <div className="quiz-options">
                  {q.options.map((opt, oi) => (
                    <label
                      key={oi}
                      className={`quiz-option ${answers[qi] === oi ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name={`q-${qi}`}
                        checked={answers[qi] === oi}
                        onChange={() => onSelectAnswer(qi, oi)}
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>
            ))}
            <button className="submit-btn" disabled={!allAnswered} onClick={onSubmitQuiz}>
              {isLastModule ? "최종 제출하기" : "답안 제출"}
              <Icon.Arrow className="icon-sm" />
            </button>
          </div>
        )}

        {phase === "result" && lastResult && (
          <div className="result-panel">
            <div className="result-score">
              {lastResult.score} / {lastResult.total}
            </div>
            <div className="result-label">모듈 {mod.no} 결과</div>
            <div className="result-detail">
              {moduleContent.questions.map((q, i) => (
                <div
                  key={i}
                  className={`result-item ${
                    lastResult.answers[i] === q.correct ? "correct" : "wrong"
                  }`}
                >
                  <div className="result-item-q">
                    Q{i + 1}. {q.q}
                  </div>
                  <div className="result-item-a">
                    내 답안: {q.options[lastResult.answers[i]]}
                    {lastResult.answers[i] !== q.correct && (
                      <> · 정답: {q.options[q.correct]}</>
                    )}
                  </div>
                  <div className="result-item-explain">{q.explain}</div>
                </div>
              ))}
            </div>
            <button className="submit-btn" onClick={onAfterResult}>
              {isLastModule ? "교육 완료 화면으로" : "다음 모듈로 이동"}
              <Icon.Arrow className="icon-sm" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* 학습 섹션의 본문 블록(text/bullets/subheading/image/video/table)을 순서대로 렌더링 */
function ContentBlocks({ blocks, folder }) {
  return (
    <div className="content-blocks">
      {blocks.map((b, i) => {
        if (b.type === "subheading") {
          return (
            <div className="block-subheading" key={i}>
              {b.text}
            </div>
          );
        }
        if (b.type === "text") {
          return (
            <p className="block-text" key={i}>
              {b.text}
            </p>
          );
        }
        if (b.type === "bullets") {
          return (
            <ul className="block-bullets" key={i}>
              {b.items.map((it, j) => (
                <li key={j}>{it.text}</li>
              ))}
            </ul>
          );
        }
        if (b.type === "image") {
          return (
            <figure className={`block-image size-${b.size || "full"}`} key={i}>
              <img src={`/${folder}/${b.file}`} alt={b.caption || ""} loading="lazy" />
              {b.caption && <figcaption>{b.caption}</figcaption>}
            </figure>
          );
        }
        if (b.type === "video") {
          return (
            <figure className={`block-video size-${b.size || "full"}`} key={i}>
              <video src={`/${folder}/${b.file}`} controls preload="none" playsInline />
              {b.caption && <figcaption>{b.caption}</figcaption>}
            </figure>
          );
        }
        if (b.type === "table") {
          const [head, ...rows] = b.rows;
          return (
            <div className="block-table-wrap" key={i}>
              <table className="block-table">
                {head && (
                  <thead>
                    <tr>
                      {head.map((c, j) => (
                        <th key={j}>{c}</th>
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {rows.map((r, ri) => (
                    <tr key={ri}>
                      {r.map((c, ci) => (
                        <td key={ci}>{c}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
function CompleteScreen({ employee, onLogout }) {
  const totalScore = employee.moduleResults.reduce((a, r) => a + r.score, 0);
  const totalMax = employee.moduleResults.reduce((a, r) => a + r.total, 0);

  return (
    <div className="complete-shell">
      <div className="complete-card">
        <div className="complete-check">
          <Icon.Check className="icon-lg" />
        </div>
        <h1>교육을 모두 완료했습니다</h1>
        <p>{employee.name} 님의 교육 결과가 관리자에게 제출되었습니다.</p>
        <div className="complete-total">
          총점 {totalScore} / {totalMax}
        </div>
        <div className="complete-list">
          {employee.moduleResults.map((r) => (
            <div className="complete-row" key={r.moduleId}>
              <span>
                모듈 {r.moduleNo} · {r.moduleTitle}
              </span>
              <span>
                {r.score} / {r.total}
              </span>
            </div>
          ))}
        </div>
        <div className="complete-meta">제출일시 {fmtDate(employee.submittedAt)}</div>
        <button className="submit-btn" onClick={onLogout}>
          로그아웃
        </button>
      </div>
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
}) {
  // Firestore 기록(r.id)에 해당하는 최신 접속코드를 allowed-users.json에서 실시간으로 찾아옵니다.
  const codeOf = (id) => {
    const entry = (allowList && allowList.employees) || [];
    const found = entry.find((u) => u.id === id);
    return found ? found.code : "-";
  };

  const totalRegistered =
    (allowList && allowList.employees && allowList.employees.length) || 0;
  const [checkedIds, setCheckedIds] = useState([]);
  const [deleting, setDeleting] = useState(false);

  const allChecked = list.length > 0 && checkedIds.length === list.length;
  const someChecked = checkedIds.length > 0;

  function toggleOne(id) {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }
  function toggleAll() {
    setCheckedIds(allChecked ? [] : list.map((r) => r.id));
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
              <img src={LOGO_WHITE_BG} alt="Green Oil Inc." />
            </span>
            <span>관리자 · 전체 교육 현황</span>
          </>
        }
        right={
          <>
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
        <div className="admin-stats">
          <StatCard label="전체 인원" value={totalRegistered} />
          <StatCard
            label="완료"
            value={list.filter((r) => r.status === "submitted").length}
          />
          <StatCard
            label="미완료"
            value={totalRegistered - list.filter((r) => r.status === "submitted").length}
          />
          <StatCard
            label="완료율"
            value={
              totalRegistered
                ? `${Math.round(
                    (list.filter((r) => r.status === "submitted").length /
                      totalRegistered) *
                      100
                  )}%`
                : "0%"
            }
          />
        </div>

        <div className="admin-toolbar">
          <div className="admin-toolbar-info">
            {someChecked ? `${checkedIds.length}명 선택됨` : `전체 ${list.length}명`}
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
        ) : list.length === 0 ? (
          <div className="admin-empty">등록된 임직원이 없습니다.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th className="checkbox-col">
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                  </th>
                  <th>이름</th>
                  <th>ID</th>
                  <th>접속코드</th>
                  <th>최근 로그인</th>
                  <th>진행상황</th>
                  <th>진행률</th>
                  <th>총점</th>
                  <th>상태</th>
                  <th>제출일시</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {list.map((r) => {
                  const done = r.moduleResults.length;
                  const totalScore = r.moduleResults.reduce((a, x) => a + x.score, 0);
                  const totalMax = r.moduleResults.reduce((a, x) => a + x.total, 0);
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
                      <td>{r.name}</td>
                      <td className="id-cell">{r.id}</td>
                      <td className="id-cell">{codeOf(r.id)}</td>
                      <td>{fmtDate(r.lastLoginAt)}</td>
                      <td>
                        {done} / {TOTAL_MODULES}
                      </td>
                      <td>
                        <div className="mini-track">
                          <div
                            className="mini-fill"
                            style={{ width: `${(done / TOTAL_MODULES) * 100}%` }}
                          />
                        </div>
                      </td>
                      <td>{totalMax ? `${totalScore} / ${totalMax}` : "-"}</td>
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

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <div>
                <h2>
                  {selected.name} <span className="modal-empid">{selected.id}</span>
                </h2>
                <div className="modal-sub">
                  접속코드 {codeOf(selected.id)} · 최초 로그인 {fmtDate(selected.loginAt)}{" "}
                  · 최근 로그인 {fmtDate(selected.lastLoginAt)}
                </div>
              </div>
              <button className="modal-close" onClick={() => setSelected(null)}>
                닫기
              </button>
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
                      {r ? `${r.score} / ${r.total}` : "미응시"}
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

/* ============================================================
   스타일
   ============================================================ */
