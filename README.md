# AI Task Scheduler

An AI-powered task scheduling application that integrates with Google Calendar and uses OpenAI to help you organize your day, week, and month.

## Features

- **AI Chat Interface**: Natural conversation with an AI assistant to describe your tasks
- **Smart Scheduling**: Automatically finds available time slots in your calendar
- **Google Calendar Integration**: Reads existing events and creates new ones
- **OpenAI Integration**: Powered by GPT models for intelligent task understanding
- **Task Management**: Track tasks by priority, deadline, and status
- **Duration Estimation**: AI estimates how long tasks will take
- **SQLite Storage**: All data persisted locally

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini

# Google Calendar OAuth
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# Server
PORT=3000

# Database
DB_PATH=./data/tasks.db
```

### 3. Set Up OpenAI API

1. Get your API key from [OpenAI Platform](https://platform.openai.com/api-keys)
2. Add it to your `.env` file
3. Choose a model (default: `gpt-4o-mini` for cost-effectiveness, or use `gpt-4` for better performance)

### 4. Set Up Google Calendar OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select existing)
3. Enable the Google Calendar API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:3000/auth/google/callback`
5. Copy the Client ID and Client Secret to your `.env` file

## Running the Application

### Development Mode

```bash
npm run dev
```

### Production Mode

```bash
npm run build
npm start
```

The application will be available at `http://localhost:3000`

## Usage

1. **Connect Google Calendar**: Click "Connect Calendar" in the top right
2. **Start Chatting**: Type your task in the chat interface
3. **Answer Questions**: The AI will ask about priority, deadline, etc.
4. **Automatic Scheduling**: Tasks are automatically scheduled to your calendar

### Example Conversations

**Simple Task:**
```
You: I need to review the marketing proposal
AI: I can help you schedule that! A few questions:
    1. How important is this task? (low/medium/high)
    2. When would you like to finish this by?
    3. Any preferred start date?
```

**Task with URL:**
```
You: I need to read this whitepaper: https://example.com/paper.pdf
AI: I'll help you schedule time to read that whitepaper.
    Based on typical whitepapers, this might take 1-2 hours.
    When would you like to complete this?
```

**Quick Task:**
```
You: Schedule a 30-minute coffee break tomorrow afternoon
AI: I'll find a 30-minute slot tomorrow afternoon and add it to your calendar.
```

## API Endpoints

### Chat
- `POST /api/chat` - Send a message to the AI
- `GET /api/chat/history` - Get conversation history
- `DELETE /api/chat/history` - Clear conversation history

### Tasks
- `GET /api/tasks` - Get all tasks
- `GET /api/tasks/:id` - Get specific task
- `POST /api/tasks` - Create and schedule a task
- `PATCH /api/tasks/:id` - Update a task
- `DELETE /api/tasks/:id` - Delete a task

### Authentication
- `GET /api/auth/google` - Get Google OAuth URL
- `GET /api/auth/google/callback` - OAuth callback
- `GET /api/auth/status` - Check auth status

## Project Structure

```
.
├── src/
│   ├── agents/          # AI agent logic
│   │   └── taskAgent.ts
│   ├── db/              # Database layer
│   │   ├── database.ts
│   │   └── schema.ts
│   ├── routes/          # API routes
│   │   └── api.ts
│   ├── services/        # External services
│   │   └── calendar.ts
│   ├── types/           # TypeScript types
│   │   └── index.ts
│   └── server.ts        # Main server
├── public/
│   └── index.html       # Chat UI
├── data/                # SQLite database (created on first run)
├── tokens/              # OAuth tokens (created on auth)
├── package.json
├── tsconfig.json
└── .env                 # Configuration
```

## Troubleshooting

### OpenAI API Issues

- Verify your API key is correct in `.env`
- Check you have billing set up and credits on your OpenAI account
- Ensure the model name is valid (`gpt-4o-mini`, `gpt-4`, `gpt-3.5-turbo`)
- Check API status at [OpenAI Status](https://status.openai.com/)

### Google Calendar Auth Issues

- Verify redirect URI matches exactly
- Check OAuth credentials in Google Cloud Console
- Delete `tokens/google-token.json` and re-authenticate

### Database Issues

- Database is created automatically in `data/` folder
- To reset: delete `data/tasks.db` and restart

## Future Enhancements

- [ ] Mobile app support
- [ ] Background daemon mode
- [ ] Advanced document parsing
- [ ] Multiple calendar support
- [ ] Recurring tasks
- [ ] Task dependencies
- [ ] Web search integration
- [ ] Notifications system

## License

MIT
