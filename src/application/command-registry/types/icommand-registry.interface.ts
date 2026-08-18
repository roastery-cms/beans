import type { CommandRegistrySpecBase } from "./command-registry-spec-base.type";
import type { CommandRunner } from "./command-runner.type";
import type { RegistrableKeys } from "./registrable-keys.type";

/**
 * What `commandRegistry(spec).withDependencies(deps)` returns: a single
 * `get`, resolving a spec key to a ready-to-run bound function.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @see `CommandRegistryBuilder.withDependencies` — returns this.
 */
export interface ICommandRegistry<
	Spec extends CommandRegistrySpecBase,
	Dependencies,
> {
	/**
	 * Resolves a spec key to a bound function that constructs the command and
	 * `execute()`s it with the stored dependency record.
	 *
	 * @typeParam Key - Narrowed to {@link RegistrableKeys} — a key whose
	 *   command's `Deps` this registry's `Dependencies` doesn't structurally
	 *   satisfy is a compile error here, never reaching runtime.
	 * @param key - The spec key to resolve.
	 * @returns A function from the command's construction payload to its `CommandResult`.
	 * @throws `InvalidPropertyException` — at runtime, for a key the spec never declared.
	 */
	get<Key extends RegistrableKeys<Spec, Dependencies>>(
		key: Key,
	): CommandRunner<Spec[Key]>;
}
