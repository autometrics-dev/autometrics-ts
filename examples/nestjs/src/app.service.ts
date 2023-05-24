import { Autometrics } from '@autometrics/autometrics';
import { Injectable } from '@nestjs/common';

@Injectable()
@Autometrics()
export class AppService {
  getHello(): string {
    return 'Hello World!';
  }
}
