import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type NodeEnvironment = 'development' | 'test' | 'production';

@Injectable()
export class AppConfigService {
  readonly nodeEnv: NodeEnvironment;
  readonly port: number;
  readonly corsOrigins: string[];
  readonly databaseUrl: string;
  readonly supabaseUrl: string;
  constructor(private readonly config: ConfigService) {
    this.nodeEnv = this.readNodeEnvironment();
    this.port = this.readPort();
    this.corsOrigins = this.readCorsOrigins();
    this.databaseUrl = this.readDatabaseUrl();
    this.supabaseUrl = this.readSupabaseUrl();
  }
  private readSupabaseUrl(): string {
    const supabaseUrl = this.config.get<string>('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL must be set.');
    }

    let url: URL;

    try {
      url = new URL(supabaseUrl);
    } catch {
      throw new Error('SUPABASE_URL must be a valid URL.');
    }

    if (url.protocol !== 'https:') {
      throw new Error('SUPABASE_URL must use HTTPS.');
    }

    return url.origin;
  }
  private readDatabaseUrl(): string {
    const databaseUrl = this.config.get<string>('DATABASE_URL');

    if (!databaseUrl) {
      throw new Error('DATABASE_URL must be set.');
    }

    const protocol = new URL(databaseUrl).protocol;

    if (!['postgres:', 'postgresql:'].includes(protocol)) {
      throw new Error('DATABASE_URL must be a PostgreSQL connection URL.');
    }

    return databaseUrl;
  }
  private readNodeEnvironment(): NodeEnvironment {
    const nodeEnv = this.config.get<string>('NODE_ENV') ?? 'development';

    if (!['development', 'test', 'production'].includes(nodeEnv)) {
      throw new Error('NODE_ENV must be development, test, or production.');
    }

    return nodeEnv as NodeEnvironment;
  }

  private readPort(): number {
    const value = this.config.get<string>('PORT') ?? '3000';
    const port = Number(value);

    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      throw new Error('PORT must be an integer between 1 and 65535.');
    }

    return port;
  }

  private readCorsOrigins(): string[] {
    const configuredOrigins = this.config.get<string>('CORS_ORIGINS');

    if (!configuredOrigins) {
      if (this.nodeEnv === 'production') {
        throw new Error('CORS_ORIGINS must be set in production.');
      }

      return ['http://localhost:5173'];
    }

    const originValues = configuredOrigins
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);

    if (!originValues.length || originValues.some((origin) => origin === '*')) {
      throw new Error('CORS_ORIGINS must contain explicit origins, never *.');
    }

    const origins = originValues.map((origin) => {
      let url: URL;

      try {
        url = new URL(origin);
      } catch {
        throw new Error(`CORS_ORIGINS contains an invalid origin: ${origin}.`);
      }

      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.pathname !== '/' ||
        url.search ||
        url.hash
      ) {
        throw new Error(
          `CORS_ORIGINS must contain HTTP(S) origins only: ${origin}.`,
        );
      }

      return url.origin;
    });

    return [...new Set(origins)];
  }
}
