import { Command } from "@/application";
import type {
	CommandDefinition,
	CommandResult,
} from "@/application/command/types";
import { PasswordVO, StringVO } from "@/domain/collections/value-objects";
import { customStringVO } from "@/domain/collections/value-objects/custom";
import { Entity } from "@/domain/entity";
import type { EntityDefinition } from "@/domain/entity/types";
import { afterEach, describe, expect, it } from "bun:test";
import { configureRedaction, redactionConfig } from "./redaction-config";

const MaskedEmailVO = customStringVO({
	default: "user@example.com",
	name: "MaskedEmailVO",
	redactWith: (value, { name }) =>
		`${String(value).slice(0, 1)}***@${String(value).split("@")[1]} (${name})`,
	sensitive: true,
});

const TokenVO = customStringVO({ default: "token", name: "TokenVO" });

const accountProperties = {
	name: StringVO,
	password: PasswordVO,
	email: MaskedEmailVO,
	token: TokenVO,
};

class Account extends Entity<typeof accountProperties> {
	protected defineEntity(): EntityDefinition<typeof accountProperties> {
		// `token` is a plain StringVO — secret to *this* aggregate only, which
		// is exactly what the definition-level list is for.
		return {
			properties: accountProperties,
			sensitive: ["token"],
			source: "account",
		};
	}
}

const loginProperties = { email: StringVO, password: PasswordVO };

class Login extends Command<typeof loginProperties, undefined, string> {
	protected defineCommand(): CommandDefinition<typeof loginProperties> {
		return { properties: loginProperties, source: "login" };
	}

	public async execute(): Promise<CommandResult<string>> {
		return { events: [], result: this.get("email") };
	}
}

const account = (): Account =>
	new Account({
		email: "alan@roastery.dev",
		name: "Alan",
		password: "StrongPass1!",
		token: "tok_live_abc",
	});

const login = (): Login =>
	new Login({ email: "alan@roastery.dev", password: "StrongPass1!" });

describe("redaction", () => {
	afterEach(() => {
		configureRedaction();
	});

	it("hands the placeholder function the value and the field context", () => {
		const seen: Array<[unknown, string, string]> = [];

		configureRedaction({
			placeholder: (value, { name, source }) => {
				seen.push([value, name, source]);
				return "x";
			},
		});

		login().toJSON();

		expect(seen).toEqual([["StrongPass1!", "password", "login"]]);
	});

	describe("configuration", () => {
		it('defaults to "[redacted]"', () => {
			expect(redactionConfig().placeholder).toBe("[redacted]");
		});

		it("takes a custom literal placeholder", () => {
			configureRedaction({ placeholder: "***" });

			expect(login().toJSON().password).toBe("***");
		});

		it("takes a placeholder function, receiving the field's name and source", () => {
			configureRedaction({
				placeholder: (_value, { name, source }) => `<${source}.${name}>`,
			});

			expect(login().toJSON().password).toBe("<login.password>");
		});

		it("restores the defaults when called with no argument", () => {
			configureRedaction({ placeholder: "***" });
			configureRedaction();

			expect(login().toJSON().password).toBe("[redacted]");
		});
	});

	describe("Command", () => {
		it("replaces a sensitive value in toJSON", () => {
			const json = login().toJSON();

			expect(json.password).toBe("[redacted]");
			expect(json.email).toBe("alan@roastery.dev");
		});

		it("keeps the plaintext reachable through get() and the accessor", () => {
			expect(login().get("password")).toBe("StrongPass1!");
		});

		it("never leaks through JSON.stringify — the structured-logger path", () => {
			expect(JSON.stringify(login())).not.toContain("StrongPass1!");
		});

		it("redacts in toString() too", () => {
			expect(login().toString()).not.toContain("StrongPass1!");
		});
	});

	describe("Entity", () => {
		it("keeps toJSON lossless, because it is the persistence contract", () => {
			const json = account().toJSON();

			expect(json.password).toBe("StrongPass1!");
			expect(json.token).toBe("tok_live_abc");
		});

		it("round-trips through fromJSON after a real JSON pass", () => {
			const original = account();
			const hydrated = Account.fromJSON(
				JSON.parse(JSON.stringify(original.toJSON())) as ReturnType<
					Account["toJSON"]
				>,
			);

			expect(hydrated.toJSON()).toEqual(original.toJSON());
		});

		it("replaces sensitive values in toSafeJSON", () => {
			const safe = account().toSafeJSON();

			expect(safe.password).toBe("[redacted]");
			expect(safe.name).toBe("Alan");
		});

		it("redacts in toString() and in the inspect hook", () => {
			const one = account();

			expect(one.toString()).not.toContain("StrongPass1!");
			const inspect = (
				one as unknown as {
					[key: symbol]: (() => Record<string, unknown>) | undefined;
				}
			)[Symbol.for("nodejs.util.inspect.custom")];

			expect(inspect).toBeFunction();
			expect(inspect?.call(one).password).toBe("[redacted]");
		});

		it("honours the definition's own sensitive list, beyond the value-objects'", () => {
			// TokenVO declares nothing; `defineEntity` named it.
			expect(account().toSafeJSON().token).toBe("[redacted]");
		});
	});

	describe("per-class redactWith", () => {
		it("wins over the configured placeholder", () => {
			configureRedaction({ placeholder: "***" });

			expect(account().toSafeJSON().email).toBe("a***@roastery.dev (email)");
		});

		it("applies without any global configuration", () => {
			expect(account().toSafeJSON().email).toBe("a***@roastery.dev (email)");
		});

		it("receives the real value, which is what makes partial masking possible", () => {
			// The point of the function receiving the value: masking, not erasing.
			// Without that, `a***@b.dev` would be impossible to produce.
			const masked = account().toSafeJSON().email;

			expect(masked).toContain("roastery.dev");
			expect(masked).not.toContain("alan@");
		});
	});

	describe("non-sensitive classes", () => {
		it("are untouched in every serialization path", () => {
			const one = account();

			expect(one.toSafeJSON().name).toBe("Alan");
			expect(one.toJSON().name).toBe("Alan");
			expect(one.toString()).toContain("Alan");
		});
	});
});
