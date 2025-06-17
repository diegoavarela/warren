import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { authRouter } from './routes/auth';
import { cashflowRouter } from './routes/cashflow';
import { pnlRouter } from './routes/pnl';
import { teamRouter } from './routes/team';
import { adminRouter } from './routes/admin';
import { legalRouter } from './routes/legal';
import configurationRouter from './routes/configuration';
import currencyRouter from './routes/currency';
import mondayRouter from './routes/monday';
import { analysisRoutes } from './routes/analysis';
import { errorHandler } from './middleware/errorHandler';
import { logger } from './utils/logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3002;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: function(origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:3002',
      'https://warren-k0mraqa0p-diegoavarelas-projects.vercel.app',
      /\.vercel\.app$/  // Allow all Vercel preview URLs
    ];
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowed => {
      if (typeof allowed === 'string') return allowed === origin;
      return allowed.test(origin);
    })) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRouter);
app.use('/api/cashflow', cashflowRouter);
app.use('/api/pnl', pnlRouter);
app.use('/api/team', teamRouter);
app.use('/api/admin', adminRouter);
app.use('/api/legal', legalRouter);
app.use('/api/configuration', configurationRouter);
app.use('/api/currency', currencyRouter);
app.use('/api/monday', mondayRouter);
app.use('/api/analysis', analysisRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Warren backend server running on port ${PORT}`);
});

export default app;