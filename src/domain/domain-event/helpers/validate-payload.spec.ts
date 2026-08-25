import { IntegerVO, StringVO } from "@/domain/collections/value-objects";
import { entityOf } from "@/domain/entity/helpers/entity-of";
import { eventPayloadOf } from "@/domain/entity/helpers/event-payload-of";
import { arrayOf, optionalOf } from "@/domain/wrapper/helpers";
import { InvalidDomainDataException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { defineDomainEvent } from "../define-domain-event";
import { validatePayload } from "./validate-payload";

class Address extends entityOf({ city: StringVO }, "address") {}

class Tag extends entityOf({ slug: StringVO }, "tag") {}

const shipmentShape = { code: StringVO, total: IntegerVO };

describe("validatePayload", () => {
	it("hands a matching payload back as the same object", () => {
		const payload = { code: "A1", total: 1500 };

		expect(validatePayload(shipmentShape, "order.shipped", payload)).toBe(
			payload,
		);
	});

	it("rejects a missing key", () => {
		expect(() =>
			validatePayload(shipmentShape, "order.shipped", { code: "A1" }),
		).toThrow(InvalidDomainDataException);
	});

	it("rejects an extra key", () => {
		expect(() =>
			validatePayload(shipmentShape, "order.shipped", {
				code: "A1",
				total: 1500,
				extra: true,
			}),
		).toThrow(InvalidDomainDataException);
	});

	it("rejects a value of the wrong type", () => {
		expect(() =>
			validatePayload(shipmentShape, "order.shipped", {
				code: "A1",
				total: "many",
			}),
		).toThrow(InvalidDomainDataException);
	});

	it("rejects a payload that is not an object at all", () => {
		expect(() => validatePayload(shipmentShape, "order.shipped", "A1")).toThrow(
			InvalidDomainDataException,
		);
	});

	it("carries the event name as the exception's source", () => {
		expect(() => validatePayload(shipmentShape, "order.shipped", {})).toThrow(
			InvalidDomainDataException,
		);

		try {
			validatePayload(shipmentShape, "order.shipped", {});
		} catch (error) {
			expect((error as InvalidDomainDataException).source).toBe(
				"order.shipped",
			);
		}
	});

	it("requires a nested aggregate's identity, which the cut carries", () => {
		expect(() =>
			validatePayload({ to: Address }, "order.shipped", {
				to: { city: "SP" },
			}),
		).toThrow(InvalidDomainDataException);
	});

	it("declares no identity of its own at the root", () => {
		const order = new (class extends entityOf({ code: StringVO }, "order") {})({
			code: "A1",
		});

		expect(() =>
			validatePayload({ code: StringVO }, "order.shipped", {
				id: order.id,
				code: "A1",
			}),
		).toThrow(InvalidDomainDataException);
	});
});

describe("validatePayload against what eventPayloadOf produced", () => {
	const orderProperties = {
		code: StringVO,
		total: IntegerVO,
		to: Address,
		note: optionalOf(StringVO),
		tags: arrayOf(Tag),
	};

	class Order extends entityOf(orderProperties, "order") {}

	const shape = {
		code: StringVO,
		to: Address,
		note: optionalOf(StringVO),
		tags: arrayOf(Tag),
	};

	const Shipped = defineDomainEvent("order.shipped", shape);

	function anOrder(): Order {
		return new Order({
			code: "A1",
			total: 1500,
			to: { city: "SP" },
			note: "fragile",
			tags: [{ slug: "one" }, { slug: "two" }],
		});
	}

	it("accepts a payload that crossed a JSON boundary", () => {
		const order = anOrder();
		const payload = eventPayloadOf(order, new Shipped(order.id));

		const crossed: unknown = JSON.parse(JSON.stringify(payload));

		expect(Shipped.fromJSON(crossed)).toEqual(crossed as never);
	});

	it("accepts one whose optional key was left empty", () => {
		const order = new Order({
			code: "A1",
			total: 1500,
			to: { city: "SP" },
			tags: [],
		});

		const payload = eventPayloadOf(order, new Shipped(order.id));
		const crossed: unknown = JSON.parse(JSON.stringify(payload));

		expect(() => Shipped.fromJSON(crossed)).not.toThrow();
	});

	it("rejects the entity's whole serialization, which carries root identity", () => {
		const order = anOrder();

		expect(() => Shipped.fromJSON(order.toJSON())).toThrow(
			InvalidDomainDataException,
		);
	});
});
