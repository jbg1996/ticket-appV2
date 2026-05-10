import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_STATUS_COLOR = '#9CA3AF';
const TOTAL_TICKETS = 96;
const OPEN_RATIO = 0.6;
const DAYS_WINDOW = 90;

function formatTicketCode(id: number): string {
  return `TM${id.toString().padStart(9, '0')}`;
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomItem<T>(items: T[]): T {
  return items[randomInt(0, items.length - 1)];
}

function randomDateWithinLastDays(days: number): Date {
  const now = Date.now();
  const maxOffsetMs = days * 24 * 60 * 60 * 1000;
  const offset = Math.floor(Math.random() * maxOffsetMs);
  return new Date(now - offset);
}

function buildResolvedDate(createdAt: Date): Date {
  const resolutionMinutes = randomInt(30, 60 * 24 * 14);
  return new Date(createdAt.getTime() + resolutionMinutes * 60 * 1000);
}

async function main() {
  await prisma.attachment.deleteMany();
  await prisma.infoResponse.deleteMany();
  await prisma.infoRequest.deleteMany();
  await prisma.ticketHistory.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.report.deleteMany();
  await prisma.user.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.status.deleteMany();
  await prisma.priority.deleteMany();
  await prisma.userType.deleteMany();

  const userTypes = [
    { name: 'Admin', code: 'ADMIN' },
    { name: 'Technical', code: 'TECH' },
    { name: 'Requester', code: 'REQUESTER' }
  ];

  const priorities = [
    { name: 'LOW', color: '#16a34a' },
    { name: 'MEDIUM', color: '#2563eb' },
    { name: 'HIGH', color: '#f97316' },
    { name: 'CRITICAL', color: '#dc2626' }
  ];

  const statuses = [
    { name: 'NEW', sortOrder: 1, color: '#3B82F6' },
    { name: 'IN_PROGRESS', sortOrder: 2, color: '#F59E0B' },
    { name: 'ON_HOLD', sortOrder: 3, color: '#A855F7' },
    { name: 'RESOLVED', sortOrder: 4, color: '#22C55E' },
    { name: 'CLOSED', sortOrder: 5, color: '#6B7280' }
  ];

  for (const userType of userTypes) {
    const existing = await prisma.userType.findFirst({ where: { code: userType.code } });
    if (existing) await prisma.userType.update({ where: { id: existing.id }, data: userType });
    else await prisma.userType.create({ data: userType });
  }

  for (const priority of priorities) {
    const existing = await prisma.priority.findFirst({ where: { name: priority.name } });
    if (existing) await prisma.priority.update({ where: { id: existing.id }, data: priority });
    else await prisma.priority.create({ data: priority });
  }

  for (const status of statuses) {
    const existing = await prisma.status.findFirst({ where: { name: status.name } });
    const data = { ...status, color: status.color || DEFAULT_STATUS_COLOR };
    if (existing) await prisma.status.update({ where: { id: existing.id }, data });
    else await prisma.status.create({ data });
  }

  const userTypeRecords = await prisma.userType.findMany();
  const priorityRecords = await prisma.priority.findMany();
  const statusRecords = await prisma.status.findMany();

  const findUserTypeId = (code: string) => userTypeRecords.find((r) => r.code === code)?.id;
  const findPriorityId = (name: string) =>
    priorityRecords.find((r) => r.name === name)?.id ?? priorityRecords[0].id;

  const ticketTypes = [
    { name: 'INCIDENT', description: 'Describe the incident and how it impacts your work.', defaultPriorityName: 'HIGH' },
    { name: 'REQUEST', description: 'Describe the request and the expected outcome.', defaultPriorityName: 'MEDIUM' },
    { name: 'ACCESS', description: 'Indicate the system and required access level.', defaultPriorityName: 'MEDIUM' },
    { name: 'HARDWARE', description: 'Describe the device and reported fault.', defaultPriorityName: 'HIGH' },
    { name: 'SOFTWARE', description: 'Indicate the application and issue details.', defaultPriorityName: 'MEDIUM' },
    { name: 'OTHER', description: 'Provide additional details for the request.', defaultPriorityName: 'LOW' }
  ];

  for (const t of ticketTypes) {
    const data = {
      description: t.description,
      defaultPriorityId: findPriorityId(t.defaultPriorityName),
      isActive: true
    };
    const existing = await prisma.ticketType.findFirst({ where: { name: t.name } });
    if (existing) await prisma.ticketType.update({ where: { id: existing.id }, data });
    else await prisma.ticketType.create({ data: { name: t.name, ...data } });
  }

  const adminTypeId = findUserTypeId('ADMIN');
  const techTypeId = findUserTypeId('TECH');
  const requesterTypeId = findUserTypeId('REQUESTER');
  if (!adminTypeId || !techTypeId || !requesterTypeId) throw new Error('Base user types were not created.');

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const users = [
    { firstName: 'Admin', lastName: 'Admin', email: 'admin@local.test', userTypeId: adminTypeId },
    { firstName: 'Lucia', lastName: 'Ops', email: 'tech1@local.test', userTypeId: techTypeId },
    { firstName: 'Martin', lastName: 'Support', email: 'tech2@local.test', userTypeId: techTypeId },
    { firstName: 'Elena', lastName: 'Infra', email: 'tech3@local.test', userTypeId: techTypeId },
    { firstName: 'Diego', lastName: 'Apps', email: 'tech4@local.test', userTypeId: techTypeId },
    { firstName: 'Carla', lastName: 'QA', email: 'tech5@local.test', userTypeId: techTypeId },
    { firstName: 'Rafa', lastName: 'Requester', email: 'requester1@local.test', userTypeId: requesterTypeId },
    { firstName: 'Paula', lastName: 'Requester', email: 'requester2@local.test', userTypeId: requesterTypeId }
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: { ...u, passwordHash, isActive: true },
      create: { ...u, passwordHash, isActive: true }
    });
  }

  const defaultSettings = [
    { key: 'HEADER_COLOR', value: '#1e1e1e' },
    { key: 'SIDEBAR_COLOR', value: '#282828' },
    { key: 'APP_LOGO_URL', value: 'https://res.cloudinary.com/dcjouquja/image/upload/v1771182335/Logo_TiMapp.png' },
    { key: 'COMPANY_LOGO_URL', value: 'https://res.cloudinary.com/dcjouquja/image/upload/v1771182565/Logo_Icono_TiMapp.png' }
  ];

  for (const setting of defaultSettings) {
    const existing = await prisma.setting.findUnique({ where: { key: setting.key } });
    if (!existing) {
      await prisma.setting.create({ data: setting });
    }
  }

  const allUsers = await prisma.user.findMany();
  const admins = allUsers.filter((u) => u.userTypeId === adminTypeId);
  const technicians = allUsers.filter((u) => u.userTypeId === techTypeId);
  const requesters = allUsers.filter((u) => u.userTypeId === requesterTypeId);
  const ticketTypeRecords = await prisma.ticketType.findMany();
  if (!admins.length || !technicians.length || !requesters.length || !ticketTypeRecords.length) {
    throw new Error('Not enough base data found.');
  }

  const openStatusPool = ['NEW', 'IN_PROGRESS', 'ON_HOLD']
    .map((name) => statusRecords.find((s) => s.name === name))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const closedStatusPool = ['RESOLVED', 'CLOSED']
    .map((name) => statusRecords.find((s) => s.name === name))
    .filter((s): s is NonNullable<typeof s> => Boolean(s));

  const openTicketsTarget = Math.floor(TOTAL_TICKETS * OPEN_RATIO);
  const createdTicketIds: number[] = [];

  for (let index = 0; index < TOTAL_TICKETS; index += 1) {
    const isResolved = index >= openTicketsTarget;
    const createdAt = randomDateWithinLastDays(DAYS_WINDOW);
    const resolvedAt = isResolved ? buildResolvedDate(createdAt) : null;

    const ticket = await prisma.ticket.create({
      data: {
        code: null,
        title: 'TEST',
        description: `Sample ticket ${index + 1} to populate dashboard metrics.`,
        ticketTypeId: randomItem(ticketTypeRecords).id,
        priorityId: randomItem(priorityRecords).id,
        statusId: isResolved ? randomItem(closedStatusPool).id : randomItem(openStatusPool).id,
        createdById: randomItem([...admins, ...requesters]).id,
        assignedToId: Math.random() < 0.82 ? randomItem(technicians).id : null,
        updatedById: randomItem([...admins, ...technicians]).id,
        createdAt,
        resolvedAt,
        isActive: true
      }
    });

    const code = formatTicketCode(ticket.id);
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        code,
        title: `${code} - TEST`
      }
    });

    createdTicketIds.push(ticket.id);

    const historyEvents = isResolved ? randomInt(2, 4) : randomInt(1, 3);
    for (let step = 0; step < historyEvents; step += 1) {
      const eventAt = new Date(createdAt.getTime() + step * randomInt(30, 360) * 60 * 1000);
      await prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          actorId: randomItem([...admins, ...technicians]).id,
          eventType: step === 0 ? 'CREATED' : 'STATUS_CHANGED',
          message: step === 0 ? 'Ticket created from seed.' : 'Simulated status change.',
          dataJson: step === 0 ? null : JSON.stringify({ from: 'NEW', to: isResolved ? 'RESOLVED' : 'IN_PROGRESS' }),
          createdAt: eventAt
        }
      });
    }
  }

  await prisma.$executeRaw`
    UPDATE Ticket
    SET
      code = 'TM' || printf('%09d', id),
      title = ('TM' || printf('%09d', id) || ' - TEST')
    WHERE code IS NULL OR title = 'TEST'
  `;

  const openTickets = await prisma.ticket.findMany({ where: { resolvedAt: null }, select: { id: true, createdAt: true } });
  const sampleOpen = openTickets.slice(0, 12);

  for (const t of sampleOpen) {
    const requesterTech = randomItem(technicians);
    const request = await prisma.infoRequest.create({
      data: {
        ticketId: t.id,
        requesterTechId: requesterTech.id,
        message: 'Please share screenshots and reproduction steps.',
        status: Math.random() < 0.5 ? 'OPEN' : 'CLOSED',
        createdAt: new Date(t.createdAt.getTime() + randomInt(60, 720) * 60 * 1000),
        closedAt: Math.random() < 0.5 ? new Date() : null
      }
    });

    if (Math.random() < 0.7) {
      await prisma.infoResponse.create({
        data: {
          infoRequestId: request.id,
          responderId: randomItem(requesters).id,
          message: 'Sharing the requested details and steps.',
          createdAt: new Date(request.createdAt.getTime() + randomInt(20, 360) * 60 * 1000)
        }
      });
    }
  }

  console.log(`Seed OK. Example: ${formatTicketCode(1)} - TEST`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
