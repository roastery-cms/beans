import type { AnyCommandClass } from "./any-command-class.type";

/**
 * Extracts the `Deps` a command class's `execute()` declares, straight from
 * its `execute` parameter via `infer`.
 *
 * **Resolves to `unknown`, not `void`, for the idiomatic `Deps = void` style**
 * — a subclass that elides the parameter entirely (`public async execute():
 * Promise<CommandResult<X>>`, the style every no-deps command in this package
 * uses) leaves nothing at that position for a contravariant `infer` to
 * constrain against, and TypeScript's fallback there is the top type. Only a
 * subclass that names the parameter explicitly, matching the abstract
 * signature verbatim (`execute(deps: void)`), resolves to `void` itself. Both
 * outcomes are handled together by {@link RegistrableKeys}.
 *
 * @typeParam Class - The command class to inspect.
 * @see `RegistrableKeys` — the only consumer, and where both resolved shapes
 *   (`unknown` and `void`) are treated as "always registrable."
 */
export type DepsOfClass<Class extends AnyCommandClass> = Class extends {
	readonly prototype: { execute(deps: infer Deps): unknown };
}
	? Deps
	: never;
