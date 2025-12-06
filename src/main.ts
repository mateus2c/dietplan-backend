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
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const tagsOrder = ['App', 'foods'];
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: (a: string, b: string) => {
        const ai = tagsOrder.indexOf(a);
        const bi = tagsOrder.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b);
      },
    },
  });

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
