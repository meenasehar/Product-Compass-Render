import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import jiraRouter from './routes/jira.js';
import confluenceRouter from './routes/confluence.js';
import gdriveRouter from './routes/gdrive.js';
import anthropicRouter from './routes/anthropic.js';
import generateRouter from './routes/generate.js';
import programStatusRouter from './routes/programStatus.js';
import notesRouter from './routes/notes.js';

const app = express();

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (server-to-server) or matching allowed list
    if (!origin || config.allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Auth routes (no auth middleware — handles login flow)
app.use('/auth', authRouter);

// API routes
app.use('/api', jiraRouter);
app.use('/api', confluenceRouter);
app.use('/api', gdriveRouter);
app.use('/api', anthropicRouter);
app.use('/api', generateRouter);
app.use('/api', programStatusRouter);
app.use('/api', notesRouter);

// Serve built frontend and fall back to index.html for SPA routing
const distPath = path.resolve(process.cwd(), 'dist');
app.use(express.static(distPath));
app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`[server] running on port ${config.port} (${config.nodeEnv})`);
});
