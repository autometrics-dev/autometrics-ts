alias b := build
alias l := lint
alias t := test

examples := "express"

build: (build-npm "beta")

build-npm version:
    deno run --allow-env --allow-read --allow-run=yarn --allow-write=dist scripts/build_npm.ts {{version}}

build-examples:
    for example in {{examples}}; do pushd "examples/$example"; just build; popd; done

build-all: build build-examples

test:
    deno test --allow-env --allow-read --allow-sys packages/autometrics

test-examples:
    for example in {{examples}}; do pushd "examples/$example"; just test; popd; done

test-all: test test-examples

clean:
    rm -Rf dist

clean-examples:
    for example in {{examples}}; do pushd "examples/$example"; just clean; popd; done

clean-all: clean clean-examples

fix:
    biome check --apply-unsafe packages

format:
    biome format --write packages

lint:
    biome ci packages
