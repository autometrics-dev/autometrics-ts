// @ts-ignore
import express from "express";

function sleep(n: number) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

const app = express();

/**
 * @autometrics
 */
app.get("/", function root_route(req, res) {
	console.log("request made");
	if (Math.floor(Math.random() * 100) > 98) {
		// return error code
		res.status(500).send("error!");
	}
	// make it slow an additional 2% of the time
	else if (Math.floor(Math.random() * 100) > 98) {
		// delay for a bit
		sleep(10000);
		// record response latency
		res.status(200).send("delayed success in");
	}
	// record latency and respond right away
	else {
		sleep(Math.floor(Math.random() * 1000));
		res.status(200).send("did not delay - success");
	}
});

app.listen(8080, () => console.log(`Example app listening on port 8080!`));

const https = require("https");
let url = "https://docs.aws.amazon.com/lambda/latest/dg/welcome.html";

/**
 * @autometrics
 */
exports.handler = async function (event) {
	const promise = new Promise(function (resolve, reject) {
		https
			.get(url, (res) => {
				resolve(res.statusCode);
			})
			.on("error", (e) => {
				reject(Error(e));
			});
	});
	return promise;
};

/**
 * @autometrics
 */
export const handler: Handler = async (event, context) => {
	if (!event.body) {
		return { statusCode: 403, body: "No payload supplied" };
	}

	const payload: TemplatePayload = JSON.parse(event.body);

	const response = await fetch(FIBERPLANE_TEMPLATE_URL, {
		headers: {
			"content-type": "application/json",
		},
		method: "POST",
		body: JSON.stringify(payload),
	});

	const data: TemplateResponse = (await response.json()) as TemplateResponse;

	return {
		statusCode: 200,
		body: data.notebookUrl,
	};
};
