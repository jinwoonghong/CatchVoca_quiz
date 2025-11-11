import { getAdminAuth } from '../lib/firebase-admin.js';

/**
 * Google Access Token → Firebase Custom Token 교환 API
 *
 * POST /api/auth/exchange-token
 * Headers: Authorization: Bearer <Google Access Token>
 * Response: { customToken, user: { uid, email, displayName, photoURL } }
 */
export default async function handler(req, res) {
  // ===== CORS 설정 =====
  const origin = req.headers.origin;
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

  // Chrome Extension에서 오는 요청 허용
  if (origin && origin.startsWith('chrome-extension://')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  } else if (allowedOrigin === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*');
  } else {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  }

  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400'); // 24시간

  // OPTIONS preflight 요청 처리
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST requests are accepted',
    });
  }

  try {
    // ===== 1. Access Token 추출 =====
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Missing authorization',
        message: 'Authorization header must be "Bearer <token>"',
      });
    }

    const accessToken = authHeader.substring(7).trim();

    if (!accessToken || accessToken.length === 0) {
      return res.status(401).json({
        error: 'Invalid token',
        message: 'Access token is empty',
      });
    }

    // ===== 2. Google UserInfo API로 토큰 검증 =====
    console.log('[Exchange Token] Verifying Google Access Token...');

    let userInfoResponse;
    try {
      // Node.js 18+ fetch API 사용 (Vercel은 Node 18+ 지원)
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15초 타임아웃

      userInfoResponse = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeout);
    } catch (error) {
      console.error('[Exchange Token] Google API network error:', error);

      if (error.name === 'AbortError') {
        return res.status(504).json({
          error: 'Gateway timeout',
          message: 'Google UserInfo API request timed out',
        });
      }

      return res.status(503).json({
        error: 'Service unavailable',
        message: 'Cannot reach Google UserInfo API',
      });
    }

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text().catch(() => 'Unknown error');
      console.error('[Exchange Token] Google API error:', {
        status: userInfoResponse.status,
        error: errorText,
      });

      return res.status(401).json({
        error: 'Invalid access token',
        message: `Google UserInfo API returned ${userInfoResponse.status}`,
        details: errorText,
      });
    }

    const userInfo = await userInfoResponse.json();

    // userInfo 구조 검증
    if (!userInfo.id || !userInfo.email) {
      console.error('[Exchange Token] Invalid user info structure:', userInfo);
      return res.status(400).json({
        error: 'Invalid user info',
        message: 'Google UserInfo missing required fields (id, email)',
      });
    }

    console.log('[Exchange Token] User verified:', {
      id: userInfo.id,
      email: userInfo.email,
    });

    // ===== 3. Firebase Custom Token 생성 =====
    // UID 포맷: google:{googleId}
    const uid = validateAndFormatUid(userInfo.id);

    // Custom Claims (선택사항)
    const additionalClaims = {
      email: userInfo.email,
      name: userInfo.name || userInfo.email.split('@')[0],
      picture: userInfo.picture || null,
      provider: 'google',
    };

    console.log('[Exchange Token] Creating Firebase Custom Token...', { uid });

    let customToken;
    try {
      const adminAuth = getAdminAuth();
      customToken = await adminAuth.createCustomToken(uid, additionalClaims);
    } catch (error) {
      console.error('[Exchange Token] Firebase Custom Token creation failed:', error);

      if (error.code === 'auth/insufficient-permission') {
        return res.status(500).json({
          error: 'Server configuration error',
          message: 'Admin SDK lacks required permissions',
          solution: 'Add "Firebase Authentication Admin" role to service account',
        });
      }

      if (error.code?.startsWith('auth/')) {
        return res.status(500).json({
          error: 'Firebase error',
          message: error.message,
          code: error.code,
        });
      }

      throw error;
    }

    console.log('[Exchange Token] Custom Token created successfully', { uid });

    // ===== 4. 응답 반환 =====
    return res.status(200).json({
      customToken,
      user: {
        uid,
        email: userInfo.email,
        displayName: additionalClaims.name,
        photoURL: additionalClaims.picture,
        emailVerified: userInfo.verified_email || false,
      },
    });
  } catch (error) {
    console.error('[Exchange Token] Unexpected error:', error);

    // 환경변수 누락 에러
    if (error.message?.includes('Missing Firebase Admin credentials')) {
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'Firebase Admin SDK not properly configured',
        details: error.message,
      });
    }

    // 기타 서버 에러
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'An unexpected error occurred',
    });
  }
}

/**
 * UID 검증 및 포맷팅
 * Firebase UID 제약사항:
 * - 최대 128자
 * - 영숫자, 대시, 언더스코어, 콜론만 허용
 */
function validateAndFormatUid(googleId) {
  if (!googleId || typeof googleId !== 'string') {
    throw new Error('Invalid Google ID: must be a non-empty string');
  }

  // google: 접두사 추가
  const uid = `google:${googleId}`;

  // 길이 검증
  if (uid.length > 128) {
    throw new Error(`UID exceeds maximum length (128 characters): ${uid.length}`);
  }

  // 허용된 문자만 포함하는지 검증
  if (!/^[a-zA-Z0-9_:\-]+$/.test(uid)) {
    throw new Error('UID contains invalid characters (only alphanumeric, dash, underscore, colon allowed)');
  }

  return uid;
}
