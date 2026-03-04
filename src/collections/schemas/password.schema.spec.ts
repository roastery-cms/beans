import { describe, expect, it } from "bun:test";
import { PasswordSchema } from "./password.schema";

describe("PasswordSchema", () => {
	it("should validate a correct password", () => {
		expect(PasswordSchema.match("StrongPassword1!")).toBe(true);
	});

	it("should invalidate password with less than 7 characters", () => {
		expect(PasswordSchema.match("Ab1!")).toBe(false);
	});

	it("should invalidate password without lowercase letters", () => {
		expect(PasswordSchema.match("PASSWORD1!")).toBe(false);
	});

	it("should invalidate password without uppercase letters", () => {
		expect(PasswordSchema.match("password1!")).toBe(false);
	});

	it("should invalidate password without numbers", () => {
		expect(PasswordSchema.match("Password!")).toBe(false);
	});

	it("should invalidate password without special characters", () => {
		expect(PasswordSchema.match("Password123")).toBe(false);
	});
});
