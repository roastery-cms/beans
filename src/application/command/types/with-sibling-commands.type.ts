import type { CommandRegistrySpecBase } from "./command-registry-spec-base.type";
import type { CommandRunner } from "./command-runner.type";

/**
 * A command's declared `Deps`, plus the `commands` bag of sibling runners
 * built from the `Siblings` map it named — the type-level half of something
 * the runtime has always done unconditionally.
 *
 * `commandRegistry` and `eventedRegistry` both already hand every command
 * (and every reaction) a `commands` bag alongside its dependency record —
 * see `buildCommands` in `command-registry.ts` and its twin in
 * `evented-registry.ts`. Until this type existed, the only way to *see* that
 * bag was to write it into `Deps` by hand:
 *
 * ```ts
 * type Deps = { users: UserRepo; commands: { login: CommandRunner<typeof LoginCommand> } };
 * ```
 *
 * which is boilerplate for a guarantee the framework never breaks, and drags
 * `CommandRunner` into a use case's own vocabulary. Here the author names the
 * sibling **classes** instead and the runners are derived:
 *
 * ```ts
 * type Deps = { users: UserRepo };
 * type Siblings = { login: typeof LoginCommand };
 *
 * class UpdateUser extends defineUseCase<typeof props, Deps, User, Siblings>(props, "update-user") {
 *   protected async handle({ users, commands }): Promise<User> {
 *     await commands.login({ email, password }); // payload and result both typed
 *   }
 * }
 * ```
 *
 * **The empty-`Siblings` guard is load-bearing, not a tidiness pass.** With
 * the factories' `Siblings = {}` default, this type must resolve to `Deps`
 * *itself* — not `Deps & { commands: {} }`. An always-present `commands` key
 * would change what `DepsOfClass` infers for every command in existence,
 * including the `Deps = void` ones, where the intersection resolves to the
 * uninhabited `void & { commands: {} }` and quietly breaks
 * `RegistrableKeys`'s `extends void` branch. `[keyof Siblings] extends
 * [never]` is written in tuples so the check is not distributed over a union
 * of keys — the same non-distributive idiom `RepositoryOrderKeysOf` uses for
 * its primitive tests.
 *
 * Nothing here reaches the registry's own gate, and nothing had to: a class
 * built through this resolves `DepsOfClass` to the same shape a hand-written
 * `Deps` used to spell out, so `RegistrableKeys` keeps checking exactly what
 * it checked before — a sibling only *reachable* through another sibling's
 * `commands` is still not provably safe, and `.get()` still withholds it.
 *
 * @typeParam Deps - What the command declares it needs, sibling commands
 *   aside.
 * @typeParam Siblings - A map of registry key to sibling `Command` **class**
 *   — `{ login: typeof LoginCommand }`, never a map of runners. Empty by
 *   default at every call site, which resolves to `Deps` untouched.
 *
 * @see `defineUseCase` in `@/application/command/helpers/define-use-case` — the primary consumer.
 * @see `defineEventHandler` in `@/application/evented-registry` — the reaction-side consumer.
 * @see `SiblingCommands` in `@/application/command-registry/types` — the registry's own,
 *   spec-wide counterpart, which computes its keys instead of being given them.
 */
export type WithSiblingCommands<
	Deps,
	Siblings extends CommandRegistrySpecBase,
> = [keyof Siblings] extends [never]
	? Deps
	: Deps & {
			readonly commands: {
				[Key in keyof Siblings]: CommandRunner<Siblings[Key]>;
			};
		};
