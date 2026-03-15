// DayFrame AI Assistant
// Reads and writes calendar data via Claude

const https = require('https');

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname,
      method: 'POST',
      headers: { ...headers, 'Content-Length': Buffer.byteLength(body) }
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status:a raes.statusCode, body: data }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: cors, body: '{}' };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return {
    statusCode: 500, headers: cors,
    body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' })
  };

  try {
    const { messages, calendarData, today } = JSON.parse(event.body);

    const systemPrompt = `You are DayFrame Assistant — a smart calendar and time-boxing assistant built into DayFrame, a personal productivity app.

Today's date is ${today}.

The user's calendar data is provided as JSON. You can read it to answer questions and suggest actions.

CALENDAR DATA:
${JSON.stringify(calendarData, null, 2)}

DATA STRUCTURE:
- days: object keyed by "YYYY-MM-DD", each day has { dayType, blocks[], notes, markers[] }
- blocks: { id, title, start, end, cat, notes, completed, trafficLight } — time-boxed tasks with start/end times
- markers: { id, title, cat } — all-day indicators, no time needed (school closures, holidays, match days, reminders)
- start/end: "HH:MM" 24-hour format
- cat: "habit" | "todo" | "workout" | "kids" | "custom" | "free" | "event"
- trafficLight: null | "done" | "missed"
- lists: habit/todo/workout/kids lists with items. List IDs are: "habits", "todo", "workout", "kids". Each item can have recurrence: { pattern:"weekly"|"monthly", days:[0-6 where 0=Sun], time:"HH:MM", duration:mins, monthDay:1-31 }

BLOCKS vs MARKERS vs RECURRING ITEMS — this is important:
- Use BLOCKS for one-off things at a specific time (meeting at 2pm today)
- Use MARKERS for all-day indicators (school closed, bank holiday, match day)
- Use RECURRING ITEMS for repeating activities (piano every Monday, gym every weekday) — these are added to the list and auto-appear on the grid each week. This is MUCH more efficient than adding individual blocks for each week.

CAPABILITIES:
You can answer questions about the calendar AND make changes. When making changes, include a JSON actions block in your response.

ACTIONS FORMAT — include this at the end of your response when making changes:
\`\`\`actions
[
  {
    "type": "add_recurring_item",
    "listId": "kids",
    "title": "Jonah's Piano",
    "recurrence": {
      "pattern": "weekly",
      "days": [1],
      "time": "15:15",
      "duration": 60
    }
  },
    "date": "YYYY-MM-DD",
    "title": "School Closed - Easter Holidays",
    "cat": "kids"
  },
  {
    "type": "delete_markers_matching",
    "titleContains": "School"
  },
  {
    "type": "add_block",
    "date": "YYYY-MM-DD",
    "block": { "title": "...", "start": "HH:MM", "end": "HH:MM", "cat": "free", "notes": "" }
  },
  {
    "type": "delete_block",
    "date": "YYYY-MM-DD",
    "blockId": "..."
  },
  {
    "type": "delete_blocks_matching",
    "titleContains": "Man Utd"
  },
  {
    "type": "update_block",
    "date": "YYYY-MM-DD",
    "blockId": "...",
    "changes": { "start": "HH:MM", "end": "HH:MM", "title": "..." }
  },
  {
    "type": "clear_day",
    "date": "YYYY-MM-DD"
  },
  {
    "type": "set_day_note",
    "date": "YYYY-MM-DD",
    "note": "..."
  }
]
\`\`\`

IMPORTANT LIMITS:
- When adding recurring events, add maximum 8 weeks at a time to avoid response limits
- Keep actions lists concise — if more than 20 actions needed, do the nearest dates first and tell the user to ask again for more
- Always complete the actions JSON block fully before ending your response
- When asked to delete/modify things, confirm what you're about to do before the actions block
- When listing schedule info, format it clearly
- Times should always be HH:MM 24-hour format
- If asked about fixtures/sports, search the web using your tools
- Always confirm completed changes: "Done — I've added X to Y"
- If you can't do something, explain why clearly`;

    const requestBody = JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 4000,
      system: systemPrompt,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: messages
    });

    const result = await httpsPost(
      'https://api.anthropic.com/v1/messages',
      {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'web-search-2025-03-05'
      },
      requestBody
    );

    return {
      statusCode: result.status,
      headers: cors,
      body: result.body
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: err.message })
    };
  }
};
