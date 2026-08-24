import { EventEmitter } from "node:events";
import type { IEventEmitter } from "@/application/commands/types";
import { StringVO } from "@/domain/collections/value-objects";
import type { IDomainEvent } from "@/domain/domain-event/types";
import { onCreate } from "@/domain/entity/decorators";
import { NodeEventEmitterAdapter } from "@/node";
import { commands, defineDomainEvent, defineUseCase, entityOf } from "@/way";
import { describe, expect, it } from "bun:test";

const OrderConfirmed = defineDomainEvent("order.confirmed");

const orderProperties = { reference: StringVO };

@onCreate(OrderConfirmed)
class Order extends entityOf(orderProperties, "order") {}

class ConfirmOrder extends defineUseCase<typeof orderProperties, void, Order>(
	orderProperties,
	"confirm-order",
) {
	protected async handle(): Promise<Order> {
		return new Order({ reference: this.reference });
	}
}

const eventNamed = (name: string): IDomainEvent => ({
	name,
	occurredAt: new Date().toISOString(),
	aggregateId: "01a0-fake",
});

describe("NodeEventEmitterAdapter", () => {
	it("publishes on the channel named after the event, with the event as the only argument", () => {
		const emitter = new NodeEventEmitterAdapter();
		const received: IDomainEvent[] = [];

		emitter.inner.on("order.confirmed", (...args: IDomainEvent[]) =>
			received.push(...args),
		);
		emitter.emit(eventNamed("order.confirmed"));

		expect(received).toHaveLength(1);
		expect(received[0]?.aggregateId).toBe("01a0-fake");
	});

	it("does nothing when no one is listening on that channel", () => {
		const emitter = new NodeEventEmitterAdapter();

		expect(() => emitter.emit(eventNamed("nobody.listening"))).not.toThrow();
	});

	it("defaults to a fresh EventEmitter", () => {
		expect(new NodeEventEmitterAdapter().inner).toBeInstanceOf(EventEmitter);
	});

	it("wraps a bus the caller already owns", () => {
		const bus = new EventEmitter();
		const received: IDomainEvent[] = [];

		bus.on("order.confirmed", (event: IDomainEvent) => received.push(event));
		new NodeEventEmitterAdapter(bus).emit(eventNamed("order.confirmed"));

		expect(received).toHaveLength(1);
	});

	it("satisfies IEventEmitter structurally", () => {
		const emitter: IEventEmitter = new NodeEventEmitterAdapter();

		expect(typeof emitter.emit).toBe("function");
	});

	it("does not throw on an event named `error` with no listener", () => {
		const emitter = new NodeEventEmitterAdapter();

		// Node throws ERR_UNHANDLED_ERROR here; the adapter must not let that
		// reach the command whose events are being published.
		expect(() => emitter.emit(eventNamed("error"))).not.toThrow();
	});

	it("still delivers an event named `error` when someone is listening", () => {
		const emitter = new NodeEventEmitterAdapter();
		const received: IDomainEvent[] = [];

		emitter.inner.on("error", (event: IDomainEvent) => received.push(event));
		emitter.emit(eventNamed("error"));

		expect(received).toHaveLength(1);
		expect(received[0]?.name).toBe("error");
	});

	it("drops straight into an evented `commands` registry", async () => {
		const emitter = new NodeEventEmitterAdapter();
		const published: string[] = [];

		emitter.inner.on("order.confirmed", (event: IDomainEvent) =>
			published.push(event.aggregateId),
		);

		const registry = commands(
			{ confirmOrder: ConfirmOrder },
			{ emitter: emitter },
		).withDependencies({});

		const { result } = await registry.get("confirmOrder")({ reference: "A-1" });

		expect(published).toEqual([result.id]);
	});
});
