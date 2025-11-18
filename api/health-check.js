// Health check endpoint to verify API configuration
// GET /api/health-check
// No authentication required - only shows if configs exist, not their values

export default async function handler(req, res) {
    const checks = {
        vapidPublicKey: !!process.env.VAPID_PUBLIC_KEY,
        vapidPrivateKey: !!process.env.VAPID_PRIVATE_KEY,
        vapidEmail: !!process.env.VAPID_EMAIL,
        cronSecret: !!process.env.CRON_SECRET,
        kvUrl: !!process.env.KV_REST_API_URL,
        kvToken: !!process.env.KV_REST_API_TOKEN
    };

    const allConfigured = Object.values(checks).every(v => v === true);
    const missing = Object.keys(checks).filter(key => !checks[key]);

    return res.status(allConfigured ? 200 : 500).json({
        status: allConfigured ? 'healthy' : 'misconfigured',
        checks,
        missing: missing.length > 0 ? missing : undefined,
        message: allConfigured
            ? 'All required environment variables are configured'
            : `Missing: ${missing.join(', ')}`,
        instructions: !allConfigured ? {
            vapidKeys: 'Run: npm run generate-vapid, then add to Vercel env vars',
            kvDatabase: 'Create KV database: Vercel Dashboard → Storage → Create Database → KV',
            cronSecret: 'Generate: openssl rand -hex 32, then add to Vercel env vars'
        } : undefined
    });
}
