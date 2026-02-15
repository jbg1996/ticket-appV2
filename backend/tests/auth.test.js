import { describe, it, beforeAll, afterAll, expect } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import prisma from '../src/prisma/client.js';
import app from '../src/index.js';
const testUser = {
    firstName: 'Test',
    lastName: 'Admin',
    email: 'admin@test.local',
    password: 'Password123!',
    role: 'ADMIN'
};
beforeAll(async () => {
    const adminType = await prisma.userType.create({ data: { name: 'Administrador', code: 'ADMIN' } });
    await prisma.user.create({
        data: {
            firstName: testUser.firstName,
            lastName: testUser.lastName,
            email: testUser.email,
            passwordHash: await bcrypt.hash(testUser.password, 10),
            userTypeId: adminType.id
        }
    });
});
afterAll(async () => {
    await prisma.user.deleteMany();
    await prisma.userType.deleteMany();
    await prisma.$disconnect();
});
describe('Auth login', () => {
    it('logs in with valid credentials', async () => {
        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: testUser.email, password: testUser.password });
        expect(response.status).toBe(200);
        expect(response.body.token).toBeTruthy();
    });
});
