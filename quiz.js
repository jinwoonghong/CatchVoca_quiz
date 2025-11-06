/**
 * CatchVoca Mobile Quiz - Main Logic
 * URL Hash 기반 플래시카드 퀴즈
 */

// ============================================================================
// State Management
// ============================================================================

let words = [];
let currentIndex = 0;
let showingAnswer = false;

// ============================================================================
// Data Loading
// ============================================================================

/**
 * URL hash에서 압축된 퀴즈 데이터 로드
 */
function loadQuizData() {
  const hash = window.location.hash.substring(1); // Remove '#'

  if (!hash) {
    showError('Quiz data not found in URL.', 'Please generate a quiz link from CatchVoca Extension.');
    return null;
  }

  try {
    console.log('[Quiz] Decompressing data...');
    const decompressed = LZString.decompressFromEncodedURIComponent(hash);

    if (!decompressed) {
      showError('Failed to decompress quiz data.', 'The URL might be corrupted or incomplete.');
      return null;
    }

    console.log('[Quiz] Parsing JSON...');
    const words = JSON.parse(decompressed);

    if (!Array.isArray(words) || words.length === 0) {
      showError('No words found in quiz data.', 'Please generate a new quiz link.');
      return null;
    }

    console.log(`[Quiz] Successfully loaded ${words.length} words`);
    return words;
  } catch (error) {
    console.error('[Quiz] Parse error:', error);
    showError('Invalid quiz data format.', error.message);
    return null;
  }
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
function initQuiz() {
  console.log('[Quiz] Initializing...');

  // URL hash 데이터 로드
  words = loadQuizData();

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

  console.log('[Quiz] Answer shown');
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
 * @param {number} direction - -1 (previous) or 1 (next)
 */
function navigateWord(direction) {
  const newIndex = currentIndex + direction;

  if (newIndex < 0 || newIndex >= words.length) {
    console.warn('[Quiz] Cannot navigate to index:', newIndex);
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
    console.warn('[Quiz] No audio URL found');
    return;
  }

  console.log('[Quiz] Playing audio:', audioUrl);

  const audio = new Audio(audioUrl);

  audio.play().catch((error) => {
    console.error('[Quiz] Audio play error:', error);
    alert('Failed to play audio. Please check your connection.');
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
  // 입력 필드에서는 단축키 비활성화
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

    case 'a':
    case 'A':
      event.preventDefault();
      if (document.getElementById('play-audio').style.display !== 'none') {
        playAudio();
      }
      break;

    default:
      // Do nothing
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

/**
 * Hash 변경 시 재초기화 (새 퀴즈 로드)
 */
window.addEventListener('hashchange', () => {
  console.log('[Quiz] Hash changed, reinitializing...');
  location.reload();
});
