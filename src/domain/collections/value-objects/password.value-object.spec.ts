import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { PasswordVO } from "./password.value-object";

const context = { name: "password", source: "spec" };

describe("PasswordVO", () => {
	it("wraps a password meeting the complexity rules", () => {
		expect(new PasswordVO("My$ecureP@ss7", context).value).toBe(
			"My$ecureP@ss7",
		);
	});

	it("rejects a password without the required character mix", () => {
		expect(() => new PasswordVO("weakpassword", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("rejects a password shorter than 7 characters", () => {
		expect(() => new PasswordVO("Aa1!", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demo() falls back to a valid example password", () => {
		expect(PasswordVO.demo(context).value).toBe("StrongPass1!");
	});
});
