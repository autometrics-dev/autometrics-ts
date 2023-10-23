import { Context, Hono } from "hono";
import { logger } from "hono/logger";
import { AutometricsLegacy, autometrics } from "@autometrics/autometrics";
import { init } from "@autometrics/exporter-otlp-http";

init({
  url: "http://0.0.0.0:4317/v1/metrics",
});

const app = new Hono();

@AutometricsLegacy()
class dbClient {
  async connect() {
    // delay for 100ms
    await new Promise((resolve) => setTimeout(resolve, 100));

    //maybe fail (less than 20% chance)

    if (Math.random() < 0.2) {
      return false;
    }

    return true;
  }

  async query() {
    // delay for 150ms
    await new Promise((resolve) => setTimeout(resolve, 150));
    return true;
  }
}

const db = new dbClient();

async function rootHandler(ctx: Context) {
  const connected = await db.connect();

  if (!connected) {
    return ctx.json({ ok: false, message: "Database connection failed" });
  }

  const result = await db.query();

  if (!result) {
    return ctx.json({ ok: false, message: "Database query failed" });
  }

  return ctx.json({ ok: true, message: "Hello world" });
}

app.use("*", logger());
app.get("/", autometrics(rootHandler));

export default app;
