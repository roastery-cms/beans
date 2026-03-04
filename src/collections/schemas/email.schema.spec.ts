import { describe, expect, it } from "bun:test";
import { EmailSchema } from "./email.schema";

describe("EmailSchema", () => {
	it("should validate a valid email", () => {
		expect(EmailSchema.match("user@example.com")).toBe(true);
	});

	it("should validate an email with subdomain", () => {
		expect(EmailSchema.match("user@mail.example.com")).toBe(true);
	});

	it("should invalidate an empty string", () => {
		expect(EmailSchema.match("")).toBe(false);
	});

	it("should invalidate a string without @", () => {
		expect(EmailSchema.match("userexample.com")).toBe(false);
	});

	it("should invalidate a number", () => {
		expect(EmailSchema.match(123)).toBe(false);
	});
});
