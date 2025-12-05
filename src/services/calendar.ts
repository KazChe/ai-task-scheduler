import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { CalendarEvent, ScheduleSlot } from '../types';
import fs from 'fs';
import path from 'path';

export class GoogleCalendarService {
  private oauth2Client: OAuth2Client;
  private calendar: any;
  private tokenPath: string;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    this.calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    this.tokenPath = path.join(__dirname, '../../tokens/google-token.json');
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/calendar']
    });
  }

  async setCredentials(code: string): Promise<void> {
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);

    // Save tokens for future use
    const tokenDir = path.dirname(this.tokenPath);
    if (!fs.existsSync(tokenDir)) {
      fs.mkdirSync(tokenDir, { recursive: true });
    }
    fs.writeFileSync(this.tokenPath, JSON.stringify(tokens));
  }

  loadSavedCredentials(): boolean {
    try {
      if (fs.existsSync(this.tokenPath)) {
        const tokens = JSON.parse(fs.readFileSync(this.tokenPath, 'utf-8'));
        this.oauth2Client.setCredentials(tokens);
        return true;
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
    return false;
  }

  isAuthenticated(): boolean {
    const credentials = this.oauth2Client.credentials;
    return !!credentials && !!credentials.access_token;
  }

  async getEvents(
    timeMin: Date = new Date(),
    timeMax: Date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
  ): Promise<CalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items.map((event: any) => ({
        id: event.id,
        summary: event.summary,
        start: new Date(event.start.dateTime || event.start.date),
        end: new Date(event.end.dateTime || event.end.date)
      }));
    } catch (error) {
      console.error('Error fetching events:', error);
      throw error;
    }
  }

  async findAvailableSlots(
    durationMinutes: number,
    startDate: Date = new Date(),
    endDate: Date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  ): Promise<ScheduleSlot[]> {
    // Scheduling window: 5 AM - 12 AM Pacific (19 hours)
    const schedulingWindowStart = 5; // 5 AM
    const schedulingWindowEnd = 24; // 12 AM (midnight)

    console.log('🔍 findAvailableSlots called with:', {
      durationMinutes,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      schedulingWindow: `${schedulingWindowStart}:00 - ${schedulingWindowEnd}:00 Pacific`
    });

    const events = await this.getEvents(startDate, endDate);
    console.log(`📋 Found ${events.length} existing events in calendar`);

    const availableSlots: ScheduleSlot[] = [];

    // Start from the provided start date, rounded to next 30-min slot
    let currentDate = new Date(startDate);
    const minutes = currentDate.getMinutes();
    const roundedMinutes = Math.ceil(minutes / 30) * 30;
    if (roundedMinutes >= 60) {
      currentDate.setHours(currentDate.getHours() + 1, 0, 0, 0);
    } else {
      currentDate.setMinutes(roundedMinutes, 0, 0);
    }

    console.log('Starting slot search:', {
      date: currentDate.toISOString(),
      localTime: currentDate.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })
    });

    let slotsChecked = 0;
    const maxSlotsToCheck = 500; // Increased safety limit

    while (currentDate < endDate && slotsChecked < maxSlotsToCheck) {
      slotsChecked++;
      const slotEnd = new Date(currentDate.getTime() + durationMinutes * 60 * 1000);

      // Get Pacific time hours for scheduling window check
      const pacificHour = parseInt(currentDate.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        hour12: false
      }));

      const slotEndPacificHour = parseInt(slotEnd.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        hour12: false
      }));

      // Check if slot is within scheduling window (5 AM - 12 AM Pacific)
      const isWithinSchedulingWindow =
        pacificHour >= schedulingWindowStart &&
        slotEndPacificHour <= schedulingWindowEnd;

      if (isWithinSchedulingWindow) {
        // Check if slot conflicts with any existing event
        const hasConflict = events.some(event => {
          return (currentDate < event.end && slotEnd > event.start);
        });

        if (!hasConflict) {
          availableSlots.push({
            start: new Date(currentDate),
            end: new Date(slotEnd),
            available: true
          });
        }
      }

      // Move to next slot (30 min intervals)
      currentDate.setMinutes(currentDate.getMinutes() + 30);

      // Check if we've gone past scheduling window
      const currentPacificHour = parseInt(currentDate.toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        hour12: false
      }));

      // If past midnight (24) or before 5 AM, skip to 5 AM same/next day
      if (currentPacificHour >= schedulingWindowEnd || currentPacificHour < schedulingWindowStart) {
        // Calculate hours to add to get to next 5 AM Pacific
        let hoursToAdd;
        if (currentPacificHour >= schedulingWindowEnd) {
          // Past midnight, add hours to get to 5 AM next day
          hoursToAdd = (24 - currentPacificHour) + schedulingWindowStart;
        } else {
          // Before 5 AM, add hours to get to 5 AM today
          hoursToAdd = schedulingWindowStart - currentPacificHour;
        }

        currentDate.setHours(currentDate.getHours() + hoursToAdd, 0, 0, 0);
      }
    }

    console.log(`✅ Found ${availableSlots.length} available slots after checking ${slotsChecked} time slots`);
    console.log('Search ended because:', {
      reachedEndDate: currentDate >= endDate,
      reachedMaxSlots: slotsChecked >= maxSlotsToCheck,
      currentDate: currentDate.toISOString(),
      endDate: endDate.toISOString()
    });

    if (availableSlots.length > 0) {
      console.log('First available slot:', {
        start: availableSlots[0].start.toISOString(),
        end: availableSlots[0].end.toISOString()
      });
    }

    return availableSlots;
  }

  async createEvent(
    title: string,
    description: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ id: string; link: string }> {
    try {
      const event = {
        summary: title,
        description: description,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'America/Los_Angeles' // TODO: Make configurable
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'America/Los_Angeles'
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 20 }
          ]
        }
      };

      console.log('📅 Creating calendar event:', JSON.stringify(event, null, 2));

      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: event
      });

      console.log("✅ Event created successfully!");
      console.log("  Event ID:", response.data.id);
      console.log("  Event Link:", response.data.htmlLink);

      return {
        id: response.data.id,
        link: response.data.htmlLink || ''
      };
    } catch (error) {
      console.error('❌ Error creating calendar event:', error);
      throw error;
    }
  }

  async updateEvent(
    eventId: string,
    updates: {
      title?: string;
      description?: string;
      startTime?: Date;
      endTime?: Date;
    }
  ): Promise<void> {
    try {
      const event: any = {};
      if (updates.title) event.summary = updates.title;
      if (updates.description) event.description = updates.description;
      if (updates.startTime) {
        event.start = {
          dateTime: updates.startTime.toISOString(),
          timeZone: 'America/Los_Angeles'
        };
      }
      if (updates.endTime) {
        event.end = {
          dateTime: updates.endTime.toISOString(),
          timeZone: 'America/Los_Angeles'
        };
      }

      await this.calendar.events.patch({
        calendarId: 'primary',
        eventId: eventId,
        requestBody: event
      });
    } catch (error) {
      console.error('Error updating event:', error);
      throw error;
    }
  }

  async deleteEvent(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }
}
