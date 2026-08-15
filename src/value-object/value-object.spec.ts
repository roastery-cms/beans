import { SlugSchema, StringSchema } from "@/collections/schemas";
import slugify from "slugify";
import { ValueObject } from "@/value-object";
import { metaOf } from "@/value-object/helpers";
import type { IValueObjectMetadata } from "@/value-object/types";
import { SchemaManager } from "@roastery/terroir/schema";
import {
	InvalidEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import { beforeEach, describe, expect, it } from "bun:test";

class DefinedStringVO extends ValueObject<string, typeof StringSchema> {
	protected defineMeta(): IValueObjectMetadata<string, typeof StringSchema> {
		return { default: "string", schema: StringSchema };
	}
}

class SlugVO extends ValueObject<string, typeof SlugSchema> {
	protected defineMeta(): IValueObjectMetadata<string, typeof SlugSchema> {
		return { default: "slug", schema: SlugSchema };
	}

	protected override transform(value: string): string {
		return slugify(value, {
			lower: true,
			strict: true,
			trim: true,
		});
	}
}

/**
 * Conta as avaliações do `default`. É o que torna a preguiça observável sem
 * mock de módulo: basta comparar o contador antes e depois da construção.
 */
let defaultCalls = 0;

class LazyVO extends ValueObject<string, typeof StringSchema> {
	protected defineMeta(): IValueObjectMetadata<string, typeof StringSchema> {
		return {
			default: () => {
				defaultCalls += 1;
				return `lazy-${defaultCalls}`;
			},
			schema: StringSchema,
		};
	}
}

const context = { name: "field", source: "test" } as const;

describe("ValueObject (v2)", () => {
	beforeEach(() => {
		defaultCalls = 0;
	});

	describe("construction", () => {
		it("wraps the value it was given", () => {
			expect(new DefinedStringVO("alan", context).value).toBe("alan");
		});

		it("runs transform before validating", () => {
			expect(new SlugVO("Hello World", context).value).toBe("hello-world");
		});

		it("throws InvalidPropertyException carrying name and source", () => {
			try {
				new SlugVO("", context);
				expect.unreachable("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidPropertyException);
				expect((error as InvalidPropertyException).property).toBe("field");
				expect((error as InvalidPropertyException).source).toBe("test");
			}
		});

		it("needs no constructor on the subclass", () => {
			// A subclasse declara só `defineMeta`; construtor, validação e modo
			// demo vêm da base.
			expect(DefinedStringVO.prototype.constructor).toBe(DefinedStringVO);
			expect(new DefinedStringVO("alan", context)).toBeInstanceOf(
				DefinedStringVO,
			);
		});
	});

	describe("defineMeta", () => {
		it("rejects an implementation declared as a class field", () => {
			class Broken extends ValueObject<string, typeof StringSchema> {
				protected defineMeta = (): IValueObjectMetadata<
					string,
					typeof StringSchema
				> => ({ default: "string", schema: StringSchema });
			}

			expect(() => new Broken("alan", context)).toThrow(
				InvalidEntityDefinitionException,
			);
		});

		it("is readable from the class, without constructing anything", () => {
			expect(metaOf(DefinedStringVO).schema).toBe(StringSchema);
			expect(metaOf(SlugVO).schema).toBe(SlugSchema);
		});

		it("reads the meta of a class whose default is invalid", () => {
			// Ler o schema não passa pela validação do default — é o que permite à
			// Entity derivar o schema agregado sem depender dele.
			class BadDefaultVO extends ValueObject<string, typeof SlugSchema> {
				protected defineMeta(): IValueObjectMetadata<
					string,
					typeof SlugSchema
				> {
					return { default: "", schema: SlugSchema };
				}
			}

			expect(metaOf(BadDefaultVO).schema).toBe(SlugSchema);
			expect(() => BadDefaultVO.demo(context)).toThrow(
				InvalidPropertyException,
			);
		});
	});

	describe("demo", () => {
		it("falls back to the metadata default", () => {
			expect(DefinedStringVO.demo(context).value).toBe("string");
		});

		it("returns an instance of the subclass it was called on", () => {
			expect(DefinedStringVO.demo(context)).toBeInstanceOf(DefinedStringVO);
			expect(SlugVO.demo(context)).toBeInstanceOf(SlugVO);
		});

		it("validates the default like any other value", () => {
			class BadDefaultVO extends ValueObject<string, typeof SlugSchema> {
				protected defineMeta(): IValueObjectMetadata<
					string,
					typeof SlugSchema
				> {
					return { default: "", schema: SlugSchema };
				}
			}

			expect(() => BadDefaultVO.demo(context)).toThrow(
				InvalidPropertyException,
			);
		});
	});

	describe("lazy default", () => {
		it("does not evaluate the thunk when a real value is given", () => {
			const vo = new LazyVO("informado", context);

			expect(vo.value).toBe("informado");
			expect(defaultCalls).toBe(0);
		});

		it("evaluates the thunk only in demo mode", () => {
			expect(LazyVO.demo(context).value).toBe("lazy-1");
			expect(defaultCalls).toBe(1);
		});

		it("evaluates once per construction, so each instance differs", () => {
			expect(LazyVO.demo(context).value).not.toBe(LazyVO.demo(context).value);
			expect(defaultCalls).toBe(2);
		});

		it("still accepts a plain value as the default", () => {
			expect(DefinedStringVO.demo(context).value).toBe("string");
		});
	});

	describe("schema", () => {
		it("serialises the model", () => {
			expect(JSON.parse(new DefinedStringVO("alan", context).schema)).toEqual(
				JSON.parse(SchemaManager.serialize(StringSchema)),
			);
		});
	});
});
