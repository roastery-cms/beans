import { describe, expect, it } from "bun:test";
import { IntegerVO, StringVO } from "@/domain/collections/value-objects";
import { customStringVO } from "@/domain/collections/value-objects/custom";
import { entityOf } from "@/domain/entity/helpers";
import type { PropertiesShapeBase } from "@/domain/entity/types";
import type { RepositoryFilterKeysOf } from "@/domain/repository/types";
import { recordOf } from "@/domain/record";
import { arrayOf, optionalOf } from "@/domain/wrapper/helpers";
import { filterKeysOf } from "./filter-keys-of";

const SecretVO = customStringVO({ name: "SecretVO", sensitive: true });

class Author extends entityOf({ name: StringVO }, "drift-author") {}
class Money extends recordOf({ amount: IntegerVO }, "drift-money") {}

const properties = {
	title: StringVO,
	password: SecretVO,
	author: Author,
	price: Money,
	tags: arrayOf(StringVO),
	editor: optionalOf(Author),
} satisfies PropertiesShapeBase;

/** Invariant type equality — see `record-type-parity.spec.ts`. */
type Equal<A, B> =
	(<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
		? true
		: false;

function assertEqual<_T extends true>(): void {}

describe("filterKeysOf", () => {
	/**
	 * The one place in the package where the same rule exists twice — once as
	 * `RepositoryFilterKeysOf` (a union, therefore not enumerable at runtime)
	 * and once as this function. The guard below pins the two together in both
	 * directions, which is what makes the duplication acceptable.
	 *
	 * It exists because the runtime half was, until the record pillar landed,
	 * a *negative* test (`!(… instanceof Entity)`): a record-valued key slipped
	 * through it while the type side excluded it, so `inMemoryRepositoryOf`
	 * would have generated a `findByPrice` no port declares.
	 */
	it("selects exactly what RepositoryFilterKeysOf declares", () => {
		// `expected` is the bridge, and it has to be: `filterKeysOf` returns
		// `readonly string[]`, so there are no literals to infer from the call
		// itself. Pinning it in both directions is what closes the gap — the
		// assertion breaks if the type gains or loses a key, the expectation
		// breaks if the runtime does.
		const expected = ["title", "id", "createdAt", "updatedAt"] as const;

		assertEqual<
			Equal<
				(typeof expected)[number],
				RepositoryFilterKeysOf<typeof properties>
			>
		>();

		expect(filterKeysOf(properties)).toEqual([...expected]);
	});

	it("drops a nested record for the same reason it drops a nested entity", () => {
		expect(filterKeysOf(properties)).not.toContain("price");
		expect(filterKeysOf(properties)).not.toContain("author");
	});

	it("drops a key its value-object declared sensitive", () => {
		expect(filterKeysOf(properties)).not.toContain("password");
	});

	/**
	 * A wrapper is excluded on **both** sides for free, and that is the point:
	 * the runtime half tests `isValueObjectClass` *positively*, so a fourth
	 * property kind is dropped without the function being touched — which is
	 * exactly what the negative test it replaced could not do. The type half
	 * still writes the branch out, as documentation.
	 */
	it("drops a wrapped key, whatever it wraps", () => {
		expect(filterKeysOf(properties)).not.toContain("tags");
		expect(filterKeysOf(properties)).not.toContain("editor");
	});
});
