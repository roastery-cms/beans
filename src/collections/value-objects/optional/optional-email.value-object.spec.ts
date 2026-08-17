import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { OptionalEmailVO } from "./optional-email.value-object";

const context = { name: "email", source: "user" } as const;

describe("OptionalEmailVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalEmailVO(undefined, context).value).toBeUndefined();
	});

	it("accepts a real email", () => {
		expect(new OptionalEmailVO("alan@example.com", context).value).toBe(
			"alan@example.com",
		);
	});

	it("rejects a malformed email", () => {
		expect(() => new OptionalEmailVO("not-an-email", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `undefined`, not `EmailVO`'s example address", () => {
		expect(OptionalEmailVO.demo(context).value).toBeUndefined();
	});
});
