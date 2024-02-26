# Changelog

## [v1.0.1]

This release fixes two issues. Thanks to @benjibuiltit for his contributions!

### Fixed

- #149 - Fixed an issue where autometrics in a Node.js environment would fail if it was not running inside a git repository
- #150 - Fixed rendering of a function name and module when using the `relfect-metadata` package


## [v1.0.0]

This release features full compliance with the
[Autometrics v1.0.0 specification](https://github.com/autometrics-dev/autometrics-shared/blob/main/specs/autometrics_v1.0.0.md)
as well as first-class [Deno](https://deno.com/) support. Also, our decorators
have been updated to match the
[Stage 3 ECMAScript decorators proposal](https://github.com/tc39/proposal-decorators).

### Changed

- **BREAKING:** Labels are submitted with dots instead of underscores when
  exported through OTLP. This should not affect exports to Prometheus.
- **BREAKING:** The `@Autometrics` decorator is now compliant with the
  [Stage 3 ECMAScript decorators proposal](https://github.com/tc39/proposal-decorators).
  For the legacy TypeScript decorators, please use `@AutometricsLegacy` instead.
- **BREAKING:** *Autometrics 1.0:* `caller.function` and `caller.module` have
  been changed to match the specification.
- Deno has become a first-class supported platform.

### Added

- *Autometrics 1.0:* Added support for the `service.name` label.
- *Autometrics 1.0:* Added support for the `repository.url` and
  `repository.provider` labels.
- *Autometrics 1.0:* Added support for excluding individual methods from the
  class decorator, using `@Autometrics({ skip: true })`. This also works with
  the legacy decorator.
- *Autometrics 1.0:* Users should see a warning in their console if they've
  configured an invalid objective name.

### Fixed

- Fixed `this` handling in the wrappers and decorators.
- Fixed using the `autometrics` package with web bundlers such as Parcel and
  WebPack.
- Fixed an issue where caller information sometimes wasn't submitted.

## [v0.7.0]

### Changed

**BREAKING:** v0.7 is a big change to how the Autometrics library works in
JavaScript. The core library interface of wrappers and decorators remains the
same and will collect the metrics as previously, however it will not export
them. For that purpose exporters are now separate to the library itself allowing
the user more control as to how they want to set up the metrics collection: as a
pull endpoint for Prometheus, push gateway, OpenTelemetry collector or something
else.

- Users need to explicitly choose an exporter and call its `init()` function.
- *Experimental:* Eagerly push metrics when `pushInterval` is set to 0.

### Added

- Support Bun runtime in the core library.
- Warn on a potentially incorrect HTTP OTLP endpoint.
- *Experimental:* Initial Gravel Gateway Support.

### Fixed

- Clear timer on handover.
- Log error when fetch is not defined in push context.
- Fix default Prometheus exporter port.
- Various smaller bugfixes.
- Updated all our examples.

## [v0.6.0] - @autometrics/autometrics - 2023-07-20

- Added functionality to initialize metrics at 0, so instrumented functions can be registered.
- Fixed an issue where decorators were changing `this` values for the methods they'd be wrapping, breaking them.
- Improved how `getModulePath` utility works, passing stack trace as structured data, and making it more robust.
- Measure function duration in seconds, and update the histogram buckets in prometheus accordingly.

## [v0.5.4] - @autometrics/typescript-plugin - 2023-07-20

- Fixed an issue that would cause the Autometrics hover to not appear on wrapped functions.

## [v0.5.3] - 2023-06-26

### Changed

- Fixed issue with running the typescript plugin in combination with typescript 5 (and also fix issues when the vscode extension is bundled with a different version of typescript compared to what vscode is using)

## [v0.5.2] - 2023-06-16

### Added

- added `docsOutputFormat` config parameter to @autometrics/typescript-plugin. This is for communicating autometrics information from typescript to the autometrics extension.

## [v0.5] - 2023-05-26

### Added

- added support for tracking function caller requests (a.k.a. "Tracing Lite")
- added API reference documentation

### Changed

- improves `build_info` to ensure it doesn't crash in the browser

## [v0.4] - 2023-05-12

### Added

- added support for tracking concurrent requests on each function
- added support for applying `@Autometrics()` to entire classes
- updated the decorator to support latest features (SLOs)
- added links to Grafana dashboards in the README

### Changed

- `launch.json` configurations for easier TypeScript plugin debugging workflow

## [v0.3] - 2023-04-23

### Added

- support for adding SLOs to functions
- support for pushing config updates to the TypeScript plugin (especially relevant in the VSCode extension context)

### Changed

- example React app and README tweaks

## [v0.2] - 2023-04-04

### Added

- experimental support for reporting metrics from the browser (client-side) using the push gateway

### Changed

- extracted the TypeScript plugin out from the bundled package to prevent CommonJS/ESM conflicts

## [v0.1.2] - 2023-03-09

### Changed

- added a bundled package option
- improved examples to generate sample traffic
- added guidance for setting up a dev environment for the project
- fixed an `undefined` issue that would crash the TypeScript plugin

## [v0.1.1] - 2023-02-28

### Fixed

- publishing workflow to npm
- ensure full URL encoding of queries

## [v0.1] - 2023-02-24

### Added

- wrapper interface for function instrumentation
- initial decorator interface for class method instrumentation
- examples packages and README
