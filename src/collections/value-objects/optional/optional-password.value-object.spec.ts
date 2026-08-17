import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";
import { OptionalPasswordVO } from "./optional-password.value-object";

const context = { name: "password", source: "user" } as const;

describe("OptionalPasswordVO", () => {
	it("accepts `undefined`", () => {
		expect(new OptionalPasswordVO(undefined, context).value).toBeUndefined();
	});

	it("accepts a real strong password", () => {
		expect(new OptionalPasswordVO("My$ecureP@ss7", context).value).toBe(
			"My$ecureP@ss7",
		);
	});

	it("rejects a password that fails the complexity rules", () => {
		expect(() => new OptionalPasswordVO("weak", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("demos to `undefined`, not `PasswordVO`'s example", () => {
		expect(OptionalPasswordVO.demo(context).value).toBeUndefined();
	});
});
