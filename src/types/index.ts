export interface Task {
  id?: number;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  estimatedDuration?: number; // in minutes
  deadline?: Date;
  preferredStartDate?: Date;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
  calendarEventId?: string;
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface ScheduleSlot {
  start: Date;
  end: Date;
  available: boolean;
}

export interface TaskInput {
  rawInput: string;
  url?: string;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: Date;
  end: Date;
}
