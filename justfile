alias b := build
alias l := lint
alias t := test

examples := "express"

test_permissions := "--allow-env --allow-net --allow-read --allow-sys"

build: (build-npm "beta")

build-npm version:
    deno run --allow-env --allow-read --allow-run=yarn --allow-write=dist scripts/build_npm.ts {{version}}

build-examples:
    #!/usr/bin/env bash
    set -euxo pipefail
    for example in {{examples}}; do
        pushd "examples/$example"
        just build
        popd
    done

build-parcel-transformer:
    cd packages/parcel-transformer-autometrics; just build

build-all: build build-examples build-parcel-transformer

test:
    deno test {{test_permissions}} packages/autometrics

update-snapshot test_file:
    deno test {{test_permissions}} --allow-write=packages/autometrics/tests/__snapshots__ {{test_file}} -- --update

test-examples:
    #!/usr/bin/env bash
    set -euxo pipefail
    for example in {{examples}}; do
        pushd "examples/$example"
        just test
        popd
    done

test-parcel-transformer:
    cd packages/parcel-transformer-autometrics; just test

test-all: test test-examples test-parcel-transformer

type-check:
    deno check packages/autometrics/mod.ts

type-check-parcel-transformer:
    cd packages/parcel-transformer-autometrics; just type-check

type-check-all: type-check type-check-parcel-transformer

clean:
    rm -Rf dist

clean-examples:
    for example in {{examples}}; do pushd "examples/$example"; just clean; popd; done

clean-parcel-transformer:
    cd packages/parcel-transformer-autometrics; just clean

clean-all: clean clean-examples clean-parcel-transformer

fix:
    biome check --apply-unsafe packages

format:
    biome format --write packages

lint:
    biome ci packages
