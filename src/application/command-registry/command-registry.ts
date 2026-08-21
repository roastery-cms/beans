import { LoopDetectedException } from "@roastery/terroir/exceptions/application";
import {
	InvalidPropertyException,
	PropertyNameCollisionException,
} from "@roastery/terroir/exceptions/domain";
import type {
	AnyCommandClass,
	CommandRegistrySpecBase,
	CommandRunner,
} from "@/application/command/types";
import type { CommandRegistryBuilder } from "./types/command-registry-builder.type";
import type { CommandRegistryOf } from "./types/command-registry-of.type";

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
 * Installs one accessor per spec key onto a finished registry, so a command
 * runs as `registry.createUser(payload)` and not only as
 * `registry.get("createUser")(payload)`.
 *
 * @remarks
 * Atomic, exactly as `installAccessors` is: every collision is checked
 * before any property is defined, so a rejected install leaves the registry
 * object untouched instead of half-populated. The test is `key in registry`
 * rather than `Object.hasOwn`, for the same reason it is there — a spec key
 * called `toString` or `constructor` would otherwise shadow an inherited
 * member of `Object.prototype`.
 *
 * Installs **every** `Object.keys(spec)` entry, not only the registrable
 * ones: registrability is a compile-time notion with no runtime footprint to
 * read (`Deps` keys no symbol slot), so the type withholds what the runtime
 * cannot. That is the gate's long-standing posture, unchanged here.
 *
 * @param registry - The registry object to install onto, carrying its named
 *   members (`get`, and `on` for the evented registry) already.
 * @param spec - The registry's command spec — its keys become the accessors.
 * @param commands - One ready-to-run runner per spec key.
 * @param source - `"command-registry"` or `"evented-registry"`, used as the
 *   `source` of the exception.
 *
 * @throws `PropertyNameCollisionException` — when a spec key collides with a
 *   member the registry already carries (`get`, `on`, `toString`, …).
 */
export function installRunners(
	registry: object,
	spec: Readonly<Record<string, unknown>>,
	commands: Readonly<Record<string, CommandRunner<AnyCommandClass>>>,
	source: "command-registry" | "evented-registry",
): void {
	const keys = Object.keys(spec);

	for (const key of keys)
		if (key in registry)
			throw new PropertyNameCollisionException(
				key,
				source,
				`${source}: the spec key "${key}" collides with an existing member of the registry and cannot become a direct accessor. Rename it, or reach it through .get("${key}").`,
			);

	for (const key of keys)
		Object.defineProperty(registry, key, {
			configurable: false,
			enumerable: true,
			value: commands[key],
			writable: false,
		});
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
 * const { result, events } = await registry.updateUser(payload);
 * // ^ internally calls deps.commands.login(...) — see `SiblingCommands`
 *
 * const key = "updateUser" as const; // held in a variable: .get() is the way out
 * await registry.get(key)(payload);
 * ```
 *
 * @throws `PropertyNameCollisionException` — from `withDependencies`, when a
 *   spec key collides with a member the registry already carries (`get`).
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
		): CommandRegistryOf<Spec, Dependencies> {
			const commands = buildCommands(spec, dependencies as object, new Set());

			const registry = {
				get(key: string) {
					if (!Object.hasOwn(spec, key))
						throw new InvalidPropertyException(String(key), "command-registry");

					return commands[key];
				},
			};

			installRunners(registry, spec, commands, "command-registry");

			// Pragmatic cast — same spirit as `buildCommands`'s own: the
			// accessors are installed reflectively, so TypeScript cannot see
			// them on the object literal, and `get`'s generic key/return
			// correlation is not something a plain method can carry either.
			return registry as unknown as CommandRegistryOf<Spec, Dependencies>;
		},
	};
}
