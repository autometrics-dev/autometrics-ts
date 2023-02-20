
# `@autometrics/autometrics` 📈

## Documentation

Full documentation for `@autometrics/autometrics` library can be found
[here](https://github.com/autometrics-dev/autometrics-ts).

## Installation

```shell
# npm
npm install @autometrics/autometrics

# yarn
yarn add @autometrics/autometrics

# pnpm
pnpm add @autometrics/autometrics
```

## Basic example

```typescript

import { autometrics } from "@autometrics/autometrics"

async function createUser(payload: User) {
  // ...
}

const user = autometics(createUser)

```
