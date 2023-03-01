## Express + Autometrics example

Simple Express API instrumented with Autometrics

### Running the example

To see autometrics in action:

0. Clone the repo

1. Install Prometheus

```shell
brew install prometheus
```

2. Run Prometheus from the root of the repo

```shell
prometheus --config.file=$(pwd)/examples/util/prometheus.yml
```

Flag `--config.file` must point to the `prometheus.yml` configuration file
(example provided in the `util/` directory)

3. Install the dependencies

```shell
npm install
```

4. Build and run the application

```shell
npm run build
```

```shell
npm run start
```

5. Run `generate_traffic.sh` script to generate some traffic to the example
	 application

```shell
examples/util/generate_traffic.sh
```

6. Open the example in VScode (or your editor of choice):

```shell
code examples/express/
```

7. Hover over the `autometrics(...)` wrapped functions to see the generated
	 query links for request, error rates and latency. Click on them to jump
	 straight to the Prometheus chart
