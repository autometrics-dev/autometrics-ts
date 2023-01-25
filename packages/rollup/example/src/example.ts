import express, { Express, Request, Response } from "express";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { MeterProvider } from "@opentelemetry/sdk-metrics";

function sleep(n: number) {
	Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}

const app: Express = express();

// set up prometheus
const prometheusOptions = { port: 9090, startServer: true };
const exporter = new PrometheusExporter(prometheusOptions);

// set up meter

const meterProvider = new MeterProvider();
meterProvider.addMetricReader(exporter);
const meter = meterProvider.getMeter("example-prometheus");


// set metric values on request

app.get("/", (req: Request, res: Response) => {
	const histogram = meter.createHistogram("root_duration_seconds")
	console.log(req);
	// start latency timer
	const requestReceived = new Date().getTime();
	console.log("request made");
	// increment total requests counter
	// return an error 2% of the time
	if (Math.floor(Math.random() * 100) > 98) {
		// increment error counter
		// return error code
		res.status(500).send("error!");
	}
	// make it slow an additional 2% of the time
	else if (Math.floor(Math.random() * 100) > 98) {
		// delay for a bit
		sleep(10000);
		// record response latency
		const measuredLatency = new Date().getTime() - requestReceived;
		histogram.record(measuredLatency, { "hi": "check" });
		res.status(200).send("delayed success in " + measuredLatency + " ms");
	}
	// record latency and respond right away
	else {
		sleep(Math.floor(Math.random() * 1000));
		const measuredLatency = new Date().getTime() - requestReceived;
		histogram.record(measuredLatency, { "hi": "check" });
		res.status(200).send(
			"did not delay - success in " + measuredLatency + " ms"
		);
	}
});

app.listen(8080, () => console.log(`Example app listening on port 8080!`));
