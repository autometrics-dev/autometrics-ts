import { autometricsDecorator as autometrics } from '@autometrics/autometrics';
import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  @autometrics
  getHello(): string {
    return 'Hello World!';
  }
}
