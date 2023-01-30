import { Injectable } from '@nestjs/common';
import { autometricsWrapper } from "autometrics-decorators"

@Injectable()
export class AppService {
	getHello(): string {
		return 'Hello World!';
	}

	getCheck(): string {
		const name = getNameWithMetrics()
		return `Hello ${name}`
	}

	getError(): string {
		throw new Error("oops")
	}
}

function getName(): string {
	return "John"
}

const getNameWithMetrics = autometricsWrapper(getName) 