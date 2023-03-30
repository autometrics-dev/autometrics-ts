# `autometrics`

This is the basic convenience package that bundles the wrapper library and
OpenTelemetry dependencies.

## Documentation

Full documentation for `autometrics` library can be found
[here](https://github.com/autometrics-dev/autometrics-ts).

## Installation

```shell
# npm
npm install autometrics

# yarn
yarn add autometrics

# pnpm
pnpm add autometrics
```

## Usage

1. Anywhere in your source code:

```typescript
import { autometrics } from "autometrics";

async function createUser(payload: User) {
  // ...
}

const user = autometrics(createUser);
    // ^ instrumented function
```

