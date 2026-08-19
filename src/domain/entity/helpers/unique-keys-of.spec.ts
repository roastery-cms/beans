import { StringSchema } from "@/domain/collections/schemas";
import { EmailVO, SlugVO, StringVO } from "@/domain/collections/value-objects";
import { customStringVO } from "@/domain/collections/value-objects/custom";
import { Entity } from "@/domain/entity";
import { entityOf, uniqueKeysOf } from "@/domain/entity/helpers";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { ValueObject } from "@/domain/value-object";
import type { IValueObjectMetadata } from "@/domain/value-object/types";
import { describe, expect, it } from "bun:test";

/** Declares uniqueness on the class, so it travels into every blueprint using it. */
class ExternalIdVO extends ValueObject<string, typeof StringSchema> {
	protected defineMeta(): IValueObjectMetadata<string, typeof StringSchema> {
		return { default: "external-id", schema: StringSchema, unique: true };
	}
}

/** Subclassing must inherit the flag, exactly as it inherits `defineMeta`. */
class TenantExternalId extends ExternalIdVO {}

const profileProperties = { bio: StringVO };
class Profile extends entityOf(profileProperties, "profile") {}

const memberProperties = {
	externalId: ExternalIdVO,
	handle: SlugVO,
	name: StringVO,
	profile: Profile,
};

describe("uniqueKeysOf", () => {
	it("always reports id, even for an entity that declares nothing unique", () => {
		const plainProperties = { name: StringVO };
		class Plain extends entityOf(plainProperties, "plain") {}

		expect(uniqueKeysOf(Plain)).toEqual(["id"]);
	});

	it("never reports createdAt or updatedAt, which repeat freely", () => {
		const plainProperties = { name: StringVO };
		class Plain extends entityOf(plainProperties, "plain") {}

		expect(uniqueKeysOf(Plain)).not.toContain("createdAt");
		expect(uniqueKeysOf(Plain)).not.toContain("updatedAt");
	});

	it("collects a key whose value-object declares unique: true", () => {
		class Member extends entityOf(memberProperties, "member") {}

		expect(uniqueKeysOf(Member)).toEqual(["id", "externalId"]);
	});

	it("collects a key whose value-object was built by a custom factory", () => {
		const codeProperties = {
			code: customStringVO({ name: "CodeVO", unique: true }),
			name: StringVO,
		};
		class Coded extends entityOf(codeProperties, "coded") {}

		expect(uniqueKeysOf(Coded)).toEqual(["id", "code"]);
	});

	it("collects a key whose value-object inherits the flag from its parent", () => {
		const scopedProperties = { externalId: TenantExternalId, name: StringVO };
		class Scoped extends entityOf(scopedProperties, "scoped") {}

		expect(uniqueKeysOf(Scoped)).toEqual(["id", "externalId"]);
	});

	it("collects a key the definition named, on top of the ones the VOs declared", () => {
		class Member extends entityOf(memberProperties, "member", {
			unique: ["handle"],
		}) {}

		expect(uniqueKeysOf(Member)).toEqual(["id", "externalId", "handle"]);
	});

	it("does not duplicate a key both sources name", () => {
		class Member extends entityOf(memberProperties, "member", {
			unique: ["externalId"],
		}) {}

		expect(uniqueKeysOf(Member)).toEqual(["id", "externalId"]);
	});

	it("skips a nested-entity key in the scan, since it carries no meta", () => {
		class Member extends entityOf(memberProperties, "member") {}

		expect(uniqueKeysOf(Member)).not.toContain("profile");
	});

	it("keeps a nested-entity key the definition named explicitly", () => {
		class Member extends entityOf(memberProperties, "member", {
			unique: ["profile"],
		}) {}

		expect(uniqueKeysOf(Member)).toContain("profile");
	});

	/**
	 * The guarantee has to hold for the hand-written form too — it lives in the
	 * engine both forms reach, not in `entityOf`, precisely so the two cannot
	 * drift.
	 */
	it("gives the class form the same guarantees as the factory form", () => {
		const guestProperties = { email: EmailVO, name: StringVO };

		// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
		interface Guest extends AccessorsOf<typeof guestProperties> {}
		class Guest extends Entity<typeof guestProperties> {
			protected defineEntity(): EntityDefinition<typeof guestProperties> {
				return {
					properties: guestProperties,
					source: "guest",
					unique: ["email"],
				};
			}
		}

		expect(uniqueKeysOf(Guest)).toEqual(["id", "email"]);
	});

	/**
	 * The reason the per-class memo is keyed by the class and not the blueprint:
	 * one blueprint object, two definitions, two different answers.
	 */
	it("does not leak one class's declared keys into another sharing its blueprint", () => {
		const sharedProperties = { handle: SlugVO, name: StringVO };

		class Loose extends entityOf(sharedProperties, "loose") {}
		class Strict extends entityOf(sharedProperties, "strict", {
			unique: ["handle"],
		}) {}

		expect(uniqueKeysOf(Loose)).toEqual(["id"]);
		expect(uniqueKeysOf(Strict)).toEqual(["id", "handle"]);
		expect(uniqueKeysOf(Loose)).toEqual(["id"]);
	});

	it("returns the same array on a second call, so the memo is doing its job", () => {
		class Member extends entityOf(memberProperties, "member") {}

		expect(uniqueKeysOf(Member)).toBe(uniqueKeysOf(Member));
	});
});
