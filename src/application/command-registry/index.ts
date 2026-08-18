/**
 * @module @roastery/beans/application/command-registry
 *
 * Public entry point for the command-registry pillar.
 *
 * Re-exports:
 * - {@link commandRegistry} — two-phase builder gating access to a set of
 *   `Command` subclasses by their declared dependencies, at compile time.
 *
 * Types (`CommandRegistrySpecBase`, `ICommandRegistry`, `CommandRunner`, …)
 * live one level deeper at
 * `@roastery/beans/application/command-registry/types` — mirroring how the
 * command pillar keeps its own types behind a dedicated subpath.
 */

export { commandRegistry } from "./command-registry";
