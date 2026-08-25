import { IntegerVO, StringVO } from "@/domain/collections/value-objects";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { InvalidDomainDataException } from "@roastery/terroir/exceptions/domain";
import { Json, SafeJson } from "@roastery/terroir/symbols";
import { describe, expect, it } from "bun:test";
import { defineDomainEvent } from "./define-domain-event";
import type { BareDomainEventClass } from "@/domain/entity/decorators/types";
import { DomainEvent } from "./domain-event";

describe("defineDomainEvent", () => {
	it("stamps name from the given name", () => {
		const UserCreated = defineDomainEvent("user.created");

		expect(new UserCreated("user-1").name).toBe("user.created");
	});

	it("stamps aggregateId with the value given to the constructor", () => {
		const UserCreated = defineDomainEvent("user.created");

		expect(new UserCreated("user-1").aggregateId).toBe("user-1");
	});

	it("stamps a fresh, ISO 8601 occurredAt", () => {
		const UserCreated = defineDomainEvent("user.created");
		const before = Date.now();

		const event = new UserCreated("user-1");
		const occurredAt = new Date(event.occurredAt).getTime();

		expect(occurredAt).toBeGreaterThanOrEqual(before);
		expect(occurredAt).toBeLessThanOrEqual(Date.now());
	});

	it("builds a DomainEvent instance", () => {
		const UserCreated = defineDomainEvent("user.created");

		expect(new UserCreated("user-1")).toBeInstanceOf(DomainEvent);
	});

	it("names the generated class after the given name", () => {
		const UserCreated = defineDomainEvent("user.created");

		expect(UserCreated.name).toBe("user.created");
	});

	it("produces unrelated classes across two calls with the same name", () => {
		const First = defineDomainEvent("user.created");
		const Second = defineDomainEvent("user.created");

		expect(new First("user-1")).not.toBeInstanceOf(Second);
	});
});

const userProperties = { name: StringVO };

const UserCreated = defineDomainEvent("user.created");

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface User extends AccessorsOf<typeof userProperties> {}
class User extends Entity<typeof userProperties> {
	protected defineEntity(): EntityDefinition<typeof userProperties> {
		return { properties: userProperties, source: "user" };
	}

	/** Public facade for `raiseEvent`, which is protected. */
	public announce(): void {
		this.raiseEvent(UserCreated);
	}
}

describe("defineDomainEvent used with Entity.raiseEvent", () => {
	it("accepts the generated class bare, without `new`", () => {
		const user = new User({ name: "Alan" });

		user.announce();

		expect(user.pullDomainEvents().map((event) => event.name)).toEqual([
			"user.created",
		]);
	});

	it("stamps the raising entity's own id as aggregateId", () => {
		const user = new User({ name: "Alan" });

		user.announce();

		const [event] = user.pullDomainEvents();

		expect(event?.aggregateId).toBe(user.id);
	});
});

const shipmentShape = { code: StringVO, total: IntegerVO };

describe("defineDomainEvent payload declaration", () => {
	it("declares no payload when called with a name alone", () => {
		const Plain = defineDomainEvent("order.plain");

		expect((Plain as { payload?: unknown }).payload).toBeUndefined();
	});

	it("carries the shape it was given as its payload declaration", () => {
		const Shipped = defineDomainEvent("order.shipped", shipmentShape);

		expect(Shipped.payload).toBe(shipmentShape);
	});

	it("carries Json as its payload declaration", () => {
		const Dumped = defineDomainEvent("order.dumped", Json);

		expect(Dumped.payload).toBe(Json);
	});

	it("carries SafeJson as its payload declaration", () => {
		const Audited = defineDomainEvent("order.audited", SafeJson);

		expect(Audited.payload).toBe(SafeJson);
	});

	it("keeps the bare-class constructor, which is what the decorators accept", () => {
		const Shipped = defineDomainEvent("order.shipped", shipmentShape);

		// The type-level half of the claim: a payload-carrying event is still a
		// `BareDomainEventClass`, so `@emit(Shipped)` needs no signature change.
		const bare: BareDomainEventClass = Shipped;

		expect(new bare("order-1").aggregateId).toBe("order-1");
	});
});

describe("defineDomainEvent fromJSON", () => {
	it("is installed only on the shape form", () => {
		const Shipped = defineDomainEvent("order.shipped", shipmentShape);
		const Audited = defineDomainEvent("order.audited", SafeJson);
		const Plain = defineDomainEvent("order.plain");

		expect(typeof Shipped.fromJSON).toBe("function");
		expect((Audited as { fromJSON?: unknown }).fromJSON).toBeUndefined();
		expect((Plain as { fromJSON?: unknown }).fromJSON).toBeUndefined();
	});

	it("hands a matching payload back unchanged", () => {
		const Shipped = defineDomainEvent("order.shipped", shipmentShape);
		const payload = { code: "A1", total: 1500 };

		expect(Shipped.fromJSON(payload)).toBe(payload);
	});

	it("rejects a payload missing a declared key", () => {
		const Shipped = defineDomainEvent("order.shipped", shipmentShape);

		expect(() => Shipped.fromJSON({ code: "A1" })).toThrow(
			InvalidDomainDataException,
		);
	});

	it("rejects a payload carrying a key the shape never declared", () => {
		const Shipped = defineDomainEvent("order.shipped", shipmentShape);

		expect(() =>
			Shipped.fromJSON({ code: "A1", total: 1500, extra: true }),
		).toThrow(InvalidDomainDataException);
	});

	it("rejects a value of the wrong type", () => {
		const Shipped = defineDomainEvent("order.shipped", shipmentShape);

		expect(() => Shipped.fromJSON({ code: "A1", total: "many" })).toThrow(
			InvalidDomainDataException,
		);
	});

	it("names the event as the exception's source", () => {
		const Shipped = defineDomainEvent("order.shipped", shipmentShape);

		expect(() => Shipped.fromJSON({})).toThrow(InvalidDomainDataException);

		try {
			Shipped.fromJSON({});
		} catch (error) {
			expect((error as InvalidDomainDataException).source).toBe(
				"order.shipped",
			);
		}
	});
});
