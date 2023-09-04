## Example React App set up with Vite.js and configured with Autometrics

Simple React App instrumented with Autometrics and using the OpenTelemetry
Collector.

### Running the example

To see Autometrics in action:

0. Clone this repo and make sure your terminal is inside `examples/react-app/`.

1. Install `am`.

Mac users can use Homebrew:

```sh
brew install autometrics-dev/tap/am
```

Others can download and install from the
[releases page](https://github.com/autometrics-dev/am/releases).

2. Start `am`:

```sh
am start :3000
```

This will start Prometheus (it will download it if necessary) and print the URL
for opening the Explorer UI. It will look something like:

> Explorer endpoint: http://127.0.0.1:6789

3. Start the OpenTelemetry Collector with the configuration from our `config/`
directory:

```sh
docker run --rm -it \
    --network host \
    -v `pwd`/../config:/conf \
    otel/opentelemetry-collector:0.83.0 \
    --config=/conf/otel-collector-config.yaml
```

4. Install the dependencies for this repository:

```sh
yarn
```

5. Build and run the application:

```sh
yarn build && yarn preview
```

A server will start and print a URL where you can see the example app. It will
look something like:

>   ➜  Local:   http://localhost:4173/

6. Now you have two URLs, one for the example app where you can generate
traffic, which you should then be able to see in the Explorer UI.

Assuming the Explorer endpoint is exactly as shown above, this will be the
direct URL to the function that is generating traffic from the example app:
http://localhost:6789/explorer/#/functions/details/m/App/getRandomPost/
