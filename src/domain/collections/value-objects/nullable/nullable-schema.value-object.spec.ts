import { t } from "@roastery/terroir";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { SchemaManager } from "@roastery/terroir/schema";
import { describe, expect, it } from "bun:test";
import { NullableSchemaVO } from "./nullable-schema.value-object";

const context = { name: "shape", source: "post-type" } as const;

const wire = SchemaManager.serialize(t.Object({ author: t.String() }));

describe("NullableSchemaVO", () => {
	it("accepts `null`, never reaching the compile check", () => {
		expect(new NullableSchemaVO(null, context).value).toBeNull();
	});

	it("still accepts a real serialized schema, like `SchemaVO`", () => {
		expect(new NullableSchemaVO(wire, context).value).toBe(wire);
	});

	it("rejects a string that is not JSON", () => {
		expect(() => new NullableSchemaVO("not json", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("rejects JSON that parses but is not a compilable schema", () => {
		expect(() => new NullableSchemaVO('{"type":"banana"}', context)).toThrow(
			InvalidPropertyException,
		);
	});

	it('demos to `null`, not `SchemaVO`\'s "{}"', () => {
		expect(NullableSchemaVO.demo(context).value).toBeNull();
	});
});
