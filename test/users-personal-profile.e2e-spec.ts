import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { UsersService, PersonalProfile, UserProfile } from '../src/users/users.service';
import { JwtAuthGuard } from '../src/auth/guards';

class MockJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    req.user = { id: 'test-user-id', sub: 'test-user-id' };
    return true;
  }
}

class MockUsersService {
  findById = jest.fn(async (userId: string): Promise<UserProfile | null> => ({
    id: userId,
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    phone: '+64211234567',
    userType: 'worker',
    countryCode: 'NZ',
    organisationType: undefined,
    emailVerified: true,
    phoneVerified: false,
    createdAt: new Date().toISOString(),
  }));

  findPersonalProfile = jest.fn(
    async (userId: string): Promise<PersonalProfile | null> => ({
      userId,
      displayName: 'Test User',
      dateOfBirth: '1990-01-01',
      countryCode: 'NZ',
      careNotes: null,
      isCareProfile: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );

  upsertPersonalProfile = jest.fn(
    async (
      userId: string,
      payload: Partial<Omit<PersonalProfile, 'userId' | 'createdAt' | 'updatedAt'>>,
    ): Promise<PersonalProfile> => ({
      userId,
      displayName: payload.displayName ?? 'Updated User',
      dateOfBirth: payload.dateOfBirth ?? '1990-01-01',
      countryCode: payload.countryCode ?? 'NZ',
      careNotes: payload.careNotes ?? null,
      isCareProfile: payload.isCareProfile ?? false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  );
}

describe('Users personal profile flows (e2e)', () => {
  let app: INestApplication;
  let usersService: MockUsersService;

  beforeAll(async () => {
    usersService = new MockUsersService();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue(usersService)
      .overrideGuard(JwtAuthGuard)
      .useClass(MockJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /users/me/personal-profile should return the current personal profile', async () => {
    const response = await request(app.getHttpServer())
      .get('/users/me/personal-profile')
      .set('Authorization', 'Bearer test-token')
      .expect(200);

    expect(response.body).toMatchObject({
      userId: 'test-user-id',
      displayName: 'Test User',
      countryCode: 'NZ',
    });
    expect(usersService.findPersonalProfile).toHaveBeenCalledWith('test-user-id');
  });

  it('PUT /users/me/personal-profile should upsert and return the updated personal profile', async () => {
    const payload = {
      displayName: 'Updated Name',
      careNotes: 'Updated care notes',
    };

    const response = await request(app.getHttpServer())
      .put('/users/me/personal-profile')
      .set('Authorization', 'Bearer test-token')
      .send(payload)
      .expect(200);

    expect(usersService.upsertPersonalProfile).toHaveBeenCalledWith('test-user-id', payload);
    expect(response.body).toMatchObject({
      userId: 'test-user-id',
      displayName: 'Updated Name',
    });
  });
});
