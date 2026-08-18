import { SlugSchema, StringSchema } from "@/domain/collections/schemas";
import { defineValueObject } from "@/domain/collections/value-objects/custom";
import { ValueObject } from "@/domain/value-object";
import { metaOf } from "@/domain/value-object/helpers";
import {
	InvalidEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import { SchemaManager } from "@roastery/terroir/schema";
import { t } from "@roastery/terroir";
import { describe, expect, it } from "bun:test";

const context = { name: "field", source: "test" } as const;

describe("defineValueObject", () => {
	describe("what it returns", () => {
		it("returns a class, not an instance", () => {
			const Klass = defineValueObject({
				default: "string",
				schema: StringSchema,
			});

			expect(typeof Klass).toBe("function");
			expect(new Klass("alan", context)).toBeInstanceOf(Klass);
		});

		it("produces a real ValueObject subclass", () => {
			const Klass = defineValueObject({
				default: "string",
				schema: StringSchema,
			});

			expect(new Klass("alan", context)).toBeInstanceOf(ValueObject);
		});

		it("wraps the value it was given", () => {
			const Klass = defineValueObject({
				default: "string",
				schema: StringSchema,
			});

			expect(new Klass("alan", context).value).toBe("alan");
		});

		it("falls back to the default in demo mode", () => {
			const Klass = defineValueObject({
				default: "placeholder",
				schema: StringSchema,
			});

			expect(Klass.demo(context).value).toBe("placeholder");
		});

		it("serialises its schema", () => {
			const Klass = defineValueObject({
				default: "string",
				schema: StringSchema,
			});

			expect(JSON.parse(new Klass("alan", context).schema)).toEqual(
				JSON.parse(SchemaManager.serialize(StringSchema)),
			);
		});

		it("mints a distinct class per call, so instanceof does not relate them", () => {
			const First = defineValueObject({ default: "a", schema: StringSchema });
			const Second = defineValueObject({ default: "a", schema: StringSchema });

			expect(First).not.toBe(Second);
			expect(new First("alan", context)).not.toBeInstanceOf(Second);
		});
	});

	describe("metadata", () => {
		it("is readable through metaOf without constructing", () => {
			const Klass = defineValueObject({
				default: "placeholder",
				schema: StringSchema,
			});

			expect(metaOf<string, typeof StringSchema>(Klass)).toEqual({
				default: "placeholder",
				schema: StringSchema,
			});
		});

		it("hands back the same schema object on every construction", () => {
			const schema = t.String();
			const Klass = defineValueObject({ default: "a", schema });

			new Klass("alan", context);

			expect(metaOf<string, typeof schema>(Klass).schema).toBe(schema);
		});
	});

	describe("name", () => {
		it("stamps the given name onto the class", () => {
			const Klass = defineValueObject({
				default: "string",
				name: "PostTitle",
				schema: StringSchema,
			});

			expect(Klass.name).toBe("PostTitle");
		});

		it("leaves the generated name in place when none is given", () => {
			const Klass = defineValueObject({
				default: "string",
				schema: StringSchema,
			});

			expect(Klass.name).toBe("CustomValueObject");
		});
	});

	describe("eager default validation", () => {
		it("rejects a ready default the schema refuses, at factory time", () => {
			expect(() =>
				defineValueObject({ default: "", schema: SlugSchema }),
			).toThrow(InvalidEntityDefinitionException);
		});

		it("reports the given name as the source", () => {
			try {
				defineValueObject({
					default: "",
					name: "TagSlug",
					schema: SlugSchema,
				});
				throw new Error("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidEntityDefinitionException);
				expect((error as InvalidEntityDefinitionException).source).toBe(
					"TagSlug",
				);
			}
		});

		it("falls back to 'value-object' as the source when unnamed", () => {
			try {
				defineValueObject({ default: "", schema: SlugSchema });
				throw new Error("should have thrown");
			} catch (error) {
				expect((error as InvalidEntityDefinitionException).source).toBe(
					"value-object",
				);
			}
		});

		it("does not evaluate a thunk default", () => {
			let calls = 0;

			const Klass = defineValueObject({
				default: () => {
					calls += 1;
					return "slug";
				},
				schema: SlugSchema,
			});

			expect(calls).toBe(0);
			expect(Klass.demo(context).value).toBe("slug");
			expect(calls).toBe(1);
		});

		it("leaves an invalid thunk default to the base, at demo time", () => {
			const Klass = defineValueObject({
				default: () => "",
				schema: SlugSchema,
			});

			expect(() => Klass.demo(context)).toThrow(InvalidPropertyException);
		});
	});

	describe("transform hook", () => {
		it("normalises the value before validation", () => {
			const Klass = defineValueObject({
				default: "alan",
				schema: t.String({ pattern: "^[a-z]+$" }),
				transform: (value) => value.toLowerCase(),
			});

			expect(new Klass("ALAN", context).value).toBe("alan");
		});

		it("does not run over the default", () => {
			let calls = 0;

			const Klass = defineValueObject({
				default: "placeholder",
				schema: StringSchema,
				transform: (value) => {
					calls += 1;
					return value;
				},
			});

			expect(Klass.demo(context).value).toBe("placeholder");
			expect(calls).toBe(0);
		});

		it("leaves the value untouched when no hook is given", () => {
			const Klass = defineValueObject({
				default: "string",
				schema: StringSchema,
			});

			expect(new Klass("  spaced  ", context).value).toBe("  spaced  ");
		});
	});

	describe("validate hook", () => {
		it("accepts a value the predicate approves", () => {
			const Klass = defineValueObject({
				default: "tag",
				schema: StringSchema,
				validate: (value) => !value.startsWith("_"),
			});

			expect(new Klass("visible", context).value).toBe("visible");
		});

		it("throws InvalidPropertyException when the predicate refuses", () => {
			const Klass = defineValueObject({
				default: "tag",
				schema: StringSchema,
				validate: (value) => !value.startsWith("_"),
			});

			expect(() => new Klass("_hidden", context)).toThrow(
				InvalidPropertyException,
			);
		});

		it("carries the context's name and source on that exception", () => {
			const Klass = defineValueObject({
				default: "tag",
				schema: StringSchema,
				validate: () => false,
			});

			try {
				new Klass("anything", { name: "slug", source: "post" });
				throw new Error("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidPropertyException);
				expect((error as InvalidPropertyException).property).toBe("slug");
				expect((error as InvalidPropertyException).source).toBe("post");
			}
		});

		it("only sees values the schema already accepted", () => {
			let seen: string | undefined;

			const Klass = defineValueObject({
				default: "slug",
				schema: SlugSchema,
				validate: (value) => {
					seen = value;
					return true;
				},
			});

			expect(() => new Klass("", context)).toThrow(InvalidPropertyException);
			expect(seen).toBeUndefined();
		});

		it("sees the transformed value, not the raw one", () => {
			let seen: string | undefined;

			const Klass = defineValueObject({
				default: "alan",
				schema: StringSchema,
				transform: (value) => value.trim(),
				validate: (value) => {
					seen = value;
					return true;
				},
			});

			new Klass("  alan  ", context);

			expect(seen).toBe("alan");
		});

		it("receives the identification context", () => {
			let seen: { name: string; source: string } | undefined;

			const Klass = defineValueObject({
				default: "string",
				schema: StringSchema,
				validate: (_value, valueContext) => {
					seen = valueContext;
					return true;
				},
			});

			new Klass("alan", { name: "title", source: "post" });

			expect(seen).toEqual({ name: "title", source: "post" });
		});

		it("propagates an exception thrown from inside the hook", () => {
			const failure = new Error("domain rule broken");

			const Klass = defineValueObject({
				default: "string",
				schema: StringSchema,
				validate: () => {
					throw failure;
				},
			});

			expect(() => new Klass("alan", context)).toThrow(failure);
		});

		it("also guards the default in demo mode", () => {
			const Klass = defineValueObject({
				default: "placeholder",
				schema: StringSchema,
				validate: (value) => value !== "placeholder",
			});

			expect(() => Klass.demo(context)).toThrow(InvalidPropertyException);
		});
	});
});
