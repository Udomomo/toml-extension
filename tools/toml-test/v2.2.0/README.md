# toml-test v2.2.0

This directory contains the official `toml-test` v2.2.0 release binaries
used by this repository's TOML 1.1 conformance tests.

## Provenance

- Project: https://github.com/toml-lang/toml-test
- Release: https://github.com/toml-lang/toml-test/releases/tag/v2.2.0
- Version: `v2.2.0`
- License: MIT; see [LICENSE](./LICENSE)

The binaries were downloaded from the following official release URLs:

- https://github.com/toml-lang/toml-test/releases/download/v2.2.0/toml-test-v2.2.0-darwin-arm64.gz
- https://github.com/toml-lang/toml-test/releases/download/v2.2.0/toml-test-v2.2.0-linux-amd64.gz

For each URL, the `.gz` asset was decompressed without modification and the
resulting executable was stored under the platform directory below.

## SHA-256

These hashes are for the decompressed executables committed to this repository.

| Platform | Path | SHA-256 |
| --- | --- | --- |
| macOS arm64 | `darwin-arm64/toml-test` | `89a99c5ce2a4fb9d6205f3cc389379670956ff96f230859c9008422c864446d0` |
| Linux amd64 | `linux-amd64/toml-test` | `78b74b9d4136f9561a2c57778920d3c6646ead41079d1b36fc1629641187df30` |

For comparison, the SHA-256 digests published by the GitHub release for the
compressed assets are `f36b1310b03a95dfa6b92ef535018db8ccc997ba20e79f3fd28d0f97c9174f35`
for macOS arm64 and
`08f9e0a97da1151c33debf01358a8f5ef45e2a56be201241ae5eb5c2e9323fef` for Linux
amd64.

## Re-download procedure

From the repository root, download each URL above, decompress it with `gzip -d`,
make the result executable with `chmod 755`, and compare the resulting
decompressed file with the corresponding hash in the table. The conformance
runner only selects these checked-in files; it does not download anything at
test time.
