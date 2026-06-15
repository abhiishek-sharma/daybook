async function request<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail = data.error || data.detail || JSON.stringify(data);
    } catch {
      detail = await res.text();
    }
    const err = new Error(`${method} ${url} → ${res.status}: ${detail}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(url: string) => request<T>('GET', url),
  post: <T>(url: string, body?: unknown) => request<T>('POST', url, body),
  patch: <T>(url: string, body?: unknown) => request<T>('PATCH', url, body),
  put: <T>(url: string, body?: unknown) => request<T>('PUT', url, body),
  del: <T>(url: string) => request<T>('DELETE', url),
};

export interface Habit {
  id: number;
  name: string;
  icon: string;
  created_at: string;
  streak: number;
  completed_today: boolean;
  total_completions: number;
}

export interface HeatmapCell {
  date: string;
  count: number;
  intensity: number;
}

export interface HeatmapData {
  cells: HeatmapCell[];
  streak: number;
  total: number;
}

export interface Todo {
  id: number;
  text: string;
  subtext: string;
  section: string;
  completed: number;
  created_at: string;
}

export interface Note {
  id: number;
  title: string;
  body: string;
  category: string;
  image_url: string;
  created_at: string;
}

export interface Transaction {
  id: number;
  title: string;
  amount: number;
  category: string;
  occurred_on: string;
}

export interface FinanceSummary {
  totalWealth: number;
  monthSpend: number;
  monthlyCeiling: number;
  utilizedPct: number;
  chart: { date: string; total: number }[];
  priorMonthDelta: number | null;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  time_estimate: string;
  excerpt: string;
  tag: string;
  starred: number;
  created_at: string;
}

export interface TripPrep {
  id: number;
  label: string;
  progress: number;
  missing_items: string[];
}

export interface Trip {
  id: number;
  title: string;
  location: string;
  start_date: string | null;
  end_date: string | null;
  description: string;
  image_url: string;
  depart_from: string;
  arrive_at: string;
  is_active: boolean;
  prep: TripPrep[];
  created_at: string;
}

export interface Poem {
  id: number;
  title: string;
  body: string;
  lines: string[];
  written_on: string;
  featured: boolean;
  language: 'Hindi' | 'English' | string;
}
