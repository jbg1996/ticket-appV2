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
  console.log('🧹 Cleaning existing data...');
  await prisma.attachment.deleteMany();
  await prisma.infoResponse.deleteMany();
  await prisma.infoRequest.deleteMany();
  await prisma.ticketHistory.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.report.deleteMany();
  await prisma.setting.deleteMany();
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
    { name: 'Baja', color: '#16a34a' },
    { name: 'Media', color: '#2563eb' },
    { name: 'Alta', color: '#f97316' },
    { name: 'Crítica', color: '#dc2626' }
  ];

  const statuses = [
    { name: 'Nuevo', sortOrder: 1, color: '#3B82F6' },
    { name: 'En progreso', sortOrder: 2, color: '#F59E0B' },
    { name: 'En espera', sortOrder: 3, color: '#A855F7' },
    { name: 'Resuelto', sortOrder: 4, color: '#22C55E' },
    { name: 'Cerrado', sortOrder: 5, color: '#6B7280' }
  ];

  for (const userType of userTypes) {
    const existing = await prisma.userType.findFirst({ where: { code: userType.code } });
    if (existing) {
      await prisma.userType.update({ where: { id: existing.id }, data: userType });
      continue;
    }
    await prisma.userType.create({ data: userType });
  }

  for (const priority of priorities) {
    const existing = await prisma.priority.findFirst({ where: { name: priority.name } });
    if (existing) {
      await prisma.priority.update({ where: { id: existing.id }, data: priority });
      continue;
    }
    await prisma.priority.create({ data: priority });
  }

  for (const status of statuses) {
    const existing = await prisma.status.findFirst({ where: { name: status.name } });
    if (existing) {
      await prisma.status.update({
        where: { id: existing.id },
        data: { ...status, color: status.color || DEFAULT_STATUS_COLOR }
      });
      continue;
    }
    await prisma.status.create({ data: status });
  }

  const userTypeRecords = await prisma.userType.findMany();
  const priorityRecords = await prisma.priority.findMany();
  const statusRecords = await prisma.status.findMany();

  const findUserTypeId = (code: string) => userTypeRecords.find((record) => record.code === code)?.id;
  const findPriorityId = (name: string) => priorityRecords.find((record) => record.name === name)?.id ?? priorityRecords[0].id;
  const findStatusId = (name: string) => statusRecords.find((record) => record.name === name)?.id ?? statusRecords[0].id;

  const ticketTypes = [
    {
      name: 'INCIDENCIA',
      description: 'Describe el incidente y cómo afecta tu trabajo.',
      defaultPriorityName: 'Alta'
    },
    {
      name: 'PETICIÓN',
      description: 'Describe la solicitud y el resultado esperado.',
      defaultPriorityName: 'Media'
    },
    {
      name: 'ACCESO',
      description: 'Indica el sistema y el nivel de acceso requerido.',
      defaultPriorityName: 'Media'
    },
    {
      name: 'HARDWARE',
      description: 'Describe el equipo y la falla reportada.',
      defaultPriorityName: 'Alta'
    },
    {
      name: 'SOFTWARE',
      description: 'Indica la aplicación y los detalles del problema.',
      defaultPriorityName: 'Media'
    },
    {
      name: 'OTROS',
      description: 'Proporciona detalles adicionales para la solicitud.',
      defaultPriorityName: 'Baja'
    }
  ];

  for (const ticketType of ticketTypes) {
    const data = {
      description: ticketType.description,
      defaultPriorityId: findPriorityId(ticketType.defaultPriorityName),
      isActive: true
    };

    const existing = await prisma.ticketType.findFirst({ where: { name: ticketType.name } });
    if (existing) {
      await prisma.ticketType.update({ where: { id: existing.id }, data });
      continue;
    }

    await prisma.ticketType.create({
      data: {
        name: ticketType.name,
        ...data
      }
    });
  }

  const adminTypeId = findUserTypeId('ADMIN');
  const techTypeId = findUserTypeId('TECH');
  const requesterTypeId = findUserTypeId('REQUESTER');

  if (!adminTypeId || !techTypeId || !requesterTypeId) {
    throw new Error('No se pudieron crear los user types base.');
  }

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const users = [
    { firstName: 'Admin', lastName: 'Principal', email: 'admin@local.test', userTypeId: adminTypeId },
    { firstName: 'Lucía', lastName: 'Ops', email: 'tech1@local.test', userTypeId: techTypeId },
    { firstName: 'Martín', lastName: 'Soporte', email: 'tech2@local.test', userTypeId: techTypeId },
    { firstName: 'Elena', lastName: 'Infra', email: 'tech3@local.test', userTypeId: techTypeId },
    { firstName: 'Diego', lastName: 'Apps', email: 'tech4@local.test', userTypeId: techTypeId },
    { firstName: 'Carla', lastName: 'QA', email: 'tech5@local.test', userTypeId: techTypeId },
    { firstName: 'Rafa', lastName: 'Requester', email: 'requester1@local.test', userTypeId: requesterTypeId },
    { firstName: 'Paula', lastName: 'Requester', email: 'requester2@local.test', userTypeId: requesterTypeId }
  ];

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: { ...user, passwordHash, isActive: true },
      create: { ...user, passwordHash, isActive: true }
    });
  }

  await prisma.setting.upsert({
    where: { key: 'HEADER_COLOR' },
    update: { value: '#1f2937' },
    create: { key: 'HEADER_COLOR', value: '#1f2937' }
  });

  const allUsers = await prisma.user.findMany();
  const admins = allUsers.filter((user) => user.userTypeId === adminTypeId);
  const technicians = allUsers.filter((user) => user.userTypeId === techTypeId);
  const requesters = allUsers.filter((user) => user.userTypeId === requesterTypeId);
  const ticketTypeRecords = await prisma.ticketType.findMany();

  if (!admins.length || !technicians.length || !requesters.length || !ticketTypeRecords.length) {
    throw new Error('No hay datos base suficientes para crear tickets de ejemplo.');
  }

  const openStatusPool = ['Nuevo', 'En progreso', 'En espera']
    .map((name) => statusRecords.find((status) => status.name === name))
    .filter((status): status is NonNullable<typeof status> => Boolean(status));

  const closedStatusPool = ['Resuelto', 'Cerrado']
    .map((name) => statusRecords.find((status) => status.name === name))
    .filter((status): status is NonNullable<typeof status> => Boolean(status));

  if (!openStatusPool.length || !closedStatusPool.length) {
    throw new Error('Los estados abiertos/cerrados requeridos no existen.');
  }

  const openTicketsTarget = Math.floor(TOTAL_TICKETS * OPEN_RATIO);
  const resolvedTicketsTarget = TOTAL_TICKETS - openTicketsTarget;

  const createdTickets = [];

  for (let index = 0; index < TOTAL_TICKETS; index += 1) {
    const isResolved = index >= openTicketsTarget;
    const createdAt = randomDateWithinLastDays(DAYS_WINDOW);
    const resolvedAt = isResolved ? buildResolvedDate(createdAt) : null;

    const ticket = await prisma.ticket.create({
      data: {
        code: null,
        title: index === 0 ? 'EJEMPLO' : `EJEMPLO ${index + 1}`,
        description: `Ticket de ejemplo ${index + 1} para poblar métricas del dashboard.`,
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
    const updatedTicket = await prisma.ticket.update({ where: { id: ticket.id }, data: { code } });
    createdTickets.push(updatedTicket);

    const historyEvents = isResolved ? randomInt(2, 4) : randomInt(1, 3);
    for (let step = 0; step < historyEvents; step += 1) {
      const eventAt = new Date(createdAt.getTime() + step * randomInt(30, 360) * 60 * 1000);
      await prisma.ticketHistory.create({
        data: {
          ticketId: ticket.id,
          actorId: randomItem([...admins, ...technicians]).id,
          eventType: step === 0 ? 'CREATED' : 'STATUS_CHANGED',
          message: step === 0 ? 'Ticket creado desde seed.' : 'Cambio de estado simulado.',
          dataJson: step === 0 ? null : JSON.stringify({ from: 'Nuevo', to: isResolved ? 'Resuelto' : 'En progreso' }),
          createdAt: eventAt
        }
      });
    }
  }

  const openTickets = createdTickets.filter((ticket) => ticket.resolvedAt === null);
  const infoRequestSample = openTickets.slice(0, 12);
  for (const ticket of infoRequestSample) {
    const requesterTech = randomItem(technicians);
    const request = await prisma.infoRequest.create({
      data: {
        ticketId: ticket.id,
        requesterTechId: requesterTech.id,
        message: 'Favor compartir capturas y pasos para reproducir.',
        requestedFields: 'capturas,pasos,error',
        status: Math.random() < 0.5 ? 'OPEN' : 'CLOSED',
        createdAt: new Date(ticket.createdAt.getTime() + randomInt(60, 720) * 60 * 1000),
        closedAt: Math.random() < 0.5 ? new Date() : null
      }
    });

    if (Math.random() < 0.7) {
      await prisma.infoResponse.create({
        data: {
          infoRequestId: request.id,
          responderId: randomItem(requesters).id,
          message: 'Adjunto detalles y pasos solicitados.',
          createdAt: new Date(request.createdAt.getTime() + randomInt(20, 360) * 60 * 1000)
        }
      });
    }
  }

  console.log(`✅ Seed completado: ${TOTAL_TICKETS} tickets (${openTicketsTarget} abiertos, ${resolvedTicketsTarget} resueltos/cerrados).`);
  console.log(`✅ Ejemplo de código generado: ${formatTicketCode(1)}.`);
  console.log(`✅ Status disponibles: ${statusRecords.map((status) => `${status.name}(${findStatusId(status.name)})`).join(', ')}.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
