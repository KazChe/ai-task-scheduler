export const createTasksTable = `
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT CHECK(priority IN ('low', 'medium', 'high')) NOT NULL,
    estimated_duration INTEGER,
    deadline TEXT,
    preferred_start_date TEXT,
    status TEXT CHECK(status IN ('pending', 'scheduled', 'completed', 'cancelled')) NOT NULL DEFAULT 'pending',
    calendar_event_id TEXT,
    scheduled_start_time TEXT,
    scheduled_end_time TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;

export const createChatHistoryTable = `
  CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    role TEXT CHECK(role IN ('user', 'assistant', 'system')) NOT NULL,
    content TEXT NOT NULL,
    timestamp TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;
