alias b := build
alias l := lint
alias t := test

build: build-npm

build-npm:
    deno run --allow-env --allow-read --allow-run=yarn --allow-write=dist scripts/build_npm.ts

format:
    biome format --write packages

lint:
    biome ci packages

test:
    deno test --allow-read packages/autometrics

test-examples:
    for example

test-all: test test-examples
