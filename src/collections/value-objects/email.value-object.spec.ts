import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { EmailVO } from "./email.value-object";

const context = { name: "email", source: "spec" };

describe("EmailVO", () => {
	it("wraps a valid email address", () => {
		expect(new EmailVO("alan@example.com", context).value).toBe(
			"alan@example.com",
		);
	});

	it("rejects a string without @", () => {
		expect(() => new EmailVO("userexample.com", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("rejects an empty string", () => {
		expect(() => new EmailVO("", context)).toThrow(InvalidPropertyException);
	});

	it("demo() falls back to a valid example address", () => {
		expect(EmailVO.demo(context).value).toBe("user@example.com");
	});
});
