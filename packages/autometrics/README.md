# `autometrics`

This is the basic convenience package that bundles both the wrapper library and
the TypeScript plugin into one package.

## Documentation

Full documentation for `@autometrics/autometrics` library can be found
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

1. In `tsconfig.json`:

```jsonc
// tsconfig.json

{
  "compilerOptions": {
    ...
    "plugins": [{
      "name": "autometrics",
      "prometheusUrl": "" // default: localhost:9090
    }]
  },
...
}
```

2. Anywhere in your source code:

```typescript
import { autometrics } from "autometrics";

async function createUser(payload: User) {
  // ...
}

const user = autometrics(createUser);
```

