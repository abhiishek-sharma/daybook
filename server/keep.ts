import { formatLocal } from './dates.js';

export interface ParsedKeepNote {
  title: string;
  body: string;
  written_on: string;
}

function decodeHTMLEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCharCode(parseInt(code, 16)));
}

export function parseKeepHTML(html: string, fallbackDate: string): ParsedKeepNote | null {
  const titleMatch = html.match(/<div class="title"[^>]*>([\s\S]*?)<\/div>/i);
  const contentMatch = html.match(/<div class="content"[^>]*>([\s\S]*?)<\/div>/i);
  const headingMatch = html.match(/<div class="heading"[^>]*>([\s\S]*?)<\/div>/i);

  if (!contentMatch) return null;
  const bodyHtml = contentMatch[1].replace(/<br\s*\/?>/gi, '\n');
  const body = decodeHTMLEntities(bodyHtml.replace(/<[^>]+>/g, '')).trim();
  if (!body) return null;

  let title: string;
  if (titleMatch) {
    title = decodeHTMLEntities(titleMatch[1].replace(/<[^>]+>/g, '')).trim();
  } else {
    const firstLine = body.split('\n').find(l => l.trim().length > 0) ?? '';
    title = firstLine.length > 80 ? firstLine.slice(0, 77).trim() + '…' : firstLine.trim();
  }
  if (!title) return null;

  let written_on = fallbackDate;
  if (headingMatch) {
    const raw = decodeHTMLEntities(headingMatch[1].replace(/<[^>]+>/g, '')).trim();
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) {
      written_on = formatLocal(d);
    }
  }

  return { title, body, written_on };
}

export function parseKeepJSON(jsonText: string, fallbackDate: string): ParsedKeepNote | null {
  let parsed: { title?: string; textContent?: string; userEditedTimestampUsec?: string | number };
  try { parsed = JSON.parse(jsonText); } catch { return null; }
  const body = (parsed.textContent ?? '').trim();
  if (!body) return null;
  const titleRaw = (parsed.title ?? '').trim();
  const title = titleRaw || (body.split('\n').find(l => l.trim().length > 0) ?? 'Untitled').slice(0, 80);
  if (!title) return null;
  let written_on = fallbackDate;
  if (parsed.userEditedTimestampUsec) {
    const usec = Number(parsed.userEditedTimestampUsec);
    if (Number.isFinite(usec)) {
      written_on = formatLocal(new Date(usec / 1000));
    }
  }
  return { title, body, written_on };
}

export function isKeepEntry(entryPath: string): boolean {
  if (!/Takeout\/Keep\//.test(entryPath) && !/^Keep\//.test(entryPath)) return false;
  if (/\/Labels\.txt$/i.test(entryPath)) return false;
  if (/\/Trash\//i.test(entryPath)) return false;
  const lower = entryPath.toLowerCase();
  return lower.endsWith('.html') || lower.endsWith('.json');
}

export function parseKeepEntry(entryPath: string, text: string, fallbackDate: string): ParsedKeepNote | null {
  const lower = entryPath.toLowerCase();
  if (lower.endsWith('.html')) return parseKeepHTML(text, fallbackDate);
  if (lower.endsWith('.json')) return parseKeepJSON(text, fallbackDate);
  return null;
}
