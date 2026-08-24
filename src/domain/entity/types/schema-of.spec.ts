import {
	BooleanVO,
	IntegerVO,
	StringVO,
} from "@/domain/collections/value-objects";
import { blueprint, entityOf } from "@/domain/entity/helpers";
import type { EntitySchemaOf } from "@/domain/entity/types/entity-schema-of.type";
import type { SchemaOf } from "@/domain/entity/types/schema-of.type";
import { recordOf } from "@/domain/record";
import { arrayOf, nullableOf, optionalOf } from "@/domain/wrapper/helpers";
import type { t } from "@roastery/terroir";
import { describe, expect, it } from "bun:test";

/** Invariant type equality — see `record-type-parity.spec.ts`. */
type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

function assertEqual<_T extends true>(): void {}

const tagProperties = blueprint({
	name: StringVO,
	hidden: BooleanVO,
}).with({ hidden: { default: false } });

class Tag extends entityOf(tagProperties, "schema-of-tag") {}

class Money extends recordOf(
	{ amount: IntegerVO, currency: StringVO },
	"schema-of-money",
) {}

const TagList = arrayOf(Tag);
const MaybeTag = optionalOf(Tag);
const NullableTag = nullableOf(Tag);
const MoneyList = arrayOf(Money);

const articleProperties = {
	title: StringVO,
	tags: TagList,
	editor: MaybeTag,
	price: Money,
};

class Article extends entityOf(articleProperties, "schema-of-article") {}

describe("SchemaOf", () => {
	it("resolves a wrapped key instead of collapsing to never", () => {
		assertEqual<
			Equal<[SchemaOf<typeof TagList>] extends [never] ? true : false, false>
		>();
		assertEqual<
			Equal<[SchemaOf<typeof MaybeTag>] extends [never] ? true : false, false>
		>();
		assertEqual<
			Equal<[SchemaOf<typeof MoneyList>] extends [never] ? true : false, false>
		>();

		expect(true).toBe(true);
	});

	it("applies the multiplicity the runtime applies", () => {
		assertEqual<
			Equal<SchemaOf<typeof TagList>, t.TArray<SchemaOf<typeof Tag>>>
		>();
		assertEqual<
			Equal<
				SchemaOf<typeof MaybeTag>,
				t.TUnion<[SchemaOf<typeof Tag>, t.TUndefined]>
			>
		>();
		assertEqual<
			Equal<
				SchemaOf<typeof NullableTag>,
				t.TUnion<[SchemaOf<typeof Tag>, t.TNull]>
			>
		>();

		expect(true).toBe(true);
	});

	it("carries the wrapped key into the aggregate schema type", () => {
		type Properties = EntitySchemaOf<typeof articleProperties>["properties"];

		assertEqual<
			Equal<[Properties["tags"]] extends [never] ? true : false, false>
		>();
		assertEqual<
			Equal<Properties["tags"] extends t.TArray<t.TSchema> ? true : false, true>
		>();

		expect(true).toBe(true);
	});

	it("agrees with the schema the runtime actually derives", () => {
		const article = new Article({
			title: "one",
			tags: [{ name: "a" }],
			price: { amount: 10, currency: "BRL" },
		});

		expect(article.schema.properties.tags.type).toBe("array");
	});
});
