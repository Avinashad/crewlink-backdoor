import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import {
  OrganizationsService,
  OrganizationMembership,
} from '../src/organizations/organizations.service';
import { JwtAuthGuard } from '../src/auth/guards';

class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'org-admin-id', sub: 'org-admin-id' };
    return true;
  }
}

const sampleMembership: OrganizationMembership = {
  orgId: 'org-1',
  userId: 'worker-1',
  role: 'recruiter',
  status: 'pending',
  joinedAt: new Date().toISOString(),
};

class MockOrganizationsService {
  getUserMemberships = jest.fn(
    async (userId: string): Promise<OrganizationMembership[]> => [
      {
        orgId: 'org-1',
        userId,
        role: 'owner',
        status: 'active',
        joinedAt: new Date().toISOString(),
      },
      {
        orgId: 'org-2',
        userId,
        role: 'recruiter',
        status: 'pending',
        joinedAt: new Date().toISOString(),
      },
    ],
  );

  applyAsWorker = jest.fn(async (orgId: string, userId: string): Promise<void> => undefined);

  getPendingMembershipsForOrg = jest.fn(
    async (): Promise<
      Array<
        OrganizationMembership & {
          email: string;
          firstName?: string;
          lastName?: string;
        }
      >
    > => [
      {
        ...sampleMembership,
        email: 'worker@example.com',
        firstName: 'Worker',
        lastName: 'One',
      },
    ],
  );

  decidePendingMembership = jest.fn(
    async (
      orgId: string,
      memberUserId: string,
      decision: 'approve' | 'reject',
      currentUserId: string,
    ): Promise<void> => undefined,
  );
}

describe('Organizations membership & association flows (e2e)', () => {
  let app: INestApplication;
  let organizationsService: MockOrganizationsService;

  beforeAll(async () => {
    organizationsService = new MockOrganizationsService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OrganizationsService)
      .useValue(organizationsService)
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /organizations/me/memberships should return memberships for current user', async () => {
    const response = await request(app.getHttpServer())
      .get('/organizations/me/memberships')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toHaveProperty('orgId');
    expect(organizationsService.getUserMemberships).toHaveBeenCalledWith('org-admin-id');
  });

  it('POST /organizations/:id/apply-as-worker should create a pending association request', async () => {
    await request(app.getHttpServer())
      .post('/organizations/org-123/apply-as-worker')
      .set('Authorization', 'Bearer test-token')
      .expect(201)
      .expect({ message: 'Association request submitted successfully' });

    expect(organizationsService.applyAsWorker).toHaveBeenCalledWith('org-123', 'org-admin-id');
  });

  it('GET /organizations/:id/memberships/pending should return pending memberships', async () => {
    const response = await request(app.getHttpServer())
      .get('/organizations/org-1/memberships/pending')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body[0]).toMatchObject({
      orgId: 'org-1',
      email: 'worker@example.com',
      status: 'pending',
    });
    expect(organizationsService.getPendingMembershipsForOrg).toHaveBeenCalledWith(
      'org-1',
      'org-admin-id',
    );
  });

  it('PUT /organizations/:id/memberships/:userId/decision should approve or reject a pending membership', async () => {
    await request(app.getHttpServer())
      .put('/organizations/org-1/memberships/worker-1/decision')
      .set('Authorization', 'Bearer test-token')
      .send({ decision: 'approve' })
      .expect(200)
      .expect({ message: 'Membership updated successfully' });

    expect(organizationsService.decidePendingMembership).toHaveBeenCalledWith(
      'org-1',
      'worker-1',
      'approve',
      'org-admin-id',
    );
  });
});

