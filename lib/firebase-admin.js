/**
 * Firebase Admin SDK Initialization
 *
 * Server-side Firebase setup for Realtime Database and Authentication.
 * Used by Vercel API routes for secure database operations.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';
import { getAuth } from 'firebase-admin/auth';

/**
 * Initialize Firebase Admin SDK
 * Uses service account credentials from environment variables
 * Singleton pattern - only initializes once
 */
function initializeFirebaseAdmin() {
  // Return existing app if already initialized
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // Service account credentials from environment variables
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  // Validate required credentials
  if (!serviceAccount.projectId || !serviceAccount.clientEmail || !serviceAccount.privateKey) {
    throw new Error(
      'Missing Firebase Admin credentials. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY environment variables.'
    );
  }

  // Get database URL from environment or construct it
  const databaseURL = process.env.FIREBASE_DATABASE_URL ||
    `https://${serviceAccount.projectId}-default-rtdb.asia-southeast1.firebasedatabase.app`;

  // Initialize Firebase Admin
  return initializeApp({
    credential: cert(serviceAccount),
    databaseURL: databaseURL,
  });
}

// Initialize app
const app = initializeFirebaseAdmin();

// Export Realtime Database instance
export const adminDb = getDatabase(app);

// Export Auth instance
export const adminAuth = getAuth(app);

/**
 * Realtime Database Structure:
 *
 * users/
 *   {userId}/
 *     ├── words/
 *     │   └── {wordId}: WordEntry object
 *     └── reviews/
 *         └── {reviewId}: ReviewState object
 *
 * Data Schema:
 * - words: Same as WordEntry from @catchvoca/types
 * - reviews: Same as ReviewState from @catchvoca/types
 */
