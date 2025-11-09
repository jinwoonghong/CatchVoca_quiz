// ============================================================================
// Authentication Functions
// ============================================================================

/**
 * Helper: 요소 보이기
 */
function showElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = el.classList.contains('state-container') ? 'flex' : 'block';
}

/**
 * Helper: 요소 숨기기
 */
function hideElement(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

/**
 * 구글 로그인
 */
async function signInWithGoogle() {
  try {
    const { signInWithPopup, GoogleAuthProvider } = window.firebaseModules;
    const provider = new GoogleAuthProvider();

    const result = await signInWithPopup(auth, provider);
    currentUser = result.user;

    console.log('[Auth] Sign in successful', currentUser.email);

    // 사용자 정보 UI 업데이트
    updateUserInfo(currentUser);

    // 로그인 성공 후 퀴즈 로드
    hideElement('login-required');
    showElement('loading');
    await loadQuizAndStart();

    return currentUser;
  } catch (error) {
    console.error('[Auth] Sign in failed', error);
    showError('로그인에 실패했습니다: ' + error.message);
    return null;
  }
}

/**
 * 로그아웃
 */
async function handleSignOut() {
  try {
    const { signOut } = window.firebaseModules;
    await signOut(auth);
    currentUser = null;
    console.log('[Auth] Sign out successful');

    // 로그인 화면으로 돌아가기
    hideElement('quiz-container');
    hideElement('user-info');
    showElement('login-required');
  } catch (error) {
    console.error('[Auth] Sign out failed', error);
  }
}

/**
 * 인증 상태 확인
 */
async function checkAuthState() {
  return new Promise((resolve) => {
    const { onAuthStateChanged } = window.firebaseModules;
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      currentUser = user;
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * 사용자 정보 UI 업데이트
 */
function updateUserInfo(user) {
  if (!user) {
    hideElement('user-info');
    return;
  }

  const userInfo = document.getElementById('user-info');
  const userPhoto = document.getElementById('user-photo');
  const userName = document.getElementById('user-name');

  if (user.photoURL) {
    userPhoto.src = user.photoURL;
    userPhoto.style.display = 'block';
  } else {
    userPhoto.style.display = 'none';
  }

  userName.textContent = user.displayName || user.email || '사용자';
  showElement('user-info');
}

/**
 * 퀴즈 로드 및 시작 (인증 후)
 */
async function loadQuizAndStart() {
  try {
    console.log('[Quiz] Loading quiz data with user:', currentUser.uid);

    // 퀴즈 데이터 로드
    words = await loadQuizData();

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

    console.log('[Quiz] Quiz started with', words.length, 'words');
  } catch (error) {
    console.error('[Quiz] Failed to load quiz', error);
    showError(error.message);
  }
}
