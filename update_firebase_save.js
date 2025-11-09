const fs = require('fs');
let content = fs.readFileSync('quiz.js', 'utf8');

// saveProgressToFirebase 함수를 saveReviewStateToFirebase로 교체
const oldSave = /async function saveProgressToFirebase\(\) \{[^}]+\{[^}]+\}[^}]+\}[^}]+\}/s;

const newSave = `async function saveReviewStateToFirebase(wordId) {
  if (!quizId || !database) return;

  try {
    const { ref, update } = window.firebaseModules;
    const reviewStateRef = ref(database, \`\${FIREBASE_PATHS.QUIZZES}/\${quizId}/reviewStates\`);

    await update(reviewStateRef, {
      [wordId]: reviewStates[wordId]
    });

    console.log('[Quiz] ReviewState saved to Firebase:', wordId);
  } catch (error) {
    console.error('[Quiz] Failed to save reviewState:', error);
  }
}`;

content = content.replace(oldSave, newSave);

// showRatingFeedback 함수 업데이트 (interval 파라미터 추가)
const oldFeedback = /function showRatingFeedback\(rating\) \{[^}]+\{[^}]+\}[^}]+const message[^}]+setTimeout[^}]+\}/s;

const newFeedback = `function showRatingFeedback(rating, interval) {
  const feedbackMessages = {
    1: \`❌ 다시 복습이 필요해요! (다음: \${interval}일 후)\`,
    2: \`😓 조금 더 연습해보세요 (다음: \${interval}일 후)\`,
    3: \`🤔 괜찮아요! (다음: \${interval}일 후)\`,
    4: \`✅ 완벽해요! (다음: \${interval}일 후)\`,
    5: \`🌟 매우 쉬웠어요! (다음: \${interval}일 후)\`,
  };

  const message = feedbackMessages[rating] || \`평가 완료 (다음: \${interval}일 후)\`;
  
  // 간단한 토스트 메시지 표시
  const toast = document.createElement('div');
  toast.className = 'rating-toast';
  toast.textContent = message;
  toast.style.cssText = \\`
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 16px 24px;
    border-radius: 8px;
    font-size: 18px;
    z-index: 1000;
    animation: fadeInOut 1s ease-in-out;
  \\`;

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 1000);
}`;

content = content.replace(oldFeedback, newFeedback);

// showCompletionMessage도 reviewStates로 변경
content = content.replace(
  'const totalReviewed = Object.keys(progress).length;',
  'const totalReviewed = Object.keys(reviewStates).length;'
);

content = content.replace(
  /const avgRating = totalReviewed > 0\n    \? Object\.values\(progress\)\.reduce/,
  `const avgRating = totalReviewed > 0
    ? Object.values(reviewStates).reduce`
);

content = content.replace(
  '\.reduce\(\(sum, p\) => sum \+ p\.lastRating, 0\)',
  '.reduce((sum, rs) => sum + (rs.lastRating || 0), 0)'
);

fs.writeFileSync('quiz.js', content, 'utf8');
console.log('Firebase save function and feedback updated');
