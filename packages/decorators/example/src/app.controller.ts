import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import autometrics from "autometricsjs"

@Controller()
export class AppController {
	constructor(private readonly appService: AppService) { }

	@Get()
	@autometrics
	/**
	 * @autometrics
	 */
	getHello(): string {
		return this.appService.getHello();
	}

	@Get("/check")
	@autometrics
	getCheck(): string {
		return this.appService.getCheck();
	}

	@Get("/error")
	@autometrics
	getError(): string {
		return this.appService.getError();
	}
}
