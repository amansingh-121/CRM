import express from 'express';
import { apiRouter } from '../server/api.ts';

// Vercel serverless entry: wraps the Express API so /api/* works in production.
// The static frontend is served by Vercel from the dist/ build output.
const app = express();

app.use(express.json({ limit: '8mb' }));
app.use('/api', apiRouter);

export default app;
