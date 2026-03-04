import { describe, expect, it } from "bun:test";
import { PasswordDTO } from "./password.dto";
import { Schema } from "@roastery/terroir/schema";

describe("PasswordDTO", () => {
	const validator = new Schema(PasswordDTO);

	it("should validate a correct password", () => {
		const validPassword = "StrongPassword1!";
		expect(validator.match(validPassword)).toBe(true);
	});

	it("should invalidate password with less than 7 characters", () => {
		const shortPassword = "Ab1!";
		expect(validator.match(shortPassword)).toBe(false);
	});

	it("should invalidate password without lowercase letters", () => {
		const noLowercase = "PASSWORD1!";
		expect(validator.match(noLowercase)).toBe(false);
	});

	it("should invalidate password without uppercase letters", () => {
		const noUppercase = "password1!";
		expect(validator.match(noUppercase)).toBe(false);
	});

	it("should invalidate password without numbers", () => {
		const noNumber = "Password!";
		expect(validator.match(noNumber)).toBe(false);
	});

	it("should invalidate password without special characters", () => {
		const noSpecial = "Password123";
		expect(validator.match(noSpecial)).toBe(false);
	});
});
