import type { SlugDTO, StringDTO } from "@/collections/dtos";
import { SlugSchema, StringSchema } from "@/collections/schemas";
import { slugify } from "@/entity/helpers";
import { metaOf, ValueObject } from "@/value-object/new";
import type { IValueObjectMetadata } from "@/value-object/types";
import {
	InvalidPropertyException,
	OperationFailedException,
} from "@roastery/terroir/exceptions/domain";
import { beforeEach, describe, expect, it } from "bun:test";

class DefinedStringVO extends ValueObject<string, typeof StringDTO> {
	protected defineMeta(): IValueObjectMetadata<string, typeof StringDTO> {
		return { default: "string", model: StringSchema };
	}
}

class SlugVO extends ValueObject<string, typeof SlugDTO> {
	protected defineMeta(): IValueObjectMetadata<string, typeof SlugDTO> {
		return { default: "slug", model: SlugSchema };
	}

	protected override transform(value: string): string {
		return slugify(value);
	}
}

/**
 * Conta as avaliações do `default`. É o que torna a preguiça observável sem
 * mock de módulo: basta comparar o contador antes e depois da construção.
 */
let defaultCalls = 0;

class LazyVO extends ValueObject<string, typeof StringDTO> {
	protected defineMeta(): IValueObjectMetadata<string, typeof StringDTO> {
		return {
			default: () => {
				defaultCalls += 1;
				return `lazy-${defaultCalls}`;
			},
			model: StringSchema,
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
				new DefinedStringVO("", context);
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
			class Broken extends ValueObject<string, typeof StringDTO> {
				protected defineMeta = (): IValueObjectMetadata<
					string,
					typeof StringDTO
				> => ({ default: "string", model: StringSchema });
			}

			expect(() => new Broken("alan", context)).toThrow(
				OperationFailedException,
			);
		});

		it("is readable from the class, without constructing anything", () => {
			expect(metaOf(DefinedStringVO).model).toBe(StringSchema);
			expect(metaOf(SlugVO).model).toBe(SlugSchema);
		});

		it("reads the meta of a class whose default is invalid", () => {
			// Ler o schema não passa pela validação do default — é o que permite à
			// BetterEntity derivar o schema agregado sem depender dele.
			class BadDefaultVO extends ValueObject<string, typeof StringDTO> {
				protected defineMeta(): IValueObjectMetadata<string, typeof StringDTO> {
					return { default: "", model: StringSchema };
				}
			}

			expect(metaOf(BadDefaultVO).model).toBe(StringSchema);
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
			class BadDefaultVO extends ValueObject<string, typeof StringDTO> {
				protected defineMeta(): IValueObjectMetadata<string, typeof StringDTO> {
					return { default: "", model: StringSchema };
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
				JSON.parse(StringSchema.toString()),
			);
		});
	});
});
