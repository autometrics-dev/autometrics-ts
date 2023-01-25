'use strict';

var exporterPrometheus = require('@opentelemetry/exporter-prometheus');
var sdkMetrics = require('@opentelemetry/sdk-metrics');
var express = require('express');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var express__default = /*#__PURE__*/_interopDefaultLegacy(express);

const exporter = new exporterPrometheus.PrometheusExporter({ port: 8081 });
const meterProvider = new sdkMetrics.MeterProvider();
meterProvider.addMetricReader(exporter);
const meter = meterProvider.getMeter("example-prometheus");
function sleep(n) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, n);
}
const app = express__default["default"]();
const port = 80;
function root_route(req, res) {
    const __autometricsHistogram = meter.createHistogram("function.calls.duration", {
        description: "Autometrics histogram for tracking function calls"
    });
    const __autometricsStart = new Date().getTime();
    console.log("request made");
    sleep(Math.floor(Math.random() * 1000));
    {
        const __autometricsDuration = new Date().getTime() - __autometricsStart;
        __autometricsHistogram.record(__autometricsDuration, { "function": "root_route" });
        return res.status(204);
    }
}
app.get("/", (req, res) => root_route(req, res));
app.listen(port, () => console.log(`Example app listening on port ${port}!`));
