import express from "express";


function sleep(n: number) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

const app = express();

const port = 80;

/**
 * @autometrics
 */
function root_route(req: express.Request, res: express.Response) {
	console.log("request made");
	const a = 1;
	sleep(Math.floor(Math.random() * 1000));
	if (a == 1) {
		return res.status(204)
	} else {
		return res.status(200).send("did not delay - success");
	}
}

app.get("/", (req, res) => root_route(req, res));

app.listen(port, () => console.log(`Example app listening on port ${port}!`));
