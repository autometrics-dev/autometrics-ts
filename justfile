alias b := build
alias l := lint
alias t := test

examples := "express faas-experimental fastify hono-bun"

test_permissions := "--allow-env --allow-net --allow-read --allow-sys"

build: (build-npm "beta")

build-npm version:
    CI=false FORCE_COLOR=2 deno run --allow-env --allow-net=deno.land --allow-read --allow-run=yarn --allow-write=dist scripts/build_npm.ts {{version}}

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

build-typescript-plugin:
    cd packages/typescript-plugin; just build

build-all: build build-examples build-parcel-transformer build-typescript-plugin

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

test-typescript-plugin:
    cd packages/typescript-plugin; just test

test-all: test test-examples test-parcel-transformer test-typescript-plugin

type-check:
    deno check packages/autometrics/mod.ts

type-check-examples:
    #!/usr/bin/env bash
    set -euxo pipefail
    for example in {{examples}}; do
        pushd "examples/$example"
        just type-check
        popd
    done

type-check-parcel-transformer:
    cd packages/parcel-transformer-autometrics; just type-check

type-check-typescript-plugin:
    cd packages/typescript-plugin; just type-check

type-check-all: type-check type-check-examples type-check-parcel-transformer type-check-typescript-plugin

clean:
    rm -Rf dist

clean-examples:
    for example in {{examples}}; do pushd "examples/$example"; just clean; popd; done

clean-parcel-transformer:
    cd packages/parcel-transformer-autometrics; just clean

clean-typescript-plugin:
    cd packages/typescript-plugin; just clean

clean-all: clean clean-examples clean-parcel-transformer clean-typescript-plugin

fix:
    biome check --apply-unsafe packages

format:
    biome format --write packages

lint:
    biome ci packages
