# @autometrics/autometrics

## Enumerations

- [ObjectiveLatency](enums/ObjectiveLatency.md)
- [ObjectivePercentile](enums/ObjectivePercentile.md)

## Type Aliases

### AutometricsClassDecoratorOptions

Ƭ **AutometricsClassDecoratorOptions**: `Omit`<[`AutometricsOptions`](README.md#autometricsoptions), ``"functionName"``\>

#### Defined in

[wrappers.ts:289](https://github.com/autometrics-dev/autometrics-ts/blob/d24c439/packages/lib/src/wrappers.ts#L289)

___

### AutometricsOptions

Ƭ **AutometricsOptions**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `functionName?` | `string` | Name of your function. Only necessary if using the decorator/wrapper on the client side where builds get minified. |
| `moduleName?` | `string` | Name of the module (usually filename) |
| `objective?` | [`Objective`](README.md#objective) | Include this function's metrics in the specified objective or SLO. See the docs for [Objective](README.md#objective) for details on how to create objectives. |
| `trackConcurrency?` | `boolean` | Pass this argument to track the number of concurrent calls to the function (using a gauge). This may be most useful for top-level functions such as the main HTTP handler that passes requests off to other functions. (default: `false`) |

#### Defined in

[wrappers.ts:43](https://github.com/autometrics-dev/autometrics-ts/blob/d24c439/packages/lib/src/wrappers.ts#L43)

___

### Objective

Ƭ **Objective**: `Object`

This represents a Service-Level Objective (SLO) for a function or group of functions.
The objective should be given a descriptive name and can represent
a success rate and/or latency objective.

**`Example`**

```ts
import { autometrics, Objective, ObjectiveLatency, ObjectivePercentile } from "@autometrics/autometrics";

const API_SLO: Objective = {
  name: 'api',
  successRate: ObjectivePercentile.P99_9,
  latency: [ObjectiveLatency.Ms250, ObjectivePercentile.P99],
};

const apiHandlerFn = autometrics({ objective: API_SLO }, function apiHandler(
  // ...
));
```

#### How this works

When an objective is added to a function, the metrics for that function will
have additional labels attached to specify the SLO details.

Specifically, success rate objectives will add objective-related labels to the `function.calls.count` metric
and latency objectives will add labels to the `function.calls.duration` metric.

Autometrics comes with a set of Prometheus [recording rules](https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/)
and [alerting rules](https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/)
that will fire alerts when the given objective is being violated.

By default, these recording rules will effectively lay dormant.
However, they are enabled when the special labels are present on certain metrics.

#### Type declaration

| Name | Type |
| :------ | :------ |
| `latency?` | [[`ObjectiveLatency`](enums/ObjectiveLatency.md), [`ObjectivePercentile`](enums/ObjectivePercentile.md)] |
| `name` | `string` |
| `successRate?` | [`ObjectivePercentile`](enums/ObjectivePercentile.md) |

#### Defined in

[objectives.ts:36](https://github.com/autometrics-dev/autometrics-ts/blob/d24c439/packages/lib/src/objectives.ts#L36)

___

### initOptions

Ƭ **initOptions**: `Object`

#### Type declaration

| Name | Type | Description |
| :------ | :------ | :------ |
| `exporter?` | `Exporter` | A custom exporter to be used instead of the bundled Prometheus Exporter on port 9464 |
| `pushGateway?` | `string` | The full URL (including http://) of the aggregating push gateway for metrics to be submitted to. |
| `pushInterval?` | `number` | Set a custom push interval in ms (default: 5000ms) |

#### Defined in

[instrumentation.ts:18](https://github.com/autometrics-dev/autometrics-ts/blob/d24c439/packages/lib/src/instrumentation.ts#L18)

## Functions

### Autometrics

▸ **Autometrics**<`T`\>(`autometricsOptions?`): <T\>(`target`: `T`) => `void`<T\>(`target`: `T`, `propertyKey`: `string`, `descriptor`: `PropertyDescriptor`) => `void`

Autometrics decorator that can be applied to either a class or class method
that automatically instruments methods with OpenTelemetry-compatible metrics.
Hover over the method to get the links for generated queries (if you have the
language service plugin installed).

Optionally, you can pass in an [AutometricsOptions](README.md#autometricsoptions) object to configure
the decorator.

**`Example`**

<caption>Basic class decorator implementation</caption>

```
 \@Autometrics()
 class Foo {
  // Don't add a backslash in front of the decorator, this is only here to
  // prevent the example from rendering incorrectly
  bar() {
    console.log("bar");
  }
}
```

**`Example`**

<caption>Method decorator that passes in an autometrics options object including SLO</caption>

```typescript
import {
  Autometrics,
  AutometricsOptions,
  Objective,
  ObjectivePercentile,
  ObjectiveLatency,
} from "autometrics";

const objective: Objective = {
  successRate: ObjectivePercentile.P99_9,
  latency: [ObjectiveLatency.Ms250, ObjectivePercentile.P99],
  name: "foo",
};

const autometricsOptions: AutometricsOptions = {
  functionName: "FooBar",
  objective,
  trackConcurrency: true,
};

class Foo {
  // Don't add a backslash in front of the decorator, this is only here to
  // prevent the example from rendering incorrectly
  @Autometrics(autometricsOptions)
  bar() {
    console.log("bar");
  }
}
```

#### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Object` \| `Function` |

#### Parameters

| Name | Type |
| :------ | :------ |
| `autometricsOptions?` | `AutometricsDecoratorOptions`<`T`\> |

#### Returns

`fn`

▸ <`T`\>(`target`): `void`

##### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Function` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `target` | `T` |

##### Returns

`void`

▸ <`T`\>(`target`, `propertyKey`, `descriptor`): `void`

##### Type parameters

| Name | Type |
| :------ | :------ |
| `T` | extends `Object` |

##### Parameters

| Name | Type |
| :------ | :------ |
| `target` | `T` |
| `propertyKey` | `string` |
| `descriptor` | `PropertyDescriptor` |

##### Returns

`void`

#### Defined in

[wrappers.ts:357](https://github.com/autometrics-dev/autometrics-ts/blob/d24c439/packages/lib/src/wrappers.ts#L357)

___

### autometrics

▸ **autometrics**<`F`\>(`functionOrOptions`, `fnInput?`): `AutometricsWrapper`<`F`\>

Autometrics wrapper for **functions** (requests handlers or database methods)
that automatically instruments the wrapped function with OpenTelemetry metrics.

Hover over the wrapped function to get the links for generated queries (if
you have the language service plugin installed)

**`Example`**

<caption>Basic usage</caption>

```typescript
import { autometrics } from "autometrics";

const createUser = autometrics(async function createUser(payload: User) {
  // ...
});

const user = createUser();
```

<caption>Usage with options</caption>

```typescript
import {
  autometrics,
  AutometricsOptions,
  Objective,
  ObjectiveLatency,
  ObjectivePercentile,
} from "autometrics";

const objective: Objective = {
  successRate: ObjectivePercentile.P99_9,
  latency: [ObjectiveLatency.Ms250, ObjectivePercentile.P99],
  name: "foo",
};

const autometricsOptions: AutometricsOptions = {
  objective,
  trackConcurrency: true,
};

const createUser = autometrics(autometricsOptions, async function createUser(payload: User) {
 // ...
});

const user = createUser();
```

#### Type parameters

| Name | Type |
| :------ | :------ |
| `F` | extends `FunctionSig` |

#### Parameters

| Name | Type | Description |
| :------ | :------ | :------ |
| `functionOrOptions` | [`AutometricsOptions`](README.md#autometricsoptions) \| `F` | {(F\|AutometricsOptions)} - the function that will be wrapped and instrumented with metrics, or an options object |
| `fnInput?` | `F` | {F} - the function that will be wrapped and instrumented with metrics (only necessary if the first argument is an options object) |

#### Returns

`AutometricsWrapper`<`F`\>

#### Defined in

[wrappers.ts:124](https://github.com/autometrics-dev/autometrics-ts/blob/d24c439/packages/lib/src/wrappers.ts#L124)

___

### init

▸ **init**(`options`): `void`

Optional initialization function to set a custom exporter or push gateway for client-side applications.
Required if using autometrics in a client-side application. See [initOptions](README.md#initoptions) for details.

#### Parameters

| Name | Type |
| :------ | :------ |
| `options` | [`initOptions`](README.md#initoptions) |

#### Returns

`void`

#### Defined in

[instrumentation.ts:39](https://github.com/autometrics-dev/autometrics-ts/blob/d24c439/packages/lib/src/instrumentation.ts#L39)
