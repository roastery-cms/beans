import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { NullablePasswordVO } from "./nullable-password.value-object";

const context = { name: "password", source: "user" } as const;

describe("NullablePasswordVO", () => {
	it("accepts `null`", () => {
		expect(new NullablePasswordVO(null, context).value).toBeNull();
	});

	it("accepts a real strong password", () => {
		expect(new NullablePasswordVO("My$ecureP@ss7", context).value).toBe(
			"My$ecureP@ss7",
		);
	});

	it("rejects a password that fails the complexity rules", () => {
		expect(() => new NullablePasswordVO("weak", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `null`, not `PasswordVO`'s example", () => {
		expect(NullablePasswordVO.demo(context).value).toBeNull();
	});
});
