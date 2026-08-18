import type { CommandDomainKeys } from "./command-domain-keys.type";
import type { CommandPropertiesShapeBase } from "./command-properties-shape-base.type";

/**
 * What a subclass's `defineCommand()` returns: the blueprint and the
 * command-type name.
 *
 * `defineCommand` must be a prototype method (never a class field — the base
 * invokes it during construction, before field initializers run) and must be
 * pure (`fromJSON` invokes it on a probe created without running any
 * constructor) — the same contract `Entity.defineEntity` and
 * `ValueObject.defineMeta` already hold their subclasses to.
 *
 * @typeParam Shape - The command's blueprint shape.
 *
 * @example
 * ```ts
 * protected defineCommand(): CommandDefinition<typeof createUserProperties> {
 *   return { properties: createUserProperties, source: "create-user" };
 * }
 * ```
 */
export type CommandDefinition<Shape extends CommandPropertiesShapeBase> = {
	properties: Shape;
	source: string;

	/**
	 * Extra blueprint keys this command treats as secret, beyond the ones whose
	 * value-object already declares `sensitive: true` in its `defineMeta`.
	 *
	 * For the case the type alone does not settle — a `StringVO` holding a
	 * one-time token, say. Unlike an `Entity`'s, a `Command`'s `toJSON()`
	 * redacts these outright: a command is never persisted, so there is no
	 * round-trip to protect, and `toJSON` is exactly what a structured logger
	 * reaches through `JSON.stringify`.
	 */
	sensitive?: readonly CommandDomainKeys<Shape>[];
};
