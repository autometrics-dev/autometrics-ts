"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = require("fastify");
const autometrics_1 = require("@autometrics/autometrics");
const port = 7000;
const server = (0, fastify_1.fastify)();
const opts = {
    schema: {
        response: {
            200: {
                type: "object",
                properties: {
                    body: {
                        type: "string"
                    }
                }
            }
        }
    }
};
function rootHandler(req, response) {
    return __awaiter(this, void 0, void 0, function* () {
        return { body: "Hello world" };
    });
}
server.get("/", opts, (0, autometrics_1.autometrics)(rootHandler));
const start = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield server.listen({ port: port });
        console.log(`Server started successfully on: ${port}`);
    }
    catch (err) {
        server.log.error(err);
        process.exit(1);
    }
});
start();
