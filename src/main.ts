import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bodyParser: true,
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') || 5000;
  const frontendUrl = configService.get<string>('frontend.url') || 'http://localhost:3000';

  // Enable CORS - whitelist frontend ports (3000 for main app, 4000 for admin portal)
  app.enableCors({
    origin: [
      frontendUrl,
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:4000',
      'http://127.0.0.1:4000',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API prefix
  app.setGlobalPrefix('api');

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('CrewLink Backend API')
    .setDescription(
      'CrewLink Backend API for authentication, user management, and marketplace operations',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'Auth endpoints for login, signup, verification')
    .addTag('Users', 'User profile management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(port);
  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   CrewLink Backend API Server                                 ║
║                                                               ║
║   Server running at: http://localhost:${port}                   ║
║   Swagger docs at:   http://localhost:${port}/api/docs          ║
║   Frontend URL:      ${frontendUrl}                       ║
║                                                               ║
║   CORS enabled for: localhost:3000, localhost:4000            ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
  `);
}

bootstrap();
