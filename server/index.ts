import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { authRouter } from './auth.js';
import { habitsRouter } from './routes/habits.js';
import { todosRouter } from './routes/todos.js';
import { notesRouter } from './routes/notes.js';
import { financeRouter } from './routes/finance.js';
import { readingRouter } from './routes/reading.js';
import { tripsRouter } from './routes/trips.js';
import { poetryRouter } from './routes/poetry.js';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3001);

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

const SESSION_SECRET = process.env.SESSION_SECRET || 'observatory-dev-secret-change-me';
const sessionsDir = path.join(process.cwd(), 'data');
fs.mkdirSync(sessionsDir, { recursive: true });

app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      secure: false,
      maxAge: 1000 * 60 * 60 * 24 * 30,
    },
  })
);

app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api/auth', authRouter);
app.use('/api/habits', habitsRouter);
app.use('/api/todos', todosRouter);
app.use('/api/notes', notesRouter);
app.use('/api/finance', financeRouter);
app.use('/api/reading', readingRouter);
app.use('/api/trips', tripsRouter);
app.use('/api/poetry', poetryRouter);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[server error]', err);
  res.status(500).json({ error: 'internal server error', detail: err.message });
});

app.listen(PORT, () => {
  console.log(`[observatory api] listening on http://localhost:${PORT}`);
});
