import type { CommandRegistrySpecBase } from "@/application/command-registry/types";
import type { IEventedRegistry } from "./ievented-registry.interface";

/**
 * What `eventedRegistry(spec, emitter)` returns: the second half of the
 * two-phase declaration, exposing **only**
 * {@link EventedRegistryBuilder.withDependencies} — the same reasoning
 * `CommandRegistryBuilder` already documents: a literal can't reference its
 * own `typeof`, so `Spec` is fixed by the first call before `Dependencies`
 * is checked against every registered handler's `Deps` in the second.
 *
 * @typeParam Spec - The command spec fixed by the first call.
 * @see `eventedRegistry` in `@roastery/beans/application/evented-registry` — returns this.
 */
export type EventedRegistryBuilder<Spec extends CommandRegistrySpecBase> = {
	/**
	 * Supplies the dependency record and returns the finished registry.
	 *
	 * @typeParam Dependencies - Inferred from the literal, `const` so its
	 *   members stay narrow enough for `RegistrableEventHandlerClass` to gate on.
	 * @param dependencies - The dependency record every registered command's
	 *   `execute()`, and every reaction's `handle()`, will be called with.
	 * @returns The registry — see `IEventedRegistry`.
	 */
	withDependencies<const Dependencies>(
		dependencies: Dependencies,
	): IEventedRegistry<Spec, Dependencies>;
};
