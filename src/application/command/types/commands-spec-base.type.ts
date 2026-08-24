import type { AnyCommandClass } from "./any-command-class.type";

/**
 * Base constraint of every `commands` spec: a plain object mapping each
 * command's registry key to the `Command` subclass it registers.
 *
 * **Lives in `command/types`, not in the `commands` pillar it is named
 * after**, because it has a second consumer that predates any registry: a
 * command's own `Siblings` type argument (see {@link WithSiblingCommands}),
 * declared at the `defineUseCase`/`commandOf` call site, long before the
 * `commands` registry that will register it exists. Putting it in
 * `commands/types` would have made `application/command` import from
 * `application/commands`, which already imports {@link CommandResult} back
 * from here — a circular dependency between the two pillars. One shape, one
 * name, re-exported from `commands/types` so that subpath serves it too.
 *
 * @example
 * ```ts
 * const spec = { renameTag: RenameTagCommand, createUser: CreateUserCommand };
 * ```
 *
 * @see {@link WithSiblingCommands} — the other consumer, at a command's own
 *   declaration site.
 */
export type CommandsSpecBase = Record<string, AnyCommandClass>;
