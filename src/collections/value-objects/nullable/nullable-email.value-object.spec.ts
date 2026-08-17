import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { NullableEmailVO } from "./nullable-email.value-object";

const context = { name: "email", source: "user" } as const;

describe("NullableEmailVO", () => {
	it("accepts `null`", () => {
		expect(new NullableEmailVO(null, context).value).toBeNull();
	});

	it("accepts a real email", () => {
		expect(new NullableEmailVO("alan@example.com", context).value).toBe(
			"alan@example.com",
		);
	});

	it("rejects a malformed email", () => {
		expect(() => new NullableEmailVO("not-an-email", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `null`, not `EmailVO`'s example address", () => {
		expect(NullableEmailVO.demo(context).value).toBeNull();
	});
});
