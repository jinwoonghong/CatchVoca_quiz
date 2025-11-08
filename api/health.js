/**
 * Health Check Endpoint
 * GET /api/health
 *
 * Simple endpoint to verify the server is running
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  return res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'CatchVoca Sync API',
    version: '1.0.0',
  });
}
