import { Command } from "@/application/command";
import { transactional } from "@/application/command/decorators";
import { defineUseCase } from "@/application/command/helpers";
import { customStringVO } from "@/domain/collections/value-objects/custom";
import type {
	CommandDefinition,
	CommandResult,
} from "@/application/command/types";
import { NumberVO, StringVO } from "@/domain/collections/value-objects";
import { DomainEvent, defineDomainEvent } from "@/domain/domain-event";
import type { IDomainEvent } from "@/domain/domain-event/types";
import { Entity } from "@/domain/entity";
import { entityOf } from "@/domain/entity/helpers";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { LoopDetectedException } from "@roastery/terroir/exceptions/application";
import {
	InvalidPropertyException,
	PropertyNameCollisionException,
} from "@roastery/terroir/exceptions/domain";
import { describe, expect, it, spyOn } from "bun:test";
import { commands } from "./commands";
import { defineEventHandler } from "./define-event-handler";
import type { RegistrableKeys } from "./types/registrable-keys.type";
import type { SiblingCommands } from "./types/sibling-commands.type";
import type {
	CommandRunner,
	CommandRunnersOf,
	IEventEmitter,
	IEventHandler,
	TransactionBoundary,
} from "./types";

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

describe("commands", () => {
	it("registers and runs both a Deps-void command and a real-deps command from the same registry", async () => {
		const logs: string[] = [];
		const registry = commands({
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
		const registry = commands({
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
		const registry = commands({
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
		const registry = commands({
			renameTag: RenameTagCommand,
		}).withDependencies({});

		try {
			registry.get("unknown" as never);
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(InvalidPropertyException);
			expect((error as InvalidPropertyException).property).toBe("unknown");
			expect((error as InvalidPropertyException).source).toBe("commands");
		}
	});

	it("blocks .get() at compile time for a command whose declared dependencies are not fully present in the provided record", () => {
		const registry = commands({
			renameTag: RenameTagCommand,
			plantBean: PlantBeanCommand,
		}).withDependencies({}); // sem `logger` nenhum

		registry.get("renameTag"); // still fine — Deps is void

		// @ts-expect-error — PlantBeanCommand needs `logger`, absent from this dependency record.
		registry.get("plantBean");
	});

	it("treats a Deps = void command as always registrable, regardless of what the dependency record contains", async () => {
		const registry = commands({
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

describe("commands — sibling command composition", () => {
	it("lets a command reach an already-registered sibling through deps.commands", async () => {
		const checked: Array<[string, string]> = [];
		const registry = commands({
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
		const registry = commands({
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
		const registry = commands({
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

describe("commands — sibling command cycles", () => {
	it("throws LoopDetectedException instead of recursing until the call stack overflows", async () => {
		const registry = commands({
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
			expect((error as LoopDetectedException).source).toBe("commands");
		}
	});
});

describe("commands — direct key access", () => {
	it("runs a command through `registry.<key>(payload)` exactly as `.get(key)(payload)` does", async () => {
		const logs: string[] = [];
		const registry = commands({
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
		const registry = commands({
			renameTag: RenameTagCommand,
		}).withDependencies({});

		expect(registry.renameTag).toBe(registry.get("renameTag"));
	});

	it("gates the accessor by the very same RegistrableKeys `.get()` is gated by", () => {
		const registry = commands({
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
		const registry = commands({
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
		const registry = commands({
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
			commands({ get: RenameTagCommand }).withDependencies({});

		expect(build).toThrow(PropertyNameCollisionException);

		try {
			build();
			expect.unreachable("should have thrown");
		} catch (error) {
			expect((error as PropertyNameCollisionException).property).toBe("get");
			expect((error as PropertyNameCollisionException).source).toBe("commands");
		}
	});

	it("rejects a key inherited from Object.prototype too, not only an own member", () => {
		const build = () =>
			commands({ toString: RenameTagCommand }).withDependencies({});

		expect(build).toThrow(PropertyNameCollisionException);
	});
});

class OrderConfirmed extends DomainEvent {
	public constructor(
		aggregateId: string,
		public readonly total: number,
	) {
		super(aggregateId);
	}

	protected defineName(): string {
		return "order.confirmed";
	}
}

class ReceiptSent extends DomainEvent {
	protected defineName(): string {
		return "receipt.sent";
	}
}

const orderProperties = { total: NumberVO };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Order extends AccessorsOf<typeof orderProperties> {}
class Order extends Entity<typeof orderProperties> {
	protected defineEntity(): EntityDefinition<typeof orderProperties> {
		return { properties: orderProperties, source: "order" };
	}

	public confirm(): void {
		this.raiseEvent(new OrderConfirmed(this.id, this.get("total")));
	}
}

const receiptProperties = { orderId: StringVO };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Receipt extends AccessorsOf<typeof receiptProperties> {}
class Receipt extends Entity<typeof receiptProperties> {
	protected defineEntity(): EntityDefinition<typeof receiptProperties> {
		return { properties: receiptProperties, source: "receipt" };
	}

	public send(): void {
		this.raiseEvent(ReceiptSent);
	}
}

const confirmOrderProperties = { total: NumberVO };
class ConfirmOrderCommand extends Command<
	typeof confirmOrderProperties,
	void,
	Order
> {
	protected defineCommand(): CommandDefinition<typeof confirmOrderProperties> {
		return { properties: confirmOrderProperties, source: "confirm-order" };
	}

	public async execute(): Promise<CommandResult<Order>> {
		const order = new Order({ total: this.get("total") });
		order.confirm();
		return { result: order, events: order.pullDomainEvents() };
	}
}

type SendReceiptDeps = {
	mailer: { send(orderId: string, total: number): void };
};
const sendReceiptProperties = { orderId: StringVO, total: NumberVO };
class SendReceiptCommand extends Command<
	typeof sendReceiptProperties,
	SendReceiptDeps,
	void
> {
	protected defineCommand(): CommandDefinition<typeof sendReceiptProperties> {
		return { properties: sendReceiptProperties, source: "send-receipt" };
	}

	public async execute({
		mailer,
	}: SendReceiptDeps): Promise<CommandResult<void>> {
		mailer.send(this.get("orderId"), this.get("total"));
		const receipt = new Receipt({ orderId: this.get("orderId") });
		receipt.send();
		return { result: undefined, events: receipt.pullDomainEvents() };
	}
}

type SendReceiptOnOrderConfirmedDeps = {
	commands: { sendReceipt: CommandRunner<typeof SendReceiptCommand> };
};
class SendReceiptOnOrderConfirmed
	implements IEventHandler<OrderConfirmed, SendReceiptOnOrderConfirmedDeps>
{
	public async handle(
		event: OrderConfirmed,
		deps: SendReceiptOnOrderConfirmedDeps,
	): Promise<void> {
		await deps.commands.sendReceipt({
			orderId: event.aggregateId,
			total: event.total,
		});
	}
}

type TrackerDeps = { tracker: { record(label: string): void } };

class RecordFirst implements IEventHandler<OrderConfirmed, TrackerDeps> {
	public async handle(
		_event: OrderConfirmed,
		deps: TrackerDeps,
	): Promise<void> {
		deps.tracker.record("first");
	}
}

class RecordSecond implements IEventHandler<OrderConfirmed, TrackerDeps> {
	public async handle(
		_event: OrderConfirmed,
		deps: TrackerDeps,
	): Promise<void> {
		deps.tracker.record("second");
	}
}

class ThrowingHandler implements IEventHandler<OrderConfirmed, unknown> {
	public async handle(): Promise<void> {
		throw new Error("boom");
	}
}

class RecordReceiptSent implements IEventHandler<ReceiptSent, TrackerDeps> {
	public async handle(_event: ReceiptSent, deps: TrackerDeps): Promise<void> {
		deps.tracker.record("receipt.sent");
	}
}

/** Raises `OrderConfirmed` again — the command a cyclic reaction dispatches. */
const repeatOrderProperties = { total: NumberVO };
class RepeatOrderCommand extends Command<
	typeof repeatOrderProperties,
	void,
	Order
> {
	protected defineCommand(): CommandDefinition<typeof repeatOrderProperties> {
		return { properties: repeatOrderProperties, source: "repeat-order" };
	}

	public async execute(): Promise<CommandResult<Order>> {
		const order = new Order({ total: this.get("total") });
		order.confirm();
		return { result: order, events: order.pullDomainEvents() };
	}
}

type RepublishOnOrderConfirmedDeps = {
	commands: { repeatOrder: CommandRunner<typeof RepeatOrderCommand> };
};
class RepublishOnOrderConfirmed
	implements IEventHandler<OrderConfirmed, RepublishOnOrderConfirmedDeps>
{
	public async handle(
		event: OrderConfirmed,
		deps: RepublishOnOrderConfirmedDeps,
	): Promise<void> {
		await deps.commands.repeatOrder({ total: event.total });
	}
}

/**
 * Reaches `sendReceipt` through `deps.commands` — the fixture behind the
 * "one bag" guarantee: whatever the sibling raises is published and reacted
 * to exactly as if it had been dispatched from outside.
 */
type ConfirmAndBillDeps = {
	mailer: { send(orderId: string, total: number): void };
	commands: { sendReceipt: CommandRunner<typeof SendReceiptCommand> };
};
const confirmAndBillProperties = { total: NumberVO };
class ConfirmAndBillCommand extends Command<
	typeof confirmAndBillProperties,
	ConfirmAndBillDeps,
	Order
> {
	protected defineCommand(): CommandDefinition<
		typeof confirmAndBillProperties
	> {
		return { properties: confirmAndBillProperties, source: "confirm-and-bill" };
	}

	public async execute({
		commands: siblings,
	}: ConfirmAndBillDeps): Promise<CommandResult<Order>> {
		const order = new Order({ total: this.get("total") });
		order.confirm();

		await siblings.sendReceipt({
			orderId: order.id,
			total: this.get("total"),
		});

		return { result: order, events: order.pullDomainEvents() };
	}
}

function fakeEmitter(): IEventEmitter & { readonly emitted: unknown[] } {
	const emitted: unknown[] = [];
	return {
		emitted,
		emit(event) {
			emitted.push(event);
		},
	};
}

describe("commands — with an emitter", () => {
	it("emits every event a command's CommandResult carries, automatically", async () => {
		const emitter = fakeEmitter();
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand, sendReceipt: SendReceiptCommand },
			{ emitter: emitter },
		).withDependencies({ mailer: { send: () => {} } });

		await registry.get("confirmOrder")({ total: 42 });

		expect(emitter.emitted).toHaveLength(1);
		expect(emitter.emitted[0]).toMatchObject({
			name: "order.confirmed",
			total: 42,
		});
	});

	it("awaits a reaction that dispatches another command through deps.commands", async () => {
		const sent: Array<[string, number]> = [];
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand, sendReceipt: SendReceiptCommand },
			{ emitter: fakeEmitter() },
		)
			.withDependencies({
				mailer: {
					send: (orderId: string, total: number) => sent.push([orderId, total]),
				},
			})
			.on(OrderConfirmed, SendReceiptOnOrderConfirmed);

		const { result } = await registry.get("confirmOrder")({ total: 100 });

		expect(sent).toEqual([[result.id, 100]]);
	});

	it("runs every handler registered for the same event, in registration order", async () => {
		const calls: string[] = [];
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand },
			{ emitter: fakeEmitter() },
		)
			.withDependencies({
				tracker: { record: (label: string) => calls.push(label) },
			})
			.on(OrderConfirmed, RecordFirst)
			.on(OrderConfirmed, RecordSecond);

		await registry.get("confirmOrder")({ total: 1 });

		expect(calls).toEqual(["first", "second"]);
	});

	it("isolates a throwing handler: sibling handlers and the original result are unaffected", async () => {
		const calls: string[] = [];
		const errors: unknown[] = [];
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand },
			{
				emitter: fakeEmitter(),
				onError: (error) => {
					errors.push(error);
				},
			},
		)
			.withDependencies({
				tracker: { record: (label: string) => calls.push(label) },
			})
			.on(OrderConfirmed, ThrowingHandler)
			.on(OrderConfirmed, RecordSecond);

		const { result } = await registry.get("confirmOrder")({ total: 7 });

		expect(result).toBeInstanceOf(Order);
		expect(calls).toEqual(["second"]);
		expect(errors).toHaveLength(1);
		expect((errors[0] as Error).message).toBe("boom");
	});

	it("is a no-op when nothing is registered for the raised event", async () => {
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand },
			{ emitter: fakeEmitter() },
		).withDependencies({});

		const { result, events } = await registry.get("confirmOrder")({
			total: 3,
		});

		expect(result).toBeInstanceOf(Order);
		expect(events).toHaveLength(1);
	});

	it("calls onError with the error and the event that caused it", async () => {
		let captured: { error: unknown; eventName: string } | undefined;
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand },
			{
				emitter: fakeEmitter(),
				onError: (error, { event }) => {
					captured = { error, eventName: event.name };
				},
			},
		)
			.withDependencies({})
			.on(OrderConfirmed, ThrowingHandler);

		await registry.get("confirmOrder")({ total: 9 });

		expect(captured!.eventName).toBe("order.confirmed");
		expect((captured!.error as Error).message).toBe("boom");
	});

	// A failing bus is not a failing command. By the time `emit` is reached the
	// command has resolved — and, in a transactional registry, committed — so
	// rejecting its `CommandResult` would report failure for something that
	// succeeded, inviting a retry that applies the whole operation twice.
	it("isolates a throwing emitter, and still resolves the command that raised", async () => {
		let captured: { error: unknown; eventName: string } | undefined;
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand },
			{
				emitter: {
					emit: () => {
						throw new Error("bus is down");
					},
				},
				onError: (error, { event }) => {
					captured = { error, eventName: event.name };
				},
			},
		).withDependencies({});

		const { result } = await registry.get("confirmOrder")({ total: 5 });

		expect(result).toBeInstanceOf(Order);
		expect(captured!.eventName).toBe("order.confirmed");
		expect((captured!.error as Error).message).toBe("bus is down");
	});

	it("falls back to the default when onError throws while handling a failed publish", async () => {
		const scheduled: (() => void)[] = [];
		const spy = spyOn(globalThis, "queueMicrotask").mockImplementation(
			(task: () => void) => {
				scheduled.push(task);
			},
		);

		try {
			const registry = commands(
				{ confirmOrder: ConfirmOrderCommand },
				{
					emitter: {
						emit: () => {
							throw new Error("bus is down");
						},
					},
					onError: () => {
						throw new Error("the hook exploded too");
					},
				},
			).withDependencies({});

			const { result } = await registry.get("confirmOrder")({ total: 9 });

			// Nowhere left to escalate to without giving up isolation, so the
			// hook's own failure takes the unconditional fallback — and the
			// command that already committed still resolves.
			expect(result).toBeInstanceOf(Order);
			expect(scheduled).toHaveLength(1);
			expect(scheduled[0]).toThrow("the hook exploded too");
		} finally {
			spy.mockRestore();
		}
	});

	it("still runs the reactions of an event the emitter failed to publish", async () => {
		const reacted: string[] = [];
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand },
			{
				emitter: {
					emit: () => {
						throw new Error("bus is down");
					},
				},
				onError: () => {},
			},
		)
			.withDependencies({})
			.on(
				OrderConfirmed,
				defineEventHandler<OrderConfirmed, unknown>(async (event) => {
					reacted.push(event.name);
				}),
			);

		await registry.get("confirmOrder")({ total: 5 });

		// Reactions are internal to the registry and never depended on the bus.
		expect(reacted).toEqual(["order.confirmed"]);
	});

	// The `onError = defaultOnError` default in the options destructuring: with
	// no hook configured, a throwing reaction must still be isolated, and the
	// command that raised the event must still resolve.
	it("isolates a throwing reaction with no onError configured at all", async () => {
		const scheduled: (() => void)[] = [];
		const spy = spyOn(globalThis, "queueMicrotask").mockImplementation(
			(task: () => void) => {
				scheduled.push(task);
			},
		);

		try {
			const registry = commands(
				{ confirmOrder: ConfirmOrderCommand },
				{ emitter: fakeEmitter() },
			)
				.withDependencies({})
				.on(OrderConfirmed, ThrowingHandler);

			const { result } = await registry.get("confirmOrder")({ total: 9 });

			expect(result).toBeInstanceOf(Order);
			expect(scheduled).toHaveLength(1);
			expect(scheduled[0]).toThrow("boom");
		} finally {
			spy.mockRestore();
		}
	});

	// The second-level fallback: the hook itself failing has nowhere left to
	// escalate to without giving up isolation, so it falls back to
	// `defaultOnError` regardless of what `onError` was configured to.
	it("falls back to the default when onError itself throws", async () => {
		const scheduled: (() => void)[] = [];
		const spy = spyOn(globalThis, "queueMicrotask").mockImplementation(
			(task: () => void) => {
				scheduled.push(task);
			},
		);

		try {
			const registry = commands(
				{ confirmOrder: ConfirmOrderCommand },
				{
					emitter: fakeEmitter(),
					onError: () => {
						throw new Error("the hook exploded too");
					},
				},
			)
				.withDependencies({})
				.on(OrderConfirmed, ThrowingHandler);

			const { result } = await registry.get("confirmOrder")({ total: 9 });

			// Still resolved: neither failure may reject the CommandResult.
			expect(result).toBeInstanceOf(Order);
			expect(scheduled).toHaveLength(1);
			expect(scheduled[0]).toThrow("the hook exploded too");
		} finally {
			spy.mockRestore();
		}
	});

	it("chains a reaction into a triggered command's own events reaching a second reaction", async () => {
		const calls: string[] = [];
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand, sendReceipt: SendReceiptCommand },
			{ emitter: fakeEmitter() },
		)
			.withDependencies({
				mailer: { send: () => {} },
				tracker: { record: (label: string) => calls.push(label) },
			})
			.on(OrderConfirmed, SendReceiptOnOrderConfirmed)
			.on(ReceiptSent, RecordReceiptSent);

		await registry.get("confirmOrder")({ total: 50 });

		expect(calls).toEqual(["receipt.sent"]);
	});

	it("isolates a reaction cycle instead of recursing until the call stack overflows", async () => {
		const errors: unknown[] = [];
		const emitter = fakeEmitter();
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand, repeatOrder: RepeatOrderCommand },
			{
				emitter: emitter,
				onError: (error) => {
					errors.push(error);
				},
			},
		)
			.withDependencies({})
			.on(OrderConfirmed, RepublishOnOrderConfirmed);

		const { result } = await registry.get("confirmOrder")({ total: 12 });

		expect(result).toBeInstanceOf(Order);
		expect(errors).toHaveLength(1);
		expect(errors[0]).toBeInstanceOf(LoopDetectedException);
		expect((errors[0] as LoopDetectedException).source).toBe("commands");
		// `order.confirmed` was emitted exactly twice — once from
		// `confirmOrder`, once from the reaction's own `repeatOrder` — and no
		// more: the cycle was caught before a third round, not left to recurse.
		expect(emitter.emitted).toHaveLength(2);
	});
});

describe("commands — compile-time gating", () => {
	it("blocks .on() at compile time for a handler whose sibling dependency is not itself directly registrable", () => {
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand },
			{
				emitter: fakeEmitter(), // no `sendReceipt` in this spec
			},
		).withDependencies({});

		// @ts-expect-error — SendReceiptOnOrderConfirmed needs `commands.sendReceipt`,
		// which this spec never registers.
		registry.on(OrderConfirmed, SendReceiptOnOrderConfirmed);
	});

	it("blocks .on() at compile time for a handler whose declared event does not match eventClass", () => {
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand, sendReceipt: SendReceiptCommand },
			{ emitter: fakeEmitter() },
		).withDependencies({ mailer: { send: () => {} } });

		// @ts-expect-error — SendReceiptOnOrderConfirmed handles OrderConfirmed, not ReceiptSent.
		registry.on(ReceiptSent, SendReceiptOnOrderConfirmed);
	});
});

describe("commands — what the emitter changes", () => {
	// The two overloads, from the outside: no `options` means no `.on()` in
	// the type *and* none on the object, which is also why a spec key
	// literally called `on` is only a collision for the evented form.
	it("has no .on() at all without options, in the type and at runtime", () => {
		const registry = commands({
			confirmOrder: ConfirmOrderCommand,
		}).withDependencies({});

		expect("on" in registry).toBe(false);
		// @ts-expect-error — `.on()` belongs to the overload taking `options`.
		registry.on;
	});

	it("rejects onError without an emitter at compile time", () => {
		// @ts-expect-error — `emitter` is required inside `options`: isolating
		// reactions that could never be registered is a mistake, not a default.
		commands({ confirmOrder: ConfirmOrderCommand }, { onError: () => {} });

		expect(true).toBe(true);
	});

	it("leaves `on` usable as a spec key when there is no emitter to publish through", async () => {
		const registry = commands({ on: ConfirmOrderCommand }).withDependencies({});

		const { result } = await registry.on({ total: 5 });

		expect(result).toBeInstanceOf(Order);
	});

	it("still surfaces raised events in the CommandResult with no emitter at all", async () => {
		const registry = commands({
			confirmOrder: ConfirmOrderCommand,
		}).withDependencies({});

		const { events } = await registry.confirmOrder({ total: 11 });

		expect(events.map((event) => event.name)).toEqual(["order.confirmed"]);
	});

	// One bag, every path: the events of a command reached through
	// `deps.commands` used to reach no emitter at all, because that bag came
	// from a second, undecorated registry built underneath this one.
	it("publishes and reacts for a command reached through deps.commands, exactly as for one reached from outside", async () => {
		const emitter = fakeEmitter();
		const reacted: string[] = [];
		const registry = commands(
			{
				confirmAndBill: ConfirmAndBillCommand,
				sendReceipt: SendReceiptCommand,
			},
			{ emitter },
		)
			.withDependencies({
				mailer: { send: () => {} },
				tracker: { record: (label: string) => reacted.push(label) },
			})
			.on(ReceiptSent, RecordReceiptSent);

		await registry.confirmAndBill({ total: 30 });

		// `receipt.sent` first: the sibling ran, published and was reacted to
		// inside the outer command's own `execute()`, before it resolved.
		expect(
			emitter.emitted.map((event) => (event as IDomainEvent).name),
		).toEqual(["receipt.sent", "order.confirmed"]);
		expect(reacted).toEqual(["receipt.sent"]);
	});
});

describe("commands — with an emitter, direct key access", () => {
	it("auto-publishes and reacts through the direct form exactly as `.get()` does", async () => {
		const emitter = fakeEmitter();
		const sent: Array<[string, number]> = [];
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand, sendReceipt: SendReceiptCommand },
			{ emitter: emitter },
		)
			.withDependencies({
				mailer: {
					send: (orderId: string, total: number) => sent.push([orderId, total]),
				},
			})
			.on(OrderConfirmed, SendReceiptOnOrderConfirmed);

		const { result } = await registry.confirmOrder({ total: 100 });

		// The reaction — and the command it dispatched — already ran by the
		// time the direct call resolved, same guarantee `.get()` carries.
		expect(sent).toEqual([[result.id, 100]]);
		expect(
			emitter.emitted.map((event) => (event as IDomainEvent).name),
		).toEqual(["order.confirmed", "receipt.sent"]);
	});

	it("hands back one runner for both forms, and it is the publishing one", async () => {
		const emitter = fakeEmitter();
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand },
			{ emitter: emitter },
		).withDependencies({});

		expect(registry.confirmOrder).toBe(registry.get("confirmOrder"));

		await registry.confirmOrder({ total: 7 });

		expect(emitter.emitted).toHaveLength(1);
	});

	it("keeps the accessors on the identity `.on()` gives back, so chaining preserves them", async () => {
		const calls: string[] = [];
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand },
			{ emitter: fakeEmitter() },
		)
			.withDependencies({
				tracker: { record: (label: string) => calls.push(label) },
			})
			.on(OrderConfirmed, RecordFirst)
			.on(OrderConfirmed, RecordSecond);

		await registry.confirmOrder({ total: 1 });

		expect(calls).toEqual(["first", "second"]);
	});

	it("throws PropertyNameCollisionException for a spec key colliding with `get` or `on`", () => {
		const collidesWithGet = () =>
			commands(
				{ get: ConfirmOrderCommand },
				{ emitter: fakeEmitter() },
			).withDependencies({});
		const collidesWithOn = () =>
			commands(
				{ on: ConfirmOrderCommand },
				{ emitter: fakeEmitter() },
			).withDependencies({});

		expect(collidesWithGet).toThrow(PropertyNameCollisionException);
		expect(collidesWithOn).toThrow(PropertyNameCollisionException);

		try {
			collidesWithOn();
			expect.unreachable("should have thrown");
		} catch (error) {
			expect((error as PropertyNameCollisionException).property).toBe("on");
			expect((error as PropertyNameCollisionException).source).toBe("commands");
		}
	});
});

// ---------------------------------------------------------------------------
// Transactions
//
// Fixtures are dedicated rather than shared with the blocks above: the
// `transactional` decorator *mutates* the class it marks, so decorating any
// fixture reused elsewhere would silently make those registries transactional
// too the moment one of them was given a `transaction` option.
// ---------------------------------------------------------------------------

/** One shared trace array — every fixture below appends to it, in order. */
type TraceDeps = { trace: string[] };

/**
 * A boundary that records its own begin/commit/rollback around the work,
 * so a single trace array proves the ordering claim end to end.
 */
function tracingBoundary(trace: string[]): TransactionBoundary {
	return async <T>(work: () => Promise<T>): Promise<T> => {
		trace.push("begin");

		try {
			const value = await work();
			trace.push("commit");
			return value;
		} catch (error) {
			trace.push("rollback");
			throw error;
		}
	};
}

const settleOrderProperties = { total: NumberVO };

@transactional
class SettleOrderCommand extends Command<
	typeof settleOrderProperties,
	TraceDeps,
	Order
> {
	protected defineCommand(): CommandDefinition<typeof settleOrderProperties> {
		return { properties: settleOrderProperties, source: "settle-order" };
	}

	public async execute({ trace }: TraceDeps): Promise<CommandResult<Order>> {
		trace.push("settle-order");
		const order = new Order({ total: this.get("total") });
		order.confirm();
		return { result: order, events: order.pullDomainEvents() };
	}
}

/** Unmarked on purpose — the control for "a runner wraps only what is marked". */
class AuditOrderCommand extends Command<
	typeof settleOrderProperties,
	TraceDeps,
	number
> {
	protected defineCommand(): CommandDefinition<typeof settleOrderProperties> {
		return { properties: settleOrderProperties, source: "audit-order" };
	}

	public async execute({ trace }: TraceDeps): Promise<CommandResult<number>> {
		trace.push("audit-order");
		return { result: this.get("total"), events: [] };
	}
}

/** Marked *and* reached as a sibling — the nested-inheritance fixture. */
@transactional
class ReserveStockCommand extends Command<
	typeof settleOrderProperties,
	TraceDeps,
	number
> {
	protected defineCommand(): CommandDefinition<typeof settleOrderProperties> {
		return { properties: settleOrderProperties, source: "reserve-stock" };
	}

	public async execute({ trace }: TraceDeps): Promise<CommandResult<number>> {
		trace.push("reserve-stock");
		return { result: this.get("total"), events: [] };
	}
}

type PlaceOrderDeps = TraceDeps & {
	commands: { reserveStock: CommandRunner<typeof ReserveStockCommand> };
};

@transactional
class PlaceOrderCommand extends Command<
	typeof settleOrderProperties,
	PlaceOrderDeps,
	Order
> {
	protected defineCommand(): CommandDefinition<typeof settleOrderProperties> {
		return { properties: settleOrderProperties, source: "place-order" };
	}

	public async execute({
		trace,
		commands: siblings,
	}: PlaceOrderDeps): Promise<CommandResult<Order>> {
		trace.push("place-order");
		await siblings.reserveStock({ total: this.get("total") });

		const order = new Order({ total: this.get("total") });
		order.confirm();
		return { result: order, events: order.pullDomainEvents() };
	}
}

/** A nested event, so the publication point of a *nested* command is observable. */
class StockReserved extends DomainEvent {
	protected defineName(): string {
		return "stock.reserved";
	}
}

/**
 * Marked, reached as a sibling, and — unlike `ReserveStockCommand` — it
 * actually raises. That difference is the whole point: with `events: []` the
 * nested runner's publication loop never runs, which is exactly why publishing
 * inside an open boundary went unnoticed.
 */
@transactional
class AnnounceStockCommand extends Command<
	typeof settleOrderProperties,
	TraceDeps,
	number
> {
	protected defineCommand(): CommandDefinition<typeof settleOrderProperties> {
		return { properties: settleOrderProperties, source: "announce-stock" };
	}

	public async execute({ trace }: TraceDeps): Promise<CommandResult<number>> {
		trace.push("announce-stock");

		return {
			result: this.get("total"),
			events: [new StockReserved("stock-1")],
		};
	}
}

type PlaceAndAnnounceDeps = TraceDeps & {
	commands: { announceStock: CommandRunner<typeof AnnounceStockCommand> };
};

/** Opens the boundary, then dispatches a nested command that raises. */
@transactional
class PlaceAndAnnounceCommand extends Command<
	typeof settleOrderProperties,
	PlaceAndAnnounceDeps,
	number
> {
	protected defineCommand(): CommandDefinition<typeof settleOrderProperties> {
		return { properties: settleOrderProperties, source: "place-and-announce" };
	}

	public async execute({
		trace,
		commands: siblings,
	}: PlaceAndAnnounceDeps): Promise<CommandResult<number>> {
		trace.push("place-and-announce:start");
		await siblings.announceStock({ total: this.get("total") });
		trace.push("place-and-announce:end");

		return { result: this.get("total"), events: [] };
	}
}

/** Opens the boundary, dispatches a raising nested command, then rejects. */
@transactional
class FailAfterAnnounceCommand extends Command<
	typeof settleOrderProperties,
	PlaceAndAnnounceDeps,
	never
> {
	protected defineCommand(): CommandDefinition<typeof settleOrderProperties> {
		return { properties: settleOrderProperties, source: "fail-after-announce" };
	}

	public async execute({
		trace,
		commands: siblings,
	}: PlaceAndAnnounceDeps): Promise<CommandResult<never>> {
		trace.push("fail-after-announce");
		await siblings.announceStock({ total: this.get("total") });

		throw new Error("write failed");
	}
}

/** Rejects after the boundary opened — the rollback fixture. */
@transactional
class FailingSettleCommand extends Command<
	typeof settleOrderProperties,
	TraceDeps,
	never
> {
	protected defineCommand(): CommandDefinition<typeof settleOrderProperties> {
		return { properties: settleOrderProperties, source: "failing-settle" };
	}

	public async execute({ trace }: TraceDeps): Promise<CommandResult<never>> {
		trace.push("failing-settle");
		throw new Error("write failed");
	}
}

type SettleOnOrderConfirmedDeps = TraceDeps & {
	commands: { reserveStock: CommandRunner<typeof ReserveStockCommand> };
};

/** Dispatches a *marked* command from inside a reaction. */
class ReserveOnOrderConfirmed
	implements IEventHandler<OrderConfirmed, SettleOnOrderConfirmedDeps>
{
	public async handle(
		event: OrderConfirmed,
		deps: SettleOnOrderConfirmedDeps,
	): Promise<void> {
		await deps.commands.reserveStock({ total: event.total });
	}
}

describe("commands — with a transaction", () => {
	it("commits before publishing and reacting, never inside the boundary", async () => {
		const trace: string[] = [];
		const emitter: IEventEmitter = {
			emit: () => {
				trace.push("emit");
			},
		};
		const registry = commands(
			{ settleOrder: SettleOrderCommand },
			{ emitter, transaction: tracingBoundary(trace) },
		)
			.withDependencies({ trace })
			.on(
				OrderConfirmed,
				defineEventHandler<OrderConfirmed, TraceDeps>(async (_event, deps) => {
					deps.trace.push("react");
				}),
			);

		await registry.settleOrder({ total: 10 });

		expect(trace).toEqual(["begin", "settle-order", "commit", "emit", "react"]);
	});

	it("lets a nested command inherit the open boundary instead of opening a second one", async () => {
		const trace: string[] = [];
		const registry = commands(
			{ placeOrder: PlaceOrderCommand, reserveStock: ReserveStockCommand },
			{ transaction: tracingBoundary(trace) },
		).withDependencies({ trace });

		await registry.placeOrder({ total: 5 });

		// `reserve-stock` is marked too, and still no second begin/commit pair.
		expect(trace).toEqual(["begin", "place-order", "reserve-stock", "commit"]);
	});

	it("opens a fresh boundary for a command dispatched by a reaction, after the original committed", async () => {
		const trace: string[] = [];
		const registry = commands(
			{ settleOrder: SettleOrderCommand, reserveStock: ReserveStockCommand },
			{ emitter: fakeEmitter(), transaction: tracingBoundary(trace) },
		)
			.withDependencies({ trace })
			.on(OrderConfirmed, ReserveOnOrderConfirmed);

		await registry.settleOrder({ total: 5 });

		expect(trace).toEqual([
			"begin",
			"settle-order",
			"commit",
			"begin",
			"reserve-stock",
			"commit",
		]);
	});

	it("publishes a nested command's events after the boundary closed, not inside it", async () => {
		const trace: string[] = [];
		const emitter: IEventEmitter = {
			emit: (event) => {
				trace.push(`emit:${event.name}`);
			},
		};
		const registry = commands(
			{
				announceStock: AnnounceStockCommand,
				placeAndAnnounce: PlaceAndAnnounceCommand,
			},
			{ emitter, transaction: tracingBoundary(trace) },
		)
			.withDependencies({ trace })
			.on(
				StockReserved,
				defineEventHandler<StockReserved, TraceDeps>(async (_event, deps) => {
					deps.trace.push("react");
				}),
			);

		await registry.placeAndAnnounce({ total: 4 });

		// The nested command resolved long before `commit`, and its event still
		// waits for it: a boundary is open above, so publication is not its call
		// to make.
		expect(trace).toEqual([
			"begin",
			"place-and-announce:start",
			"announce-stock",
			"place-and-announce:end",
			"commit",
			"emit:stock.reserved",
			"react",
		]);
	});

	it("opens no second boundary for a command a nested event's reaction dispatches", async () => {
		const trace: string[] = [];
		const registry = commands(
			{
				announceStock: AnnounceStockCommand,
				placeAndAnnounce: PlaceAndAnnounceCommand,
				reserveStock: ReserveStockCommand,
			},
			{ emitter: fakeEmitter(), transaction: tracingBoundary(trace) },
		)
			.withDependencies({ trace })
			.on(
				StockReserved,
				defineEventHandler<StockReserved, SettleOnOrderConfirmedDeps>(
					async (_event, deps) => {
						deps.trace.push("react:start");
						await deps.commands.reserveStock({ total: 1 });
						deps.trace.push("react:end");
					},
				),
			);

		await registry.placeAndAnnounce({ total: 4 });

		// The outer pair closes before the reaction starts, so the boundary the
		// reaction's command opens is a fresh one — never a second `begin` nested
		// inside the first, which no adapter has to be reentrant to survive.
		expect(trace).toEqual([
			"begin",
			"place-and-announce:start",
			"announce-stock",
			"place-and-announce:end",
			"commit",
			"react:start",
			"begin",
			"reserve-stock",
			"commit",
			"react:end",
		]);
	});

	it("publishes nothing a nested command raised when the boundary rolls back", async () => {
		const trace: string[] = [];
		const emitter = fakeEmitter();
		const registry = commands(
			{
				announceStock: AnnounceStockCommand,
				failAfterAnnounce: FailAfterAnnounceCommand,
			},
			{ emitter, transaction: tracingBoundary(trace) },
		).withDependencies({ trace });

		await expect(registry.failAfterAnnounce({ total: 2 })).rejects.toThrow(
			"write failed",
		);

		expect(trace).toEqual([
			"begin",
			"fail-after-announce",
			"announce-stock",
			"rollback",
		]);
		expect(emitter.emitted).toHaveLength(0);
	});

	it("runs a marked command normally when the registry was given no runner", async () => {
		const trace: string[] = [];
		const registry = commands({
			settleOrder: SettleOrderCommand,
		}).withDependencies({ trace });

		const { result } = await registry.settleOrder({ total: 7 });

		expect(result).toBeInstanceOf(Order);
		expect(trace).toEqual(["settle-order"]);
	});

	it("leaves an unmarked command unwrapped even when a runner is configured", async () => {
		const trace: string[] = [];
		const registry = commands(
			{ auditOrder: AuditOrderCommand },
			{ transaction: tracingBoundary(trace) },
		).withDependencies({ trace });

		await registry.auditOrder({ total: 3 });

		expect(trace).toEqual(["audit-order"]);
	});

	it("rolls back and publishes nothing when the command rejects", async () => {
		const trace: string[] = [];
		const emitter = fakeEmitter();
		const registry = commands(
			{ failingSettle: FailingSettleCommand },
			{ emitter, transaction: tracingBoundary(trace) },
		).withDependencies({ trace });

		await expect(registry.failingSettle({ total: 1 })).rejects.toThrow(
			"write failed",
		);

		expect(trace).toEqual(["begin", "failing-settle", "rollback"]);
		expect(emitter.emitted).toHaveLength(0);
	});

	it("keeps the boundary outside construction, so an invalid payload never opens one", async () => {
		const trace: string[] = [];
		const registry = commands(
			{ settleOrder: SettleOrderCommand },
			{ transaction: tracingBoundary(trace) },
		).withDependencies({ trace });

		await expect(
			registry.settleOrder({ total: "not a number" } as never),
		).rejects.toThrow();

		expect(trace).toEqual([]);
	});

	it("rejects an empty options object, which is what keeps both overloads' keys in the editor's completion list", () => {
		const trace: string[] = [];

		// @ts-expect-error — `{}` matches neither overload on purpose: `transaction`
		// is required on the events-free options and `emitter` on the evented ones.
		// TypeScript resolves an argument's completions against the overload that
		// matches, so an empty literal matching one of them would hide the other's
		// keys entirely; matching neither makes the list the union of both.
		commands({ auditOrder: AuditOrderCommand }, {}).withDependencies({ trace });

		// The two ways to write what `{}` was trying to say, both fine:
		expect(() =>
			commands({ auditOrder: AuditOrderCommand }).withDependencies({ trace }),
		).not.toThrow();
		expect(() =>
			commands(
				{ auditOrder: AuditOrderCommand },
				{ transaction: tracingBoundary(trace) },
			).withDependencies({ trace }),
		).not.toThrow();
	});

	it("has no .on() when given a transaction but no emitter — options alone never make a registry evented", () => {
		const trace: string[] = [];
		const registry = commands(
			{ auditOrder: AuditOrderCommand },
			{ transaction: tracingBoundary(trace) },
		).withDependencies({ trace });

		// @ts-expect-error — no emitter, so this overload's registry has no `.on()`.
		const registrar: unknown = registry.on;

		expect(registrar).toBeUndefined();
	});

	it("keeps a spec key called `on` installable when only a transaction was given", async () => {
		const trace: string[] = [];
		const registry = commands(
			{ on: AuditOrderCommand },
			{ transaction: tracingBoundary(trace) },
		).withDependencies({ trace });

		// The accessor, not a reaction registrar — the whole point of the gate
		// being `emitter` rather than `options`.
		expect(registry.on).toBe(registry.get("on"));

		await registry.get("on")({ total: 2 });

		expect(trace).toEqual(["audit-order"]);
	});
});

const SecretVO = customStringVO({ default: "secret", sensitive: true });

const parcelProperties = { code: StringVO, secret: SecretVO };

const ParcelShipped = defineDomainEvent("parcel.shipped", { code: StringVO });

class Parcel extends entityOf(parcelProperties, "parcel") {
	public ship(): void {
		this.raiseEvent(ParcelShipped);
	}
}

type ParcelDeps = { readonly shipped: string[] };

class ShipParcelCommand extends defineUseCase<
	typeof parcelProperties,
	ParcelDeps,
	Parcel
>(parcelProperties, "ship-parcel") {
	protected async handle(deps: ParcelDeps): Promise<Parcel> {
		const parcel = new Parcel({ code: this.code, secret: this.secret });

		parcel.ship();
		deps.shipped.push(parcel.code);

		return parcel;
	}
}

@transactional
class ShipParcelTransactionallyCommand extends defineUseCase<
	typeof parcelProperties,
	ParcelDeps,
	Parcel
>(parcelProperties, "ship-parcel-tx") {
	protected async handle(deps: ParcelDeps): Promise<Parcel> {
		const parcel = new Parcel({ code: this.code, secret: this.secret });

		parcel.ship();
		deps.shipped.push(parcel.code);

		return parcel;
	}
}

describe("commands — a declared event payload across the bus", () => {
	it("reaches the emitter intact", async () => {
		const emitter = fakeEmitter();
		const registry = commands(
			{ shipParcel: ShipParcelCommand },
			{ emitter },
		).withDependencies({ shipped: [] as string[] });

		await registry.shipParcel({ code: "A1", secret: "hunter2" });

		expect((emitter.emitted[0] as IDomainEvent).payload).toEqual({
			code: "A1",
		});
	});

	it("carries only the declared keys — the shape is the allowlist", async () => {
		const emitter = fakeEmitter();
		const registry = commands(
			{ shipParcel: ShipParcelCommand },
			{ emitter },
		).withDependencies({ shipped: [] as string[] });

		await registry.shipParcel({ code: "A1", secret: "hunter2" });

		expect(JSON.stringify(emitter.emitted[0])).not.toContain("hunter2");
	});

	it("reaches a reaction's handle intact", async () => {
		const seen: unknown[] = [];
		const registry = commands(
			{ shipParcel: ShipParcelCommand },
			{ emitter: fakeEmitter() },
		)
			.withDependencies({ shipped: [] as string[] })
			.on(
				ParcelShipped,
				defineEventHandler<InstanceType<typeof ParcelShipped>, unknown>(
					async (event) => {
						seen.push(event.payload);
					},
				),
			);

		await registry.shipParcel({ code: "A1", secret: "hunter2" });

		expect(seen).toEqual([{ code: "A1" }]);
	});

	it("survives on the CommandResult a caller reads directly", async () => {
		const registry = commands({
			shipParcel: ShipParcelCommand,
		}).withDependencies({ shipped: [] as string[] });

		const { events } = await registry.shipParcel({
			code: "A1",
			secret: "hunter2",
		});

		expect(events[0]?.payload).toEqual({ code: "A1" });
	});

	it("survives being held until a transactional boundary closes", async () => {
		const trace: string[] = [];
		const emitter: IEventEmitter = {
			emit: (event) => {
				trace.push(`emit:${JSON.stringify(event.payload)}`);
			},
		};
		const registry = commands(
			{ shipParcel: ShipParcelTransactionallyCommand },
			{ emitter, transaction: tracingBoundary(trace) },
		).withDependencies({ shipped: [] as string[] });

		await registry.shipParcel({ code: "A1", secret: "hunter2" });

		// The payload is cut inside the boundary and published after it closed,
		// intact — the damming never touches what the event carries.
		expect(trace).toEqual(["begin", "commit", 'emit:{"code":"A1"}']);
	});

	it("validates on arrival, the far side of the same declaration", async () => {
		const emitter = fakeEmitter();
		const registry = commands(
			{ shipParcel: ShipParcelCommand },
			{ emitter },
		).withDependencies({ shipped: [] as string[] });

		await registry.shipParcel({ code: "A1", secret: "hunter2" });

		const crossed: unknown = JSON.parse(
			JSON.stringify((emitter.emitted[0] as IDomainEvent).payload),
		);

		expect(ParcelShipped.fromJSON(crossed)).toEqual({ code: "A1" });
	});
});
