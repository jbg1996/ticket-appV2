import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma/client.js';
import { parseId, parseOptionalId } from '../utils/parseId.js';

export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({ include: { userType: true } });
  res.json(users);
}

export async function listUserSummaries(_req: Request, res: Response) {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      firstName: true,
      lastName: true,
      userType: { select: { name: true, code: true } }
    }
  });
  res.json(users);
}

export async function createUser(req: Request, res: Response) {
  const { firstName, lastName, email, password, phone, userTypeId } = req.body as {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    userTypeId: number;
  };
  if (!firstName || !lastName || !email || !password || !userTypeId) {
    console.warn('createUser validation failed', { firstName, lastName, email, userTypeId });
    return res.status(400).json({ message: 'First name, last name, email, password, and userTypeId are required.' });
  }
  const parsedUserTypeId = parseId(userTypeId);
  if (!parsedUserTypeId) {
    return res.status(400).json({ message: 'Invalid user type.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ message: 'Email already in use.' });
  }
  const userType = await prisma.userType.findUnique({ where: { id: parsedUserTypeId } });
  if (!userType) {
    return res.status(400).json({ message: 'Invalid user type.' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { firstName, lastName, email, passwordHash, phone, userTypeId: parsedUserTypeId }
  });
  console.info('Created user', { id: user.id });
  res.status(201).json(user);
}

export async function updateUser(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid user id.' });
  }
  const { firstName, lastName, phone, userTypeId, isActive } = req.body as {
    firstName?: string;
    lastName?: string;
    phone?: string;
    userTypeId?: number;
    isActive?: boolean;
  };
  if (!firstName && !lastName && !phone && !userTypeId && typeof isActive === 'undefined') {
    return res.status(400).json({ message: 'Provide fields to update.' });
  }
  const existing = await prisma.user.findUnique({ where: { id: parsedId } });
  if (!existing) {
    return res.status(404).json({ message: 'User not found.' });
  }
  const parsedUserTypeId = parseOptionalId(userTypeId);
  if (userTypeId && !parsedUserTypeId) {
    return res.status(400).json({ message: 'Invalid user type.' });
  }
  if (userTypeId) {
    const userType = await prisma.userType.findUnique({ where: { id: parsedUserTypeId } });
    if (!userType) {
      return res.status(400).json({ message: 'Invalid user type.' });
    }
  }
  const user = await prisma.user.update({
    where: { id: parsedId },
    data: { firstName, lastName, phone, userTypeId: parsedUserTypeId, isActive }
  });
  console.info('Updated user', { id: parsedId });
  res.json(user);
}

export async function disableUser(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid user id.' });
  }
  const user = await prisma.user.update({ where: { id: parsedId }, data: { isActive: false } });
  res.json(user);
}

export async function deleteUser(req: Request, res: Response) {
  const parsedId = parseId(req.params.id);
  if (!parsedId) {
    return res.status(400).json({ message: 'Invalid user id.' });
  }
  const existing = await prisma.user.findUnique({ where: { id: parsedId } });
  if (!existing) {
    return res.status(404).json({ message: 'User not found.' });
  }
  await prisma.user.delete({ where: { id: parsedId } });
  console.info('Deleted user', { id: parsedId });
  res.status(204).send();
}
