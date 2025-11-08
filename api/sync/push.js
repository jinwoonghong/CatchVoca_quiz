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

    const idToken = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Parse request body
    const { words = [], reviews = [], deviceId, timestamp } = req.body;

    if (!deviceId || !timestamp) {
      return res.status(400).json({ error: 'Missing deviceId or timestamp' });
    }

    // Prepare updates for Realtime Database
    const updates = {};
    let wordCount = 0;
    let reviewCount = 0;

    // Process word changes
    for (const word of words) {
      const wordPath = `users/${userId}/words/${word.id}`;

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
      const reviewPath = `users/${userId}/reviews/${review.id}`;

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
