import {
	BooleanVO,
	NumberVO,
	StringVO,
} from "@/domain/collections/value-objects";
import { entityOf } from "@/domain/entity/helpers";
import type {
	ICanReadBy,
	ICanReadManyBy,
	RepositoryPage,
} from "@/domain/repository/types";
import { describe, expect, it } from "bun:test";

/** Mutual assignability, both directions — the strictest equality a type test can assert. */
type Equal<Left, Right> =
	(<Probe>() => Probe extends Left ? 1 : 2) extends <
		Probe,
	>() => Probe extends Right ? 1 : 2
		? true
		: false;

/**
 * Three keys, three *different* raw value types. That is what makes the
 * key/value pairing observable: a mapped type written over the generated names
 * instead of over the keys would hand every method the union of all three.
 */
const productProperties = {
	title: StringVO,
	stock: NumberVO,
	published: BooleanVO,
};
class Product extends entityOf(productProperties, "product") {}

describe("ICanReadBy", () => {
	it("names the method after the key it was generated from", () => {
		const result: Equal<
			keyof ICanReadBy<typeof Product, "title">,
			"findByTitle"
		> = true;
		expect(result).toBe(true);
	});

	it("generates one method per key when Key is a union", () => {
		const result: Equal<
			keyof ICanReadBy<typeof Product, "title" | "stock">,
			"findByTitle" | "findByStock"
		> = true;
		expect(result).toBe(true);
	});

	it("pairs each generated method with its own key's value type, not the union", () => {
		type Contract = ICanReadBy<typeof Product, "title" | "stock" | "published">;

		const byTitle: Equal<
			Parameters<Contract["findByTitle"]>,
			[value: string]
		> = true;
		const byStock: Equal<
			Parameters<Contract["findByStock"]>,
			[value: number]
		> = true;
		const byPublished: Equal<
			Parameters<Contract["findByPublished"]>,
			[value: boolean]
		> = true;

		expect([byTitle, byStock, byPublished]).toEqual([true, true, true]);
	});

	it("covers the identity fields the Entity base stamps on", () => {
		const result: Equal<
			keyof ICanReadBy<typeof Product, "id" | "createdAt" | "updatedAt">,
			"findById" | "findByCreatedAt" | "findByUpdatedAt"
		> = true;
		expect(result).toBe(true);
	});

	it("carries updatedAt's optionality into the argument type", () => {
		type Contract = ICanReadBy<typeof Product, "id" | "updatedAt">;

		const byId: Equal<Parameters<Contract["findById"]>, [value: string]> = true;
		const byUpdatedAt: Equal<
			Parameters<Contract["findByUpdatedAt"]>,
			[value: string | undefined]
		> = true;

		expect([byId, byUpdatedAt]).toEqual([true, true]);
	});

	it("resolves to an empty contract for an empty key union", () => {
		const result: Equal<keyof ICanReadBy<typeof Product, never>, never> = true;
		expect(result).toBe(true);
	});

	it("is implementable by a class, and that implementation runs", async () => {
		class InMemoryProductReader
			implements ICanReadBy<typeof Product, "title" | "stock">
		{
			public constructor(private readonly rows: readonly Product[]) {}

			public async findByTitle(value: string): Promise<Product | null> {
				return this.rows.find((row) => row.title === value) ?? null;
			}

			public async findByStock(value: number): Promise<Product | null> {
				return this.rows.find((row) => row.stock === value) ?? null;
			}
		}

		const product = new Product({
			title: "arabica",
			stock: 12,
			published: true,
		});
		const reader = new InMemoryProductReader([product]);

		expect(await reader.findByTitle("arabica")).toBe(product);
		expect(await reader.findByStock(12)).toBe(product);
		expect(await reader.findByStock(0)).toBeNull();
	});
});

describe("ICanReadManyBy", () => {
	it("prefixes the method with findManyBy and takes a page", () => {
		type Contract = ICanReadManyBy<typeof Product, "stock">;

		const name: Equal<keyof Contract, "findManyByStock"> = true;
		const signature: Equal<
			Parameters<Contract["findManyByStock"]>,
			[value: number, page: RepositoryPage]
		> = true;

		expect([name, signature]).toEqual([true, true]);
	});

	it("pairs each generated method with its own key's value type", () => {
		type Contract = ICanReadManyBy<typeof Product, "title" | "stock">;

		const byTitle: Equal<
			Parameters<Contract["findManyByTitle"]>,
			[value: string, page: RepositoryPage]
		> = true;
		const byStock: Equal<
			Parameters<Contract["findManyByStock"]>,
			[value: number, page: RepositoryPage]
		> = true;

		expect([byTitle, byStock]).toEqual([true, true]);
	});

	it("resolves to a readonly array of entities, never null", () => {
		const result: Equal<
			ReturnType<ICanReadManyBy<typeof Product, "stock">["findManyByStock"]>,
			Promise<readonly Product[]>
		> = true;
		expect(result).toBe(true);
	});

	it("rejects id as a collection filter key", () => {
		// @ts-expect-error `id` is excluded — findManyByIds is the batch loader.
		type Rejected = ICanReadManyBy<typeof Product, "id">;

		expect<Rejected | undefined>(undefined).toBeUndefined();
	});
});
