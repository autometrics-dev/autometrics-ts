import { fastify, FastifyReply, FastifyRequest } from "fastify";
import { autometrics } from "@autometrics/autometrics";
import { PrismaClient } from "@prisma/client";

const port = 8080;
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

async function createTulip(tulip: Tulip) {
  return prisma.tulip.create({
    data: tulip,
  });
}

// Example internal function calling a database instrumented with autometrics
const createTulipWithMetrics = autometrics(createTulip);

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

async function generateRandomTraffic() {
  const loopTimes = Math.floor(Math.random() * 30 + 20);
  const http = await import("http");

  for (let i = 0; i < loopTimes; i++) {
    const type = Math.floor(Math.random() * 2);

    switch (type) {
      case 0: {
        await fetch("http://localhost:8080/tulips/");
        break;
      }

      case 1: {
        await fetch("http://localhost:8080/tulips/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: "Abernathy", price: 2.5 }),
        });
        break;
      }

      default:
        break;
    }
  }
}

// We delay firing the sample traffic 1s to ensure
// Prometheus can pick up the newly registered metrics
setTimeout(() => generateRandomTraffic(), 1000);

