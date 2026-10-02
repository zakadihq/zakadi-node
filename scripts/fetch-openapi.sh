#!/bin/sh
# Writes openapi/openapi.yaml, the copy of api/openapi.yaml of zakadihq/zakadi-server
# that npm run generate reads (spec/02-api.md 2.11 and 2.12, D84). zakadi-server is
# private and publishes no package, so the copy is pinned by commit and SHA-256 (D133)
# and read with gh, whose token must read that repository. Bytes with another SHA-256
# are refused and the copy is left as it was. With --check the committed copy is
# verified against the SHA-256, offline.
set -eu

commit=061fcdd7d59f1a6aa3f1b8656fdafcf311afeb6b
sha256=5d5fe6f3529eb28a7cdc59293340f354a489a15167ab74244cf6ca4c43981b7c

dir="$(cd "$(dirname "$0")/.." && pwd)/openapi"
copy="$dir/openapi.yaml"

digest() { shasum -a 256 "$1" | cut -d ' ' -f 1; }

case "${1-}" in
--check)
    if [ ! -f "$copy" ] || [ "$(digest "$copy")" != "$sha256" ]; then
        echo "fetch-openapi: openapi/openapi.yaml is not zakadi-server $commit (SHA-256 $sha256); run sh scripts/fetch-openapi.sh" >&2
        exit 1
    fi
    echo "fetch-openapi: openapi/openapi.yaml is zakadi-server $commit"
    ;;
"")
    mkdir -p "$dir"
    part="$(mktemp "$dir/.openapi.yaml.XXXXXX")"
    trap 'rm -f "$part"' EXIT
    gh api "repos/zakadihq/zakadi-server/contents/api/openapi.yaml?ref=$commit" \
        -H "Accept: application/vnd.github.raw" >"$part"
    if [ "$(digest "$part")" != "$sha256" ]; then
        echo "fetch-openapi: api/openapi.yaml at zakadi-server $commit does not match SHA-256 $sha256; openapi/openapi.yaml is unchanged" >&2
        exit 1
    fi
    chmod 644 "$part"
    mv "$part" "$copy"
    echo "fetch-openapi: openapi/openapi.yaml written from zakadi-server $commit"
    ;;
*)
    echo "usage: sh scripts/fetch-openapi.sh [--check]" >&2
    exit 2
    ;;
esac
