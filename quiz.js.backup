/**
 * CatchVoca Mobile Quiz - Firebase Version
 * Firebase Realtime Database에서 퀴즈 데이터 로드
 */

// ============================================================================
// State Management
// ============================================================================

let words = [];
let currentIndex = 0;
let showingAnswer = false;
let firebaseApp = null;
let database = null;

// ============================================================================
// Firebase Initialization
// ============================================================================

async function initializeFirebase() {
  // Firebase 모듈이 로드될 때까지 대기
  while (!window.firebaseModules) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const { initializeApp, getDatabase } = window.firebaseModules;

  if (!firebaseApp) {
    firebaseApp = initializeApp(firebaseConfig);
    database = getDatabase(firebaseApp);
    console.log('[Quiz] Firebase initialized');
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
async function loadQuizDataFromFirebase(quizId) {
  try {
    console.log('[Quiz] Loading from Firebase...', quizId);

    const db = await initializeFirebase();
    const { ref, get } = window.firebaseModules;

    const quizRef = ref(db, `${FIREBASE_PATHS.QUIZZES}/${quizId}`);
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
  const quizId = getQuizIdFromUrl();

  if (!quizId) {
    showError('Quiz ID not found in URL.', 'Please generate a quiz link from CatchVoca Extension.');
    return null;
  }

  // Firebase에서 로드
  return await loadQuizDataFromFirebase(quizId);
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
  const card = document.querySelector('.card');
  card.innerHTML = `
    <div class="completion-message">
      <div class="emoji">🎉</div>
      <h2>Quiz Complete!</h2>
      <p>You've reviewed all ${words.length} words.</p>
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
 */
window.addEventListener('DOMContentLoaded', () => {
  console.log('[Quiz] DOM loaded');
  initQuiz();
});
