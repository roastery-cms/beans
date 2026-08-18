import { commandOf } from "@/application/command/helpers";
import type { CommandResult } from "@/application/command/types";
import {
	EmailVO,
	PasswordVO,
	StringVO,
} from "@/domain/collections/value-objects";
import { BadRequestException } from "@roastery/terroir/exceptions/application";
import { describe, expect, it } from "bun:test";

type Deps = { readonly greeting: string };

const greetProperties = { email: EmailVO, name: StringVO };

class Greet extends commandOf<typeof greetProperties, Deps, string>(
	greetProperties,
	"greet",
) {
	public async execute({ greeting }: Deps): Promise<CommandResult<string>> {
		// Typed accessors, no interface merge — that's the test.
		return { events: [], result: `${greeting}, ${this.name} <${this.email}>` };
	}
}

const greet = (): Greet =>
	new Greet({ email: "alan@roastery.dev", name: "Alan" });

describe("commandOf", () => {
	it("types the blueprint accessors with no interface merge", () => {
		const name: string = greet().name;
		const email: string = greet().email;

		expect(name).toBe("Alan");
		expect(email).toBe("alan@roastery.dev");
	});

	it("runs execute with the accessors in scope", async () => {
		const { result } = await greet().execute({ greeting: "Oi" });

		expect(result).toBe("Oi, Alan <alan@roastery.dev>");
	});

	it("always returns an events array, even when empty", async () => {
		const { events } = await greet().execute({ greeting: "Oi" });

		expect(events).toEqual([]);
	});

	it("returns the subclass from demo(), not the base", () => {
		const fixture = Greet.demo();

		expect(fixture).toBeInstanceOf(Greet);
		expect(fixture.email).toBe("user@example.com");
	});

	it("hydrates strictly through fromJSON", () => {
		const hydrated = Greet.fromJSON({
			email: "alan@roastery.dev",
			name: "Alan",
		});

		expect(hydrated).toBeInstanceOf(Greet);
		expect(hydrated.name).toBe("Alan");
	});

	it("rejects an extra key through fromJSON, like the class form", () => {
		expect(() =>
			Greet.fromJSON({
				email: "alan@roastery.dev",
				extra: "nope",
				name: "Alan",
			} as unknown as ReturnType<Greet["toJSON"]>),
		).toThrow(BadRequestException);
	});

	it("still redacts a sensitive value in toJSON", () => {
		const loginProperties = { email: EmailVO, password: PasswordVO };

		class Login extends commandOf<typeof loginProperties, undefined, string>(
			loginProperties,
			"login",
		) {
			public async execute(): Promise<CommandResult<string>> {
				return { events: [], result: this.email };
			}
		}

		expect(
			new Login({ email: "a@b.dev", password: "StrongPass1!" }).toJSON()
				.password,
		).toBe("[redacted]");
	});
});
