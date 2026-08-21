import { t } from "@roastery/terroir";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { SchemaManager } from "@roastery/terroir/schema";
import { describe, expect, it } from "bun:test";
import { OptionalSchemaVO } from "./optional-schema.value-object";

const context = { name: "shape", source: "post-type" } as const;

const wire = SchemaManager.serialize(t.Object({ author: t.String() }));

describe("OptionalSchemaVO", () => {
	it("accepts `undefined`, never reaching the compile check", () => {
		expect(new OptionalSchemaVO(undefined, context).value).toBeUndefined();
	});

	it("still accepts a real serialized schema, like `SchemaVO`", () => {
		expect(new OptionalSchemaVO(wire, context).value).toBe(wire);
	});

	it("rejects a string that is not JSON", () => {
		expect(() => new OptionalSchemaVO("not json", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("rejects JSON that parses but is not a compilable schema", () => {
		expect(() => new OptionalSchemaVO('{"type":"banana"}', context)).toThrow(
			InvalidPropertyException,
		);
	});

	it('demos to `undefined`, not `SchemaVO`\'s "{}"', () => {
		expect(OptionalSchemaVO.demo(context).value).toBeUndefined();
	});
});
