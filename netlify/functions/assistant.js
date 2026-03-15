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
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
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
- days: object keyed by "YYYY-MM-DD", each day has { dayType, blocks[], notes }
- blocks: { id, title, start, end, cat, notes, completed, trafficLight }
- start/end: "HH:MM" 24-hour format
- cat: "habit" | "todo" | "workout" | "kids" | "custom" | "free"
- trafficLight: null | "done" | "missed"
- lists: habit/todo/workout/kids lists with items
- projects: projects with steps

CAPABILITIES:
You can answer questions about the calendar AND make changes. When making changes, include a JSON actions block in your response.

ACTIONS FORMAT — include this at the end of your response when making changes:
\`\`\`actions
[
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

GUIDELINES:
- Be concise and friendly
- When asked to delete/modify things, confirm what you're about to do before the actions block
- When listing schedule info, format it clearly
- Times should always be HH:MM 24-hour format
- If asked about fixtures/sports, search the web using your tools
- Always confirm completed changes: "Done — I've added X to Y"
- If you can't do something, explain why clearly`;

    const requestBody = JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
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
