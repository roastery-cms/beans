import { describe, expect, it } from "bun:test";
import { StringVO } from "@/domain/collections/value-objects";
import { reshapeShape } from "./reshape-shape";

describe("reshapeShape", () => {
	/**
	 * The same contract `blueprint(...).done()` has: the object's identity is
	 * what a caller reuses across call sites, so it must be the argument itself
	 * and not a copy.
	 */
	it("hands back the very object it was given", () => {
		const shape = { name: StringVO };

		expect(reshapeShape(shape)).toBe(shape);
	});

	it("accepts a nested target as a key's value", () => {
		const nested = reshapeShape({ name: StringVO });
		const shape = reshapeShape({ title: StringVO, author: nested });

		expect(shape.author).toBe(nested);
	});

	/**
	 * The `const` type parameter is the whole reason the helper exists: without
	 * it a key holding a nested target would widen to `ReshapeShapeBase` and
	 * `reshapeTo` could say nothing about what comes back.
	 */
	it("infers each key as the literal it was written as", () => {
		const nested = reshapeShape({ name: StringVO });
		const shape = reshapeShape({ author: nested });

		const author: typeof nested = shape.author;

		expect(author.name).toBe(StringVO);
	});
});
