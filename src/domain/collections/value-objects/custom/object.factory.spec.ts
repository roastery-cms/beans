import { customObjectVO } from "@/domain/collections/value-objects/custom";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import { metaOf } from "@/domain/value-object/helpers";
import {
	InvalidEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import { t } from "@roastery/terroir";
import { describe, expect, it } from "bun:test";

const context = { name: "profile", source: "bean" } as const;

const profileShape = {
	minutes: t.Number({ minimum: 0 }),
	temperature: t.Number({ minimum: 0 }),
};

const roastProfile = { minutes: 12, temperature: 210 } as const;

describe("customObjectVO", () => {
	it("validates the declared shape", () => {
		const Profile = customObjectVO(profileShape, { default: roastProfile });

		expect(
			new Profile({ minutes: 9, temperature: 195 }, context).value,
		).toEqual({ minutes: 9, temperature: 195 });
		expect(
			() => new Profile({ minutes: -1, temperature: 195 }, context),
		).toThrow(InvalidPropertyException);
	});

	it("rejects a missing key", () => {
		const Profile = customObjectVO(profileShape, { default: roastProfile });

		expect(
			() =>
				new Profile(
					{ temperature: 195 } as unknown as typeof roastProfile,
					context,
				),
		).toThrow(InvalidPropertyException);
	});

	it("rejects extra keys, since additionalProperties defaults to false", () => {
		const Profile = customObjectVO(profileShape, { default: roastProfile });

		expect(
			() =>
				new Profile(
					{ ...roastProfile, extra: true } as unknown as typeof roastProfile,
					context,
				),
		).toThrow(InvalidPropertyException);
	});

	it("lets the caller opt into extra keys", () => {
		const Profile = customObjectVO(profileShape, {
			default: roastProfile,
			options: { additionalProperties: true },
		});

		expect(
			new Profile(
				{ ...roastProfile, extra: true } as unknown as typeof roastProfile,
				context,
			).value,
		).toEqual({
			...roastProfile,
			extra: true,
		} as unknown as typeof roastProfile);
	});

	it("uses the required default in demo mode", () => {
		const Profile = customObjectVO(profileShape, { default: roastProfile });

		expect(Profile.demo(context).value).toEqual(roastProfile);
	});

	it("rejects a default the shape refuses, at factory time", () => {
		expect(() =>
			customObjectVO(profileShape, {
				default: { minutes: -1, temperature: 210 },
			}),
		).toThrow(InvalidEntityDefinitionException);
	});

	it("carries the shape into the built schema", () => {
		const Profile = customObjectVO(profileShape, { default: roastProfile });
		const schema = metaOf<typeof roastProfile, t.TObject<typeof profileShape>>(
			Profile,
		).schema;

		expect(schema.additionalProperties).toBe(false);
		expect(schema.properties.minutes).toBe(profileShape.minutes);
	});
});

const RoastProfile = customObjectVO(profileShape, {
	default: roastProfile,
	name: "RoastProfile",
});

const beanProperties = { profile: RoastProfile };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Bean extends AccessorsOf<typeof beanProperties> {}
class Bean extends Entity<typeof beanProperties> {
	protected defineEntity(): EntityDefinition<typeof beanProperties> {
		return { properties: beanProperties, source: "bean" };
	}
}

describe("customObjectVO in a blueprint", () => {
	it("reads the object back through the typed accessor", () => {
		expect(
			new Bean({ profile: { minutes: 9, temperature: 195 } }).profile,
		).toEqual({ minutes: 9, temperature: 195 });
	});

	it("round-trips through toJSON and fromJSON", () => {
		const row = new Bean({ profile: roastProfile }).toJSON();

		expect(row.profile).toEqual(roastProfile);
		expect(Bean.fromJSON(row).profile).toEqual(roastProfile);
	});

	it("uses the factory's default in demo mode", () => {
		expect(Bean.demo().profile).toEqual(roastProfile);
	});
});
