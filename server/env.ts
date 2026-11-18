// Load .env.local / .env before any other server module reads process.env.
// ES module imports run before the importing file's own code, so this must be
// the first import in index.ts (auth.ts reads the login settings at import time).
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env.local') });
dotenv.config();
