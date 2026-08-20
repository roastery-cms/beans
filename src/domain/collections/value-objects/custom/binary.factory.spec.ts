import {
	customBinaryVO,
	decodeBase64,
	encodeBase64,
} from "@/domain/collections/value-objects/custom";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import {
	InvalidEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import { describe, expect, it } from "bun:test";

const context = { name: "avatar", source: "user" } as const;

const Avatar = customBinaryVO();

const avatarProperties = { avatar: Avatar };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Holder extends AccessorsOf<typeof avatarProperties> {}
class Holder extends Entity<typeof avatarProperties> {
	protected defineEntity(): EntityDefinition<typeof avatarProperties> {
		return { properties: avatarProperties, source: "holder" };
	}
}

describe("customBinaryVO", () => {
	it("accepts a valid base64 payload", () => {
		const value = encodeBase64(new Uint8Array([1, 2, 3]));

		expect(new Avatar(value, context).value).toBe(value);
	});

	it("accepts the empty payload, its placeholder default", () => {
		expect(Avatar.demo(context).value).toBe("");
	});

	it("rejects a string that is not base64", () => {
		expect(() => new Avatar("not base64!", context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("rejects a payload above `maxBytes`", () => {
		const Small = customBinaryVO({ options: { maxBytes: 2 } });

		expect(() => new Small(encodeBase64(new Uint8Array(3)), context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("counts bytes exactly, not through the base64 string's length", () => {
		// Three bytes and one byte both encode to a four-character group, so a
		// bound lowered into `maxLength` would let the three-byte payload through.
		const Small = customBinaryVO({ options: { maxBytes: 1 } });

		expect(new Small(encodeBase64(new Uint8Array(1)), context).value).toBe(
			"AA==",
		);
		expect(() => new Small(encodeBase64(new Uint8Array(3)), context)).toThrow(
			InvalidPropertyException,
		);
	});

	it("rejects a payload below `minBytes`", () => {
		const Signature = customBinaryVO({
			options: { minBytes: 4 },
			default: encodeBase64(new Uint8Array(4)),
		});

		expect(
			() => new Signature(encodeBase64(new Uint8Array(2)), context),
		).toThrow(InvalidPropertyException);
	});

	it("rejects a default outside the declared bounds, at factory-call time", () => {
		expect(() => customBinaryVO({ options: { minBytes: 4 } })).toThrow(
			InvalidEntityDefinitionException,
		);
	});

	it("runs the caller's own `validate` hook on top of the bounds", () => {
		const PngOnly = customBinaryVO({
			validate: (value) => value.startsWith("iVBOR"),
		});

		expect(
			() => new PngOnly(encodeBase64(new Uint8Array([1, 2, 3])), context),
		).toThrow(InvalidPropertyException);
	});

	it("round-trips bytes through `encodeBase64` / `decodeBase64`", () => {
		const bytes = new Uint8Array([0, 1, 127, 128, 255]);

		expect(decodeBase64(encodeBase64(bytes))).toEqual(bytes);
	});

	it("encodes a payload far past the call-stack limit of a single spread", () => {
		const bytes = new Uint8Array(600_000).fill(7);

		expect(decodeBase64(encodeBase64(bytes))).toEqual(bytes);
	});

	it("survives a full JSON round-trip inside an entity", () => {
		const value = encodeBase64(new Uint8Array([9, 8, 7]));
		const holder = new Holder({ avatar: value });
		const raw = JSON.parse(JSON.stringify(holder.toJSON()));

		expect(Holder.fromJSON(raw).avatar).toBe(value);
	});

	it("still redacts when declared sensitive", () => {
		const Secret = customBinaryVO({ sensitive: true });
		const secretProperties = { secret: Secret };

		class Vault extends Entity<typeof secretProperties> {
			protected defineEntity(): EntityDefinition<typeof secretProperties> {
				return { properties: secretProperties, source: "vault" };
			}
		}

		const vault = new Vault({
			secret: encodeBase64(new Uint8Array([1, 2, 3])),
		});

		expect(vault.toString()).not.toContain("AQID");
	});
});
