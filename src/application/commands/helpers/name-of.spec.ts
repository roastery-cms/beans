import { DomainEvent, defineDomainEvent } from "@/domain/domain-event";
import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { nameOf } from "./name-of";

describe("nameOf", () => {
	it("reads the name off a hand-written DomainEvent subclass, without constructing it", () => {
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

		// Two required constructor params beyond `aggregateId` — proves the
		// probe never runs the constructor.
		expect(nameOf(OrderConfirmed)).toBe("order.confirmed");
	});

	it("reads the name off a defineDomainEvent-generated class", () => {
		const BeanPlanted = defineDomainEvent("bean.planted");

		expect(nameOf(BeanPlanted)).toBe("bean.planted");
	});

	it("throws when the class does not declare defineName as a prototype method", () => {
		class NotAnEvent {
			public readonly name = "not.an.event";
		}

		try {
			nameOf(NotAnEvent as never);
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBeInstanceOf(InvalidEntityDefinitionException);
			expect((error as InvalidEntityDefinitionException).source).toBe(
				"commands",
			);
		}
	});
});
