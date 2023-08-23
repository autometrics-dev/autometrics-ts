# `autometrics` 📈✨

## Documentation

Full documentation for the `autometrics` library can be found
[here](https://github.com/autometrics-dev/autometrics-ts).

## Basic example

```typescript
import { autometrics } from "https://deno.land/x/autometrics";

async function createUser(payload: User) {
  // ...
}

const user = autometrics(createUser);
    // ^ instrumented function
```
