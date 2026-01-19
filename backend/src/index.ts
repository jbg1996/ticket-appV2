import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import cron from 'node-cron';
import fs from 'fs/promises';
import { z } from 'zod';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireAuth, requireRole } from './middleware/auth.js';
import { login, logout, me } from './controllers/authController.js';
import { listUsers, createUser, updateUser, disableUser, deleteUser } from './controllers/userController.js';
import "dotenv/config";
import {
  listUserTypes,
  listStatuses,
  createStatus,
  updateStatus,
  deleteStatus,
  listPriorities,
  createPriority,
  updatePriority,
  deletePriority,
  listTicketTypes,
  createTicketType,
  updateTicketType,
  deleteTicketType
} from './controllers/catalogController.js';
import {
  listTickets,
  createTicket,
  getTicket,
  updateTicket,
  assignTicket,
  changeStatus,
  requestInfo,
  respondInfo,
  deleteTicket,
  addComment
} from './controllers/ticketController.js';
import { uploadAttachment, downloadAttachment } from './controllers/attachmentController.js';
import { generateReportHandler, listReports, downloadReport } from './controllers/reportController.js';
import { getHeaderColor, updateHeaderColor } from './controllers/settingsController.js';
import { generateReport } from './services/reportService.js';

const app = express();

await fs.mkdir(env.uploadDir, { recursive: true });
await fs.mkdir(env.reportDir, { recursive: true });

app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(helmet());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

const upload = multer({
  dest: env.uploadDir
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});
const ticketCreateSchema = z.object({
  ticketTypeId: z.string(),
  description: z.string().min(1),
  priorityId: z.string().optional(),
  title2: z.string().optional()
});
const assignSchema = z.object({
  assigneeId: z.string()
});
const statusSchema = z.object({
  statusId: z.string()
});
const infoRequestSchema = z.object({
  message: z.string().min(1),
  requestedFields: z.array(z.string()).optional()
});
const commentSchema = z.object({
  message: z.string().min(1)
});

app.post('/api/auth/login', authLimiter, async (req, res, next) => {
  try {
    loginSchema.parse(req.body);
    await login(req, res);
  } catch (error) {
    next(error as Error);
  }
});
app.post('/api/auth/logout', logout);
app.get('/api/auth/me', requireAuth, me);

app.get('/api/users', requireAuth, requireRole(['ADMIN']), listUsers);
app.post('/api/users', requireAuth, requireRole(['ADMIN']), createUser);
app.put('/api/users/:id', requireAuth, requireRole(['ADMIN']), updateUser);
app.patch('/api/users/:id/disable', requireAuth, requireRole(['ADMIN']), disableUser);
app.delete('/api/users/:id', requireAuth, requireRole(['ADMIN']), deleteUser);

app.get('/api/catalog/user-types', requireAuth, requireRole(['ADMIN']), listUserTypes);
app.get('/api/catalog/statuses', requireAuth, listStatuses);
app.post('/api/catalog/statuses', requireAuth, requireRole(['ADMIN']), createStatus);
app.put('/api/catalog/statuses/:id', requireAuth, requireRole(['ADMIN']), updateStatus);
app.delete('/api/catalog/statuses/:id', requireAuth, requireRole(['ADMIN']), deleteStatus);

app.get('/api/catalog/priorities', requireAuth, listPriorities);
app.post('/api/catalog/priorities', requireAuth, requireRole(['ADMIN']), createPriority);
app.put('/api/catalog/priorities/:id', requireAuth, requireRole(['ADMIN']), updatePriority);
app.delete('/api/catalog/priorities/:id', requireAuth, requireRole(['ADMIN']), deletePriority);

app.get('/api/catalog/ticket-types', requireAuth, listTicketTypes);
app.post('/api/catalog/ticket-types', requireAuth, requireRole(['ADMIN']), createTicketType);
app.put('/api/catalog/ticket-types/:id', requireAuth, requireRole(['ADMIN']), updateTicketType);
app.delete('/api/catalog/ticket-types/:id', requireAuth, requireRole(['ADMIN']), deleteTicketType);

app.get('/api/tickets', requireAuth, listTickets);
app.get('/api/tickets/:id', requireAuth, getTicket);
app.put('/api/tickets/:id', requireAuth, updateTicket);
app.post('/api/tickets', requireAuth, async (req, res, next) => {
  try {
    ticketCreateSchema.parse(req.body);
    await createTicket(req, res);
  } catch (error) {
    next(error as Error);
  }
});
app.post('/api/tickets/:id/assign', requireAuth, requireRole(['ADMIN']), async (req, res, next) => {
  try {
    assignSchema.parse(req.body);
    await assignTicket(req, res);
  } catch (error) {
    next(error as Error);
  }
});
app.post('/api/tickets/:id/status', requireAuth, requireRole(['ADMIN', 'TECH']), async (req, res, next) => {
  try {
    statusSchema.parse(req.body);
    await changeStatus(req, res);
  } catch (error) {
    next(error as Error);
  }
});
app.post('/api/tickets/:id/request-info', requireAuth, requireRole(['TECH', 'ADMIN']), async (req, res, next) => {
  try {
    infoRequestSchema.parse(req.body);
    await requestInfo(req, res);
  } catch (error) {
    next(error as Error);
  }
});
app.post('/api/info-requests/:id/respond', requireAuth, upload.single('file'), respondInfo);
app.post('/api/tickets/:id/comment', requireAuth, async (req, res, next) => {
  try {
    commentSchema.parse(req.body);
    await addComment(req, res);
  } catch (error) {
    next(error as Error);
  }
});
app.delete('/api/tickets/:id', requireAuth, requireRole(['ADMIN']), deleteTicket);

app.post('/api/tickets/:id/attachments', requireAuth, upload.single('file'), uploadAttachment);
app.get('/api/attachments/:id/download', requireAuth, downloadAttachment);

app.post('/api/reports/generate', requireAuth, requireRole(['ADMIN']), generateReportHandler);
app.get('/api/reports', requireAuth, requireRole(['ADMIN']), listReports);
app.get('/api/reports/:id/download', requireAuth, requireRole(['ADMIN']), downloadReport);

app.get('/api/settings/header-color', requireAuth, getHeaderColor);
app.put('/api/settings/header-color', requireAuth, requireRole(['ADMIN']), updateHeaderColor);

app.use(errorHandler);

const server = app.listen(env.port, () => {
  console.log(`Server running on http://localhost:${env.port}`);
});

cron.schedule('55 23 * * *', async () => {
  await generateReport('DAILY');
});

cron.schedule('55 23 * * 0', async () => {
  await generateReport('WEEKLY');
});

cron.schedule('10 0 1 * *', async () => {
  await generateReport('MONTHLY');
});

process.on('SIGTERM', () => {
  server.close();
});

export default app;
