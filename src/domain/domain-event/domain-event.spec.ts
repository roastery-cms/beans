import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { DomainEvent } from "./domain-event";

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

describe("DomainEvent", () => {
	it("stamps name from defineName", () => {
		const event = new OrderConfirmed("order-1", 42);

		expect(event.name).toBe("order.confirmed");
	});

	it("stamps aggregateId with the value given to the constructor", () => {
		const event = new OrderConfirmed("order-1", 42);

		expect(event.aggregateId).toBe("order-1");
	});

	it("stamps a fresh, ISO 8601 occurredAt", () => {
		const before = Date.now();

		const event = new OrderConfirmed("order-1", 42);
		const occurredAt = new Date(event.occurredAt).getTime();

		expect(occurredAt).toBeGreaterThanOrEqual(before);
		expect(occurredAt).toBeLessThanOrEqual(Date.now());
	});

	it("keeps the payload fields the subclass declares", () => {
		const event = new OrderConfirmed("order-1", 42);

		expect(event.total).toBe(42);
	});

	describe("defineName", () => {
		it("rejects an implementation declared as a class field", () => {
			class Broken extends DomainEvent {
				protected defineName = (): string => "broken.event";
			}

			expect(() => new Broken("order-1")).toThrow(
				InvalidEntityDefinitionException,
			);
		});
	});
});
