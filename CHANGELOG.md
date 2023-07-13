# Changelog

## [Unreleased]

- Fixed an issue where decorators were changing `this` values for the methods they'd be wrapping, breaking them.
- Improved how `getModulePath` utility works, passing stack trace as structured data, and making it more robust.

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
