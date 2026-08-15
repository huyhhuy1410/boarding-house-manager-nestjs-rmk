import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import { AppConfigService } from '../config/config.service';
type AuthenticatedRequest = Request & {
  user: {
    id: string;
    email?: string;
  };
};

@Injectable()
export class AuthGuard implements CanActivate {
  private readonly jwks;

  constructor(private readonly config: AppConfigService) {
    this.jwks = createRemoteJWKSet(
      new URL(`${config.supabaseUrl}/auth/v1/.well-known/jwks.json`),
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Bearer token is required.');
    }

    const token = authorization.slice('Bearer '.length).trim();

    if (!token) {
      throw new UnauthorizedException('Invalid access token.');
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: `${this.config.supabaseUrl}/auth/v1`,
        audience: 'authenticated',
      });

      if (typeof payload.sub !== 'string') {
        throw new UnauthorizedException('Invalid access token.');
      }

      request.user = {
        id: payload.sub,
        email: typeof payload.email === 'string' ? payload.email : undefined,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Invalid access token.');
    }
  }
}
