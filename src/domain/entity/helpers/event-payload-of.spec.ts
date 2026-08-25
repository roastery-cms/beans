import { IntegerVO, StringVO } from "@/domain/collections/value-objects";
import { customStringVO } from "@/domain/collections/value-objects/custom";
import { DomainEvent, defineDomainEvent } from "@/domain/domain-event";
import { arrayOf } from "@/domain/wrapper/helpers";
import {
	InvalidEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import { Json, SafeJson } from "@roastery/terroir/symbols";
import { describe, expect, it } from "bun:test";
import { entityOf } from "./entity-of";
import { eventPayloadOf } from "./event-payload-of";

const TokenVO = customStringVO({ default: "tok", sensitive: true });

class Address extends entityOf({ city: StringVO }, "address") {}

class Tag extends entityOf({ slug: StringVO }, "tag") {}

const orderProperties = {
	code: StringVO,
	total: IntegerVO,
	token: TokenVO,
	to: Address,
	tags: arrayOf(Tag),
};

class Order extends entityOf(orderProperties, "order") {}

const shipmentShape = { code: StringVO, to: Address };

const Shipped = defineDomainEvent("order.shipped", shipmentShape);
const Dumped = defineDomainEvent("order.dumped", Json);
const Audited = defineDomainEvent("order.audited", SafeJson);
const Plain = defineDomainEvent("order.plain");

function anOrder(): Order {
	return new Order({
		code: "A1",
		total: 1500,
		token: "hunter2",
		to: { city: "SP" },
		tags: [{ slug: "one" }],
	});
}

describe("eventPayloadOf", () => {
	it("returns undefined when the event class declares nothing", () => {
		const order = anOrder();

		expect(eventPayloadOf(order, new Plain(order.id))).toBeUndefined();
	});

	it("returns undefined for an event raised as a plain object literal", () => {
		const order = anOrder();

		expect(eventPayloadOf(order, { name: "order.plain" })).toBeUndefined();
	});

	it("reads the static off a hand-written DomainEvent subclass", () => {
		const order = anOrder();

		class HandWritten extends DomainEvent {
			public static readonly payload = shipmentShape;

			protected defineName(): string {
				return "order.shipped";
			}
		}

		expect(eventPayloadOf(order, new HandWritten(order.id))).toHaveProperty(
			"code",
			"A1",
		);
	});

	it("reads a declaration inherited from a parent event class", () => {
		const order = anOrder();

		class Base extends DomainEvent {
			public static readonly payload = shipmentShape;

			protected defineName(): string {
				return "order.shipped";
			}
		}

		class Express extends Base {
			protected override defineName(): string {
				return "order.expressed";
			}
		}

		expect(eventPayloadOf(order, new Express(order.id))).toHaveProperty(
			"code",
			"A1",
		);
	});

	it("throws when the declaration is neither a shape nor a directive", () => {
		const order = anOrder();

		class Bogus extends DomainEvent {
			// What a plain-JS caller, or a typo, would leave here.
			public static readonly payload = "everything";

			protected defineName(): string {
				return "order.bogus";
			}
		}

		expect(() => eventPayloadOf(order, new Bogus(order.id))).toThrow(
			InvalidEntityDefinitionException,
		);
	});
});

describe("eventPayloadOf with a shape", () => {
	it("keeps only the declared keys", () => {
		const order = anOrder();

		const payload = eventPayloadOf(order, new Shipped(order.id)) as Record<
			string,
			unknown
		>;

		expect(Object.keys(payload).sort()).toEqual(["code", "to"]);
	});

	it("drops the root's identity, which aggregateId already carries", () => {
		const order = anOrder();

		const payload = eventPayloadOf(order, new Shipped(order.id)) as Record<
			string,
			unknown
		>;

		expect(payload).not.toHaveProperty("id");
		expect(payload).not.toHaveProperty("createdAt");
		expect(payload).not.toHaveProperty("updatedAt");
	});

	it("keeps a nested aggregate's identity, which makes it hydratable", () => {
		const order = anOrder();

		const { to } = eventPayloadOf(order, new Shipped(order.id)) as {
			to: { id: string; createdAt: string; city: string };
		};

		expect(to.id).toBe(order.to.id);
		expect(to.createdAt).toBe(order.to.createdAt);
		expect(to.city).toBe("SP");
	});

	it("cuts every item of a wrapped key", () => {
		const order = anOrder();
		const Tagged = defineDomainEvent("order.tagged", { tags: arrayOf(Tag) });

		const { tags } = eventPayloadOf(order, new Tagged(order.id)) as {
			tags: readonly { slug: string }[];
		};

		expect(tags.map((tag) => tag.slug)).toEqual(["one"]);
	});

	it("never touches the entity it cut from", () => {
		const order = anOrder();

		eventPayloadOf(order, new Shipped(order.id));

		expect(order.toJSON()).toHaveProperty("id");
		expect(order.to.id).toBeString();
	});

	it("does not redact — the shape is the allowlist, not toSafeJSON", () => {
		const order = anOrder();
		const Leaky = defineDomainEvent("order.leaky", { token: TokenVO });

		expect(eventPayloadOf(order, new Leaky(order.id))).toEqual({
			token: "hunter2",
		});
	});

	it("throws with the dotted path when the shape asks for a key the entity lacks", () => {
		const order = anOrder();
		const Wrong = defineDomainEvent("order.wrong", {
			to: entityOf({ postcode: StringVO }, "postcode-only"),
		});

		expect(() => eventPayloadOf(order, new Wrong(order.id))).toThrow(
			InvalidPropertyException,
		);

		try {
			eventPayloadOf(order, new Wrong(order.id));
		} catch (error) {
			expect((error as InvalidPropertyException).property).toBe("to.postcode");
			expect((error as InvalidPropertyException).source).toBe("order");
		}
	});
});

describe("eventPayloadOf with Json and SafeJson", () => {
	it("carries the complete, unredacted serialization for Json", () => {
		const order = anOrder();

		expect(eventPayloadOf(order, new Dumped(order.id))).toEqual(order.toJSON());
	});

	it("carries the redacted serialization for SafeJson", () => {
		const order = anOrder();

		const payload = eventPayloadOf(order, new Audited(order.id)) as {
			token: string;
		};

		expect(payload).toEqual(order.toSafeJSON());
		expect(payload.token).not.toBe("hunter2");
	});

	it("keeps the root's identity, because the directive means the whole serialization", () => {
		const order = anOrder();

		expect(eventPayloadOf(order, new Dumped(order.id))).toHaveProperty(
			"id",
			order.id,
		);
	});
});
