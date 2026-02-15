import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEFAULT_STATUS_COLOR = '#9CA3AF';

async function main() {
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
    const existingUserType = await prisma.userType.findFirst({ where: { code: userType.code } });
    if (existingUserType) {
      await prisma.userType.update({
        where: { id: existingUserType.id },
        data: { name: userType.name }
      });
      continue;
    }
    await prisma.userType.create({ data: userType });
  }

  for (const priority of priorities) {
    const existingPriority = await prisma.priority.findFirst({ where: { name: priority.name } });
    if (existingPriority) {
      await prisma.priority.update({
        where: { id: existingPriority.id },
        data: { color: priority.color }
      });
      continue;
    }
    await prisma.priority.create({ data: priority });
  }

  let createdStatuses = 0;
  let updatedStatuses = 0;
  for (const status of statuses) {
    const existing = await prisma.status.findFirst({ where: { name: status.name } });
    if (!existing) {
      await prisma.status.create({ data: status });
      createdStatuses += 1;
      continue;
    }
    await prisma.status.update({
      where: { id: existing.id },
      data: { sortOrder: status.sortOrder, color: status.color || DEFAULT_STATUS_COLOR }
    });
    updatedStatuses += 1;
  }

  const createdUserTypes = await prisma.userType.findMany();
  const priorityRecords = await prisma.priority.findMany();

  const getPriorityId = (name: string) => priorityRecords.find((p) => p.name === name)?.id ?? priorityRecords[0].id;

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
      description: 'Indica el sistema y el nivel de acceso requerid:.',
      defaultPriorityName: 'Media'
    },
    {
      name: 'HARDWARE',
      description: 'Describe el equipo y la falla reportada:',
      defaultPriorityName: 'Alta'
    },
    {
      name: 'SOFTWARE',
      description: 'Indica la aplicación y los detalles del problema:',
      defaultPriorityName: 'Media'
    },
    {
      name: 'OTROS',
      description: 'Proporciona detalles adicionales para la solicitud.',
      defaultPriorityName: 'Baja'
    }
  ];

  for (const ticketType of ticketTypes) {
    const existingTicketType = await prisma.ticketType.findFirst({ where: { name: ticketType.name } });
    const ticketTypeData = {
      description: ticketType.description,
      defaultPriorityId: getPriorityId(ticketType.defaultPriorityName),
      isActive: true
    };

    if (existingTicketType) {
      await prisma.ticketType.update({
        where: { id: existingTicketType.id },
        data: ticketTypeData
      });
      continue;
    }

    await prisma.ticketType.create({
      data: {
        name: ticketType.name,
        ...ticketTypeData
      }
    });
  }

  const adminType = createdUserTypes.find((type) => type.code === 'ADMIN');
  const techType = createdUserTypes.find((type) => type.code === 'TECH');
  const requesterType = createdUserTypes.find((type) => type.code === 'REQUESTER');
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const users = [
    {
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@local.test',
      userTypeId: adminType?.id,
      isActive: true
    },
    {
      firstName: 'Tania',
      lastName: 'Tech',
      email: 'tech@local.test',
      userTypeId: techType?.id,
      isActive: true
    },
    {
      firstName: 'Rafa',
      lastName: 'Requester',
      email: 'requester@local.test',
      userTypeId: requesterType?.id,
      isActive: true
    }
  ];

  for (const user of users) {
    if (!user.userTypeId) continue;
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        userTypeId: user.userTypeId,
        isActive: user.isActive,
        passwordHash
      },
      create: {
        ...user,
        userTypeId: user.userTypeId,
        passwordHash
      }
    });
  }

  await prisma.setting.upsert({
    where: { key: 'HEADER_COLOR' },
    update: { value: '#1f2937' },
    create: {
      key: 'HEADER_COLOR',
      value: '#1f2937'
    }
  });

  const statusRecords = await prisma.status.findMany();
  const ticketTypeRecords = await prisma.ticketType.findMany();
  const requesterUser = await prisma.user.findUnique({ where: { email: 'requester@local.test' } });
  const techUser = await prisma.user.findUnique({ where: { email: 'tech@local.test' } });

  const getStatusId = (name: string) => statusRecords.find((status) => status.name === name)?.id ?? statusRecords[0].id;
  const getTypeId = (name: string) => ticketTypeRecords.find((type) => type.name === name)?.id ?? ticketTypeRecords[0].id;

  const ticketCount = await prisma.ticket.count();
  if (ticketCount === 0 && requesterUser) {
    await prisma.ticket.createMany({
      data: [
        {
          title: 'No puedo acceder al correo',
          description: 'Desde esta mañana aparece un error 403 al entrar en el webmail.',
          ticketTypeId: getTypeId('ACCESO'),
          priorityId: getPriorityId('Alta'),
          statusId: getStatusId('Nuevo'),
          createdById: requesterUser.id
        },
        {
          title: 'Solicitud de software de diseño',
          description: 'Necesito instalar la última versión de la suite de diseño para el equipo.',
          ticketTypeId: getTypeId('SOFTWARE'),
          priorityId: getPriorityId('Media'),
          statusId: getStatusId('En espera'),
          createdById: requesterUser.id,
          assignedToId: techUser?.id ?? null
        },
        {
          title: 'Portátil con pantalla en negro',
          description: 'El equipo no enciende, la pantalla se queda en negro.',
          ticketTypeId: getTypeId('HARDWARE'),
          priorityId: getPriorityId('Crítica'),
          statusId: getStatusId('En progreso'),
          createdById: requesterUser.id,
          assignedToId: techUser?.id ?? null
        }
      ]
    });
  }

  console.log(`Seed statuses: ${createdStatuses} created, ${updatedStatuses} updated.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
