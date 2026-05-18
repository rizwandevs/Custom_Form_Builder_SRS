import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import formsRoutes from './routes/forms';
import publicRoutes from './routes/public';
import submissionsRoutes from './routes/submissions';
import profileRoutes from './routes/profile';
import { errorHandler } from './middleware/errorHandler';

const app = express();

const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const uploadDir = process.env.UPLOAD_DIR || './uploads';
app.use('/uploads', express.static(path.resolve(uploadDir)));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', authRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/forms', formsRoutes);
app.use('/api/forms/:id/submissions', submissionsRoutes);
app.use('/api/public', publicRoutes);

// CloudPanel Node.js sites proxy all traffic to Express. Set SERVE_STATIC=true
// when frontend dist is in the parent folder of backend/ (site root).
if (process.env.SERVE_STATIC === 'true') {
  const siteRoot = path.resolve(__dirname, '..', '..');
  app.use(express.static(siteRoot));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(siteRoot, 'index.html'), (err) => {
      if (err) next(err);
    });
  });
}

app.use(errorHandler);

export default app;
