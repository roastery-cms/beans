import { describe, expect, it } from "bun:test";
import { Schema } from "@roastery/terroir/schema";
import { EmailDTO } from "./email.dto";

describe("EmailDTO", () => {
	const validator = new Schema(EmailDTO);

	it("should validate a valid email address", () => {
		expect(validator.match("user@example.com")).toBe(true);
	});

	it("should validate an email with subdomain", () => {
		expect(validator.match("user@mail.example.com")).toBe(true);
	});

	it("should invalidate an email without @", () => {
		expect(validator.match("userexample.com")).toBe(false);
	});

	it("should invalidate an email without domain", () => {
		expect(validator.match("user@")).toBe(false);
	});

	it("should invalidate an empty string", () => {
		expect(validator.match("")).toBe(false);
	});
});
