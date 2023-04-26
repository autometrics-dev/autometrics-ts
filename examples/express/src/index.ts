import express from "express";
import { autometrics } from "@autometrics/autometrics";

const app = express();

const port = 8080;

const rootRoute = (req: express.Request, res: express.Response) => {
  console.log("Request made");
  return res.status(200).send("did not delay - success");
};

function badRoute(req: express.Request, res: express.Response) {
  console.log("Bad route request made");
  throw new Error("Bad request");
}

const badRouteMetrics = autometrics(badRoute);

async function asyncRoute(req: express.Request, res: express.Response) {
  console.log("Async route request made");
  const result = await asyncCall(); // works with async
  return res.status(200).send(result);
}

function resolveAfterHalfSecond(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("Function resolved");
    }, 500);
  });
}

async function asyncCall() {
  console.log("Calling async function");
  return await resolveAfterHalfSecond();
}

app.get("/", autometrics(rootRoute));
app.get("/bad", (req, res) => badRouteMetrics(req, res));
app.get("/async", autometrics(asyncRoute));

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

async function generateRandomTraffic() {
  const loopTimes = Math.floor(Math.random() * 30 + 20);
  const http = await import("http");

  for (let i = 0; i < loopTimes; i++) {
    const type = Math.floor(Math.random() * 3);

    switch (type) {
      case 0: {
        http.get("http://localhost:8080");
        break;
      }

      case 1: {
        http.get("http://localhost:8080/async");
        break;
      }

      case 2: {
        http.get("http://localhost:8080/bad");
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
