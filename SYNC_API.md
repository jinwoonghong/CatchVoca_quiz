# CatchVoca Sync API Server

Vercel serverless functions for CatchVoca online synchronization.

## Overview

This API server acts as middleware between Chrome Extension and Firebase Firestore to enable:
- Google OAuth authentication
- Cross-device vocabulary synchronization
- Conflict resolution using timestamps
- Offline queue support

## Architecture

```
Chrome Extension (Client)
    ↓ Google OAuth Token
Vercel API (Middleware)
    ↓ Firebase Admin SDK
Firestore (Database)
```

## API Endpoints

### Health Check
```
GET /api/health
```

Returns server status and version.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-11-08T12:00:00.000Z",
  "service": "CatchVoca Sync API",
  "version": "1.0.0"
}
```

### Authentication

#### Verify Google Token
```
POST /api/auth/verify
```

Verifies Google OAuth token from Chrome Identity API and returns Firebase custom token.

**Request:**
```json
{
  "idToken": "google-oauth-token"
}
```

**Response:**
```json
{
  "success": true,
  "customToken": "firebase-custom-token",
  "user": {
    "uid": "user-id",
    "email": "user@example.com",
    "displayName": "User Name",
    "photoURL": "https://..."
  }
}
```

### Synchronization

#### Push Changes to Server
```
POST /api/sync/push
Authorization: Bearer <firebase-custom-token>
```

Uploads client changes to Firestore.

**Request:**
```json
{
  "words": [
    {
      "id": "hello::https://example.com",
      "word": "hello",
      "normalizedWord": "hello",
      "updatedAt": 1699430400000,
      ...
    }
  ],
  "reviews": [
    {
      "id": "review-id",
      "wordId": "hello::https://example.com",
      "updatedAt": 1699430400000,
      ...
    }
  ],
  "deviceId": "device_123456",
  "timestamp": 1699430400000
}
```

**Response:**
```json
{
  "success": true,
  "synced": {
    "words": 10,
    "reviews": 5
  },
  "timestamp": 1699430400000
}
```

#### Pull Changes from Server
```
GET /api/sync/pull?lastSyncedAt=<timestamp>
Authorization: Bearer <firebase-custom-token>
```

Downloads server changes to client. Supports incremental sync.

**Response:**
```json
{
  "success": true,
  "data": {
    "words": [...],
    "reviews": [...]
  },
  "timestamp": 1699430400000,
  "totalWords": 10,
  "totalReviews": 5
}
```

## Firestore Data Structure

```
users/
  {userId}/
    words/
      {wordId}  → WordEntry document
    reviews/
      {wordId}  → ReviewState document
```

## Environment Variables

Required environment variables in Vercel:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

## Conflict Resolution

All conflicts are resolved using timestamp-based strategy:

1. **For WordEntry**: Latest `updatedAt` wins
2. **For ReviewState**: Latest review in `history` array wins
3. **For Deleted Items**: `deletedAt` takes precedence over `updatedAt`

## Development

### Install Dependencies
```bash
pnpm install
```

### Run Locally
```bash
pnpm dev
```

### Deploy to Vercel
```bash
pnpm deploy
```

## Security

- All sync endpoints require Firebase authentication
- Google OAuth tokens verified server-side
- Private keys stored in Vercel environment variables
- No client-side Firebase credentials exposed

## Error Codes

- `400`: Bad Request - Missing required parameters
- `401`: Unauthorized - Invalid or expired token
- `405`: Method Not Allowed - Wrong HTTP method
- `500`: Internal Server Error - Server-side error

## Phase 1 Status

✅ **Completed:**
- Firebase Admin SDK setup
- Health check endpoint
- Google OAuth verification endpoint
- Push sync endpoint with conflict resolution
- Pull sync endpoint with incremental sync
- Environment variable configuration

⏳ **Next Steps (Phase 2):**
- Chrome Extension authentication integration
- IndexedDB sync implementation
- Auto-sync with Chrome Alarms API
- Offline queue for failed syncs
