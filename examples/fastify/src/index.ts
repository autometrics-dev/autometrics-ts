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

async function handleGetAllTulips(req: FastifyRequest, res: FastifyReply) {
  const tulips: Tulip[] = await prisma.tulip.findMany();
  return {
    data: tulips,
  };
}

async function handleCreateTulip(
  req: FastifyRequest<{ Body: Tulip }>,
  res: FastifyReply,
) {
  const tulip = req.body;
  const createdTulip = await prisma.tulip.create({
    data: tulip,
  });
  return createdTulip;
}

server.get(
  "/",
  async function healthcheck(req: FastifyRequest, res: FastifyReply) {
    return { body: "OK" };
  },
);

server.get("/tulips/", autometrics(handleGetAllTulips));

server.post<{ Body: Tulip }>("/tulip/", autometrics(handleCreateTulip));

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

