import { Command } from "@/application/command";
import type {
	CommandDefinition,
	CommandResult,
} from "@/application/command/types";
import { NumberVO } from "@/domain/collections/value-objects";
import { defineDomainEvent, DomainEvent } from "@/domain/domain-event";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { describe, expect, it } from "bun:test";
import { defineEventHandler } from "./define-event-handler";
import { commands } from "./commands";
import type { IEventEmitter } from "./types";

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

type TrackerDeps = { tracker: { record(label: string): void } };

describe("defineEventHandler", () => {
	it("returns a class whose instances expose handle", () => {
		const Handler = defineEventHandler(async () => {});
		const handler = new Handler();

		expect(typeof handler.handle).toBe("function");
	});

	it("the generated handle delegates to the given function, forwarding event and deps unchanged", async () => {
		const received: unknown[] = [];
		const Handler = defineEventHandler<OrderConfirmed, TrackerDeps>(
			async (event, deps) => {
				received.push(event, deps);
			},
		);
		const event = new OrderConfirmed("order-1", 42);
		const deps: TrackerDeps = { tracker: { record: () => {} } };

		await new Handler().handle(event, deps);

		expect(received).toEqual([event, deps]);
	});

	it("resolves once the given function resolves", async () => {
		const calls: string[] = [];
		const Handler = defineEventHandler<OrderConfirmed, TrackerDeps>(
			async () => {
				await Promise.resolve();
				calls.push("done");
			},
		);

		await new Handler().handle(new OrderConfirmed("order-1", 42), {
			tracker: { record: () => {} },
		});

		expect(calls).toEqual(["done"]);
	});

	it("propagates a rejection from the given function unchanged", async () => {
		const Handler = defineEventHandler<OrderConfirmed, TrackerDeps>(
			async () => {
				throw new Error("boom");
			},
		);

		await expect(
			new Handler().handle(new OrderConfirmed("order-1", 42), {
				tracker: { record: () => {} },
			}),
		).rejects.toThrow("boom");
	});

	it("produces unrelated classes across two calls with the same handle function", () => {
		const handle = async () => {};
		const First = defineEventHandler(handle);
		const Second = defineEventHandler(handle);

		expect(new First()).not.toBeInstanceOf(Second);
	});

	it("infers Event/Deps from the given function's own parameter types, with no explicit type arguments", () => {
		const Handler = defineEventHandler(
			async (event: OrderConfirmed, deps: TrackerDeps) => {
				deps.tracker.record(event.name);
			},
		);

		expect(Handler.name).toBeDefined();
	});

	describe("the class-reference overload", () => {
		it("accepts typeof EventClass directly, no InstanceType<...> needed, and keeps the concrete event's own fields", async () => {
			const received: unknown[] = [];
			const Handler = defineEventHandler<typeof OrderConfirmed, TrackerDeps>(
				async (event, deps) => {
					received.push(event.total, deps);
				},
			);
			const event = new OrderConfirmed("order-1", 42);
			const deps: TrackerDeps = { tracker: { record: () => {} } };

			await new Handler().handle(event, deps);

			expect(received).toEqual([42, deps]);
		});

		it("also works for a defineDomainEvent-generated event", async () => {
			const BeanPlanted = defineDomainEvent("bean.planted");
			const received: string[] = [];
			const Handler = defineEventHandler<typeof BeanPlanted>(async (event) => {
				received.push(event.name, event.aggregateId);
			});

			await new Handler().handle(new BeanPlanted("bean-1"), undefined);

			expect(received).toEqual(["bean.planted", "bean-1"]);
		});

		it("Deps defaults to unknown when omitted, so handle's second parameter can be dropped", () => {
			const Handler = defineEventHandler<typeof OrderConfirmed>(async () => {});

			expect(typeof new Handler().handle).toBe("function");
		});
	});

	describe("name", () => {
		it("stamps the given name onto the generated class", () => {
			const Handler = defineEventHandler(
				async () => {},
				"SendReceiptOnOrderConfirmed",
			);

			expect(Handler.name).toBe("SendReceiptOnOrderConfirmed");
		});

		it("leaves the generated name in place when none is given", () => {
			const Handler = defineEventHandler(async () => {});

			expect(Handler.name).toBe("GeneratedEventHandler");
		});
	});
});

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

function fakeEmitter(): IEventEmitter & { readonly emitted: unknown[] } {
	const emitted: unknown[] = [];
	return {
		emitted,
		emit(event) {
			emitted.push(event);
		},
	};
}

describe("defineEventHandler used with commands", () => {
	it("a generated handler class is directly usable with .on(), with no manual implements IEventHandler", async () => {
		const calls: string[] = [];
		const RecordOrderConfirmed = defineEventHandler<
			OrderConfirmed,
			TrackerDeps
		>(async (event, deps) => {
			deps.tracker.record(`confirmed:${event.total}`);
		});
		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand },
			{ emitter: fakeEmitter() },
		)
			.withDependencies({
				tracker: { record: (label: string) => calls.push(label) },
			})
			.on(OrderConfirmed, RecordOrderConfirmed);

		await registry.get("confirmOrder")({ total: 42 });

		expect(calls).toEqual(["confirmed:42"]);
	});

	it("isolates a throwing generated handler the same way a hand-written one is isolated", async () => {
		const calls: string[] = [];
		const errors: unknown[] = [];
		const ThrowingHandler = defineEventHandler(async () => {
			throw new Error("boom");
		});
		const RecordSecond = defineEventHandler<OrderConfirmed, TrackerDeps>(
			async (_event, deps) => {
				deps.tracker.record("second");
			},
		);
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
});

/**
 * The `Siblings` type argument on the reaction side. `commands` has
 * always handed every reaction a `commands` bag (see its `react`), but until
 * `WithSiblingCommands` existed the only way to see it was to write
 * `commands: { sendReceipt: CommandRunner<…> }` into `Deps` by hand.
 */
const sendReceiptProperties = { total: NumberVO };
class SendReceiptCommand extends Command<
	typeof sendReceiptProperties,
	{ readonly receipts: number[] },
	Order
> {
	protected defineCommand(): CommandDefinition<typeof sendReceiptProperties> {
		return { properties: sendReceiptProperties, source: "send-receipt" };
	}

	public async execute({
		receipts,
	}: {
		readonly receipts: number[];
	}): Promise<CommandResult<Order>> {
		receipts.push(this.get("total"));

		return { result: new Order({ total: this.get("total") }), events: [] };
	}
}

describe("defineEventHandler — Siblings", () => {
	it("derives a typed commands bag from the sibling classes it names", async () => {
		const receipts: number[] = [];

		// `unknown` in the Deps slot: this reaction reads nothing but commands,
		// and `unknown & { commands: … }` reduces to the bag alone.
		const SendReceiptOnOrderConfirmed = defineEventHandler<
			OrderConfirmed,
			unknown,
			{ sendReceipt: typeof SendReceiptCommand }
		>(async (event, deps) => {
			// Payload and result both typed straight off SendReceiptCommand.
			const { result } = await deps.commands.sendReceipt({
				total: event.total,
			});

			receipts.push(result.get("total"));
		});

		const registry = commands(
			{ confirmOrder: ConfirmOrderCommand, sendReceipt: SendReceiptCommand },
			{ emitter: fakeEmitter() },
		)
			.withDependencies({ receipts })
			.on(OrderConfirmed, SendReceiptOnOrderConfirmed);

		await registry.get("confirmOrder")({ total: 7 });

		expect(receipts).toEqual([7, 7]);
	});

	it("leaves Deps untouched when Siblings is omitted", () => {
		const Handler = defineEventHandler<OrderConfirmed, TrackerDeps>(
			async (_event, deps) => {
				deps.tracker.record("ok");
			},
		);

		type HandlerDeps = Parameters<InstanceType<typeof Handler>["handle"]>[1];
		type Assert<T extends true> = T;

		// The `[keyof Siblings] extends [never]` guard: the default must resolve
		// to `Deps` itself, never `Deps & { commands: {} }`.
		type _NoCommandsKey = Assert<
			"commands" extends keyof HandlerDeps ? false : true
		>;

		expect(typeof new Handler().handle).toBe("function");
	});
});
