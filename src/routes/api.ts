import { Router } from 'express';
import { TaskSchedulingAgent } from '../agents/taskAgent';
import { GoogleCalendarService } from '../services/calendar';

export function createApiRouter(
  agent: TaskSchedulingAgent,
  calendar: GoogleCalendarService
) {
  const router = Router();

  // Chat endpoint
  router.post('/chat', async (req, res) => {
    try {
      const { message } = req.body;

      if (!message) {
        return res.status(400).json({ error: 'Message is required' });
      }

      const response = await agent.processMessage(message);
      res.json({ response });
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: 'Failed to process message' });
    }
  });

  // Get chat history
  router.get('/chat/history', (req, res) => {
    try {
      const history = agent.getHistory();
      res.json({ history });
    } catch (error) {
      console.error('History error:', error);
      res.status(500).json({ error: 'Failed to fetch history' });
    }
  });

  // Clear chat history
  router.delete('/chat/history', (req, res) => {
    try {
      agent.clearHistory();
      res.json({ message: 'History cleared' });
    } catch (error) {
      console.error('Clear history error:', error);
      res.status(500).json({ error: 'Failed to clear history' });
    }
  });

  // Create and schedule task (directly to Google Calendar)
  router.post('/tasks', async (req, res) => {
    try {
      const taskData = req.body;

      // Convert date strings to Date objects
      if (taskData.deadline) taskData.deadline = new Date(taskData.deadline);
      if (taskData.preferredStartDate) taskData.preferredStartDate = new Date(taskData.preferredStartDate);

      const result = await agent.createAndScheduleTask(taskData);
      res.json(result);
    } catch (error) {
      console.error('Task creation error:', error);
      res.status(500).json({ error: 'Failed to create task' });
    }
  });

  // Google Calendar auth
  router.get('/auth/google', (req, res) => {
    const url = calendar.getAuthUrl();
    res.json({ authUrl: url });
  });

  router.get('/auth/google/callback', async (req, res) => {
    try {
      const { code } = req.query;
      if (!code) {
        return res.status(400).send('Authorization code is required');
      }

      await calendar.setCredentials(code as string);
      res.send('<h1>Authorization successful!</h1><p>You can close this window and return to the app.</p>');
    } catch (error) {
      console.error('Auth error:', error);
      res.status(500).send('Authorization failed');
    }
  });

  router.get('/auth/status', (req, res) => {
    res.json({ authenticated: calendar.isAuthenticated() });
  });

  router.delete('/auth/google', (req, res) => {
    try {
      const success = calendar.disconnect();
      if (success) {
        res.json({ message: 'Disconnected successfully' });
      } else {
        res.status(500).json({ error: 'Failed to disconnect' });
      }
    } catch (error) {
      console.error('Disconnect error:', error);
      res.status(500).json({ error: 'Failed to disconnect' });
    }
  });

  // Get token usage statistics
  router.get('/stats/tokens', (req, res) => {
    try {
      const stats = agent.getTokenUsageStats();
      res.json(stats);
    } catch (error) {
      console.error('Stats error:', error);
      res.status(500).json({ error: 'Failed to fetch token stats' });
    }
  });

  return router;
}
