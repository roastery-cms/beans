import type { CommandDomainKeys } from "./command-domain-keys.type";
import type { CommandPropertiesShapeBase } from "./command-properties-shape-base.type";
import type { CommandReadValueOf } from "./command-read-value-of.type";

/**
 * The read-only accessors a `Command` derives from its blueprint: one
 * property per blueprint key, typed as that key's value-object's raw value.
 *
 * The getters are installed on the prototype at runtime regardless; merging
 * this interface is how TypeScript learns about them — declare
 * `interface X extends CommandAccessorsOf<typeof xProperties> {}` next to the
 * class. Skip the line and the accessors still work but stay invisible to
 * the type system — the same trade-off `Entity`'s `AccessorsOf` documents.
 *
 * @typeParam Shape - The command's blueprint shape.
 *
 * @example
 * ```ts
 * const createUserProperties = { email: EmailVO };
 *
 * interface CreateUserCommand extends CommandAccessorsOf<typeof createUserProperties> {}
 * class CreateUserCommand extends Command<typeof createUserProperties, Deps, User> { ... }
 *
 * command.email; // string — typed by the merge
 * ```
 */
export type CommandAccessorsOf<Shape extends CommandPropertiesShapeBase> = {
	readonly [Key in CommandDomainKeys<Shape>]: CommandReadValueOf<Shape, Key>;
};
