import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import prisma from '../src/prisma/client.js';
import app from '../src/index.js';
import { TICKET_STATUS } from '../src/constants/ticketCanon.js';

let adminToken = '';
let adminUserId = 0;
let ticketTypeId = 0;
let priorityId = 0;
let statusIds: Record<string, number> = {};
const runSuffix = Date.now().toString();
const adminEmail = `lifecycle.admin.${runSuffix}@test.local`;
const adminTypeName = `Admin Lifecycle ${runSuffix}`;

const createTicket = async ({
  statusName,
  resolvedAt,
  isActive = true
}: {
  statusName: string;
  resolvedAt?: Date | null;
  isActive?: boolean;
}) =>
  prisma.ticket.create({
    data: {
      ticketTypeId,
      title: `Lifecycle ${Date.now()}`,
      description: 'Lifecycle test ticket',
      priorityId,
      statusId: statusIds[statusName],
      createdById: adminUserId,
      updatedById: adminUserId,
      resolvedAt,
      isActive
    }
  });

describe.sequential('Ticket status lifecycle', () => {
  beforeAll(async () => {
    const adminType = await prisma.userType.create({ data: { name: adminTypeName, code: 'ADMIN' } });
    const passwordHash = await bcrypt.hash('Password123!', 10);
    const admin = await prisma.user.create({
      data: {
        firstName: 'Lifecycle',
        lastName: 'Admin',
        email: adminEmail,
        passwordHash,
        userTypeId: adminType.id
      }
    });
    adminUserId = admin.id;

    const priority = await prisma.priority.create({ data: { name: 'MEDIUM_LIFECYCLE', color: '#2563eb' } });
    priorityId = priority.id;

    const createdStatuses = await Promise.all(
      [
        { name: TICKET_STATUS.NEW, sortOrder: 1 },
        { name: TICKET_STATUS.IN_PROGRESS, sortOrder: 2 },
        { name: TICKET_STATUS.ON_HOLD, sortOrder: 3 },
        { name: TICKET_STATUS.RESOLVED, sortOrder: 4 },
        { name: TICKET_STATUS.CLOSED, sortOrder: 5 }
      ].map(async (status) => {
        const existing = await prisma.status.findFirst({ where: { name: status.name }, orderBy: { sortOrder: 'asc' } });
        return existing ?? prisma.status.create({ data: status });
      })
    );

    statusIds = createdStatuses.reduce<Record<string, number>>((acc, status) => {
      acc[status.name] = status.id;
      return acc;
    }, {});

    const ticketType = await prisma.ticketType.create({
      data: {
        name: 'REQUEST_LIFECYCLE',
        description: 'Lifecycle template',
        defaultPriorityId: priorityId,
        isActive: true
      }
    });
    ticketTypeId = ticketType.id;

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: adminEmail, password: 'Password123!' });
    adminToken = loginResponse.body.token;
  });

  afterAll(async () => {
    await prisma.infoResponse.deleteMany();
    await prisma.infoRequest.deleteMany();
    await prisma.ticketHistory.deleteMany();
    await prisma.attachment.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.ticketType.deleteMany({ where: { id: ticketTypeId } });
    await prisma.priority.deleteMany({ where: { id: priorityId } });
    await prisma.user.deleteMany({ where: { id: adminUserId } });
    await prisma.userType.deleteMany({ where: { name: adminTypeName } });
    await prisma.$disconnect();
  });

  it('allows manual status change from RESOLVED to IN_PROGRESS', async () => {
    const ticket = await createTicket({
      statusName: TICKET_STATUS.RESOLVED,
      resolvedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
    });

    const response = await request(app)
      .post(`/api/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: statusIds[TICKET_STATUS.IN_PROGRESS] });

    expect(response.status).toBe(200);

    const updated = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: { status: true } });
    expect(updated.status.name).toBe(TICKET_STATUS.IN_PROGRESS);
    expect(updated.resolvedAt).toBeNull();
  });

  it('does not auto-close resolved tickets before 5 days', async () => {
    const ticket = await createTicket({
      statusName: TICKET_STATUS.RESOLVED,
      resolvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000)
    });

    const response = await request(app).get('/api/tickets').set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);

    const current = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: { status: true } });
    expect(current.status.name).toBe(TICKET_STATUS.RESOLVED);
    expect(current.isActive).toBe(true);
  });

  it('auto-closes and disables resolved tickets after 5 days', async () => {
    const ticket = await createTicket({
      statusName: TICKET_STATUS.RESOLVED,
      resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 - 60 * 1000)
    });

    const response = await request(app).get(`/api/tickets/${ticket.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);

    const current = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: { status: true } });
    expect(current.status.name).toBe(TICKET_STATUS.CLOSED);
    expect(current.isActive).toBe(false);
  });

  it('restarts the 5-day counter after leaving and re-entering RESOLVED', async () => {
    const ticket = await createTicket({
      statusName: TICKET_STATUS.RESOLVED,
      resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
    });

    const reopenResponse = await request(app)
      .post(`/api/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: statusIds[TICKET_STATUS.NEW] });

    expect(reopenResponse.status).toBe(200);

    const reResolveResponse = await request(app)
      .post(`/api/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: statusIds[TICKET_STATUS.IN_PROGRESS] });

    expect(reResolveResponse.status).toBe(200);

    const resolveAgainResponse = await request(app)
      .post(`/api/tickets/${ticket.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ statusId: statusIds[TICKET_STATUS.RESOLVED] });

    expect(resolveAgainResponse.status).toBe(200);

    await prisma.ticket.update({
      where: { id: ticket.id },
      data: { resolvedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), isActive: true }
    });

    const maintenanceResponse = await request(app).get('/api/tickets').set('Authorization', `Bearer ${adminToken}`);
    expect(maintenanceResponse.status).toBe(200);

    const current = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: { status: true } });
    expect(current.status.name).toBe(TICKET_STATUS.RESOLVED);
    expect(current.isActive).toBe(true);
    expect(current.resolvedAt).not.toBeNull();
  });

  it('does not reprocess already closed and inactive tickets', async () => {
    const ticket = await createTicket({
      statusName: TICKET_STATUS.CLOSED,
      resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      isActive: false
    });

    const baseline = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } });

    const response = await request(app).get('/api/tickets').set('Authorization', `Bearer ${adminToken}`);
    expect(response.status).toBe(200);

    const current = await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id }, include: { status: true } });
    expect(current.status.name).toBe(TICKET_STATUS.CLOSED);
    expect(current.isActive).toBe(false);
    expect(current.updatedAt.getTime()).toBe(baseline.updatedAt.getTime());
  });
});
