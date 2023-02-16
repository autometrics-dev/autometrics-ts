import {
	fastify,
	FastifyReply,
	FastifyRequest,
	RouteShorthandOptions,
} from "fastify";
import { autometrics } from "@autometrics/autometrics";

const port = 7000;
const server = fastify();

const opts: RouteShorthandOptions = {
	schema: {
		response: {
			200: {
				type: "object",
				properties: {
					body: {
						type: "string",
					},
				},
			},
		},
	},
};

async function rootHandler(req: FastifyRequest, response: FastifyReply) {
	return { body: "Hello world" };
}

server.get("/", opts, autometrics(rootHandler));

const start = async () => {
	try {
		await server.listen({ port: port });
		console.log(`Server started successfully on: ${port}`);
	} catch (err) {
		server.log.error(err);
		process.exit(1);
	}
};

start();
