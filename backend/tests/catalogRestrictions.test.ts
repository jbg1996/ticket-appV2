import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import prisma from '../src/prisma/client.js';
import app from '../src/index.js';

let adminToken = '';
let priorityId = 0;
let statusId = 0;
let otherTicketTypeId = 0;
let deletableTicketTypeId = 0;

beforeAll(async () => {
  const adminType = await prisma.userType.create({ data: { name: 'Admin', code: 'ADMIN' } });
  const passwordHash = await bcrypt.hash('Password123!', 10);

  await prisma.user.create({
    data: {
      firstName: 'Catalog',
      lastName: 'Admin',
      email: 'catalog-admin@test.local',
      passwordHash,
      userTypeId: adminType.id
    }
  });

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'catalog-admin@test.local', password: 'Password123!' });

  adminToken = loginResponse.body.token;

  const priority = await prisma.priority.create({ data: { name: 'PRIORITY_TEST', color: '#111111' } });
  priorityId = priority.id;

  const status = await prisma.status.create({ data: { name: 'STATUS_TEST', sortOrder: 99, color: '#222222' } });
  statusId = status.id;

  const otherType = await prisma.ticketType.create({
    data: {
      name: 'OTHER',
      description: 'Protected type',
      defaultPriorityId: priority.id,
      isActive: true
    }
  });
  otherTicketTypeId = otherType.id;

  const requestType = await prisma.ticketType.create({
    data: {
      name: 'REQUEST_TEST',
      description: 'Deletable type',
      defaultPriorityId: priority.id,
      isActive: true
    }
  });
  deletableTicketTypeId = requestType.id;
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

describe('Catalog restrictions for Tables management', () => {
  it('blocks creating priorities and statuses', async () => {
    const createPriorityResponse = await request(app)
      .post('/api/catalog/priorities')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'BLOCKED_PRIORITY', color: '#123456' });

    const createStatusResponse = await request(app)
      .post('/api/catalog/statuses')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'BLOCKED_STATUS', sortOrder: 10, color: '#654321' });

    expect(createPriorityResponse.status).toBe(403);
    expect(createStatusResponse.status).toBe(403);
  });

  it('allows updating only priority color', async () => {
    const updateColorResponse = await request(app)
      .put(`/api/catalog/priorities/${priorityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ color: '#abcdef' });

    const updateNameResponse = await request(app)
      .put(`/api/catalog/priorities/${priorityId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'NOT_ALLOWED' });

    expect(updateColorResponse.status).toBe(200);
    expect(updateColorResponse.body.color).toBe('#abcdef');
    expect(updateNameResponse.status).toBe(400);
  });

  it('allows updating only status color', async () => {
    const updateColorResponse = await request(app)
      .put(`/api/catalog/statuses/${statusId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ color: '#fedcba' });

    const updateFieldsResponse = await request(app)
      .put(`/api/catalog/statuses/${statusId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'NOT_ALLOWED', sortOrder: 5 });

    expect(updateColorResponse.status).toBe(200);
    expect(updateColorResponse.body.color).toBe('#fedcba');
    expect(updateFieldsResponse.status).toBe(400);
  });

  it('blocks deleting priorities and statuses', async () => {
    const deletePriorityResponse = await request(app)
      .delete(`/api/catalog/priorities/${priorityId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const deleteStatusResponse = await request(app)
      .delete(`/api/catalog/statuses/${statusId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deletePriorityResponse.status).toBe(403);
    expect(deleteStatusResponse.status).toBe(403);
  });

  it('blocks deleting OTHER ticket type but allows deleting other ticket types', async () => {
    const deleteOtherResponse = await request(app)
      .delete(`/api/catalog/ticket-types/${otherTicketTypeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    const deleteRequestResponse = await request(app)
      .delete(`/api/catalog/ticket-types/${deletableTicketTypeId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(deleteOtherResponse.status).toBe(400);
    expect(deleteRequestResponse.status).toBe(204);
  });
});
