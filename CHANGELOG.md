# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.3] - 2026-03-25

### Added

- `EntityStorage` class — internal key-value store (`string → string`) for entities
- `EntityStorage` symbol — protected `[EntityStorage]` accessor on the `Entity` class for subclasses to consume the internal storage
- Export of `EntityStorage` symbol via `src/entity/symbols/index.ts`
