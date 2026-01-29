import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const userTypes = [
    { name: 'Administrador', code: 'ADMIN' },
    { name: 'Técnico', code: 'TECH' },
    { name: 'Solicitante', code: 'REQUESTER' }
  ];

  await prisma.attachment.deleteMany();
  await prisma.ticketHistory.deleteMany();
  await prisma.infoResponse.deleteMany();
  await prisma.infoRequest.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.report.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.user.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.status.deleteMany();
  await prisma.priority.deleteMany();
  await prisma.userType.deleteMany();

  const createdUserTypes = await Promise.all(
    userTypes.map((type) => prisma.userType.create({ data: type }))
  );

  await prisma.priority.createMany({
    data: [
      { name: 'Baja', color: '#16a34a' },
      { name: 'Media', color: '#2563eb' },
      { name: 'Alta', color: '#f97316' },
      { name: 'Crítica', color: '#dc2626' }
    ]
  });

  const priorityRecords = await prisma.priority.findMany();

  await prisma.status.createMany({
    data: [
      { name: 'Nuevo', sortOrder: 1 },
      { name: 'En progreso', sortOrder: 2 },
      { name: 'En espera', sortOrder: 3 },
      { name: 'Resuelto', sortOrder: 4 },
      { name: 'Cerrado', sortOrder: 5 }
    ]
  });

  const getPriorityId = (name: string) => priorityRecords.find((p) => p.name === name)?.id ?? priorityRecords[0].id;

  await prisma.ticketType.createMany({
    data: [
      {
        name: 'INCIDENCIA',
        description: 'Describe el incidente y cómo afecta tu trabajo.',
        defaultPriorityId: getPriorityId('Alta'),
        isActive: true
      },
      {
        name: 'PETICIÓN',
        description: 'Describe la solicitud y el resultado esperado.',
        defaultPriorityId: getPriorityId('Media'),
        isActive: true
      },
      {
        name: 'ACCESO',
        description: 'Indica el sistema y el nivel de acceso requerido.',
        defaultPriorityId: getPriorityId('Media'),
        isActive: true
      },
      {
        name: 'HARDWARE',
        description: 'Describe el equipo y la falla reportada.',
        defaultPriorityId: getPriorityId('Alta'),
        isActive: true
      },
      {
        name: 'SOFTWARE',
        description: 'Indica la aplicación y los detalles del problema.',
        defaultPriorityId: getPriorityId('Media'),
        isActive: true
      },
      {
        name: 'OTROS',
        description: 'Proporciona detalles adicionales para la solicitud.',
        defaultPriorityId: getPriorityId('Baja'),
        isActive: true
      }
    ]
  });

  const adminType = createdUserTypes.find((type) => type.code === 'ADMIN');
  const techType = createdUserTypes.find((type) => type.code === 'TECH');
  const requesterType = createdUserTypes.find((type) => type.code === 'REQUESTER');
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const [adminUser, techUser, requesterUser] = await Promise.all([
    adminType
      ? prisma.user.create({
          data: {
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@local.test',
            passwordHash,
            userTypeId: adminType.id,
            isActive: true
          }
        })
      : null,
    techType
      ? prisma.user.create({
          data: {
            firstName: 'Tania',
            lastName: 'Tech',
            email: 'tech@local.test',
            passwordHash,
            userTypeId: techType.id,
            isActive: true
          }
        })
      : null,
    requesterType
      ? prisma.user.create({
          data: {
            firstName: 'Rafa',
            lastName: 'Requester',
            email: 'requester@local.test',
            passwordHash,
            userTypeId: requesterType.id,
            isActive: true
          }
        })
      : null
  ]);

  await prisma.setting.create({
    data: {
      key: 'HEADER_COLOR',
      value: '#1f2937'
    }
  });

  const statusRecords = await prisma.status.findMany();
  const ticketTypes = await prisma.ticketType.findMany();

  const getStatusId = (name: string) => statusRecords.find((status) => status.name === name)?.id ?? statusRecords[0].id;
  const getTypeId = (name: string) => ticketTypes.find((type) => type.name === name)?.id ?? ticketTypes[0].id;

  if (adminUser && requesterUser) {
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

  console.log('Seed data created');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
