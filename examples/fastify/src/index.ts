import { fastify, FastifyReply, FastifyRequest } from "fastify";
import { autometrics } from "@autometrics/autometrics";
import { PrismaClient } from "@prisma/client";

const port = 7000;
const server = fastify();
const prisma = new PrismaClient();

interface Tulip {
  id: number;
  name: string;
  price: number;
}

async function getAllTulips() {
  return prisma.tulip.findMany();
}

async function handleGetAllTulips(req: FastifyRequest, res: FastifyReply) {
  const tulips = await getAllTulips();
  return {
    data: tulips,
  };
}

// Example internal function calling a database instrumented with autometrics
const createTulipWithMetrics = autometrics(async function createTulip(
  tulip: Tulip,
) {
  return prisma.tulip.create({
    data: tulip,
  });
});

async function handleCreateTulip(
  req: FastifyRequest<{ Body: Tulip }>,
  res: FastifyReply,
) {
  const tulip = req.body;
  const created = await createTulipWithMetrics(tulip);
  return created;
}

server.get(
  "/",
  async function healthcheck(req: FastifyRequest, res: FastifyReply) {
    return { body: "OK" };
  },
);

// Example handler instrumented with autometrics
server.get("/tulips/", autometrics(handleGetAllTulips));

server.post<{ Body: Tulip }>("/tulips/", handleCreateTulip);

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
