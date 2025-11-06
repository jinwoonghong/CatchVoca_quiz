# 📚 CatchVoca Mobile Quiz

**CatchVoca Extension**에서 생성된 모바일 퀴즈 링크를 통해 접근 가능한 웹 기반 플래시카드 퀴즈입니다.

URL Hash 기반으로 동작하여 **서버가 필요 없으며**, 완전히 **오프라인에서도 작동**합니다.

---

## ✨ 주요 기능

- ✅ **서버 불필요**: URL Hash 기반 (완전 로컬)
- ✅ **데이터 압축**: LZ-String 압축 (20개 단어 ≈ 500-1000자)
- ✅ **오프라인 동작**: 인터넷 연결 없이도 퀴즈 가능
- ✅ **키보드 단축키**: `←` `→` (네비게이션), `Space` (답변 표시)
- ✅ **발음 재생**: 오디오 URL이 있는 경우 발음 듣기 지원
- ✅ **반응형 UI**: 모바일/태블릿/데스크톱 모두 최적화
- ✅ **다크 모드**: 시스템 설정에 따라 자동 적용

---

## 🚀 사용 방법

### 1. CatchVoca Extension에서 퀴즈 링크 생성

1. **CatchVoca Extension** 설치 ([GitHub](https://github.com/YOUR_USERNAME/CatchVoca))
2. Extension Popup → **Settings** 탭으로 이동
3. "모바일 퀴즈 생성" 버튼 클릭
4. **QR 코드 스캔** 또는 **URL 복사**

### 2. 모바일 기기에서 접속

- **QR 코드 스캔**: 카메라 앱으로 스캔
- **URL 복사**: 모바일 브라우저에 붙여넣기

### 3. 플래시카드 퀴즈 시작

- 단어를 보고 의미를 떠올려보세요
- "Show Answer" 버튼으로 정의 확인
- 화살표 버튼으로 다음/이전 단어 이동
- 🔊 버튼으로 발음 듣기 (오디오 지원 단어만)

---

## ⌨️ 키보드 단축키

| 키 | 기능 |
|---|---|
| `←` | 이전 단어 |
| `→` | 다음 단어 |
| `Space` | 답변 표시/숨기기 |
| `A` | 발음 재생 (오디오가 있는 경우) |

---

## 🛠️ 기술 스택

- **Frontend**: Vanilla JavaScript (No Framework)
- **Compression**: [LZ-String](https://pieroxy.net/blog/pages/lz-string/index.html) v1.5.0
- **Hosting**: GitHub Pages (무료 정적 호스팅)
- **Design**: CSS3 with Flexbox & Grid

---

## 📦 프로젝트 구조

```
CatchVoca_Quiz/
├── index.html          # 메인 HTML (플래시카드 UI)
├── quiz.js             # 퀴즈 로직 (데이터 로드, 네비게이션, 키보드)
├── style.css           # 스타일링 (반응형, 다크 모드)
└── README.md           # 이 파일
```

---

## 🌐 배포 방법 (GitHub Pages)

### 1. GitHub 저장소 생성

```bash
# 로컬에서 Git 초기화
cd d:\project\CatchVoca_Quiz
git init
git add .
git commit -m "Initial commit: Mobile quiz webapp"

# GitHub에 푸시
git remote add origin https://github.com/YOUR_USERNAME/CatchVoca_Quiz.git
git branch -M main
git push -u origin main
```

### 2. GitHub Pages 활성화

1. GitHub 저장소 페이지 방문
2. **Settings** → **Pages**
3. **Source**: `main` branch 선택
4. **Save** 클릭
5. 약 1-2분 후 배포 완료

### 3. URL 확인

배포 완료 후 다음 URL로 접속 가능:

```
https://YOUR_USERNAME.github.io/CatchVoca_Quiz/
```

---

## 🔗 Extension 코드 수정

GitHub Pages 배포 후, **CatchVoca Extension** 코드에서 실제 URL로 업데이트하세요:

### 파일 위치
`packages/extension/src/background/services/mobileQuizService.ts`

### 수정 내용
```typescript
// Before (145줄)
pwaUrl = 'https://YOUR_GITHUB_USERNAME.github.io/catchvoca-quiz/',

// After (실제 배포 URL로 변경)
pwaUrl = 'https://YOUR_ACTUAL_USERNAME.github.io/CatchVoca_Quiz/',
```

### Extension 리빌드
```bash
cd d:\project\CatchVoca
pnpm build:extension
```

Chrome에서 Extension 새로고침 후 다시 테스트하세요!

---

## 📊 데이터 형식

### URL Hash 구조

```
https://YOUR_USERNAME.github.io/CatchVoca_Quiz/#COMPRESSED_DATA
```

### 압축 전 JSON 형식

```json
[
  {
    "w": "hello",
    "d": ["안녕하세요", "인사말"],
    "p": "/həˈloʊ/",
    "a": "https://example.com/audio/hello.mp3"
  },
  {
    "w": "world",
    "d": ["세계", "지구"],
    "p": "/wɜːrld/"
  }
]
```

### 필드 설명

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `w` | string | ✅ | 단어 |
| `d` | string[] | ✅ | 정의 목록 |
| `p` | string | ❌ | 발음 기호 |
| `a` | string | ❌ | 오디오 URL |

---

## 🔒 개인정보 보호

- ✅ **완전 로컬 처리**: 모든 데이터는 URL Hash에만 저장
- ✅ **서버 전송 없음**: 어떠한 데이터도 서버로 전송되지 않음
- ✅ **쿠키/추적 없음**: 사용자 행동 추적 없음
- ✅ **오프라인 지원**: 인터넷 연결 없이도 퀴즈 가능

---

## 🐛 문제 해결

### 1. "Quiz data not found in URL" 오류

**원인**: URL에 `#` 이후 데이터가 없음

**해결책**:
- CatchVoca Extension에서 퀴즈 링크를 다시 생성
- URL을 완전히 복사했는지 확인 (`#` 포함)

### 2. "Failed to decompress quiz data" 오류

**원인**: URL이 잘못되었거나 불완전함

**해결책**:
- 브라우저 주소창에 URL을 직접 붙여넣기
- 메신저 앱에서 링크가 잘린 경우 원본 링크 확인

### 3. "Invalid quiz data format" 오류

**원인**: Extension 버전과 PWA 버전 불일치

**해결책**:
- CatchVoca Extension을 최신 버전으로 업데이트
- 새로운 퀴즈 링크 생성

### 4. URL이 너무 길다 (2048자 초과)

**원인**: 단어 수가 너무 많거나 정의가 너무 김

**해결책**:
- Extension Settings에서 `maxWords` 값을 줄이기 (20 → 10)
- 긴 정의를 가진 단어 제외

---

## 📈 성능 최적화

### 압축 효율

- **원본 JSON**: ~5KB (20개 단어 기준)
- **LZ-String 압축 후**: ~800 bytes (84% 압축률)
- **URL 길이**: ~850자 (2048자 제한 내)

### 로딩 속도

- **초기 로드**: < 100ms (LZ-String CDN 포함)
- **데이터 파싱**: < 50ms (20개 단어)
- **렌더링**: < 30ms (첫 단어 표시)

---

## 🤝 기여 가이드

이 프로젝트는 **CatchVoca Extension**의 일부입니다.

### 개선 아이디어

- [ ] PWA 매니페스트 추가 (홈 화면에 추가)
- [ ] Service Worker 캐싱 (완전 오프라인)
- [ ] 퀴즈 진행 상황 저장 (LocalStorage)
- [ ] 통계 기능 (정답률, 소요 시간)
- [ ] 다국어 지원 (영어, 한국어)
- [ ] 애니메이션 강화 (카드 플립 효과)

### Pull Request 환영

버그 수정, 기능 추가, 문서 개선 등 모든 기여를 환영합니다!

---

## 📄 라이선스

MIT License

Copyright (c) 2025 CatchVoca

---

## 🔗 관련 링크

- **CatchVoca Extension**: [GitHub](https://github.com/YOUR_USERNAME/CatchVoca)
- **개발 문서**: [DEV_PLAN.md](https://github.com/YOUR_USERNAME/CatchVoca/blob/main/DEV_PLAN.md)
- **이슈 제보**: [GitHub Issues](https://github.com/YOUR_USERNAME/CatchVoca/issues)

---

## 💬 문의

질문이나 제안 사항이 있으시면 [GitHub Issues](https://github.com/YOUR_USERNAME/CatchVoca/issues)에 남겨주세요!

---

**Made with ❤️ by CatchVoca Team**
