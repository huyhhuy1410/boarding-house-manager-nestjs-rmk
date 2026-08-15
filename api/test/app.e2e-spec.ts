import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module';
import { Server } from 'http';
import { AppConfigService } from './../src/config/config.service';
import { PrismaService } from './../src/prisma/prisma.service';
describe('HealthController (e2e)', () => {
  let app: INestApplication<Server> | undefined;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AppConfigService)
      .useValue({
        nodeEnv: 'test',
        port: 3000,
        corsOrigins: ['http://localhost:5173'],
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
      })
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
