import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { Server } from 'http';
import { AppConfigService } from './../src/config/config.service';
import { PrismaService } from './../src/prisma/prisma.service';

// Mapped type over the class: keyof only picks up PUBLIC members, so this
// forces the mock to declare every config field the app reads. Add a new
// field to AppConfigService and this object stops compiling until it is here.
type AppConfigMock = { [K in keyof AppConfigService]: AppConfigService[K] };

const appConfigMock: AppConfigMock = {
  nodeEnv: 'test',
  port: 3000,
  corsOrigins: ['http://localhost:5173'],
  databaseUrl: 'postgresql://test:test@localhost:5432/test',
  // AuthGuard builds a JWKS URL from this in its constructor. Nest instantiates
  // providers eagerly, so it must be a valid URL even for tests that never
  // touch a guarded route. createRemoteJWKSet is lazy — no network call here.
  supabaseUrl: 'https://example.supabase.co',
};

describe('HealthController (e2e)', () => {
  let app: INestApplication<Server> | undefined;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AppConfigService)
      .useValue(appConfigMock)
      .overrideProvider(PrismaService)
      .useValue({
        $connect: jest.fn(),
        $disconnect: jest.fn(),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/health (GET)', () => {
    return request(app!.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok' });
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
