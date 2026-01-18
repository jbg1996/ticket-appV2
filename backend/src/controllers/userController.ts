import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../prisma/client.js';

export async function listUsers(_req: Request, res: Response) {
  const users = await prisma.user.findMany({ include: { userType: true } });
  res.json(users);
}

export async function createUser(req: Request, res: Response) {
  const { firstName, lastName, email, password, phone, userTypeId } = req.body as {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    userTypeId: string;
  };
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { firstName, lastName, email, passwordHash, phone, userTypeId }
  });
  res.status(201).json(user);
}

export async function updateUser(req: Request, res: Response) {
  const { id } = req.params;
  const { firstName, lastName, phone, userTypeId, isActive } = req.body as {
    firstName?: string;
    lastName?: string;
    phone?: string;
    userTypeId?: string;
    isActive?: boolean;
  };
  const user = await prisma.user.update({
    where: { id },
    data: { firstName, lastName, phone, userTypeId, isActive }
  });
  res.json(user);
}

export async function disableUser(req: Request, res: Response) {
  const { id } = req.params;
  const user = await prisma.user.update({ where: { id }, data: { isActive: false } });
  res.json(user);
}

export async function deleteUser(req: Request, res: Response) {
  const { id } = req.params;
  await prisma.user.delete({ where: { id } });
  res.status(204).send();
}
