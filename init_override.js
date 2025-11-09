/**
 * Quiz 초기화 오버라이드 (인증 포함)
 */

// 원래 initQuiz 함수를 백업
const originalInitQuiz = window.initQuiz;

// 새로운 initQuiz 함수
async function initQuizWithAuth() {
  console.log('[Quiz] Initializing with authentication...');

  // Firebase 초기화
  await initializeFirebase();

  // 인증 상태 확인
  const user = await checkAuthState();

  if (!user) {
    // 로그인 필요
    console.log('[Quiz] User not logged in, showing login screen');
    hideElement('loading');
    showElement('login-required');

    // 로그인 버튼 이벤트 리스너
    const signInBtn = document.getElementById('google-sign-in-btn');
    if (signInBtn) {
      signInBtn.addEventListener('click', signInWithGoogle);
    }

    return;
  }

  // 로그인된 경우
  console.log('[Quiz] User logged in:', user.email);
  updateUserInfo(user);

  // 로그아웃 버튼 이벤트 리스너
  const signOutBtn = document.getElementById('sign-out-btn');
  if (signOutBtn) {
    signOutBtn.addEventListener('click', handleSignOut);
  }

  // 퀴즈 데이터 로드
  const quizIdParam = getQuizIdFromUrl();

  if (!quizIdParam) {
    showError('Quiz ID not found in URL.', 'Please generate a quiz link from CatchVoca Extension.');
    return;
  }

  try {
    showElement('loading');
    words = await loadQuizDataFromFirebase(quizIdParam);

    if (!words || words.length === 0) {
      return;
    }

    // UI 전환
    hideElement('loading');
    hideElement('login-required');
    showElement('quiz-container');

    // Total count 업데이트
    document.getElementById('total').textContent = words.length;

    // 첫 번째 단어 표시
    showWord(0);

    // 이벤트 리스너 등록
    setupEventListeners();

    console.log('[Quiz] Initialization complete');
  } catch (error) {
    console.error('[Quiz] Failed to load quiz', error);
    showError(error.message);
  }
}

// DOMContentLoaded 이벤트 리스너를 재등록
window.removeEventListener('DOMContentLoaded', originalInitQuiz);
window.addEventListener('DOMContentLoaded', () => {
  console.log('[Quiz] DOM loaded (with auth)');
  initQuizWithAuth();
});
