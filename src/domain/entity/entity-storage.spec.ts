import { describe, it, expect, beforeEach } from "bun:test";
import { EntityStorage } from "./entity-storage";

describe("EntityStorage", () => {
	let storage: EntityStorage;

	beforeEach(() => {
		storage = new EntityStorage();
	});

	describe("get", () => {
		it("returns null for a nonexistent key", () => {
			expect(storage.get("chave")).toBeNull();
		});

		it("returns the value after set", () => {
			storage.set("chave", "valor");
			expect(storage.get("chave")).toBe("valor");
		});

		it("returns null after del", () => {
			storage.set("chave", "valor");
			storage.del("chave");
			expect(storage.get("chave")).toBeNull();
		});
	});

	describe("set", () => {
		it("overwrites an existing value", () => {
			storage.set("chave", "primeiro");
			storage.set("chave", "segundo");
			expect(storage.get("chave")).toBe("segundo");
		});

		it("stores multiple keys independently", () => {
			storage.set("a", "1");
			storage.set("b", "2");
			expect(storage.get("a")).toBe("1");
			expect(storage.get("b")).toBe("2");
		});
	});

	describe("del", () => {
		it("does not throw when deleting a nonexistent key", () => {
			expect(() => storage.del("inexistente")).not.toThrow();
		});

		it("removes only the specified key", () => {
			storage.set("a", "1");
			storage.set("b", "2");
			storage.del("a");
			expect(storage.get("a")).toBeNull();
			expect(storage.get("b")).toBe("2");
		});
	});

	describe("clear", () => {
		it("does not throw on an empty store", () => {
			expect(() => storage.clear()).not.toThrow();
		});

		it("removes all entries at once", () => {
			storage.set("a", "1");
			storage.set("b", "2");
			storage.clear();
			expect(storage.get("a")).toBeNull();
			expect(storage.get("b")).toBeNull();
		});
	});
});
