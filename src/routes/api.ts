import { Router } from 'express';
import { TaskSchedulingAgent } from '../agents/taskAgent';
import { GoogleCalendarService } from '../services/calendar';
import { TaskDatabase } from '../db/database';

export function createApiRouter(
  agent: TaskSchedulingAgent,
  calendar: GoogleCalendarService,
  db: TaskDatabase
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

  // Create and schedule task
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

  // Get all tasks
  router.get('/tasks', (req, res) => {
    try {
      const { status } = req.query;
      const tasks = db.getAllTasks(status as string);
      res.json({ tasks });
    } catch (error) {
      console.error('Get tasks error:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  });

  // Get task by ID
  router.get('/tasks/:id', (req, res) => {
    try {
      const task = db.getTaskById(parseInt(req.params.id));
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json({ task });
    } catch (error) {
      console.error('Get task error:', error);
      res.status(500).json({ error: 'Failed to fetch task' });
    }
  });

  // Update task
  router.patch('/tasks/:id', (req, res) => {
    try {
      const updates = req.body;
      if (updates.deadline) updates.deadline = new Date(updates.deadline);
      if (updates.preferredStartDate) updates.preferredStartDate = new Date(updates.preferredStartDate);
      if (updates.scheduledStartTime) updates.scheduledStartTime = new Date(updates.scheduledStartTime);
      if (updates.scheduledEndTime) updates.scheduledEndTime = new Date(updates.scheduledEndTime);

      const task = db.updateTask(parseInt(req.params.id), updates);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }
      res.json({ task });
    } catch (error) {
      console.error('Update task error:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  });

  // Delete task
  router.delete('/tasks/:id', async (req, res) => {
    try {
      const task = db.getTaskById(parseInt(req.params.id));
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Delete from calendar if scheduled
      if (task.calendarEventId) {
        await calendar.deleteEvent(task.calendarEventId);
      }

      db.deleteTask(parseInt(req.params.id));
      res.json({ message: 'Task deleted' });
    } catch (error) {
      console.error('Delete task error:', error);
      res.status(500).json({ error: 'Failed to delete task' });
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
