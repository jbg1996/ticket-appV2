import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma/client.js';
import { signToken } from '../utils/jwt.js';
import { AuthRequest } from '../middleware/auth.js';
import { validatePasswordPolicy } from '../utils/passwordPolicy.js';

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as { email: string; password: string };
  const user = await prisma.user.findUnique({ where: { email }, include: { userType: true } });
  if (!user || !user.isActive) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ message: 'Invalid credentials.' });
  }
  const token = signToken({ userId: user.id, role: user.userType.code });
  return res.json({ token, user: { id: user.id, email: user.email, role: user.userType.code, firstName: user.firstName, lastName: user.lastName } });
}

export async function me(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }
  const user = await prisma.user.findUnique({ where: { id: req.user.id }, include: { userType: true } });
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }
  return res.json({ id: user.id, email: user.email, role: user.userType.code, firstName: user.firstName, lastName: user.lastName });
}

export async function logout(_req: Request, res: Response) {
  return res.json({ message: 'Logged out.' });
}

export async function changePassword(req: AuthRequest, res: Response) {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized.' });
  }

  const { currentPassword, newPassword } = req.body as { currentPassword: string; newPassword: string };
  const passwordValidation = validatePasswordPolicy(newPassword);
  if (!passwordValidation.isValid) {
    return res.status(400).json({ message: passwordValidation.message });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) {
    return res.status(404).json({ message: 'User not found.' });
  }

  const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    return res.status(400).json({ message: 'Current password is incorrect.' });
  }

  const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash);
  if (isSamePassword) {
    return res.status(400).json({ message: 'New password must be different from the current password.' });
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
  return res.json({ message: 'Password updated successfully.' });
}
