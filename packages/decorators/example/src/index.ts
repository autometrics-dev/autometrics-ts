import express from "express";
import { autometrics } from "autometrics-decorators";

function sleep(n: number) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

const app = express();

const port = 8080;

function root_route(req: express.Request, res: express.Response) {
	console.log("request made");
	sleep(Math.floor(Math.random() * 10));
	return res.status(200).send("did not delay - success");
}

function bad_route(req: express.Request, res: express.Response) {
	console.log("bad route request made")
	sleep(Math.floor(Math.random() * 100));
	throw new Error("Bad request")

	return res.status(200).send("bad request")
}

function resolveAfter2Seconds() {
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
	// Expected output: "resolved"
}

const asyncCallMetrics = autometrics(asyncCall); // works with async

const root_route_instrumented = autometrics(root_route)
const bad_route_instrumented = autometrics(bad_route);

app.get("/", (req, res) => root_route_instrumented(req, res));
app.get("/bad", (req, res) => bad_route_instrumented(req, res));

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
