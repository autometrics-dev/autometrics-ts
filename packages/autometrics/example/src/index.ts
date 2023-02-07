import express from "express";
import { autometrics } from "autometrics";

const app = express();

const port = 8080;

const rootRoute = (req: express.Request, res: express.Response) => {
	console.log("request made");
	return res.status(200).send("did not delay - success");
};

const anotherRoute = autometrics(function anotherRoute(
	req: express.Request,
	res: express.Response,
) {
	console.log("request made");
	return res.status(200).send("did not delay - success");
});

function badRoute(req: express.Request, res: express.Response) {
	console.log("bad route request made");
	throw new Error("Bad request");
}

async function asyncRoute(req: express.Request, res: express.Response) {
	console.log("async route request made");
	const result = autometrics(asyncCall); // works with async
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
	console.log(result);
	return result;
	// Expected output: "resolved"
}

app.get("/", autometrics(rootRoute));
app.get("/another", (req, res) => anotherRoute(req, res));
app.get("/bad", (req, res) => badRouteMetrics(req, res));
app.get("/async", async (req, res) => asyncRouteMetrics(req, res));

const rootRouteMetrics = autometrics(rootRoute);
const badRouteMetrics = autometrics(badRoute);
const asyncRouteMetrics = autometrics(asyncRoute);

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
