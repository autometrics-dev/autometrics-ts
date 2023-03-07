# Contributing

## Development workflow

The project uses as `npm` as the package manager.

```shell
git clone git@github.com:autometrics-dev/autometrics-ts.git
cd autometrics-ts
npm install
```


### Overview

#### `@autometrics/autometrics`

Houses code that wraps and instruments the functions or class methods and
exposes them on an endpoint via an exporter.

#### `@autometrics/typescript-plugin`

Houses code that writes the queries in your IDE on hover. Its main function is
to intercept the `quick info` (that's the tooltip doc comments) requests from 
the language server client, determine whether it should show the generated
queries for the hovered item, and, if yes, grab the identifier and insert it
into the generated query templates.


### Getting the wrapper library and plugin running

#### Wrapper library

```shell
# in project root
npm run dev:lib
```


##### TypeScript plugin

```shell
# in project root
npm run dev:plugin
```

#### Use examples

Use the examples in `examples/` to test your changes. You will need to reinstall
autometrics packages to use the local development ones to see the changes
reflected.

Example with the `express` app:

1. Remove the official npm released autometrics packages

```shell
npm uninstall @autometrics/autometrics @autometrics/typescript-plugin
```

2. Install local versions of autometrics

```shell
# from examples/express
npm install ../../packages/autometrics/
npm install -D ../../packages/autometrics-typescript-plugin/
```

Now every time you will save and rebuild any of the packages they will update in
your example repo automatically (you won't need to re-run `npm install`)

Open the `express` app with your editor, e.g.: VSCode - `code examples/express/`

This is now your "lab" environment for testing out how the library or the plugin
work and feel like.

#### Debugging TypeScript plugin

1. Console.log

You can use `console.log` to debug like in any application. To see the logs in
VSCode run "TypeScript: Open TS Server Logs". It might prompt you to enable
logging and restart the TypeScript server.

However, with the somewhat complex AST-parsing logic of the TypeScript plugin
logs might quickly get noisy and difficult to navigate so an easier way would be
to use a debugger.

2. Using debugger

Add `debugger` in the TypeScript plugin code where you want to insert the
breakpoint.

Open the example repo in VSCode with a prepended environment variable to await
TypeScript server on breakpoint:

```shell
TSS_DEBUG_BRK=9229 code examples/express/
```

In your main editor (if VSCode) or in Chrome Debugging tools attach to the
process on port `9229`. The process will initially break on `tsserver`
initialization which you can resume until it breaks again on your breakpoint.

You can now step through the code of the TypeScript plugin and inspect the
values.

> Note: after each update of your plugin source code you will need to restart
> the TypeScript server to see the changes

Read this [blog post](https://blog.andrewbran.ch/debugging-the-type-script-codebase/) for more information on debugging TypeScript plugins

3. Use TypeScript AST viewer

If you're working with the AST in the TypeScript plugin it can be daunting to
navigate the syntax tree. [This playground](https://ts-ast-viewer.com) renders
any pasted TypeScript code in a more usable preview.

