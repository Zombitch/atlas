import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import { existsSync, readFileSync } from 'fs';
import helmet from 'helmet';
import { Request } from 'express';

function loadEnvFile(): void {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    let value = trimmed.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function loadPackageVersion(): string {
  const packageJsonPath = join(process.cwd(), 'package.json');
  if (!existsSync(packageJsonPath)) {
    return 'dev';
  }

  try {
    const packageJsonContent = readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent) as { version?: string };
    return packageJson.version ?? 'dev';
  } catch {
    return 'dev';
  }
}

async function bootstrap() {
  loadEnvFile();
  const assetVersion = loadPackageVersion();
  const { AppModule } = await import('./app.module');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const trustProxyHops = parseInt(process.env.TRUST_PROXY_HOPS || '0', 10);
  if (Number.isFinite(trustProxyHops) && trustProxyHops > 0) {
    app.set('trust proxy', trustProxyHops);
  }

  // Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'blob:'],
          objectSrc: ["'self'"],
          frameSrc: ["'self'"],
          connectSrc: ["'self'"],
        },
      },
      crossOriginEmbedderPolicy: false,
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );

  // EJS setup
  app.setBaseViewsDir(join(__dirname, '..', 'views'));
  app.setViewEngine('ejs');
  app.getHttpAdapter().getInstance().locals.assetVersion = assetVersion;

  // Static files
  app.useStaticAssets(join(__dirname, '..', 'public'));

  app.use((req: Request, res, next) => {
    const hasSecretInQuery = typeof req.query.secret === 'string';
    const hasSecretHeader =
      !!req.get('x-atlas-secret') || !!req.get('authorization');

    if (hasSecretInQuery || hasSecretHeader) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  });

  const allowedOrigins = (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.length > 0) {
    app.enableCors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Not allowed by CORS'));
      },
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Atlas-Secret'],
      credentials: false,
      maxAge: 600,
    });
  } else {
    app.enableCors({ origin: false });
  }

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(
    `Atlas running on port ${port} (${process.env.NODE_ENV || 'development'})`,
  );
}
bootstrap();
