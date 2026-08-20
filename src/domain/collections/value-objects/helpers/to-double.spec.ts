import { describe, expect, it } from "bun:test";
import { toDouble } from "./to-double";

describe("toDouble", () => {
	it("rounds to two decimal places by default", () => {
		expect(toDouble(1234.5678)).toBe(1234.57);
	});

	it("rounds a negative value the same way", () => {
		expect(toDouble(-1234.5678)).toBe(-1234.57);
	});

	it("leaves a value already at the precision untouched", () => {
		expect(toDouble(42.5)).toBe(42.5);
		expect(toDouble(42)).toBe(42);
	});

	it("honours an explicit precision", () => {
		expect(toDouble(1.23456, 3)).toBe(1.235);
		expect(toDouble(1.23456, 0)).toBe(1);
	});

	it("normalises `-0` to `0`", () => {
		expect(Object.is(toDouble(-0.001), 0)).toBe(true);
	});

	it("rounds half toward positive infinity, as `Math.round` does", () => {
		expect(toDouble(-2.005)).toBe(-2);
	});

	it("inherits binary-float representation error, as documented", () => {
		// `1.005 * 100` is `100.49999999999999`, so this rounds down. Exact
		// decimal arithmetic needs a decimal library at the boundary — this is
		// asserted so the limit stays visible rather than being discovered.
		expect(toDouble(1.005)).toBe(1);
	});
});
