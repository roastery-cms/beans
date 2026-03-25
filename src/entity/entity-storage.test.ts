import { describe, it, expect, beforeEach } from "bun:test";
import { EntityStorage } from "./entity-storage";

describe("EntityStorage", () => {
	let storage: EntityStorage;

	beforeEach(() => {
		storage = new EntityStorage();
	});

	describe("get", () => {
		it("retorna null para chave inexistente", () => {
			expect(storage.get("chave")).toBeNull();
		});

		it("retorna o valor após set", () => {
			storage.set("chave", "valor");
			expect(storage.get("chave")).toBe("valor");
		});

		it("retorna null após del", () => {
			storage.set("chave", "valor");
			storage.del("chave");
			expect(storage.get("chave")).toBeNull();
		});
	});

	describe("set", () => {
		it("sobrescreve valor existente", () => {
			storage.set("chave", "primeiro");
			storage.set("chave", "segundo");
			expect(storage.get("chave")).toBe("segundo");
		});

		it("armazena múltiplas chaves independentemente", () => {
			storage.set("a", "1");
			storage.set("b", "2");
			expect(storage.get("a")).toBe("1");
			expect(storage.get("b")).toBe("2");
		});
	});

	describe("del", () => {
		it("não lança erro ao deletar chave inexistente", () => {
			expect(() => storage.del("inexistente")).not.toThrow();
		});

		it("remove apenas a chave especificada", () => {
			storage.set("a", "1");
			storage.set("b", "2");
			storage.del("a");
			expect(storage.get("a")).toBeNull();
			expect(storage.get("b")).toBe("2");
		});
	});
});
