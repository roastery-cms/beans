import { Command } from "@/application/command";
import type {
	CommandDefinition,
	CommandResult,
} from "@/application/command/types";
import { NumberVO } from "@/domain/collections/value-objects";
import { DomainEvent } from "@/domain/domain-event";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { describe, expect, it } from "bun:test";
import { defineEventHandler } from "./define-event-handler";
import { eventedRegistry } from "./evented-registry";
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

describe("defineEventHandler used with eventedRegistry", () => {
	it("a generated handler class is directly usable with .on(), with no manual implements IEventHandler", async () => {
		const calls: string[] = [];
		const RecordOrderConfirmed = defineEventHandler<
			OrderConfirmed,
			TrackerDeps
		>(async (event, deps) => {
			deps.tracker.record(`confirmed:${event.total}`);
		});
		const registry = eventedRegistry(
			{ confirmOrder: ConfirmOrderCommand },
			fakeEmitter(),
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
});
