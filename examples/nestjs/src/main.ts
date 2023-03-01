import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(8080);
}
bootstrap();

async function generateRandomTraffic() {
  const loopTimes = Math.floor(Math.random() * 30 + 20);

  for (let i = 0; i < loopTimes; i++) {
    await fetch("http://localhost:8080/");
  }
}

// We delay firing the sample traffic 1s to ensure
// Prometheus can pick up the newly registered metrics
setTimeout(() => generateRandomTraffic(), 1000);

