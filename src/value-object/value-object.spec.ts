import { describe, expect, it } from "bun:test";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { ValueObject } from "./value-object";
import type { StringDTO } from "@/collections/dtos";
import { StringSchema } from "@/collections/schemas";

class TestVO extends ValueObject<string, typeof StringDTO> {
	protected schema = StringSchema;

	public static make(value: string) {
		const vo = new TestVO(value, { name: "test", source: "domain" });
		vo.validate();
		return vo;
	}
}

describe("ValueObject", () => {
	it("should create a valid instance", () => {
		const vo = TestVO.make("valid");
		expect(vo.value).toBe("valid");
	});

	it("should throw InvalidPropertyException when validation fails", () => {
		expect(() => TestVO.make("")).toThrow(InvalidPropertyException);
	});
});
