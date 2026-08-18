import type { AnyCommandClass } from "./any-command-class.type";

/**
 * Base constraint of every `commandRegistry` spec: a plain object mapping
 * each command's registry key to the `Command` subclass it registers.
 *
 * @example
 * ```ts
 * const spec = { renameTag: RenameTagCommand, createUser: CreateUserCommand };
 * ```
 */
export type CommandRegistrySpecBase = Record<string, AnyCommandClass>;
