import { Command } from "@/application/command";
import type {
	CommandDefinition,
	CommandResult,
} from "@/application/command/types";
import { StringVO } from "@/domain/collections/value-objects";
import { DomainEvent } from "@/domain/domain-event";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { LoopDetectedException } from "@roastery/terroir/exceptions/application";
import {
	InvalidPropertyException,
	PropertyNameCollisionException,
} from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { commandRegistry } from "./command-registry";
import type { RegistrableKeys } from "./types/registrable-keys.type";
import type { SiblingCommands } from "./types/sibling-commands.type";
import type { CommandRunner, CommandRunnersOf } from "./types";

/** Payload-less event — used only to prove events survive the registry's runner. */
class BeanPlanted extends DomainEvent {
	protected defineName(): string {
		return "bean.planted";
	}
}

const beanProperties = { name: StringVO };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Bean extends AccessorsOf<typeof beanProperties> {}
class Bean extends Entity<typeof beanProperties> {
	protected defineEntity(): EntityDefinition<typeof beanProperties> {
		return { properties: beanProperties, source: "bean" };
	}

	public plant(): void {
		this.raiseEvent(BeanPlanted);
	}
}

const renameTagProperties = { name: StringVO };
class RenameTagCommand extends Command<
	typeof renameTagProperties,
	void,
	string
> {
	protected defineCommand(): CommandDefinition<typeof renameTagProperties> {
		return { properties: renameTagProperties, source: "rename-tag" };
	}

	public async execute(): Promise<CommandResult<string>> {
		return { result: this.get("name"), events: [] };
	}
}

type PlantBeanDeps = { logger: { log(message: string): void } };
const plantBeanProperties = { name: StringVO };
class PlantBeanCommand extends Command<
	typeof plantBeanProperties,
	PlantBeanDeps,
	Bean
> {
	protected defineCommand(): CommandDefinition<typeof plantBeanProperties> {
		return { properties: plantBeanProperties, source: "plant-bean" };
	}

	public async execute({
		logger,
	}: PlantBeanDeps): Promise<CommandResult<Bean>> {
		logger.log("planting");
		const bean = new Bean({ name: this.get("name") });
		bean.plant();

		return { result: bean, events: bean.pullDomainEvents() };
	}
}

describe("commandRegistry", () => {
	it("registers and runs both a Deps-void command and a real-deps command from the same registry", async () => {
		const logs: string[] = [];
		const registry = commandRegistry({
			renameTag: RenameTagCommand,
			plantBean: PlantBeanCommand,
		}).withDependencies({ logger: { log: (m: string) => logs.push(m) } });

		const renamed = await registry.get("renameTag")({ name: "hello" });
		const planted = await registry.get("plantBean")({ name: "arabica" });

		expect(renamed.result).toBe("hello");
		expect(planted.result).toBeInstanceOf(Bean);
		expect(logs).toEqual(["planting"]);
	});

	it("threads the dependency record supplied once at withDependencies() through every execute() call", async () => {
		let calls = 0;
		const registry = commandRegistry({
			plantBean: PlantBeanCommand,
		}).withDependencies({
			logger: {
				log: () => {
					calls++;
				},
			},
		});

		await registry.get("plantBean")({ name: "a" });
		await registry.get("plantBean")({ name: "b" });

		expect(calls).toBe(2);
	});

	it("surfaces domain events raised inside a registered command's execute(), same envelope execute() itself returns", async () => {
		const registry = commandRegistry({
			plantBean: PlantBeanCommand,
		}).withDependencies({
			logger: { log: () => {} },
		});

		const { result, events } = await registry.get("plantBean")({
			name: "arabica",
		});

		expect(events).toHaveLength(1);
		expect(events[0]).toMatchObject({
			name: "bean.planted",
			aggregateId: result.id,
		});
	});

	it("rejects a key the spec never declared, at runtime", () => {
		const registry = commandRegistry({
			renameTag: RenameTagCommand,
		}).withDependencies({});

		try {
			registry.get("unknown" as never);
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(InvalidPropertyException);
			expect((error as InvalidPropertyException).property).toBe("unknown");
			expect((error as InvalidPropertyException).source).toBe(
				"command-registry",
			);
		}
	});

	it("blocks .get() at compile time for a command whose declared dependencies are not fully present in the provided record", () => {
		const registry = commandRegistry({
			renameTag: RenameTagCommand,
			plantBean: PlantBeanCommand,
		}).withDependencies({}); // sem `logger` nenhum

		registry.get("renameTag"); // still fine — Deps is void

		// @ts-expect-error — PlantBeanCommand needs `logger`, absent from this dependency record.
		registry.get("plantBean");
	});

	it("treats a Deps = void command as always registrable, regardless of what the dependency record contains", async () => {
		const registry = commandRegistry({
			renameTag: RenameTagCommand,
		}).withDependencies({
			somethingUnrelated: 42,
		});

		const { result } = await registry.get("renameTag")({ name: "hello" });

		expect(result).toBe("hello");
	});
});

type SecretsService = {
	check(hash: string, candidate: string): Promise<boolean>;
};

/** Reproduces the UpdateUser -> Login scenario: a command reusing another already-registered one. */
const userLoginProperties = { password: StringVO };
type UserLoginDeps = { secrets: SecretsService };
class UserLoginCommand extends Command<
	typeof userLoginProperties,
	UserLoginDeps,
	boolean
> {
	protected defineCommand(): CommandDefinition<typeof userLoginProperties> {
		return { properties: userLoginProperties, source: "user-login" };
	}

	public async execute({
		secrets,
	}: UserLoginDeps): Promise<CommandResult<boolean>> {
		const matches = await secrets.check("stored-hash", this.get("password"));
		return { result: matches, events: [] };
	}
}

const updateUserProperties = { password: StringVO };
type UpdateUserDeps = {
	secrets: SecretsService;
	commands: { login: CommandRunner<typeof UserLoginCommand> };
};
class UpdateUserCommand extends Command<
	typeof updateUserProperties,
	UpdateUserDeps,
	string
> {
	protected defineCommand(): CommandDefinition<typeof updateUserProperties> {
		return { properties: updateUserProperties, source: "update-user" };
	}

	public async execute({
		commands,
	}: UpdateUserDeps): Promise<CommandResult<string>> {
		const { result: authenticated } = await commands.login({
			password: this.get("password"),
		});

		return { result: authenticated ? "updated" : "unauthorized", events: [] };
	}
}

describe("RegistrableKeys — the depth flag", () => {
	it("caps the sibling bag at one hop: `false` sees only the raw record", () => {
		type Spec = {
			login: typeof UserLoginCommand;
			updateUser: typeof UpdateUserCommand;
		};
		type Deps = { secrets: SecretsService };
		type Assert<T extends true> = T;
		type Equal<A, B> =
			(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
				? true
				: false;

		// Depth 1 (the default `.get()` uses): `updateUser` becomes registrable
		// because `login` is reachable through the `commands` bag.
		type _Full = Assert<
			Equal<RegistrableKeys<Spec, Deps>, "login" | "updateUser">
		>;

		// Depth 0 (what `SiblingCommands` builds its key set from): only what
		// the raw record satisfies on its own. This is the former
		// `DirectlyRegistrableKeys`, now the same type at a different depth.
		type _Direct = Assert<Equal<RegistrableKeys<Spec, Deps, false>, "login">>;

		// Which is what keeps the bag itself from promising a sibling `.get()`
		// cannot prove safe.
		type _Bag = Assert<Equal<keyof SiblingCommands<Spec, Deps>, "login">>;

		expect(true).toBe(true);
	});
});

describe("commandRegistry — sibling command composition", () => {
	it("lets a command reach an already-registered sibling through deps.commands", async () => {
		const checked: Array<[string, string]> = [];
		const registry = commandRegistry({
			login: UserLoginCommand,
			updateUser: UpdateUserCommand,
		}).withDependencies({
			secrets: {
				check: async (hash: string, candidate: string) => {
					checked.push([hash, candidate]);
					return candidate === "correct";
				},
			},
		});

		const { result } = await registry.get("updateUser")({
			password: "correct",
		});

		expect(result).toBe("updated");
		expect(checked).toEqual([["stored-hash", "correct"]]);
	});

	it("keeps a directly-registrable sibling reachable both on its own and through another command", async () => {
		const registry = commandRegistry({
			login: UserLoginCommand,
			updateUser: UpdateUserCommand,
		}).withDependencies({
			secrets: {
				check: async (_hash: string, candidate: string) =>
					candidate === "correct",
			},
		});

		const direct = await registry.get("login")({ password: "correct" });
		const viaUpdateUser = await registry.get("updateUser")({
			password: "correct",
		});

		expect(direct.result).toBe(true);
		expect(viaUpdateUser.result).toBe("updated");
	});

	it("blocks .get() at compile time for a command whose sibling dependency is not itself directly registrable", () => {
		const registry = commandRegistry({
			login: UserLoginCommand,
			updateUser: UpdateUserCommand,
		}).withDependencies({}); // no `secrets` at all

		// @ts-expect-error — UserLoginCommand needs `secrets`, absent from this record.
		registry.get("login");
		// @ts-expect-error — UpdateUserCommand needs `commands.login`, which is itself
		// not directly registrable without `secrets` — the requirement propagates.
		registry.get("updateUser");
	});
});

/**
 * Two commands that call each other through `deps.commands` — neither is
 * `RegistrableKeys<Spec, Deps, false>` (each needs `commands` itself), so `.get()`
 * rejects both at compile time, same as the block above. Reaching them
 * still requires the same bypass any real cycle in this system needs: a
 * caller who sidesteps TypeScript, exactly as `RegistrableKeys`'s own TSDoc
 * says nothing stops at runtime.
 */
const cycleAProperties = { label: StringVO };
type CycleADeps = { commands: { b: CommandRunner<typeof CycleBCommand> } };
class CycleACommand extends Command<
	typeof cycleAProperties,
	CycleADeps,
	string
> {
	protected defineCommand(): CommandDefinition<typeof cycleAProperties> {
		return { properties: cycleAProperties, source: "cycle-a" };
	}

	public async execute({
		commands,
	}: CycleADeps): Promise<CommandResult<string>> {
		const { result } = await commands.b({ label: "b" });
		return { result, events: [] };
	}
}

const cycleBProperties = { label: StringVO };
type CycleBDeps = { commands: { a: CommandRunner<typeof CycleACommand> } };
class CycleBCommand extends Command<
	typeof cycleBProperties,
	CycleBDeps,
	string
> {
	protected defineCommand(): CommandDefinition<typeof cycleBProperties> {
		return { properties: cycleBProperties, source: "cycle-b" };
	}

	public async execute({
		commands,
	}: CycleBDeps): Promise<CommandResult<string>> {
		const { result } = await commands.a({ label: "a" });
		return { result, events: [] };
	}
}

describe("commandRegistry — sibling command cycles", () => {
	it("throws LoopDetectedException instead of recursing until the call stack overflows", async () => {
		const registry = commandRegistry({
			a: CycleACommand,
			b: CycleBCommand,
		}).withDependencies({});

		// Bypasses the compile-time gate the same way the spec's own "rejects a
		// key the spec never declared" test does — this pair is intentionally
		// not `RegistrableKeys` (see the comment above), so a second cast on
		// the returned runner is needed too: `Spec[never]` collapses the
		// payload type to `never` along with the key.
		const run = registry.get("a" as never) as CommandRunner<
			typeof CycleACommand
		>;

		try {
			await run({ label: "a" });
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(LoopDetectedException);
			expect((error as LoopDetectedException).source).toBe("command-registry");
		}
	});
});

describe("commandRegistry — direct key access", () => {
	it("runs a command through `registry.<key>(payload)` exactly as `.get(key)(payload)` does", async () => {
		const logs: string[] = [];
		const registry = commandRegistry({
			renameTag: RenameTagCommand,
			plantBean: PlantBeanCommand,
		}).withDependencies({ logger: { log: (m: string) => logs.push(m) } });

		const direct = await registry.renameTag({ name: "hello" });
		const explicit = await registry.get("renameTag")({ name: "hello" });
		const planted = await registry.plantBean({ name: "arabica" });

		expect(direct.result).toBe("hello");
		expect(direct.result).toBe(explicit.result);
		expect(planted.result).toBeInstanceOf(Bean);
		expect(planted.events.map((event) => event.name)).toEqual(["bean.planted"]);
		expect(logs).toEqual(["planting"]);
	});

	it("surfaces the same runner both ways — `.get(key)` and the accessor are one function", () => {
		const registry = commandRegistry({
			renameTag: RenameTagCommand,
		}).withDependencies({});

		expect(registry.renameTag).toBe(registry.get("renameTag"));
	});

	it("gates the accessor by the very same RegistrableKeys `.get()` is gated by", () => {
		const registry = commandRegistry({
			renameTag: RenameTagCommand,
			plantBean: PlantBeanCommand,
		}).withDependencies({}); // no `logger` at all

		// @ts-expect-error — PlantBeanCommand needs `logger`, absent from this dependency record.
		registry.plantBean;
		// `renameTag` declares `Deps = void`, so it stays reachable.
		expect(typeof registry.renameTag).toBe("function");
	});

	it("keys the accessor set by exactly RegistrableKeys, at the same depth", () => {
		type Spec = {
			login: typeof UserLoginCommand;
			updateUser: typeof UpdateUserCommand;
		};
		type Deps = { secrets: SecretsService };
		type Assert<T extends true> = T;
		type Equal<A, B> =
			(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
				? true
				: false;

		type _Keys = Assert<
			Equal<keyof CommandRunnersOf<Spec, Deps>, "login" | "updateUser">
		>;
		type _SameAsGate = Assert<
			Equal<keyof CommandRunnersOf<Spec, Deps>, RegistrableKeys<Spec, Deps>>
		>;

		expect(true).toBe(true);
	});

	it("composes siblings through the direct form", async () => {
		const registry = commandRegistry({
			login: UserLoginCommand,
			updateUser: UpdateUserCommand,
		}).withDependencies({
			secrets: {
				check: async (_hash: string, candidate: string) =>
					candidate === "correct",
			},
		});

		const { result } = await registry.updateUser({ password: "correct" });

		expect(result).toBe("updated");
	});

	it("still throws LoopDetectedException on a cycle reached through the direct form", async () => {
		const registry = commandRegistry({
			a: CycleACommand,
			b: CycleBCommand,
		}).withDependencies({});

		// Same compile-time bypass the `.get()` cycle test needs, for the same
		// reason: neither key is `RegistrableKeys`, so neither is an accessor
		// the type exposes — while the runtime installs both, as documented.
		const run = (
			registry as unknown as { a: CommandRunner<typeof CycleACommand> }
		).a;

		expect(run({ label: "a" })).rejects.toBeInstanceOf(LoopDetectedException);
	});

	it("throws PropertyNameCollisionException when a spec key collides with `get`", () => {
		const build = () =>
			commandRegistry({ get: RenameTagCommand }).withDependencies({});

		expect(build).toThrow(PropertyNameCollisionException);

		try {
			build();
			expect.unreachable("should have thrown");
		} catch (error) {
			expect((error as PropertyNameCollisionException).property).toBe("get");
			expect((error as PropertyNameCollisionException).source).toBe(
				"command-registry",
			);
		}
	});

	it("rejects a key inherited from Object.prototype too, not only an own member", () => {
		const build = () =>
			commandRegistry({ toString: RenameTagCommand }).withDependencies({});

		expect(build).toThrow(PropertyNameCollisionException);
	});
});
