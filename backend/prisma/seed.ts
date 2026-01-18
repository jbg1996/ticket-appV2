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

  const priorities = await prisma.priority.createMany({
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
  const passwordHash = await bcrypt.hash('Admin123!', 10);

  if (adminType) {
    await prisma.user.create({
      data: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@local.test',
        passwordHash,
        userTypeId: adminType.id,
        isActive: true
      }
    });
  }

  await prisma.setting.create({
    data: {
      key: 'HEADER_COLOR',
      value: '#1f2937'
    }
  });

  console.log('Seed data created', priorities);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
