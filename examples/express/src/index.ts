import express from "express";
import { autometrics } from "@autometrics/autometrics";

const app = express();

const port = 8080;

function rootRoute(req: express.Request, res: express.Response) {
  console.log("Request made");
  return res.status(200).send("did not delay - success");
}

function badRoute(req: express.Request, res: express.Response) {
  console.log("Bad route request made");
  throw new Error("Bad request");
}

async function asyncRoute(req: express.Request, res: express.Response) {
  console.log("Async route request made");
  const result = await asyncCall();
  return res.status(200).send(result);
}

function resolveAfterHalfSecond(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("Function resolved");
    }, 500);
  });
}

const asyncCall = autometrics(async function asyncCall() {
  console.log("Calling async function");
  return await resolveAfterHalfSecond();
});

app.get("/", autometrics(rootRoute));
app.get("/bad", autometrics(badRoute));
app.get("/async", autometrics(asyncRoute));

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

async function generateRandomTraffic() {
  console.log("Generating random traffic");

  while (true) {
    const type = Math.floor(Math.random() * 3);

    const sleepDuration = Math.floor(Math.random() * 400 + 100);

    switch (type) {
      case 0: {
        await fetch("http://localhost:8080");
      }

      case 1: {
        await fetch("http://localhost:8080/async");
      }

      case 2: {
        await fetch("http://localhost:8080/bad");
      }
    }

    delay(sleepDuration);
  }
}

const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

// We delay firing the sample traffic 1s to ensure
// Prometheus can pick up the newly registered metrics
setTimeout(() => generateRandomTraffic(), 1000);
