import { LoopDetectedException } from "@roastery/terroir/exceptions/application";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import type { AnyCommandClass } from "./types/any-command-class.type";
import type { CommandRegistryBuilder } from "./types/command-registry-builder.type";
import type { CommandRegistrySpecBase } from "./types/command-registry-spec-base.type";
import type { CommandRunner } from "./types/command-runner.type";
import type { ICommandRegistry } from "./types/icommand-registry.interface";

/**
 * Builds the exception a sibling-command chain throws when a key it is
 * already executing shows up again on its own call chain — the runtime
 * guard behind {@link buildCommands}.
 *
 * @param chain - Every command key on the call chain, in call order, ending
 *   with the key that closed the cycle.
 * @returns A `LoopDetectedException` (HTTP 508) naming the full chain.
 */
function siblingCycleError(chain: readonly string[]): LoopDetectedException {
	return new LoopDetectedException(
		"command-registry",
		`commandRegistry: sibling-command execution cycled back to an already-running command (chain: ${chain.join(" → ")}). Composition has no runtime depth limit, but it must stay acyclic — break the cycle in how these commands call each other.`,
	);
}

/**
 * Builds the sibling-commands bag for one point in a call chain.
 *
 * @remarks
 * Rebuilt fresh for every nested call rather than shared as one flat,
 * mutable object: a shared `Set` guard (add before await, remove in
 * `finally`) cannot tell two unrelated *concurrent* calls to the same key
 * apart from a real cycle — the second call would see the first call's
 * in-flight marker and misreport a cycle that never happened. Threading an
 * immutable `chain` downward instead means two sibling branches (two
 * different reactions calling the same command independently, say) never
 * see each other's markers, only true ancestors do — the same "siblings,
 * not a cycle" distinction `domain/entity`'s own blueprint-cycle guard
 * already draws.
 *
 * @param spec - The registry's command spec.
 * @param dependencies - The dependency record supplied to `withDependencies`.
 * @param chain - Every command key already on this call chain.
 * @returns One runner per spec key, each aware of `chain`.
 */
function buildCommands<Spec extends CommandRegistrySpecBase>(
	spec: Spec,
	dependencies: object,
	chain: ReadonlySet<string>,
): Record<string, CommandRunner<AnyCommandClass>> {
	const commands: Record<string, CommandRunner<AnyCommandClass>> = {};

	for (const key of Object.keys(spec)) {
		// Pragmatic cast — same spirit as buildProperty/readDefinition in
		// entity.ts: TypeScript doesn't correlate a generic Spec key with
		// the concrete payload/deps the body needs here.
		const CommandClass = spec[key] as AnyCommandClass;

		commands[key] = async (payload) => {
			if (chain.has(key)) throw siblingCycleError([...chain, key]);

			const nextChain = new Set(chain).add(key);

			return new CommandClass(payload).execute({
				...dependencies,
				commands: buildCommands(spec, dependencies, nextChain),
			} as never);
		};
	}

	return commands;
}

/**
 * Declares a registry gating access to a set of `Command` subclasses by
 * their declared dependencies — entirely at compile time.
 *
 * Two-phase for the same reason `blueprint` is: `spec` is fixed by this call
 * before `withDependencies`'s `Dependencies` can be checked against every
 * spec member's `Deps`.
 *
 * @typeParam Spec - The command spec, inferred `const` so each key keeps its
 *   exact command class (not widened to {@link AnyCommandClass}).
 * @param spec - One `Command` subclass per registry key.
 * @returns A builder whose `withDependencies` attaches the dependency record
 *   and returns the registry.
 *
 * @example
 * ```ts
 * const registry = commandRegistry({
 *   login: UserLoginCommand,
 *   updateUser: UpdateUserCommand, // Deps names `commands: { login: CommandRunner<typeof UserLoginCommand> } }`
 * }).withDependencies({ secrets, users });
 *
 * const { result, events } = await registry.get("updateUser")(payload);
 * // ^ internally calls deps.commands.login(...) — see `SiblingCommands`
 * ```
 *
 * @throws {@link LoopDetectedException} if a sibling-command chain reached
 *   through `deps.commands` calls back into a key already on its own call
 *   chain — composition has no depth limit at runtime (only what
 *   `RegistrableKeys` can *prove* at compile time is capped at one hop), but
 *   it must stay acyclic; this is the runtime backstop for that.
 * @see `CommandRegistryBuilder`
 */
export function commandRegistry<const Spec extends CommandRegistrySpecBase>(
	spec: Spec,
): CommandRegistryBuilder<Spec> {
	return {
		withDependencies<const Dependencies>(
			dependencies: Dependencies,
		): ICommandRegistry<Spec, Dependencies> {
			const commands = buildCommands(spec, dependencies as object, new Set());

			return {
				get(key) {
					if (!Object.hasOwn(spec, key))
						throw new InvalidPropertyException(String(key), "command-registry");

					return commands[key as string] as never;
				},
			};
		},
	};
}
