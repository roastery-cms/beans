import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { EmailSchema } from "./email.schema";

describe("EmailSchema", () => {
	it("should validate a valid email address", () => {
		expect(SchemaManager.match(EmailSchema, "user@example.com")).toBe(true);
	});

	it("should validate an email with subdomain", () => {
		expect(SchemaManager.match(EmailSchema, "user@mail.example.com")).toBe(
			true,
		);
	});

	it("should invalidate an email without @", () => {
		expect(SchemaManager.match(EmailSchema, "userexample.com")).toBe(false);
	});

	it("should invalidate an email without domain", () => {
		expect(SchemaManager.match(EmailSchema, "user@")).toBe(false);
	});

	it("should invalidate an empty string", () => {
		expect(SchemaManager.match(EmailSchema, "")).toBe(false);
	});
});
