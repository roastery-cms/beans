import { SlugSchema, StringSchema } from "@/domain/collections/schemas";
import slugify from "slugify";
import { ValueObject } from "@/domain/value-object";
import { metaOf } from "@/domain/value-object/helpers";
import type { IValueObjectMetadata } from "@/domain/value-object/types";
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
 * Counts how many times `default` gets evaluated. It's what makes the
 * laziness observable without a module mock: just compare the counter
 * before and after construction.
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
			// The subclass declares only `defineMeta`; constructor, validation and
			// demo mode all come from the base.
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
			// Reading the schema doesn't go through the default's validation — it's
			// what lets `Entity` derive the aggregate schema without depending on it.
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

	describe("sensitive", () => {
		/**
		 * The `Sensitive` parameter defaults to `false`, which is what turns
		 * "declared sensitive but forgot the parameter" from a silently
		 * ineffective flag into a compile error. That failure mode is the whole
		 * reason the default is `false` rather than `boolean`, so it is asserted
		 * rather than left to be rediscovered.
		 */
		it("rejects `sensitive: true` without the matching type parameter", () => {
			class Careless extends ValueObject<string, typeof StringSchema> {
				protected defineMeta(): IValueObjectMetadata<
					string,
					typeof StringSchema
				> {
					return {
						default: "string",
						schema: StringSchema,
						// @ts-expect-error `true` is not assignable to the default `false`.
						sensitive: true,
					};
				}
			}

			expect(new Careless("alan", context).value).toBe("alan");
		});

		it("carries the literal into the Meta slot once the parameter is given", () => {
			class Careful extends ValueObject<string, typeof StringSchema, true> {
				protected defineMeta(): IValueObjectMetadata<
					string,
					typeof StringSchema,
					true
				> {
					return { default: "string", schema: StringSchema, sensitive: true };
				}
			}

			expect(metaOf(Careful).sensitive).toBe(true);
			expect(metaOf(DefinedStringVO).sensitive).toBeUndefined();
		});
	});
});
