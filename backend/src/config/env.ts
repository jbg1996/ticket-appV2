import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'changeme',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  reportDir: process.env.REPORT_DIR ?? 'reports'
};
