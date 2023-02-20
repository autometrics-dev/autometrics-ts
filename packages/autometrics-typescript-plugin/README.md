
# `@autometrics/typescript-plugin` 📈✨

## Documentation

Full documentation for `@autometrics/typescript-plugin` library can be found
[here](https://github.com/autometrics-dev/autometrics-ts).

## Installation

```shell
# npm
npm install @autometrics/typescript-plugin

# yarn
yarn add @autometrics/typescript-plugin

# pnpm
pnpm add @autometrics/typescript-plugin
```

## Getting started

```json
// tsconfig.json

{
  "compilerOptions": {
    ...
    "plugins": [{
      "name": "@autometrics/typescript-plugin",
      "prometheusUrl": "" // default: localhost:9090
    }]
  },
...
}
```
