alias b := build
alias l := lint
alias t := test
alias reload-all := reload-all-deno-cache

examples := "deno-fresh express faas-experimental fastify hono-bun react-app-experimental"

lib_packages := "autometrics exporter-otlp-http exporter-prometheus exporter-prometheus-push-gateway"

test_permissions := "--allow-env --allow-net --allow-read --allow-sys --allow-write"

biome_permissions := "--allow-env --allow-read --allow-run --allow-write"

build: (build-npm "")

build-npm version:
    deno run --allow-env --allow-ffi --allow-net=deno.land --allow-read --allow-run --allow-sys --allow-write=dist scripts/build_npm.ts {{version}}

build-examples:
    #!/usr/bin/env bash
    set -euxo pipefail
    for example in {{examples}}; do
        pushd "examples/$example"
        just build
        popd
    done

# NOTE - You may need to run `just clean` in the project root before running this command
build-parcel-transformer:
    cd packages/parcel-transformer-autometrics; just build

# NOTE - You may need to run `just clean` in the project root before running this command
build-typescript-plugin:
    cd packages/typescript-plugin; just build

# NOTE - Build the non-deno things first, then the deno things (this order is important)
# NOTE - If this fails, try running `clean-all` then run this command again
build-all: build-parcel-transformer build-typescript-plugin build build-examples

test:
    deno test {{test_permissions}} packages/autometrics

update-snapshot test_file:
    deno test {{test_permissions}} {{test_file}} -- --update

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
    rm -Rf dist node_modules

clean-examples:
    for example in {{examples}}; do pushd "examples/$example"; just clean; popd; done

clean-parcel-transformer:
    cd packages/parcel-transformer-autometrics; just clean

clean-typescript-plugin:
    cd packages/typescript-plugin; just clean

clean-all: clean clean-examples clean-parcel-transformer clean-typescript-plugin

reload-all-deno-cache:
    #!/usr/bin/env bash
    set -euxo pipefail
    for package in {{lib_packages}}; do
        pushd "packages/$package"
        # Ignore directories named `tests` or `dist` or `node_modules`
        # Then reload the Deno cache for any imports in files that end in .ts or .js
        find . \( -type d \( -name "tests" -o -name "dist" -o -name "node_modules" \) -prune \) -o \( -type f \( -name "*.ts" \) -exec deno cache --reload {} + \)
        popd
    done

fix:
    deno run {{biome_permissions}} npm:@biomejs/biome check --apply-unsafe packages

format:
    deno run {{biome_permissions}} npm:@biomejs/biome format --write packages

lint:
    deno run {{biome_permissions}} npm:@biomejs/biome ci packages

release-lib:
    #!/usr/bin/env bash
    set -euxo pipefail
    for package in {{lib_packages}}; do
        pushd "dist/$package"
        npm publish
        popd
    done
