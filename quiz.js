/**
 * CatchVoca Mobile Quiz - Firebase Version with SM-2 Algorithm
 * Implements identical learning logic as PC Chrome Extension
 */

// ============================================================================
// State Management
// ============================================================================

let words = [];
let currentIndex = 0;
let showingAnswer = false;
let firebaseApp = null;
let database = null;
let quizId = null;
let userId = null; // User ID from URL parameter
let reviewStates = {}; // SM-2 algorithm states: { wordId: ReviewState }
let auth = null;
let currentUser = null;

// ============================================================================
// SM-2 Algorithm Configuration & Implementation
// ============================================================================

/**
 * SM-2 알고리즘 설정
 */
const SM2_CONFIG = {
  minEaseFactor: 1.3,
  maxEaseFactor: 2.5,
  firstInterval: 1,    // 1일
  secondInterval: 6,   // 6일
};

/**
 * Rating enum (1-5)
 */
const Rating = {
  Again: 1,      // 완전히 못 외움
  Hard: 2,       // 어렵게 기억
  Good: 3,       // 보통
  Easy: 4,       // 쉽게 기억
  VeryEasy: 5,   // 매우 쉽게 기억 (UI에서는 사용 안 함)
};

/**
 * SM-2 알고리즘을 사용하여 다음 복습 일정 계산
 * @param {Object} currentState - 현재 복습 상태
 * @param {number} rating - 사용자의 평가 (1-5)
 * @returns {Object} 다음 복습 일정 정보
 */
function calculateNextReview(currentState, rating) {
  let { interval, easeFactor, repetitions } = currentState;

  // 1. EaseFactor 계산
  // EF' = EF + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const newEaseFactor = Math.max(
    SM2_CONFIG.minEaseFactor,
    Math.min(
      SM2_CONFIG.maxEaseFactor,
      easeFactor + (0.1 - (5 - rating) * (0.08 + (5 - rating) * 0.02))
    )
  );

  // 2. 평가에 따른 간격 및 반복 횟수 계산
  let newInterval;
  let newRepetitions;

  if (rating < Rating.Good) {
    // Rating이 Good(3) 미만이면 처음부터 다시 시작
    newInterval = SM2_CONFIG.firstInterval;
    newRepetitions = 0;
  } else {
    // Rating이 Good(3) 이상이면 성공
    newRepetitions = repetitions + 1;

    if (newRepetitions === 1) {
      // 첫 번째 성공 복습
      newInterval = SM2_CONFIG.firstInterval;
    } else if (newRepetitions === 2) {
      // 두 번째 성공 복습
      newInterval = SM2_CONFIG.secondInterval;
    } else {
      // 세 번째 이후 성공 복습
      // I(n) = I(n-1) * EF
      newInterval = Math.round(interval * newEaseFactor);
    }
  }

  // 3. 다음 복습 시각 계산
  const now = Date.now();
  const nextReviewAt = now + newInterval * 24 * 60 * 60 * 1000;

  return {
    nextReviewAt,
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
  };
}

/**
 * 초기 ReviewState 생성
 * @param {string} wordId - 단어 ID
 * @returns {Object} 초기 ReviewState
 */
function createInitialReviewState(wordId) {
  const now = Date.now();
  return {
    wordId,
    nextReviewAt: now, // 저장 즉시 복습 가능
    interval: SM2_CONFIG.firstInterval,
    easeFactor: 2.5, // 초기 난이도 계수
    repetitions: 0,
  };
}

// ============================================================================
// Firebase Initialization
// ============================================================================

async function initializeFirebase() {
  // Firebase 모듈이 로드될 때까지 대기
  while (!window.firebaseModules) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const { initializeApp, getDatabase, getAuth } = window.firebaseModules;

  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
    database = getDatabase(firebaseApp);
    auth = getAuth(firebaseApp);
    console.log('[Quiz] Firebase initialized (database + auth)');
  }

  return database;
}

// ============================================================================
// Data Loading
// ============================================================================

/**
 * URL 쿼리 파라미터에서 퀴즈 ID 추출
 */
function getQuizIdFromUrl() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('id');
}

/**
 * Firebase에서 퀴즈 데이터 로드
 */
async function loadQuizDataFromFirebase(quizIdParam) {
  try {
    console.log('[Quiz] Loading from Firebase...', quizIdParam);

    const db = await initializeFirebase();
    const { ref, get } = window.firebaseModules;

    // URL에서 userId도 가져오기
    const urlParams = new URLSearchParams(window.location.search);
    const userIdParam = urlParams.get('uid');

    if (!userIdParam) {
      showError('Invalid URL', 'User ID is missing from the quiz link.');
      return null;
    }

    const quizRef = ref(db, `users/${userIdParam}/${FIREBASE_PATHS.QUIZZES}/${quizIdParam}`);
    const snapshot = await get(quizRef);

    if (!snapshot.exists()) {
      showError('Quiz not found', 'The quiz link may have expired (7 days limit) or is invalid.');
      return null;
    }

    const quizData = snapshot.val();

    // 만료 확인
    if (quizData.expiresAt < Date.now()) {
      showError('Quiz expired', 'This quiz has expired. Please generate a new link.');
      return null;
    }

    // quizId와 userId 저장
    quizId = quizIdParam;
    userId = userIdParam;

    // reviewStates 로드 (있다면)
    const reviewStatesRef = ref(db, `users/${userIdParam}/${FIREBASE_PATHS.QUIZZES}/${quizIdParam}/reviewStates`);
    const reviewStatesSnapshot = await get(reviewStatesRef);

    if (reviewStatesSnapshot.exists()) {
      reviewStates = reviewStatesSnapshot.val() || {};
      console.log('[Quiz] Loaded review states:', Object.keys(reviewStates).length);
    } else {
      reviewStates = {};
      console.log('[Quiz] No review states found, starting fresh');
    }

    console.log(`[Quiz] Loaded ${quizData.words.length} words from Firebase`);
    return quizData.words;
  } catch (error) {
    console.error('[Quiz] Firebase load error:', error);
    showError('Failed to load quiz', error.message || 'Please check your internet connection.');
    return null;
  }
}

/**
 * 퀴즈 데이터 로드 (메인 함수)
 */
async function loadQuizData() {
  const quizIdParam = getQuizIdFromUrl();

  if (!quizIdParam) {
    showError('Quiz ID not found in URL.', 'Please generate a quiz link from CatchVoca Extension.');
    return null;
  }

  // Firebase에서 로드
  return await loadQuizDataFromFirebase(quizIdParam);
}

/**
 * 에러 표시
 */
function showError(mainMessage, detailMessage = '') {
  document.getElementById('loading').style.display = 'none';
  document.getElementById('error').style.display = 'flex';

  const errorMessageEl = document.getElementById('error-message');
  errorMessageEl.innerHTML = `<strong>${mainMessage}</strong>`;

  if (detailMessage) {
    errorMessageEl.innerHTML += `<br><small>${detailMessage}</small>`;
  }
}

// ============================================================================
// Quiz Initialization
// ============================================================================

/**
 * 퀴즈 초기화
 */
async function initQuiz() {
  console.log('[Quiz] Initializing...');

  // 퀴즈 데이터 로드
  words = await loadQuizData();

  if (!words || words.length === 0) {
    return;
  }

  // UI 전환
  document.getElementById('loading').style.display = 'none';
  document.getElementById('quiz-container').style.display = 'block';

  // Total count 업데이트
  document.getElementById('total').textContent = words.length;

  // 첫 번째 단어 표시
  showWord(0);

  // 이벤트 리스너 등록
  setupEventListeners();

  console.log('[Quiz] Initialization complete');
}

/**
 * 이벤트 리스너 설정
 */
function setupEventListeners() {
  // 답변 토글 버튼
  document.getElementById('show-answer').addEventListener('click', toggleAnswer);

  // 네비게이션 버튼
  document.getElementById('prev-btn').addEventListener('click', () => navigateWord(-1));
  document.getElementById('next-btn').addEventListener('click', () => navigateWord(1));

  // 오디오 재생 버튼
  document.getElementById('play-audio').addEventListener('click', playAudio);

  // 평점 버튼
  document.querySelectorAll('.rating-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const rating = parseInt(btn.dataset.rating);
      handleRating(rating);
    });
  });

  // 키보드 단축키
  document.addEventListener('keydown', handleKeydown);
}

// ============================================================================
// Word Display
// ============================================================================

/**
 * 특정 인덱스의 단어 표시
 */
function showWord(index) {
  if (index < 0 || index >= words.length) {
    console.error('[Quiz] Invalid index:', index);
    return;
  }

  currentIndex = index;
  const word = words[index];
  showingAnswer = false;

  console.log(`[Quiz] Showing word ${index + 1}/${words.length}:`, word.w);

  // 단어 및 발음 기호
  document.getElementById('word-text').textContent = word.w;
  document.getElementById('phonetic').textContent = word.p || '';

  // 진행 상황
  document.getElementById('current').textContent = index + 1;

  // 답변 초기화
  hideAnswer();

  // 정의 렌더링
  renderDefinitions(word.d);

  // 오디오 버튼
  const audioBtn = document.getElementById('play-audio');
  if (word.a) {
    audioBtn.style.display = 'inline-block';
    audioBtn.dataset.audioUrl = word.a;
  } else {
    audioBtn.style.display = 'none';
  }

  // 네비게이션 버튼 상태
  updateNavigationButtons();
}

/**
 * 정의 목록 렌더링
 */
function renderDefinitions(definitions) {
  const definitionsList = document.getElementById('definitions-list');
  definitionsList.innerHTML = '';

  if (!definitions || definitions.length === 0) {
    const li = document.createElement('li');
    li.textContent = '정의 없음';
    li.className = 'no-definition';
    definitionsList.appendChild(li);
    return;
  }

  definitions.forEach((def, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="def-number">${index + 1}.</span> ${def}`;
    definitionsList.appendChild(li);
  });
}

/**
 * 네비게이션 버튼 상태 업데이트
 */
function updateNavigationButtons() {
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');

  prevBtn.disabled = currentIndex === 0;
  nextBtn.disabled = currentIndex === words.length - 1;

  // 마지막 단어일 때 "Finish" 표시
  if (currentIndex === words.length - 1) {
    nextBtn.textContent = 'Finish 🎉';
  } else {
    nextBtn.textContent = 'Next →';
  }
}

// ============================================================================
// Answer Toggle
// ============================================================================

/**
 * 답변 표시/숨기기 토글
 */
function toggleAnswer() {
  showingAnswer = !showingAnswer;

  if (showingAnswer) {
    showAnswer();
  } else {
    hideAnswer();
  }
}

/**
 * 답변 표시
 */
function showAnswer() {
  const answerContainer = document.getElementById('answer');
  const showAnswerBtn = document.getElementById('show-answer');

  answerContainer.style.display = 'block';
  showAnswerBtn.textContent = 'Hide Answer';
  showAnswerBtn.classList.add('active');
  showingAnswer = true;
}

/**
 * 답변 숨기기
 */
function hideAnswer() {
  const answerContainer = document.getElementById('answer');
  const showAnswerBtn = document.getElementById('show-answer');

  answerContainer.style.display = 'none';
  showAnswerBtn.textContent = 'Show Answer';
  showAnswerBtn.classList.remove('active');
  showingAnswer = false;
}

// ============================================================================
// SM-2 Rating Handler
// ============================================================================

/**
 * 평점 처리 (SM-2 알고리즘 적용)
 */
async function handleRating(rating) {
  const word = words[currentIndex];

  // quizId 검증
  if (!quizId) {
    console.error('[Quiz] Cannot rate word: quizId is not set');
    alert('퀴즈 ID를 찾을 수 없습니다. 페이지를 새로고침해주세요.');
    return;
  }

  // ✅ normalizedWord 사용 (PC 동기화와 일치)
  const normalizedWord = word.w.toLowerCase().trim();
  const wordId = `${normalizedWord}::${quizId}`;

  console.log(`[Quiz] Rating ${rating} for word:`, word.w, `(normalized: ${normalizedWord})`);

  // 현재 ReviewState 가져오기 또는 초기화
  let currentState = reviewStates[wordId];
  if (!currentState) {
    currentState = createInitialReviewState(wordId);
    console.log('[Quiz] Created initial review state for:', wordId);
  }

  // SM-2 알고리즘으로 다음 복습 일정 계산
  const sm2Result = calculateNextReview(currentState, rating);

  console.log('[Quiz] SM-2 calculation result:', {
    interval: sm2Result.interval,
    easeFactor: sm2Result.easeFactor,
    repetitions: sm2Result.repetitions,
  });

  // ReviewState 업데이트
  reviewStates[wordId] = {
    wordId: wordId,
    nextReviewAt: sm2Result.nextReviewAt,
    interval: sm2Result.interval,
    easeFactor: sm2Result.easeFactor,
    repetitions: sm2Result.repetitions,
    lastRating: rating,
    lastReviewedAt: Date.now(),
  };

  // Firebase에 저장
  await saveReviewStateToFirebase(wordId);

  // 피드백 표시
  showRatingFeedback(rating, sm2Result.interval);

  // 1초 후 다음 단어로 이동
  setTimeout(() => {
    if (currentIndex < words.length - 1) {
      navigateWord(1);
    } else {
      showCompletionMessage();
    }
  }, 1000);
}

/**
 * ReviewState를 Firebase에 저장
 */
async function saveReviewStateToFirebase(wordId) {
  try {
    // userId와 quizId 검증
    if (!userId || !quizId) {
      console.error('[Quiz] Cannot save review state: userId or quizId is not set', { userId, quizId });
      throw new Error('User ID or Quiz ID is missing');
    }

    const db = await initializeFirebase();
    const { ref, update } = window.firebaseModules;

    // userId를 포함한 올바른 경로에 저장
    const reviewStateRef = ref(db, `users/${userId}/${FIREBASE_PATHS.QUIZZES}/${quizId}/reviewStates/${wordId}`);
    await update(reviewStateRef, reviewStates[wordId]);

    console.log('[Quiz] Review state saved to Firebase:', wordId);
  } catch (error) {
    console.error('[Quiz] Failed to save review state:', error);

    // ✅ 사용자에게 저장 실패 알림
    alert('⚠️ 학습 기록 저장 실패\n\n인터넷 연결을 확인하고 다시 시도해주세요.');
    throw error; // 재시도 가능하도록 에러 전파
  }
}

/**
 * 평점 피드백 표시
 */
function showRatingFeedback(rating, interval) {
  const feedbackMessages = {
    1: `다시 복습하세요! (다음: ${interval}일 후)`,
    2: `조금 더 연습이 필요해요 (다음: ${interval}일 후)`,
    3: `좋아요! (다음: ${interval}일 후)`,
    4: `완벽해요! (다음: ${interval}일 후)`,
  };

  const message = feedbackMessages[rating] || '평가 완료!';

  // 임시 알림 표시
  const feedback = document.createElement('div');
  feedback.className = 'rating-feedback';
  feedback.textContent = message;
  feedback.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 20px 40px;
    border-radius: 10px;
    font-size: 18px;
    z-index: 1000;
    animation: fadeIn 0.3s ease-in-out;
  `;

  document.body.appendChild(feedback);

  setTimeout(() => {
    feedback.remove();
  }, 900);
}

// ============================================================================
// Navigation
// ============================================================================

/**
 * 단어 네비게이션
 */
function navigateWord(direction) {
  const newIndex = currentIndex + direction;

  if (newIndex < 0 || newIndex >= words.length) {
    return;
  }

  // 마지막 단어에서 "Finish" 클릭 시
  if (currentIndex === words.length - 1 && direction === 1) {
    showCompletionMessage();
    return;
  }

  showWord(newIndex);
}

/**
 * 퀴즈 완료 메시지
 */
function showCompletionMessage() {
  const reviewedCount = Object.keys(reviewStates).length;

  const card = document.querySelector('.card');
  card.innerHTML = `
    <div class="completion-message">
      <div class="emoji">🎉</div>
      <h2>Quiz Complete!</h2>
      <p>You've reviewed ${reviewedCount} words out of ${words.length}.</p>
      <p class="subtitle">Great job! Keep practicing to improve retention.</p>
      <button class="btn btn-primary" onclick="location.reload()">
        Restart Quiz
      </button>
    </div>
  `;

  document.querySelector('.controls').style.display = 'none';
}

// ============================================================================
// Audio Playback
// ============================================================================

/**
 * 오디오 재생
 */
function playAudio() {
  const audioBtn = document.getElementById('play-audio');
  const audioUrl = audioBtn.dataset.audioUrl;

  if (!audioUrl) {
    return;
  }

  const audio = new Audio(audioUrl);

  audio.play().catch((error) => {
    console.error('[Quiz] Audio play error:', error);
    alert('Failed to play audio.');
  });

  // Visual feedback
  audioBtn.textContent = '🔊 Playing...';
  audioBtn.disabled = true;

  audio.addEventListener('ended', () => {
    audioBtn.textContent = '🔊 Play';
    audioBtn.disabled = false;
  });

  audio.addEventListener('error', () => {
    audioBtn.textContent = '🔊 Play';
    audioBtn.disabled = false;
  });
}

// ============================================================================
// Keyboard Shortcuts
// ============================================================================

/**
 * 키보드 이벤트 핸들러
 */
function handleKeydown(event) {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
    return;
  }

  switch (event.key) {
    case 'ArrowLeft':
      event.preventDefault();
      navigateWord(-1);
      break;

    case 'ArrowRight':
      event.preventDefault();
      navigateWord(1);
      break;

    case ' ':
      event.preventDefault();
      toggleAnswer();
      break;

    default:
      break;
  }
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * DOMContentLoaded 이벤트 시 초기화
 * 참고: init_override.js가 로드되면 인증 후 initQuizWithAuth()가 호출됨
 * 이 이벤트 리스너는 init_override.js가 없는 경우의 fallback
 */
window.addEventListener('DOMContentLoaded', () => {
  console.log('[Quiz] DOM loaded');
  // init_override.js가 로드될 때까지 대기
  // init_override.js가 있으면 initQuizWithAuth()가 실행됨
  setTimeout(() => {
    // init_override.js가 로드되지 않은 경우에만 실행
    if (!window.initQuizWithAuthLoaded) {
      console.log('[Quiz] No auth override, running basic initQuiz');
      initQuiz();
    }
  }, 100);
});
