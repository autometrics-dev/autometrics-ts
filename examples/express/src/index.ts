import express from "express";
import { autometrics } from "autometrics";

const app = express();

const port = 8080;

const rootRoute = (req: express.Request, res: express.Response) => {
  console.log("request made");
  return res.status(200).send("did not delay - success");
};

function badRoute(req: express.Request, res: express.Response) {
  console.log("bad route request made");
  throw new Error("Bad request");
}

async function asyncRoute(req: express.Request, res: express.Response) {
  console.log("async route request made");
  const result = await asyncCall(); // works with async
  return res.status(200).send(result);
}

function resolveAfter2Seconds(): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve("resolved");
    }, 2000);
  });
}

async function asyncCall() {
  console.log("calling");
  const result = await resolveAfter2Seconds();
  return result;
  // Expected output: "resolved"
}

app.get("/", autometrics(rootRoute));
app.get("/bad", (req, res) => badRouteMetrics(req, res));
app.get("/async", autometrics(asyncRoute));

const badRouteMetrics = autometrics(badRoute);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
