import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Dietplan API')
    .setDescription('API for diet plan management')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('App')
    .addTag('foods')
    .addTag('auth')
    .addTag('patients')
    .addTag('patients/meal-plans', 'Meal plans for patients')
    .addTag('patients/anamnesis', 'Anamnesis for patients')
    .addTag('patients/energy-calculation', 'Energy calculation for patients')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: (a: string, b: string) => {
        const order = [
          'App',
          'foods',
          'auth',
          'patients',
          'patients/meal-plans',
          'patients/anamnesis',
          'patients/energy-calculation',
        ];
        const indexA = order.indexOf(a);
        const indexB = order.indexOf(b);
        // If not in order list, sort alphabetically
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      },
    },
    customfavIcon: 'https://unpkg.com/swagger-ui-dist@5/favicon-32x32.png',
    customCssUrl: 'https://unpkg.com/swagger-ui-dist@5/swagger-ui.css',
    customJs: [
      'https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js',
      'https://unpkg.com/swagger-ui-dist@5/swagger-ui-standalone-preset.js',
    ],
  });

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
