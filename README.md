# 안전 · 근무수칙 교육 플랫폼 (Green Oil Inc.)

React(Vite) + Firebase(Firestore)로 만든 사내 안전교육 플랫폼입니다.
서버를 직접 운영하지 않고, Google이 관리하는 Firestore를 데이터 저장소로 사용합니다.

- 임직원: 이름 + 접속코드로 로그인 (허용목록에 등록된 사람만 접근 가능) → 5개 모듈 학습 → 모듈별 확인 문제 2문항 → 마지막 모듈 제출 시 자동으로 관리자에게 결과 전송
- 관리자: ADMIN 계정 + 비밀번호로 로그인 → 전 직원 진행률 · 점수를 실시간으로 확인

---

## 0. 준비물

- [Node.js](https://nodejs.org) 18 버전 이상
- [Google 계정](https://accounts.google.com) (Firebase 사용)
- [GitHub 계정](https://github.com) (배포용)
- [VS Code](https://code.visualstudio.com) (권장 에디터)

### VS Code로 열기

이 폴더를 VS Code에서 열면(`File > Open Folder`) 우측 하단에 "추천 확장 프로그램을 설치할까요?"
알림이 뜹니다. **설치(Install All)**를 눌러주세요.

---

## 1. 로그인 허용 목록 관리 — `public/data/allowed-users.json`

**이 프로젝트는 이 파일 하나로 "누가 로그인할 수 있는지"를 관리합니다.**
별도 회원가입이나 데이터베이스 없이, 이 JSON 파일에 등록된 **이름 + 접속코드** 조합만 로그인할 수 있고,
관리자 계정(ID/비밀번호)도 이 파일에서 관리합니다.

```json
{
  "admin": {
    "id": "ADMIN",
    "password": "1"
  },
  "employees": [
    { "id": "goi001", "name": "홍길동", "code": "482913" },
    { "id": "goi002", "name": "김안전", "code": "119284" }
  ]
}
```

각 항목의 의미:

- **`id`** — 시스템 내부에서만 쓰는 고정 값입니다. **한 번 부여하면 절대 바꾸지 마세요.**
  학습 기록은 이 `id`를 기준으로 저장되기 때문에, `id`가 유지되는 한 이름이나 접속코드를
  나중에 바꿔도 기존 학습 이력이 끊기지 않습니다. 새 직원을 추가할 때는 그냥 다음 번호
  (`goi004`, `goi005`, …)를 순서대로 붙이면 됩니다. 직원에게는 절대 알려주지 않아도 됩니다.
- **`name`** — 로그인 화면에 입력하는 이름입니다.
- **`code`** — 관리자가 각 직원에게 개별적으로 안내하는 접속코드입니다. 유출되거나 분실되면
  이 값만 새 번호로 바꿔주면 되고, `id`가 그대로이므로 학습 기록은 유지됩니다.

### 동명이인 처리

이름이 같은 직원이 여러 명이어도 문제없습니다. `id`와 `code`를 각자 다르게 부여하면
시스템이 서로 다른 사람으로 정확히 구분합니다. 이름 자체를 억지로 다르게 적을 필요는 없습니다.

```json
{ "id": "goi004", "name": "홍길동", "code": "552011" },
{ "id": "goi005", "name": "홍길동", "code": "883467" }
```

### 직원 추가/삭제/재발급하는 방법

1. `public/data/allowed-users.json` 파일을 엽니다.
2. **신규 등록**: `employees` 배열 끝에 `{ "id": "goi00N", "name": "이름", "code": "접속코드" }`를
   추가합니다 (N은 다음 순서 번호). 마지막 항목 뒤에는 쉼표(`,`)를 붙이지 않도록 주의하세요.
3. **퇴사자 삭제**: 해당 줄을 통째로 지웁니다.
4. **접속코드 재발급**: 해당 직원의 `code` 값만 바꿉니다 (`id`는 그대로 둡니다).
5. 저장 후 아래 5단계(`npm run build` → `npm run deploy`)를 다시 실행해야 실제 배포 사이트에 반영됩니다.

### 관리자 비밀번호 바꾸는 방법

같은 파일의 `admin.password` 값만 원하는 값으로 바꾸고 다시 배포하면 됩니다.

> **보안 참고**: 이 파일은 `public` 폴더에 있어 배포되면 `/data/allowed-users.json` 주소로
> 누구나 파일 내용을 열람할 수 있습니다(관리자 비밀번호 포함). 실제 인사정보 수준의 민감한
> 값(주민번호 등)은 절대 넣지 마세요. 더 엄격한 보안이 필요하면 Firebase Authentication
> 연동을 고려해야 합니다(요청 시 도와드릴 수 있습니다).

---

## 2. Firebase 프로젝트 만들기 (5분)

1. https://console.firebase.google.com 접속 → **프로젝트 추가**
2. 프로젝트 이름 입력 (예: `green-oil-training`) → 애널리틱스는 꺼도 무방 → **프로젝트 만들기**
3. 왼쪽 메뉴에서 **Firestore Database** 클릭 → **데이터베이스 만들기**
   - 위치는 `asia-northeast3 (서울)` 선택 권장
   - 모드는 우선 **테스트 모드**로 시작 (아래 3단계에서 보안 규칙을 다시 설정합니다)
4. 왼쪽 메뉴 상단 톱니바퀴 → **프로젝트 설정** → 아래로 스크롤 → **내 앱** → **웹 앱 추가**(`</>` 아이콘)
5. 앱 닉네임 아무거나 입력 → **앱 등록**
6. 화면에 나타나는 `firebaseConfig` 객체를 통째로 복사해서 `src/firebase.js`의 값과 그대로 교체하세요.

---

## 3. Firestore 보안 규칙 설정 (중요)

Firebase 콘솔 → Firestore Database → **규칙** 탭에서 아래 내용으로 교체하세요.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /employees/{empId} {
      allow read, write: if true;
    }
  }
}
```

> 로그인 자체는 `allowed-users.json`의 허용목록으로 막혀 있으므로, Firestore에는 허용된
> 사람의 학습 기록만 쓰이게 됩니다. 더 엄격하게 하려면 Firebase Authentication 연동이 필요합니다.

---

## 4. 로컬에서 테스트

```bash
npm install
npm run dev
```

터미널에 나오는 주소(예: `http://localhost:5173`)로 접속하세요.

- `allowed-users.json`에 등록된 이름+접속코드로 로그인되는지 확인
- 등록되지 않은 이름/접속코드로는 "등록되지 않은 이름 또는 접속코드입니다" 오류가 뜨는지 확인
- ADMIN 계정 + 설정한 비밀번호로 관리자 화면 진입 확인

---

## 5. GitHub Pages로 배포

### 5-1. GitHub 저장소 만들고 코드 올리기

```bash
git init
git add .
git commit -m "안전 교육 플랫폼"
git branch -M main
git remote add origin https://github.com/내계정/safety-training.git
git push -u origin main
```

### 5-2. `vite.config.js`의 base 경로 수정

저장소 이름이 `safety-training`이라면:

```js
export default defineConfig({
  plugins: [react()],
  base: "/safety-training/",
});
```

### 5-3. 배포

```bash
npm run build
npm run deploy
```

몇 초 후 `https://내계정.github.io/safety-training/` 주소로 접속하면 실제 서비스가 열립니다.
**`allowed-users.json`을 수정한 뒤에도 이 두 명령어를 다시 실행해야 반영됩니다.**

---

## 6. 교육 콘텐츠(모듈) 구조와 수정 방법

이제 모듈 내용은 코드(`App.jsx`)가 아니라 **`public/module1/content.json` ~ `public/module6/content.json`**
파일에 들어있습니다. 각 모듈 화면에 진입할 때 이 파일을 그대로 불러와 렌더링합니다.

```
public/
├── module1/
│   ├── content.json          ← 챕터 > 세부타이틀 > 본문블록 구조
│   ├── module1-image1.jpg    ← 본문에서 참조하는 이미지
│   └── ...
├── module2/
│   ├── content.json
│   ├── module2-image*.jpg
│   ├── tire-gripper.mp4       ← 본문에서 참조하는 영상
│   ├── mobile-usage.mp4
│   ├── no-seatbelt.mp4
│   └── rolling-stop.mp4
├── module3/ ~ module6/  (동일한 구조)
```

### content.json 구조

```json
{
  "title": "오리엔테이션 & 근무수칙",
  "subtitle": "...",
  "objectives": ["학습목표1", "학습목표2"],
  "chapters": [
    {
      "chapterTitle": "1. 교육 목적 및 목표",
      "sections": [
        {
          "sectionTitle": "1-1. 교육 목적",
          "blocks": [
            { "type": "bullets", "items": [{ "text": "..." }] },
            { "type": "image", "file": "module1-image1.jpg", "caption": "..." },
            { "type": "video", "file": "tire-gripper.mp4", "caption": "..." }
          ]
        }
      ]
    }
  ],
  "questions": []
}
```

- `chapters[].sections[]`가 임직원이 한 페이지씩 넘겨보는 "세부타이틀" 단위입니다.
- `blocks`는 `text`(문단) · `bullets`(목록) · `subheading`(소제목) · `image` · `video` · `table` 타입을 지원합니다.
- 텍스트나 이미지 위치를 바꾸고 싶으면 이 JSON 파일만 수정하면 됩니다 (코드 수정 불필요).

### 문제(퀴즈) 추가하기

현재 모든 모듈의 `questions`가 빈 배열이라, 학습을 마치면 "문제 준비 중입니다" 화면이 뜨고 바로 다음
모듈로 넘어갑니다. 실제 문제를 추가하려면 해당 모듈의 `content.json`에 아래 형태로 `questions` 배열을
채우면, 코드 수정 없이 자동으로 실제 퀴즈 화면으로 전환됩니다.

```json
"questions": [
  {
    "q": "질문 내용",
    "options": ["보기1", "보기2", "보기3", "보기4"],
    "correct": 0,
    "explain": "정답 해설"
  }
]
```

수정 후에는 `npm run build` → `npm run deploy`로 다시 배포해야 반영됩니다.

---

## 7. 알아두면 좋은 한계

- 사번+이름은 허용목록에 있어야 로그인되지만, 비밀번호가 없는 방식이라 "본인 확인"까지는 안 됩니다
  (사번과 이름을 아는 사람이면 로그인 가능). 더 엄격한 본인 인증이 필요하면 알려주세요.
- 관리자 비밀번호는 `allowed-users.json`에 평문으로 저장되며, 이 파일은 배포되면 공개 URL로 열람 가능합니다.
- 이미지 · 동영상 교육자료는 아직 자리만 마련되어 있고 실제 파일 업로드 기능은 없습니다.
