/**
 * Google OAuth Token Verification Endpoint
 * POST /api/auth/verify
 *
 * Verifies Google OAuth access token from Chrome Identity API
 * Returns Firebase custom token for client authentication
 */

import { adminAuth } from '../../lib/firebase-admin.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Missing accessToken in request body' });
    }

    // Get user info from Google using access token
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      return res.status(401).json({ error: 'Invalid access token' });
    }

    const userInfo = await userInfoResponse.json();
    const { id: googleId, email, name, picture } = userInfo;

    // Use email as uid (or googleId)
    const uid = `google:${googleId}`;

    // Create or update user in Firebase Auth
    try {
      await adminAuth.getUser(uid);
    } catch (error) {
      // User doesn't exist, create new user
      await adminAuth.createUser({
        uid,
        email,
        displayName: name,
        photoURL: picture,
      });
    }

    // Generate custom token for client
    const customToken = await adminAuth.createCustomToken(uid);

    return res.status(200).json({
      success: true,
      customToken,
      user: {
        uid,
        email,
        displayName: name,
        photoURL: picture,
      },
    });
  } catch (error) {
    console.error('Auth verification error:', error);

    return res.status(500).json({
      error: 'Authentication failed',
      message: error.message,
    });
  }
}
