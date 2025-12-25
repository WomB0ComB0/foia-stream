/**
 * Copyright (c) 2025 Foia Stream
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * @file Server Entry Point
 * @module api
 * @author FOIA Stream Team
 * @description Main entry point for the FOIA Stream API server.
 *              Initializes the Bun HTTP server and schedules background jobs
 *              like data retention in production environments.
 *
 * @example
 * ```bash
 * # Development
 * bun run dev
 *
 * # Production
 * bun run start
 * ```
 */

// ============================================
// FOIA Stream - Server Entry Point
// ============================================

import app from './src/app';
import { env } from './src/config/env';
import { dataRetentionService } from './src/services/data-retention.service';

console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ███████╗ ██████╗ ██╗ █████╗     ███████╗████████╗      ║
║   ██╔════╝██╔═══██╗██║██╔══██╗    ██╔════╝╚══██╔══╝      ║
║   █████╗  ██║   ██║██║███████║    ███████╗   ██║         ║
║   ██╔══╝  ██║   ██║██║██╔══██║    ╚════██║   ██║         ║
║   ██║     ╚██████╔╝██║██║  ██║    ███████║   ██║         ║
║   ╚═╝      ╚═════╝ ╚═╝╚═╝  ╚═╝    ╚══════╝   ╚═╝         ║
║                                                           ║
║   Transparency & Audit Application for Public Records     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`);

console.log(`🚀 Starting FOIA Stream server...`);
console.log(`📍 Environment: ${env.NODE_ENV}`);
console.log(`🌐 Host: ${env.HOST}`);
console.log(`🔌 Port: ${env.PORT}`);

// Start server using Bun
export default {
  port: env.PORT,
  hostname: env.HOST,
  fetch: app.fetch,
};

console.log(`\n✅ Server running at http://${env.HOST}:${env.PORT}`);
console.log(`📚 API available at http://${env.HOST}:${env.PORT}/api/v1`);
console.log(`\n📖 Available endpoints:`);
console.log(`   GET  /                    - API info`);
console.log(`   GET  /health              - Health check`);
console.log(`   POST /api/v1/auth/register    - Create account`);
console.log(`   POST /api/v1/auth/login       - Login`);
console.log(`   GET  /api/v1/requests         - Search FOIA requests`);
console.log(`   POST /api/v1/requests         - Create FOIA request`);
console.log(`   GET  /api/v1/agencies         - Search agencies`);
console.log(`   GET  /api/v1/templates        - Get request templates`);

// Schedule data retention job (runs daily in production)
if (env.NODE_ENV === 'production') {
  const RETENTION_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

  setInterval(async () => {
    console.log('🗑️  Running scheduled data retention...');
    try {
      const report = await dataRetentionService.runRetentionCleanup();
      console.log(`✅ Data retention completed:`);
      console.log(`   Request content purged: ${report.requestContentPurged}`);
      console.log(`   Sessions purged: ${report.sessionsPurged}`);
      if (report.errors.length > 0) {
        console.warn(`   Errors: ${report.errors.length}`);
      }
    } catch (error) {
      console.error('❌ Data retention failed:', error);
    }
  }, RETENTION_INTERVAL);

  console.log(`\n🗓️  Data retention scheduled (every 24h)`);
}

// Log retention stats on startup
dataRetentionService
  .getRetentionStats()
  .then((stats) => {
    console.log(`\n📊 Data Retention Stats:`);
    console.log(`   Requests pending purge: ${stats.pendingPurge}`);
    console.log(`   Already purged requests: ${stats.purgedRequests}`);
    console.log(`   Expired sessions: ${stats.expiredSessions}`);
  })
  .catch(() => {
    // Silently ignore - database may not be initialized yet
  });
