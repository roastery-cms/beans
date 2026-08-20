import { Command } from "@/application/command";
import type {
	CommandDefinition,
	CommandResult,
} from "@/application/command/types";
import type { CommandRunner } from "@/application/command-registry/types";
import { NumberVO, StringVO } from "@/domain/collections/value-objects";
import { DomainEvent } from "@/domain/domain-event";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { LoopDetectedException } from "@roastery/terroir/exceptions/application";
import { describe, expect, it, spyOn } from "bun:test";
import { eventedRegistry } from "./evented-registry";
import type { IEventEmitter, IEventHandler } from "./types";

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

function fakeEmitter(): IEventEmitter & { readonly emitted: unknown[] } {
	const emitted: unknown[] = [];
	return {
		emitted,
		emit(event) {
			emitted.push(event);
		},
	};
}

describe("eventedRegistry", () => {
	it("emits every event a command's CommandResult carries, automatically", async () => {
		const emitter = fakeEmitter();
		const registry = eventedRegistry(
			{ confirmOrder: ConfirmOrderCommand, sendReceipt: SendReceiptCommand },
			emitter,
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
		const registry = eventedRegistry(
			{ confirmOrder: ConfirmOrderCommand, sendReceipt: SendReceiptCommand },
			fakeEmitter(),
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
		const registry = eventedRegistry(
			{ confirmOrder: ConfirmOrderCommand },
			fakeEmitter(),
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
		const registry = eventedRegistry(
			{ confirmOrder: ConfirmOrderCommand },
			fakeEmitter(),
			{
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
		const registry = eventedRegistry(
			{ confirmOrder: ConfirmOrderCommand },
			fakeEmitter(),
		).withDependencies({});

		const { result, events } = await registry.get("confirmOrder")({
			total: 3,
		});

		expect(result).toBeInstanceOf(Order);
		expect(events).toHaveLength(1);
	});

	it("calls onError with the error and the event that caused it", async () => {
		let captured: { error: unknown; eventName: string } | undefined;
		const registry = eventedRegistry(
			{ confirmOrder: ConfirmOrderCommand },
			fakeEmitter(),
			{
				onError: (error, { event }) => {
					captured = { error, eventName: event.name };
				},
			},
		)
			.withDependencies({})
			.on(OrderConfirmed, ThrowingHandler);

		await registry.get("confirmOrder")({ total: 9 });

		expect(captured?.eventName).toBe("order.confirmed");
		expect((captured?.error as Error).message).toBe("boom");
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
			const registry = eventedRegistry(
				{ confirmOrder: ConfirmOrderCommand },
				fakeEmitter(),
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
			const registry = eventedRegistry(
				{ confirmOrder: ConfirmOrderCommand },
				fakeEmitter(),
				{
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
		const registry = eventedRegistry(
			{ confirmOrder: ConfirmOrderCommand, sendReceipt: SendReceiptCommand },
			fakeEmitter(),
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
		const registry = eventedRegistry(
			{ confirmOrder: ConfirmOrderCommand, repeatOrder: RepeatOrderCommand },
			emitter,
			{
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
		expect((errors[0] as LoopDetectedException).source).toBe(
			"evented-registry",
		);
		// `order.confirmed` was emitted exactly twice — once from
		// `confirmOrder`, once from the reaction's own `repeatOrder` — and no
		// more: the cycle was caught before a third round, not left to recurse.
		expect(emitter.emitted).toHaveLength(2);
	});
});

describe("eventedRegistry — compile-time gating", () => {
	it("blocks .on() at compile time for a handler whose sibling dependency is not itself directly registrable", () => {
		const registry = eventedRegistry(
			{ confirmOrder: ConfirmOrderCommand }, // no `sendReceipt` in this spec
			fakeEmitter(),
		).withDependencies({});

		// @ts-expect-error — SendReceiptOnOrderConfirmed needs `commands.sendReceipt`,
		// which this spec never registers.
		registry.on(OrderConfirmed, SendReceiptOnOrderConfirmed);
	});

	it("blocks .on() at compile time for a handler whose declared event does not match eventClass", () => {
		const registry = eventedRegistry(
			{ confirmOrder: ConfirmOrderCommand, sendReceipt: SendReceiptCommand },
			fakeEmitter(),
		).withDependencies({ mailer: { send: () => {} } });

		// @ts-expect-error — SendReceiptOnOrderConfirmed handles OrderConfirmed, not ReceiptSent.
		registry.on(ReceiptSent, SendReceiptOnOrderConfirmed);
	});
});
