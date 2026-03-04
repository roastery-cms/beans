import { describe, expect, it } from "bun:test";
import { StringArrayVO } from "./string-array.value-object";

describe("StringArrayVO", () => {
	it("should create a valid instance with strings", () => {
		const vo = StringArrayVO.make(["one", "two"], {
			name: "tags",
			source: "domain",
		});
		expect(vo.value).toEqual(["one", "two"]);
	});

	it("should create a valid instance with empty array", () => {
		const vo = StringArrayVO.make([], {
			name: "tags",
			source: "domain",
		});
		expect(vo.value).toEqual([]);
	});
});
