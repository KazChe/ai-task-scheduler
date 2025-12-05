import Database from 'better-sqlite3';
import path from 'path';
import { createTasksTable, createChatHistoryTable } from './schema';
import { Task, ChatMessage } from '../types';

export class TaskDatabase {
  private db: Database.Database;

  constructor(dbPath: string = './data/tasks.db') {
    // Ensure data directory exists
    const dir = path.dirname(dbPath);
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.initialize();
  }

  private initialize() {
    this.db.exec(createTasksTable);
    this.db.exec(createChatHistoryTable);
  }

  // Task operations
  createTask(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (
        title, description, priority, estimated_duration,
        deadline, preferred_start_date, status, calendar_event_id,
        scheduled_start_time, scheduled_end_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      task.title,
      task.description || null,
      task.priority,
      task.estimatedDuration || null,
      task.deadline?.toISOString() || null,
      task.preferredStartDate?.toISOString() || null,
      task.status,
      task.calendarEventId || null,
      task.scheduledStartTime?.toISOString() || null,
      task.scheduledEndTime?.toISOString() || null
    );

    return this.getTaskById(result.lastInsertRowid as number)!;
  }

  getTaskById(id: number): Task | undefined {
    const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
    const row = stmt.get(id) as any;
    return row ? this.mapRowToTask(row) : undefined;
  }

  getAllTasks(status?: string): Task[] {
    const stmt = status
      ? this.db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY created_at DESC')
      : this.db.prepare('SELECT * FROM tasks ORDER BY created_at DESC');

    const rows = status ? stmt.all(status) : stmt.all();
    return (rows as any[]).map(row => this.mapRowToTask(row));
  }

  updateTask(id: number, updates: Partial<Task>): Task | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt' && value !== undefined) {
        const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        fields.push(`${dbKey} = ?`);
        values.push(value instanceof Date ? value.toISOString() : value);
      }
    });

    if (fields.length === 0) return this.getTaskById(id);

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE tasks SET ${fields.join(', ')} WHERE id = ?
    `);
    stmt.run(...values);

    return this.getTaskById(id);
  }

  deleteTask(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // Chat history operations
  saveChatMessage(message: Omit<ChatMessage, 'timestamp'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO chat_history (role, content) VALUES (?, ?)
    `);
    stmt.run(message.role, message.content);
  }

  getChatHistory(limit: number = 50): ChatMessage[] {
    const stmt = this.db.prepare(`
      SELECT * FROM chat_history ORDER BY timestamp DESC LIMIT ?
    `);
    const rows = stmt.all(limit) as any[];
    return rows.reverse().map(row => ({
      role: row.role,
      content: row.content,
      timestamp: new Date(row.timestamp)
    }));
  }

  clearChatHistory(): void {
    this.db.prepare('DELETE FROM chat_history').run();
  }

  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority,
      estimatedDuration: row.estimated_duration,
      deadline: row.deadline ? new Date(row.deadline) : undefined,
      preferredStartDate: row.preferred_start_date ? new Date(row.preferred_start_date) : undefined,
      status: row.status,
      calendarEventId: row.calendar_event_id,
      scheduledStartTime: row.scheduled_start_time ? new Date(row.scheduled_start_time) : undefined,
      scheduledEndTime: row.scheduled_end_time ? new Date(row.scheduled_end_time) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  close() {
    this.db.close();
  }
}
