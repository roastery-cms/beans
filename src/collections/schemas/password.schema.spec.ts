import { describe, expect, it } from "bun:test";
import { SchemaManager } from "@roastery/terroir/schema";
import { PasswordSchema } from "./password.schema";

describe("PasswordSchema", () => {
	it("should validate a correct password", () => {
		const validPassword = "StrongPassword1!";
		expect(SchemaManager.match(PasswordSchema, validPassword)).toBe(true);
	});

	it("should invalidate password with less than 7 characters", () => {
		const shortPassword = "Ab1!";
		expect(SchemaManager.match(PasswordSchema, shortPassword)).toBe(false);
	});

	it("should invalidate password without lowercase letters", () => {
		const noLowercase = "PASSWORD1!";
		expect(SchemaManager.match(PasswordSchema, noLowercase)).toBe(false);
	});

	it("should invalidate password without uppercase letters", () => {
		const noUppercase = "password1!";
		expect(SchemaManager.match(PasswordSchema, noUppercase)).toBe(false);
	});

	it("should invalidate password without numbers", () => {
		const noNumber = "Password!";
		expect(SchemaManager.match(PasswordSchema, noNumber)).toBe(false);
	});

	it("should invalidate password without special characters", () => {
		const noSpecial = "Password123";
		expect(SchemaManager.match(PasswordSchema, noSpecial)).toBe(false);
	});
});
