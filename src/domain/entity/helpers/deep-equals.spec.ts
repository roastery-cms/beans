import { describe, expect, it } from "bun:test";
import { deepEquals } from "./deep-equals";

describe("deepEquals", () => {
	it("should compare primitives strictly", () => {
		expect(deepEquals("a", "a")).toBe(true);
		expect(deepEquals("a", "b")).toBe(false);
		expect(deepEquals(1, 1)).toBe(true);
		expect(deepEquals(1, "1")).toBe(false);
		expect(deepEquals(true, true)).toBe(true);
		expect(deepEquals(null, null)).toBe(true);
		expect(deepEquals(undefined, undefined)).toBe(true);
		expect(deepEquals(null, undefined)).toBe(false);
	});

	it("should compare arrays element by element", () => {
		expect(deepEquals(["a", "b"], ["a", "b"])).toBe(true);
		expect(deepEquals(["a", "b"], ["b", "a"])).toBe(false);
		expect(deepEquals(["a"], ["a", "b"])).toBe(false);
		expect(deepEquals([], [])).toBe(true);
	});

	it("should compare nested objects structurally", () => {
		expect(
			deepEquals({ a: 1, b: { c: [1, 2] } }, { a: 1, b: { c: [1, 2] } }),
		).toBe(true);
		expect(deepEquals({ a: 1 }, { a: 2 })).toBe(false);
		expect(deepEquals({ a: 1 }, { a: 1, b: 2 })).toBe(false);
		expect(deepEquals({ a: 1, b: 2 }, { a: 1 })).toBe(false);
	});

	it("should not equate arrays with plain objects", () => {
		expect(deepEquals([], {})).toBe(false);
		expect(deepEquals({ 0: "a", length: 1 }, ["a"])).toBe(false);
	});
});
