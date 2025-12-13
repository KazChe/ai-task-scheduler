import { ChatOpenAI } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage, AIMessage, BaseMessage } from '@langchain/core/messages';
import { GoogleCalendarService } from '../services/calendar';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

type LLM = ChatOpenAI | ChatOllama;

function createLLM(): LLM {
  const provider = process.env.LLM_PROVIDER || 'openai';

  if (provider === 'ollama') {
    return new ChatOllama({
      baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL || 'qwen3:8b',
    });
  }

  return new ChatOpenAI({
    openAIApiKey: process.env.OPENAI_API_KEY,
    modelName: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    temperature: 0.7
  });
}

export class TaskSchedulingAgent {
  private llm: LLM;
  private calendar: GoogleCalendarService;
  private conversationHistory: BaseMessage[] = [];
  private chatHistory: ChatMessage[] = [];
  private tokenUsageStats = {
    totalPromptTokens: 0,
    totalCompletionTokens: 0,
    totalTokens: 0,
    requestCount: 0
  };

  constructor(calendar: GoogleCalendarService) {
    this.llm = createLLM();
    this.calendar = calendar;

    // Initialize with system message
    const now = new Date();
    const currentDateTime = now.toISOString();
    const currentDateReadable = now.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    this.conversationHistory.push(
      new SystemMessage(`You are a helpful AI task assistant that schedules tasks on the user's calendar.

CURRENT DATE AND TIME: ${currentDateReadable} (${currentDateTime})

IMPORTANT: When users ask you to:
- "Find an open slot for..."
- "Schedule..."
- "Add to my calendar..."
- "Put on my calendar..."
- "Block time for..."
- Or mention any task/event with a title

You should IMMEDIATELY schedule it. These are ALL task scheduling requests, not information queries.

When users tell you about tasks:

1. IMMEDIATELY create the task with smart defaults - don't ask questions unless absolutely necessary
2. Infer priority from context (urgent words = high, casual = low, otherwise medium)
3. Estimate duration based on task type (meeting=60min, email=15min, review=120min, etc)
4. Use reasonable defaults for dates and times:
   - Pay CLOSE ATTENTION to dates and times the user specifies
   - When user says "today after 3pm" or "today at 2pm":
     * Convert the Pacific time to UTC for preferredStartDate
     * Example: "today after 3pm Pacific" = current date with time "23:00:00Z" (3pm Pacific = 11pm UTC)
   - When user says "before 5pm": the task must END before that time, not start
   - When user says "after 3pm": the task can start ANY TIME after 3pm, not exactly at 3pm
   - If user specifies a specific date (e.g., "Saturday, December 6th"), use that EXACT date
   - If urgent or user says "today": use today's date
   - If user says "tomorrow": use tomorrow's date
   - If user says "this week": spread across the next few days
   - Otherwise: start looking for slots from tomorrow onwards

   CRITICAL TIME CONVERSION:
   - User's timezone is Pacific (America/Los_Angeles) which is UTC-8
   - To convert Pacific to UTC: add 8 hours
   - Examples:
     * 3:00 PM Pacific = 23:00 UTC (15 + 8 = 23)
     * 9:00 AM Pacific = 17:00 UTC (9 + 8 = 17)
     * 5:00 PM Pacific = 01:00 UTC next day (17 + 8 = 25 - 24 = 1)

5. ALWAYS include detailed information in the description field:
   - If user mentions multiple sub-tasks (e.g., "wash car, change oil, fill gas tank"), list ALL of them in the description
   - If user provides context or details about the task, include them in the description
   - Description should be comprehensive - it will appear in the calendar event
   - Use bullet points or numbered lists for clarity in descriptions

6. If user mentions multiple sub-tasks in ONE request:
   - Create ONE calendar entry
   - Title should summarize the main activity (e.g., "Car Maintenance")
   - Description MUST list all sub-tasks with bullet points or newlines

IMPORTANT: When scheduling multiple SEPARATE tasks in one conversation, stagger the preferred start times:
- First task: tomorrow morning (9 AM)
- Second task: tomorrow afternoon (2 PM)
- Third task: day after tomorrow (9 AM)
- And so on...

When you understand a task, respond with:
SCHEDULE_TASK:{"title":"Clear task name","description":"Detailed description with all relevant information, sub-tasks, or context the user provided","priority":"medium","estimatedDuration":60,"preferredStartDate":"2025-12-05T17:00:00Z","deadline":"2025-12-10T17:00:00Z"}

Examples:
- User: "Wash car, change oil, fill gas tank on Saturday"
  Response: SCHEDULE_TASK:{"title":"Car Maintenance","description":"- Wash the car\\n- Change oil\\n- Fill up gas tank","priority":"medium","estimatedDuration":120,"preferredStartDate":"2025-12-07T18:00:00Z"}

- User: "Review the Q4 report and prepare slides for Monday's meeting"
  Response: SCHEDULE_TASK:{"title":"Q4 Report Review","description":"Review Q4 report and prepare presentation slides for Monday's meeting","priority":"high","estimatedDuration":120,"preferredStartDate":"2025-12-08T17:00:00Z"}

- User: "Find an open slot for today after 3pm. Titled: Meeting"
  Response: SCHEDULE_TASK:{"title":"Meeting","description":"Meeting scheduled for after 3pm","priority":"medium","estimatedDuration":60,"preferredStartDate":"2025-12-04T23:00:00Z"}

Then confirm with a friendly message like "Got it! I've scheduled [task]."

ONLY ask clarifying questions if:
- The task is completely unclear
- There are multiple conflicting requirements
- The user explicitly asks for help deciding

Be conversational, helpful, and decisive. Trust your judgment.`)
    );
  }

  async processMessage(userMessage: string): Promise<string> {
    // Add user message to history
    this.conversationHistory.push(new HumanMessage(userMessage));
    this.chatHistory.push({ role: 'user', content: userMessage, timestamp: new Date() });

    // Get LLM response
    const response = await this.llm.invoke(this.conversationHistory);
    let assistantMessage = response.content as string;

    // Track token usage
    if (response.response_metadata?.tokenUsage) {
      const usage = response.response_metadata.tokenUsage;
      this.tokenUsageStats.totalPromptTokens += usage.promptTokens || 0;
      this.tokenUsageStats.totalCompletionTokens += usage.completionTokens || 0;
      this.tokenUsageStats.totalTokens += usage.totalTokens || 0;
      this.tokenUsageStats.requestCount += 1;

      // Calculate cost for gpt-4o-mini (as of Dec 2024)
      // Input: $0.150 per 1M tokens, Output: $0.600 per 1M tokens
      const inputCost = (usage.promptTokens || 0) * 0.150 / 1_000_000;
      const outputCost = (usage.completionTokens || 0) * 0.600 / 1_000_000;
      const requestCost = inputCost + outputCost;

      console.log('\n💰 Token Usage for this request:');
      console.log(`   Prompt tokens: ${usage.promptTokens}`);
      console.log(`   Completion tokens: ${usage.completionTokens}`);
      console.log(`   Total tokens: ${usage.totalTokens}`);
      console.log(`   Cost: $${requestCost.toFixed(6)}`);

      // Show cumulative stats
      const totalInputCost = this.tokenUsageStats.totalPromptTokens * 0.150 / 1_000_000;
      const totalOutputCost = this.tokenUsageStats.totalCompletionTokens * 0.600 / 1_000_000;
      const totalCost = totalInputCost + totalOutputCost;

      console.log('\n📊 Cumulative Stats (this session):');
      console.log(`   Total requests: ${this.tokenUsageStats.requestCount}`);
      console.log(`   Total prompt tokens: ${this.tokenUsageStats.totalPromptTokens}`);
      console.log(`   Total completion tokens: ${this.tokenUsageStats.totalCompletionTokens}`);
      console.log(`   Total tokens: ${this.tokenUsageStats.totalTokens}`);
      console.log(`   Total cost: $${totalCost.toFixed(6)}`);
      console.log(`   Average cost per request: $${(totalCost / this.tokenUsageStats.requestCount).toFixed(6)}\n`);
    }

    // Check if the assistant wants to schedule a task
    if (assistantMessage.includes('SCHEDULE_TASK:')) {
      const jsonMatch = assistantMessage.match(/SCHEDULE_TASK:(\{.*?\})/);
      if (jsonMatch) {
        try {
          const taskData = JSON.parse(jsonMatch[1]);

          // Convert date strings to Date objects
          if (taskData.deadline) {
            taskData.deadline = new Date(taskData.deadline);
          }
          if (taskData.preferredStartDate) {
            taskData.preferredStartDate = new Date(taskData.preferredStartDate);
          }

          // Create and schedule the task
          const result = await this.createAndScheduleTask(taskData);

          // Replace the SCHEDULE_TASK command with the result message
          assistantMessage = assistantMessage.replace(/SCHEDULE_TASK:\{.*?\}/, '').trim();
          if (assistantMessage) {
            assistantMessage += '\n\n';
          }
          assistantMessage += `✅ ${result.message}`;

        } catch (error: any) {
          console.error('Error scheduling task:', error);
          assistantMessage = assistantMessage.replace(/SCHEDULE_TASK:\{.*?\}/, '').trim();
          assistantMessage += '\n\n❌ Sorry, I encountered an error saving the task. Please try again.';
        }
      }
    }

    // Add assistant response to history
    this.conversationHistory.push(new AIMessage(assistantMessage));
    this.chatHistory.push({ role: 'assistant', content: assistantMessage, timestamp: new Date() });

    return assistantMessage;
  }

  async createAndScheduleTask(taskData: {
    title: string;
    description?: string;
    priority: 'low' | 'medium' | 'high';
    deadline?: Date;
    preferredStartDate?: Date;
    estimatedDuration?: number;
  }): Promise<{ message: string; eventId: string; eventLink: string }> {
    try {
      console.log('📅 Creating task:', taskData);

      // Check if calendar is authenticated
      const isAuth = this.calendar.isAuthenticated();
      console.log('🔐 Calendar authenticated:', isAuth);

      if (!isAuth) {
        throw new Error('Calendar not authenticated');
      }

      const duration = taskData.estimatedDuration || 60;

      // Find available time slots
      const now = new Date();

      // Start searching from now (or preferred start if in the future)
      let searchStartDate = now;
      if (taskData.preferredStartDate && taskData.preferredStartDate > now) {
        searchStartDate = taskData.preferredStartDate;
      }

      // Search window should be at least 7 days to ensure we find slots
      const minSearchWindow = new Date(searchStartDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      let searchEndDate = minSearchWindow;

      // If deadline is provided and further out, use that instead
      if (taskData.deadline && taskData.deadline > minSearchWindow) {
        searchEndDate = taskData.deadline;
      }

      console.log('🔍 Searching for available slots:', {
        duration: `${duration} mins`,
        searchStart: searchStartDate.toISOString(),
        searchEnd: searchEndDate.toISOString(),
        preferredStartProvided: !!taskData.preferredStartDate,
        deadlineProvided: !!taskData.deadline
      });

      const availableSlots = await this.calendar.findAvailableSlots(
        duration,
        searchStartDate,
        searchEndDate
      );

      if (availableSlots.length === 0) {
        throw new Error('No available time slots found in the specified time range');
      }

      // Use the first available slot
      const selectedSlot = availableSlots[0];
      const startTime = selectedSlot.start;
      const endTime = selectedSlot.end;

      console.log('⏰ Found available slot:', {
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: `${duration} mins`
      });

      // Create Google Calendar event
      console.log('📤 Creating Google Calendar event...');
      console.log('📝 Event details:', {
        title: taskData.title,
        description: taskData.description,
        hasDescription: !!taskData.description
      });

      const eventResult = await this.calendar.createEvent(
        taskData.title,
        taskData.description || '',
        startTime,
        endTime
      );

      console.log('✅ Calendar event created:', eventResult.id);

      const scheduledTime = startTime.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });

      const message = `Task "${taskData.title}" scheduled for ${scheduledTime} (${duration} minutes)\n\nView event: ${eventResult.link}`;

      return {
        message,
        eventId: eventResult.id,
        eventLink: eventResult.link
      };
    } catch (error) {
      console.error('❌ Error creating task:', error);
      throw error;
    }
  }

  async estimateTaskDuration(taskDescription: string): Promise<number> {
    // Use LLM to estimate duration
    const prompt = `Based on this task description, estimate how many minutes it would take to complete. Respond with ONLY a number (the minutes).

Task: ${taskDescription}

Estimated minutes:`;

    const response = await this.llm.invoke([new HumanMessage(prompt)]);
    const content = response.content as string;

    // Extract number from response
    const match = content.match(/\d+/);
    return match ? parseInt(match[0]) : 60; // Default to 60 minutes
  }

  async assessTaskFromUrl(url: string): Promise<string> {
    // This would fetch and analyze content from URL
    // For now, return a placeholder
    const prompt = `The user wants to work on something from this URL: ${url}
Please ask them to describe what specifically they want to do with this content.`;

    const response = await this.llm.invoke([new HumanMessage(prompt)]);
    return response.content as string;
  }

  clearHistory() {
    // Keep system message, clear the rest
    const systemMessage = this.conversationHistory[0];
    this.conversationHistory = systemMessage ? [systemMessage] : [];
    this.chatHistory = [];
  }

  getHistory() {
    return this.chatHistory;
  }

  getTokenUsageStats() {
    const totalInputCost = this.tokenUsageStats.totalPromptTokens * 0.150 / 1_000_000;
    const totalOutputCost = this.tokenUsageStats.totalCompletionTokens * 0.600 / 1_000_000;
    const totalCost = totalInputCost + totalOutputCost;

    return {
      ...this.tokenUsageStats,
      costs: {
        inputCost: totalInputCost,
        outputCost: totalOutputCost,
        totalCost: totalCost,
        averageCostPerRequest: this.tokenUsageStats.requestCount > 0
          ? totalCost / this.tokenUsageStats.requestCount
          : 0
      }
    };
  }
}
