import type { CommandRegistrySpecBase } from "./command-registry-spec-base.type";
import type { DepsOfClass } from "./deps-of-class.type";

/**
 * The spec keys registrable **using only the raw `Dependencies` record** —
 * no sibling command access. This is the base case `SiblingCommands` builds
 * on: only a command whose own `Deps` is satisfied this way is safe to hand
 * to another command as part of its `commands` bag, since a `commands` entry
 * that itself secretly needed another sibling would be a promise `.get()`
 * cannot actually keep at that key.
 *
 * Every key whose command declares `Deps = void` is registrable
 * unconditionally, plus every key whose declared `Deps` the provided
 * `Dependencies` record structurally satisfies.
 *
 * Two branches exist for the "no deps needed" case because {@link DepsOfClass}
 * resolves to two different types depending on how the subclass wrote its
 * override — `unknown` when the parameter is elided (the idiomatic style
 * throughout this package), `void` when it's named explicitly, matching the
 * abstract signature verbatim. Both mean the same thing ("this command reads
 * nothing from `execute`'s argument") and both must be treated as always
 * registrable, regardless of what `Dependencies` is — a naive
 * `Dependencies extends DepsOfClass<Spec[Key]>` alone would wrongly exclude
 * the explicit-`void` style whenever `Dependencies` isn't itself `void`.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @see `SiblingCommands` — the only consumer.
 * @see `RegistrableKeys` — the two-tier gate `.get()` actually uses, layering
 *   sibling-command access on top of this.
 */
export type DirectlyRegistrableKeys<
	Spec extends CommandRegistrySpecBase,
	Dependencies,
> = {
	[Key in Extract<keyof Spec, string>]: unknown extends DepsOfClass<Spec[Key]>
		? Key
		: DepsOfClass<Spec[Key]> extends void
			? Key
			: Dependencies extends DepsOfClass<Spec[Key]>
				? Key
				: never;
}[Extract<keyof Spec, string>];
