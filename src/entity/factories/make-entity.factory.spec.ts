import { describe, expect, it } from "bun:test";
import { makeEntity } from "./make-entity.factory";

describe("Make Entity Factory", () => {
	it("should create a valid entity dto", () => {
		const entity = makeEntity();

		expect(entity).toBeDefined();
		expect(entity.id).toBeDefined();
		expect(typeof entity.id).toBe("string");
		expect(entity.id.length).toBeGreaterThan(0);

		expect(entity.createdAt).toBeDefined();
		expect(new Date(entity.createdAt).toISOString()).toBe(entity.createdAt);

		expect(entity.updatedAt).toBeUndefined();
	});
});
