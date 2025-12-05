import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { createConnection } from 'net';
import { TaskDatabase } from './db/database';
import { GoogleCalendarService } from './services/calendar';
import { TaskSchedulingAgent } from './agents/taskAgent';
import { createApiRouter } from './routes/api';

// Load environment variables
dotenv.config();

const app = express();
const PREFERRED_PORT = parseInt(process.env.PORT || '3000');
const MAX_PORT_ATTEMPTS = 10;

// Middleware
app.use(express.json());
app.use(express.static('public'));

// Initialize services
const db = new TaskDatabase(process.env.DB_PATH);
const calendar = new GoogleCalendarService();

// Try to load saved credentials
calendar.loadSavedCredentials();

// Initialize agent
const agent = new TaskSchedulingAgent(db, calendar);

// API routes
app.use('/api', createApiRouter(agent, calendar, db));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Function to check if a port is available
function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const tester = createConnection({ port, host: 'localhost' })
      .once('error', (err: any) => {
        if (err.code === 'ECONNREFUSED') {
          // Port is not in use
          resolve(true);
        } else {
          // Port is in use
          resolve(false);
        }
      })
      .once('connect', () => {
        // Port is in use
        tester.end();
        resolve(false);
      });
  });
}

// Function to find an available port
async function findAvailablePort(startPort: number, maxAttempts: number): Promise<number> {
  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    const available = await isPortAvailable(port);

    if (available) {
      if (port !== startPort) {
        console.log(`⚠️  Port ${startPort} is already in use`);
        console.log(`✅ Found available port: ${port}`);
      }
      return port;
    } else if (i === 0) {
      console.log(`⚠️  Port ${port} is already in use`);
      console.log(`🔄 Searching for next available port...`);
    }
  }

  throw new Error(`Could not find an available port after ${maxAttempts} attempts (tried ${startPort}-${startPort + maxAttempts - 1})`);
}

// Function to start server on a specific port
async function startServer(port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const server = createServer(app);

    server.on('error', (err: NodeJS.ErrnoException) => {
      reject(err);
    });

    server.on('listening', () => {
      console.log(`
╔════════════════════════════════════════╗
║   AI Task Scheduler                    ║
║                                        ║
║   Server running on:                   ║
║   http://localhost:${port}${port < 10000 ? '              ' : port < 100000 ? '             ' : '            '}║
║                                        ║
║   Setup:                               ║
║   1. Configure OpenAI API Key          ║
║   2. Connect Google Calendar           ║
║   3. Start scheduling tasks!           ║
╚════════════════════════════════════════╝
      `);

      if (port !== PREFERRED_PORT) {
        console.log(`ℹ️  Note: Using port ${port} instead of preferred port ${PREFERRED_PORT}`);
        console.log(`💡 Update your Google OAuth redirect URI if needed:`);
        console.log(`   http://localhost:${port}/api/auth/google/callback\n`);
      }

      resolve();
    });

    server.listen(port);
  });
}

// Start server with automatic port selection
(async () => {
  try {
    const availablePort = await findAvailablePort(PREFERRED_PORT, MAX_PORT_ATTEMPTS);
    await startServer(availablePort);
  } catch (err: any) {
    console.error('❌ Failed to start server:', err.message);
    process.exit(1);
  }
})();

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down gracefully...');
  db.close();
  process.exit(0);
});
