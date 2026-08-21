import type { AnyCommandClass } from "./any-command-class.type";

/**
 * Base constraint of every `commandRegistry` spec: a plain object mapping
 * each command's registry key to the `Command` subclass it registers.
 *
 * **Lives in `command/types`, despite the `Registry` in its name**, because
 * it has a second consumer that predates any registry: a command's own
 * `Siblings` type argument (see {@link WithSiblingCommands}), declared at the
 * `defineUseCase`/`commandOf` call site, long before the `commandRegistry`
 * that will register it exists. Keeping it in `command-registry/types` would
 * have made `application/command` import from `application/command-registry`,
 * which already imports {@link CommandResult} back from here — a circular
 * dependency between the two pillars. The name is kept as-is rather than
 * split into a second alias: one shape, one name, re-exported from
 * `command-registry/types` so its original subpath still serves it.
 *
 * @example
 * ```ts
 * const spec = { renameTag: RenameTagCommand, createUser: CreateUserCommand };
 * ```
 *
 * @see {@link WithSiblingCommands} — the other consumer, at a command's own
 *   declaration site.
 */
export type CommandRegistrySpecBase = Record<string, AnyCommandClass>;
