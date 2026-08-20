import { describe, expect, it } from "bun:test";
import { InvalidEntityDefinitionException } from "@roastery/terroir/exceptions/domain";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { customDoubleVO } from "./double.factory";

const context = { name: "price", source: "product" };

describe("customDoubleVO", () => {
	it("rounds to two decimal places by default", () => {
		const Price = customDoubleVO({ name: "Price" });

		expect(new Price(1234.5678, context).value).toBe(1234.57);
	});

	it("honours an explicit precision", () => {
		const Latitude = customDoubleVO({ decimals: 6, name: "Latitude" });

		expect(new Latitude(1.23456789, context).value).toBe(1.234568);
	});

	it("applies the schema options after rounding", () => {
		const Rate = customDoubleVO({ options: { minimum: 0, maximum: 1 } });

		expect(new Rate(0.12345, context).value).toBe(0.12);
		expect(() => new Rate(1.5, context)).toThrow(InvalidPropertyException);
	});

	it("composes a caller's own transform after the rounding", () => {
		const Positive = customDoubleVO({
			transform: (value) => Math.abs(value),
		});

		expect(new Positive(-1.239, context).value).toBe(1.24);
	});

	it("still runs a caller's validate hook, on the rounded value", () => {
		const Even = customDoubleVO({
			validate: (value) => value % 2 === 0,
		});

		expect(new Even(4, context).value).toBe(4);
		expect(() => new Even(3, context)).toThrow(InvalidPropertyException);
	});

	it("falls back to `0` when no default is declared", () => {
		const Amount = customDoubleVO();

		expect(Amount.demo(context).value).toBe(0);
	});

	it("rejects a default the options refuse, at factory time", () => {
		expect(() => customDoubleVO({ options: { minimum: 1 } })).toThrow(
			InvalidEntityDefinitionException,
		);
	});

	it("does not round the default — `transform` never runs over one", () => {
		const Amount = customDoubleVO({ default: 1.2345 });

		expect(Amount.demo(context).value).toBe(1.2345);
	});
});
