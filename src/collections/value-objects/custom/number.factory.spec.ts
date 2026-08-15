import { customNumberVO } from "@/collections/value-objects/custom";
import { metaOf } from "@/value-object/helpers";
import {
	InvalidEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import type { t } from "@roastery/terroir";
import { describe, expect, it } from "bun:test";

const context = { name: "score", source: "bean" } as const;

describe("customNumberVO", () => {
	it("enforces the declared bounds", () => {
		const Score = customNumberVO({ options: { maximum: 100, minimum: 0 } });

		expect(new Score(87, context).value).toBe(87);
		expect(() => new Score(-1, context)).toThrow(InvalidPropertyException);
		expect(() => new Score(101, context)).toThrow(InvalidPropertyException);
	});

	it("defaults to the `0` placeholder", () => {
		expect(customNumberVO().demo(context).value).toBe(0);
	});

	it("rejects the placeholder when the bounds refuse it, at factory time", () => {
		expect(() => customNumberVO({ options: { minimum: 1 } })).toThrow(
			InvalidEntityDefinitionException,
		);
		expect(() => customNumberVO({ options: { exclusiveMinimum: 0 } })).toThrow(
			InvalidEntityDefinitionException,
		);
	});

	it("accepts an explicit default that satisfies the bounds", () => {
		const Score = customNumberVO({ default: 50, options: { minimum: 1 } });

		expect(Score.demo(context).value).toBe(50);
	});

	it("carries the options into the schema", () => {
		const Score = customNumberVO({ options: { maximum: 100, minimum: 0 } });

		expect(metaOf<number, t.TNumber>(Score).schema.maximum).toBe(100);
	});

	it("constrains to integers through `multipleOf`", () => {
		const Count = customNumberVO({ options: { minimum: 0, multipleOf: 1 } });

		expect(new Count(3, context).value).toBe(3);
		expect(() => new Count(3.5, context)).toThrow(InvalidPropertyException);
	});

	it("runs the validate hook over a schema-valid number", () => {
		const Even = customNumberVO({
			options: { minimum: 0 },
			validate: (value) => value % 2 === 0,
		});

		expect(new Even(4, context).value).toBe(4);
		expect(() => new Even(5, context)).toThrow(InvalidPropertyException);
	});
});
