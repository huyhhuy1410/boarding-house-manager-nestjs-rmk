/**
 * Shared e2e harness.
 *
 * - Loads `.env.test` into process.env BEFORE Nest's ConfigModule runs, so the
 *   app connects to the test database and never falls back to `.env`
 *   (production) values. ConfigModule does not overwrite vars already present
 *   in process.env, so pre-loading is the guard that keeps e2e off prod.
 * - Overrides AuthGuard so tests need no real Supabase JWT: TestAuthGuard
 *   stamps `request.user` with a fixed authUserId.
 * - Exposes createTestApp(), resetDatabase(), createOwnerUser() and shared
 *   test-identity constants.
 */

import * as path from 'path';
import { config as loadEnvFile } from 'dotenv';
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/auth/auth.guard';
import { PrismaService } from '../src/prisma/prisma.service';
import { UserRole } from '../src/generated/prisma/enums';

// Load the test env file before anything imports the config module.
// `override: false` (default) keeps any real shell env vars — but ensures
// .env.test wins over .env for keys that only exist in files.
loadEnvFile({ path: path.resolve(__dirname, '../.env.test') });

// ── Test identity ───────────────────────────────────────────────────────────
// These authUserIds map to app `User` rows created by createOwnerUser().
// Two owners exist so ownership-isolation specs can prove one owner never
// sees another owner's data.
export const OWNER_AUTH_USER_ID = 'auth-owner-a';
export const OWNER_AUTH_USER_ID_B = 'auth-owner-b';
export const OWNER_EMAIL = 'owner-a@example.com';
export const OWNER_EMAIL_B = 'owner-b@example.com';

export const AUTH_USER_1 = OWNER_AUTH_USER_ID;
export const AUTH_USER_2 = OWNER_AUTH_USER_ID_B;

/**
 * Replaces the real AuthGuard (which verifies a Supabase JWT over the network)
 * with a stub. The authenticated owner is read from the `x-auth-user-id`
 * header (defaults to owner A), so ownership-isolation specs can impersonate
 * a second owner without touching Supabase.
 */
export class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      user: { id: string; email: string };
      headers: Record<string, string>;
    }>();

    const requestedId = request.headers['x-auth-user-id'];
    const isOwnerB = requestedId === OWNER_AUTH_USER_ID_B;
    request.user = {
      id: isOwnerB ? OWNER_AUTH_USER_ID_B : OWNER_AUTH_USER_ID,
      email: isOwnerB ? OWNER_EMAIL_B : OWNER_EMAIL,
    };
    return true;
  }
}

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(AuthGuard)
    .useClass(TestAuthGuard)
    .compile();

  const app = moduleFixture.createNestApplication();
  // Mirror the global pipes from src/main.ts so DTO validation behaves like
  // production (whitelist strips unknown keys, extra keys are rejected).
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  await app.init();
  return app;
}

export function getPrisma(app: INestApplication): PrismaService {
  return app.get(PrismaService);
}

/**
 * Truncate every table so each spec starts from a clean slate. One TRUNCATE
 * statement with CASCADE — fast and deterministic.
 *
 * Note: this is a deliberate trade-off. TRUNCATE gives per-test isolation
 * without transaction rollback, at the cost of wiping the database that
 * `.env.test` points at (shared with local dev). `jest-e2e.json` pins
 * maxWorkers to 1 so suites cannot truncate each other mid-run.
 */
export async function resetDatabase(app: INestApplication): Promise<void> {
  const prisma = getPrisma(app);
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE
       "InvoiceItem", "Invoice", "MeterReading", "MaintenanceRequest",
       "Expense", "Contract", "Tenant", "Room", "BoardingHouse", "User"
     RESTART IDENTITY CASCADE;`,
  );
}

/**
 * Create (or reuse) the app `User` row that requireApplicationUser() looks up.
 * Idempotent so beforeEach can call it without unique-constraint clashes.
 */
export async function createOwnerUser(
  app: INestApplication,
  authUserId: string,
  email: string,
) {
  const prisma = getPrisma(app);
  return prisma.user.upsert({
    where: { authUserId },
    update: {},
    create: {
      authUserId,
      email,
      name: email.split('@')[0],
      role: UserRole.OWNER,
    },
  });
}

/** Supertest instance bound to the running app. */
export const http = (app: INestApplication) => request(app.getHttpServer());
