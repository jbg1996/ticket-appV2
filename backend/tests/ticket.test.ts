import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import prisma from '../src/prisma/client.js';
import app from '../src/index.js';

let token = '';
let ticketTypeId = 0;
let statusId = 0;
let priorityId = 0;
let userId = 0;

beforeAll(async () => {
  const adminType = await prisma.userType.create({ data: { name: 'Administrador', code: 'ADMIN' } });
  const passwordHash = await bcrypt.hash('Password123!', 10);
  const user = await prisma.user.create({
    data: {
      firstName: 'Admin',
      lastName: 'User',
      email: 'ticket@test.local',
      passwordHash,
      userTypeId: adminType.id
    }
  });
  userId = user.id;

  const priority = await prisma.priority.create({ data: { name: 'Media', color: '#2563eb' } });
  priorityId = priority.id;
  const status = await prisma.status.create({ data: { name: 'Nuevo', sortOrder: 1 } });
  statusId = status.id;
  const ticketType = await prisma.ticketType.create({
    data: {
      name: 'PETICIÓN',
      description: 'Template',
      defaultPriorityId: priorityId,
      isActive: true
    }
  });
  ticketTypeId = ticketType.id;

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'ticket@test.local', password: 'Password123!' });
  token = loginRes.body.token;
});

afterAll(async () => {
  await prisma.ticket.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.status.deleteMany();
  await prisma.priority.deleteMany();
  await prisma.user.deleteMany();
  await prisma.userType.deleteMany();
  await prisma.$disconnect();
});

describe('Ticket creation', () => {
  it('creates a ticket', async () => {
    const response = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticketTypeId, description: 'Need help', priorityId });

    expect(response.status).toBe(201);
    expect(response.body.creatorId).toBe(userId);
  });
});
