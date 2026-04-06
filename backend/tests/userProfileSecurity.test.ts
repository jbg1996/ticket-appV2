import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import prisma from '../src/prisma/client.js';
import app from '../src/index.js';

let adminToken = '';
let targetUserId = 0;
const targetEmail = 'security-target@test.local';

beforeAll(async () => {
  const adminType = await prisma.userType.create({ data: { name: 'Admin', code: 'ADMIN' } });
  const requesterType = await prisma.userType.create({ data: { name: 'Requester', code: 'REQUESTER' } });

  await prisma.user.create({
    data: {
      firstName: 'Main',
      lastName: 'Admin',
      email: 'security-admin@test.local',
      passwordHash: await bcrypt.hash('Password123!', 10),
      userTypeId: adminType.id
    }
  });

  const targetUser = await prisma.user.create({
    data: {
      firstName: 'Target',
      lastName: 'User',
      email: targetEmail,
      passwordHash: await bcrypt.hash('Password123!', 10),
      userTypeId: requesterType.id
    }
  });
  targetUserId = targetUser.id;

  const loginResponse = await request(app)
    .post('/api/auth/login')
    .send({ email: 'security-admin@test.local', password: 'Password123!' });
  adminToken = loginResponse.body.token as string;
});

afterAll(async () => {
  await prisma.user.deleteMany();
  await prisma.userType.deleteMany();
  await prisma.$disconnect();
});

describe('User profile security', () => {
  it('blocks attempts to update user profile photos from the user update endpoint', async () => {
    const response = await request(app)
      .put(`/api/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ imageUrl: 'https://example.com/new-avatar.png' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('Profile photo cannot be updated from this endpoint.');
  });

  it('allows ADMIN to update another user password from edit endpoint', async () => {
    const updatedPassword = 'NextPass123!';

    const updateResponse = await request(app)
      .put(`/api/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ password: updatedPassword });

    expect(updateResponse.status).toBe(200);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: targetEmail, password: updatedPassword });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeTypeOf('string');
  });

  it('does not overwrite existing password when edit payload omits password', async () => {
    const stablePassword = 'NextPass123!';

    const updateResponse = await request(app)
      .put(`/api/users/${targetUserId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ firstName: 'TargetUpdated' });

    expect(updateResponse.status).toBe(200);

    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({ email: targetEmail, password: stablePassword });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.body.token).toBeTypeOf('string');
  });
});
