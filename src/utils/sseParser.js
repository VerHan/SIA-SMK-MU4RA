/* ============================================================
   sseParser.js — Pure Incremental Parser for Server-Sent Events
   ============================================================ */

/**
 * Parses an accumulated UTF-8 SSE text buffer into complete events
 * and returns the remaining incomplete tail chunk.
 */
export function parseSseBuffer(rawBuffer) {
  const normalized = String(rawBuffer || '').replace(/\r\n/g, '\n');
  const blocks = normalized.split('\n\n');
  const remainder = blocks.pop() ?? '';
  const events = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    let eventName = 'message';
    const dataLines = [];

    for (const line of block.split('\n')) {
      if (!line || line.startsWith(':')) continue; // comment/ping
      if (line.startsWith('event:')) {
        eventName = line.slice(6).trim() || 'message';
      } else if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    if (dataLines.length === 0) continue;
    const rawData = dataLines.join('\n');
    let data = rawData;
    try {
      data = JSON.parse(rawData);
    } catch {
      /* keep raw string */
    }
    events.push({ event: eventName, data });
  }

  return { events, remainder };
}
