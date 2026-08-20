import { describe, expect, it } from "bun:test";
import { toInteger } from "./to-integer";

describe("toInteger", () => {
	it("truncates a positive float toward zero", () => {
		expect(toInteger(2.7)).toBe(2);
	});

	it("truncates a negative float toward zero", () => {
		expect(toInteger(-2.7)).toBe(-2);
	});

	it("leaves a whole number untouched", () => {
		expect(toInteger(42)).toBe(42);
		expect(toInteger(-42)).toBe(-42);
	});

	it("normalises `-0` to `0`", () => {
		// `Math.trunc(-0.5)` is `-0`, which does not survive a toJSON/fromJSON
		// round-trip identically: `JSON.stringify(-0)` is `"0"`, while
		// `Object.is(-0, 0)` is `false`.
		expect(Object.is(toInteger(-0.5), 0)).toBe(true);
	});
});
