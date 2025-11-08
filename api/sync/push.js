/**
 * Push Sync Endpoint
 * POST /api/sync/push
 *
 * Uploads client changes to Firestore
 * Handles conflict resolution using timestamps
 */

import { adminAuth, adminDb } from '../../lib/firebase-admin.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    // Extract and decode custom token
    const customToken = authHeader.substring(7);

    // Custom tokens are JWTs - decode the payload
    const tokenParts = customToken.split('.');
    if (tokenParts.length !== 3) {
      return res.status(401).json({ error: 'Invalid token format' });
    }

    // Decode JWT payload (base64url decode)
    const payload = JSON.parse(Buffer.from(tokenParts[1], 'base64').toString());
    const userId = payload.uid || payload.sub;

    if (!userId) {
      return res.status(401).json({ error: 'Invalid token: missing uid' });
    }

    // Parse request body
    const { words = [], reviews = [], deviceId, timestamp } = req.body;

    if (!deviceId || !timestamp) {
      return res.status(400).json({ error: 'Missing deviceId or timestamp' });
    }

    // Prepare updates for Realtime Database
    const updates = {};
    let wordCount = 0;
    let reviewCount = 0;

    // Helper function to encode ID for Firebase Realtime Database
    // Firebase keys cannot contain . $ # [ ] / or ASCII control characters
    const encodeFirebaseKey = (key) => {
      return key
        .replace(/\./g, '%2E')
        .replace(/\$/g, '%24')
        .replace(/#/g, '%23')
        .replace(/\[/g, '%5B')
        .replace(/\]/g, '%5D')
        .replace(/\//g, '%2F');
    };

    // Process word changes
    for (const word of words) {
      const encodedWordId = encodeFirebaseKey(word.id);
      const wordPath = `users/${userId}/words/${encodedWordId}`;

      // Get existing data for conflict resolution
      const existingSnapshot = await adminDb.ref(wordPath).get();

      if (existingSnapshot.exists()) {
        const existingData = existingSnapshot.val();

        // Conflict resolution: latest updatedAt wins
        if (existingData.updatedAt > word.updatedAt) {
          continue; // Skip this word, server version is newer
        }
      }

      // Add metadata
      const wordData = {
        ...word,
        syncedAt: timestamp,
        syncedFrom: deviceId,
      };

      updates[wordPath] = wordData;
      wordCount++;
    }

    // Process review changes
    for (const review of reviews) {
      const encodedReviewId = encodeFirebaseKey(review.id);
      const reviewPath = `users/${userId}/reviews/${encodedReviewId}`;

      // Get existing data for conflict resolution
      const existingSnapshot = await adminDb.ref(reviewPath).get();

      if (existingSnapshot.exists()) {
        const existingData = existingSnapshot.val();

        // Conflict resolution: latest history entry wins
        const existingLastReview = existingData.history?.[existingData.history.length - 1];
        const newLastReview = review.history?.[review.history.length - 1];

        if (existingLastReview && newLastReview && existingLastReview.reviewedAt > newLastReview.reviewedAt) {
          continue; // Skip this review, server version is newer
        }
      }

      // Add metadata
      const reviewData = {
        ...review,
        syncedAt: timestamp,
        syncedFrom: deviceId,
      };

      updates[reviewPath] = reviewData;
      reviewCount++;
    }

    // Apply all updates atomically
    await adminDb.ref().update(updates);

    return res.status(200).json({
      success: true,
      synced: {
        words: wordCount,
        reviews: reviewCount,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error('Push sync error:', error);

    if (error.code === 'auth/id-token-expired') {
      return res.status(401).json({ error: 'Token expired' });
    }

    return res.status(500).json({
      error: 'Push sync failed',
      message: error.message,
    });
  }
}
