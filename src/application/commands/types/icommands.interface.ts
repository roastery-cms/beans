import type {
	CommandRunner,
	CommandsSpecBase,
} from "@/application/command/types";
import type { RegistrableKeys } from "./registrable-keys.type";

/**
 * The **named** members of a finished registry: `get`, resolving a spec key
 * to a ready-to-run bound function.
 *
 * @remarks
 * Only half of what `withDependencies` actually returns — the per-key
 * accessors (`registry.createUser(payload)`) are a mapped type, which an
 * interface cannot declare, and are intersected in by `CommandsOf`.
 * This stays an ordinary interface so it remains the place `.get`'s contract
 * is documented and the thing `IEventedCommands` extends.
 *
 * @typeParam Spec - The registry's command spec.
 * @typeParam Dependencies - The dependency record supplied to `withDependencies`.
 * @see `CommandsOf` — the full return type, accessors included.
 * @see `CommandsBuilder.withDependencies` — returns that.
 */
export interface ICommands<Spec extends CommandsSpecBase, Dependencies> {
	/**
	 * Resolves a spec key to a bound function that constructs the command and
	 * `execute()`s it with the stored dependency record.
	 *
	 * Kept alongside the direct form (`registry.createUser(payload)`) as the
	 * way out for a key held in a variable, or a key whose name is not a
	 * valid identifier.
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
