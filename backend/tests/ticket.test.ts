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
let requesterToken = '';
let techToken = '';

beforeAll(async () => {
  const adminType = await prisma.userType.create({ data: { name: 'Admin', code: 'ADMIN' } });
  const requesterType = await prisma.userType.create({ data: { name: 'Requester', code: 'REQUESTER' } });
  const techType = await prisma.userType.create({ data: { name: 'Technical', code: 'TECH' } });
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

  const priority = await prisma.priority.create({ data: { name: 'MEDIUM', color: '#2563eb' } });
  priorityId = priority.id;
  const status = await prisma.status.create({ data: { name: 'NEW', sortOrder: 1 } });
  statusId = status.id;
  const ticketType = await prisma.ticketType.create({
    data: {
      name: 'REQUEST',
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

  await prisma.user.create({
    data: {
      firstName: 'Req',
      lastName: 'User',
      email: 'requester@test.local',
      passwordHash,
      userTypeId: requesterType.id
    }
  });

  const requesterLoginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'requester@test.local', password: 'Password123!' });
  requesterToken = requesterLoginRes.body.token;

  await prisma.user.create({
    data: {
      firstName: 'Tech',
      lastName: 'User',
      email: 'tech@test.local',
      passwordHash,
      userTypeId: techType.id
    }
  });

  const techLoginRes = await request(app)
    .post('/api/auth/login')
    .send({ email: 'tech@test.local', password: 'Password123!' });
  techToken = techLoginRes.body.token;
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




  it('allows ADMIN and TECH to assign tickets, but denies REQUESTER', async () => {
    const createResponse = await request(app)
      .post('/api/tickets')
      .set('Authorization', `Bearer ${token}`)
      .send({ ticketTypeId, description: 'Assign permission test', priorityId });

    expect(createResponse.status).toBe(201);
    const ticketId = createResponse.body.id as number;

    const usersResponse = await request(app)
      .get('/api/users/summary')
      .set('Authorization', `Bearer ${token}`);

    const techUser = usersResponse.body.find((candidate: { id: number; userType: { code: string } }) => candidate.userType.code === 'TECH');
    expect(techUser).toBeTruthy();

    const adminAssignResponse = await request(app)
      .post(`/api/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${token}`)
      .send({ assigneeId: techUser.id });
    expect(adminAssignResponse.status).toBe(200);

    const techAssignResponse = await request(app)
      .post(`/api/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${techToken}`)
      .send({ assigneeId: techUser.id });
    expect(techAssignResponse.status).toBe(200);

    const requesterAssignResponse = await request(app)
      .post(`/api/tickets/${ticketId}/assign`)
      .set('Authorization', `Bearer ${requesterToken}`)
      .send({ assigneeId: techUser.id });
    expect(requesterAssignResponse.status).toBe(403);
  });

  it('rejects unauthorized ticket views for requester users', async () => {
    const forbiddenViewResponse = await request(app)
      .get('/api/tickets?view=ALL_TICKETS')
      .set('Authorization', `Bearer ${requesterToken}`);

    expect(forbiddenViewResponse.status).toBe(403);

    const invalidViewResponse = await request(app)
      .get('/api/tickets?view=NOT_A_VIEW')
      .set('Authorization', `Bearer ${token}`);

    expect(invalidViewResponse.status).toBe(400);
  });

  it('returns paginated tickets metadata', async () => {
    for (let index = 0; index < 25; index += 1) {
      await request(app)
        .post('/api/tickets')
        .set('Authorization', `Bearer ${token}`)
        .send({ ticketTypeId, description: `Need help ${index}`, priorityId });
    }

    const response = await request(app)
      .get('/api/tickets?page=2&pageSize=10')
      .set('Authorization', `Bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body.page).toBe(2);
    expect(response.body.pageSize).toBe(10);
    expect(response.body.total).toBeGreaterThanOrEqual(25);
    expect(response.body.totalPages).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(response.body.data)).toBe(true);
    expect(response.body.data).toHaveLength(10);
  });
});
