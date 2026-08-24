import { PropertyNameCollisionException } from "@roastery/terroir/exceptions/domain";
import type {
	AnyCommandClass,
	CommandRunner,
} from "@/application/command/types";

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
 *   members (`get`, and `on` when an emitter was supplied) already.
 * @param spec - The registry's command spec — its keys become the accessors.
 * @param runners - One ready-to-run runner per spec key.
 *
 * @throws `PropertyNameCollisionException` — when a spec key collides with a
 *   member the registry already carries (`get`, `on`, `toString`, …).
 *
 * @example
 * ```ts
 * installRunners(self, spec, runners);
 * await self.createUser(payload); // same function as self.get("createUser")
 * ```
 *
 * @see `commands` in `@/application/commands/commands` — its only caller.
 */
export function installRunners(
	registry: object,
	spec: Readonly<Record<string, unknown>>,
	runners: Readonly<Record<string, CommandRunner<AnyCommandClass>>>,
): void {
	const keys = Object.keys(spec);

	for (const key of keys)
		if (key in registry)
			throw new PropertyNameCollisionException(
				key,
				"commands",
				`commands: the spec key "${key}" collides with an existing member of the registry and cannot become a direct accessor. Rename it, or reach it through .get("${key}").`,
			);

	for (const key of keys)
		Object.defineProperty(registry, key, {
			configurable: false,
			enumerable: true,
			value: runners[key],
			writable: false,
		});
}
