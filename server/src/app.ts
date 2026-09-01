import cors from 'cors';
import express from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import session from 'express-session';
import { env } from './config/env.js';
import { SqlSessionStore } from './config/session-store.js';
import { errorHandler, notFound } from './middleware/error.middleware.js';
import { apiRouter } from './routes/index.js';

export const app = express();
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(rateLimit({ windowMs: 15 * 60_000, limit: 500, standardHeaders: true, legacyHeaders: false }));
app.use(session({
  name: 'stockhub.sid', secret: env.SESSION_SECRET, store: new SqlSessionStore(), resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'lax', secure: env.NODE_ENV === 'production', maxAge: 8 * 60 * 60_000 }
}));
app.get('/health', (_request, response) => response.json({ success: true, message: 'StockHub API is running.', data: { status: 'ok' } }));
app.use('/api', apiRouter);
app.use(notFound);
app.use(errorHandler);
