import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';

const TMP_DIR = path.join(os.tmpdir(), 'observatory-uploads');
fs.mkdirSync(TMP_DIR, { recursive: true });

export const zipUpload = multer({
  storage: multer.diskStorage({
    destination: TMP_DIR,
    filename: (_req, file, cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.originalname}`),
  }),
  limits: { fileSize: 5 * 1024 * 1024 * 1024 },
});
