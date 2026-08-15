import { UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { jwtVerify } from 'jose';
import { AppConfigService } from '../config/config.service';
import { AuthGuard } from './auth.guard';

jest.mock('jose', () => ({
  createRemoteJWKSet: jest.fn(() => 'mock-jwks'),
  jwtVerify: jest.fn(),
}));

type MockRequest = {
  headers: { authorization?: string };
  user?: { id: string; email?: string };
};

const mockedJwtVerify = jest.mocked(jwtVerify);

const createContext = (request: MockRequest) => ({
  switchToHttp: () => ({
    getRequest: () => request,
  }),
});

describe('AuthGuard', () => {
  let guard: AuthGuard;

  beforeEach(async () => {
    mockedJwtVerify.mockReset();

    const module = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: AppConfigService,
          useValue: { supabaseUrl: 'https://example.supabase.co' },
        },
      ],
    }).compile();

    guard = module.get(AuthGuard);
  });

  it('is defined', () => {
    expect(guard).toBeDefined();
  });

  it.each([
    undefined,
    '',
    'Basic token',
  ])('rejects an authorization header without a Bearer token: %s', async (authorization) => {
    const request: MockRequest = { headers: { authorization } };

    await expect(guard.canActivate(createContext(request) as never)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(mockedJwtVerify).not.toHaveBeenCalled();
  });

  it('rejects an empty Bearer token', async () => {
    const request: MockRequest = { headers: { authorization: 'Bearer   ' } };

    await expect(guard.canActivate(createContext(request) as never)).rejects.toThrow('Invalid access token.');
    expect(mockedJwtVerify).not.toHaveBeenCalled();
  });

  it('verifies a valid token and attaches the authenticated user to the request', async () => {
    mockedJwtVerify.mockResolvedValue({
      payload: { sub: 'auth-user-1', email: 'owner@example.com' },
      protectedHeader: {},
    } as never);
    const request: MockRequest = { headers: { authorization: 'Bearer valid-token' } };

    await expect(guard.canActivate(createContext(request) as never)).resolves.toBe(true);
    expect(mockedJwtVerify).toHaveBeenCalledWith(
      'valid-token',
      'mock-jwks',
      {
        issuer: 'https://example.supabase.co/auth/v1',
        audience: 'authenticated',
      },
    );
    expect(request.user).toEqual({ id: 'auth-user-1', email: 'owner@example.com' });
  });

  it('attaches no email when the token email claim is absent', async () => {
    mockedJwtVerify.mockResolvedValue({ payload: { sub: 'auth-user-1' } } as never);
    const request: MockRequest = { headers: { authorization: 'Bearer valid-token' } };

    await expect(guard.canActivate(createContext(request) as never)).resolves.toBe(true);
    expect(request.user).toEqual({ id: 'auth-user-1', email: undefined });
  });

  it('rejects a token without a subject claim', async () => {
    mockedJwtVerify.mockResolvedValue({ payload: { email: 'owner@example.com' } } as never);
    const request: MockRequest = { headers: { authorization: 'Bearer token-without-sub' } };

    await expect(guard.canActivate(createContext(request) as never)).rejects.toThrow('Invalid access token.');
    expect(request.user).toBeUndefined();
  });

  it('rejects an invalid or expired token', async () => {
    mockedJwtVerify.mockRejectedValue(new Error('JWT expired'));
    const request: MockRequest = { headers: { authorization: 'Bearer expired-token' } };

    await expect(guard.canActivate(createContext(request) as never)).rejects.toThrow('Invalid access token.');
    expect(request.user).toBeUndefined();
  });
});
