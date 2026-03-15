// DayFrame AI Assistant
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
  if (!apiKey) return { statusCode: 500, headers: cors, body: JSON.stringify({ error: 'ANTHROPIC_API_KEY not set' }) };

  try {
    const { messages, calendarData, today } = JSON.parse(event.body);

    // Summarise calendar data — 7 days back, 60 days forward only
    const today2 = new Date(today);
    const summaryData = {
      lists: (calendarData.lists || []).map(l => ({
        id: l.id, name: l.name,
        items: (l.items || []).map(i => ({ id: i.id, text: i.text, recurring: i.recurring, recurrence: i.recurrence }))
      })),
      projects: (calendarData.projects || []).map(p => ({
        id: p.id, name: p.name, status: p.status, due: p.due,
        steps: (p.steps || []).map(s => ({ id: s.id, title: s.title, done: s.done, dueDate: s.dueDate }))
      })),
      dayTypes: calendarData.dayTypes,
      days: Object.fromEntries(
        Object.entries(calendarData.days || {}).filter(([ds]) => {
          const diff = (new Date(ds) - today2) / 86400000;
          return diff >= -7 && diff <= 60;
        })
      )
    };

    const systemPrompt = `You are DayFrame Assistant — a smart calendar and time-boxing assistant.

Today's date is ${today}.

CALENDAR DATA:
${JSON.stringify(summaryData, null, 2)}

DATA STRUCTURE:
- days: keyed by "YYYY-MM-DD", each has { dayType, blocks[], notes, markers[] }
- blocks: { id, title, start, end, cat, notes, completed, trafficLight } — time-boxed tasks
- markers: { id, title, cat } — all-day indicators (no time needed)
- start/end: "HH:MM" 24-hour format
- cat: "habit"|"todo"|"workout"|"kids"|"custom"|"free"|"event"
- lists: IDs are "habits", "todo", "workout", "kids". Items can have recurrence: { pattern:"weekly"|"monthly", days:[0-6 where 0=Sun], time:"HH:MM", duration:mins }

WHEN TO USE EACH TYPE:
- BLOCKS: one-off timed tasks (meeting at 2pm today)
- MARKERS: all-day indicators (school closed, bank holiday, match day)
- RECURRING ITEMS: repeating activities (piano every Monday) — add to list once, auto-appears on grid every week. Much more efficient than individual blocks.

ACTIONS FORMAT — append at end of response when making changes:
\`\`\`actions
[
  { "type": "add_recurring_item", "listId": "kids", "title": "Jonah Piano", "recurrence": { "pattern": "weekly", "days": [1], "time": "15:15", "duration": 60 } },
  { "type": "add_marker", "date": "YYYY-MM-DD", "title": "School Closed", "cat": "kids" },
  { "type": "delete_markers_matching", "titleContains": "School" },
  { "type": "add_block", "date": "YYYY-MM-DD", "block": { "title": "...", "start": "HH:MM", "end": "HH:MM", "cat": "free", "notes": "" } },
  { "type": "delete_block", "date": "YYYY-MM-DD", "blockId": "..." },
  { "type": "delete_blocks_matching", "titleContains": "Man Utd" },
  { "type": "update_block", "date": "YYYY-MM-DD", "blockId": "...", "changes": { "start": "HH:MM", "end": "HH:MM" } },
  { "type": "clear_day", "date": "YYYY-MM-DD" },
  { "type": "set_day_note", "date": "YYYY-MM-DD", "note": "..." }
]
\`\`\`

RULES:
- Max 20 actions per response — do nearest dates first, tell user to ask for more
- Always complete the JSON block fully before ending response
- Be concise and friendly
- Confirm changes: "Done — added X"
- Times in HH:MM 24-hour format`;

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

    return { statusCode: result.status, headers: cors, body: result.body };

  } catch (err) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: err.message }) };
  }
};
