## Fastify API + Prisma + Autometrics example

This is a very simple example for an API built with Fastify and Prisma, and
instrumented with Autometrics.

### Running the example

To see autometrics in action:

0. Clone the repo

1. Install Prometheus

```shell
brew install prometheus
```

2. Run Prometheus from the root of the repo

```shell
prometheus --config.file=$(pwd)/examples/config/prometheus.yml
```

Flag `--config.file` must point to the `prometheus.yml` configuration file
(example provided in the `config/` directory)

3. Copy `.env.example` as `.env`

4. Install the dependencies

```shell
yarn
```

5. Run the initial migration

```shell
npx prisma migrate dev --name init
```

6. Generate the client

```shell
npx prisma generate
```

7. Build and run the application

```shell
yarn build && yarn start
```

The example should run and generate some sample traffic by itself

8. Open the example in VScode (or your editor of choice):

```shell
code examples/fastify/
```

9. Hover over the `autometrics(...)` wrapped functions to see the generated
	 query links for request, error rates and latency. Click on them to jump
	 straight to the Prometheus chart
