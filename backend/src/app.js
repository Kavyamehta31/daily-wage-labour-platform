import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import authRouter from './routes/authRoutes.js';
import siteRouter from './routes/siteRoutes.js';
import workerRouter from './routes/workerRoutes.js';
import attendanceRouter from './routes/attendanceRoutes.js';
import wageRouter from './routes/wageRoutes.js';
import paymentRouter from './routes/paymentRoutes.js';
import adminRouter from './routes/adminRoutes.js';
import exportRouter from './routes/exportRoutes.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/sites', siteRouter);
app.use('/api/workers', workerRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/wages', wageRouter);
app.use('/api/payments', paymentRouter);
app.use('/api/admin', adminRouter);
app.use('/api/export', exportRouter);

app.use(errorHandler);

export default app;
