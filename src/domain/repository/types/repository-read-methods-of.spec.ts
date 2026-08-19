import { EmailVO, StringVO } from "@/domain/collections/value-objects";
import { entityOf } from "@/domain/entity/helpers";
import type {
	RepositoryCollectionFilterKeysOf,
	RepositoryFilterKeysOf,
	RepositoryMethodsOf,
	RepositoryReadMethodsOf,
	RepositoryWriteMethods,
} from "@/domain/repository/types";
import { describe, expect, it } from "bun:test";

/** Mutual assignability, both directions — the strictest equality a type test can assert. */
type Equal<Left, Right> =
	(<Probe>() => Probe extends Left ? 1 : 2) extends <
		Probe,
	>() => Probe extends Right ? 1 : 2
		? true
		: false;

/** Whether `Name` is a member of the catalog, as a boolean literal. */
type InCatalog<Name> = [Name] extends [RepositoryReadMethodsOf<typeof User>]
	? true
	: false;

const profileProperties = { bio: StringVO };
class Profile extends entityOf(profileProperties, "profile") {}

const userProperties = { name: StringVO, email: EmailVO, profile: Profile };
class User extends entityOf(userProperties, "user") {}

describe("RepositoryFilterKeysOf", () => {
	it("carries the value-object keys plus the three identity fields", () => {
		const result: Equal<
			RepositoryFilterKeysOf<typeof userProperties>,
			"name" | "email" | "id" | "createdAt" | "updatedAt"
		> = true;
		expect(result).toBe(true);
	});

	it("excludes a key backed by a nested entity", () => {
		const result: Equal<
			Extract<RepositoryFilterKeysOf<typeof userProperties>, "profile">,
			never
		> = true;
		expect(result).toBe(true);
	});
});

describe("RepositoryCollectionFilterKeysOf", () => {
	it("is the filter keys minus id", () => {
		const result: Equal<
			RepositoryCollectionFilterKeysOf<typeof userProperties>,
			"name" | "email" | "createdAt" | "updatedAt"
		> = true;
		expect(result).toBe(true);
	});
});

describe("RepositoryReadMethodsOf", () => {
	it("expands to the three fixed reads plus one method per derived key", () => {
		const result: Equal<
			RepositoryReadMethodsOf<typeof User>,
			| "count"
			| "findMany"
			| "findManyByIds"
			| "findById"
			| "findByCreatedAt"
			| "findByUpdatedAt"
			| "findByName"
			| "findByEmail"
			| "findManyByCreatedAt"
			| "findManyByUpdatedAt"
			| "findManyByName"
			| "findManyByEmail"
		> = true;
		expect(result).toBe(true);
	});

	it("includes the names a blueprint key generates", () => {
		const results = [
			true satisfies InCatalog<"findByEmail">,
			true satisfies InCatalog<"findManyByName">,
			true satisfies InCatalog<"findById">,
			true satisfies InCatalog<"findManyByIds">,
			true satisfies InCatalog<"count">,
		];
		expect(results).toEqual([true, true, true, true, true]);
	});

	it("excludes a nested-entity key, findManyById, and any name off the model", () => {
		const results = [
			false satisfies InCatalog<"findByProfile">,
			false satisfies InCatalog<"findManyByProfile">,
			false satisfies InCatalog<"findManyById">,
			false satisfies InCatalog<"findByPublishedAt">,
			false satisfies InCatalog<"create">,
		];
		expect(results).toEqual([false, false, false, false, false]);
	});
});

describe("RepositoryMethodsOf", () => {
	it("is the read catalog unioned with the fixed writes", () => {
		const result: Equal<
			RepositoryMethodsOf<typeof User>,
			RepositoryReadMethodsOf<typeof User> | RepositoryWriteMethods
		> = true;
		expect(result).toBe(true);
	});

	it("keeps the write half fixed, independent of the blueprint", () => {
		const result: Equal<
			RepositoryWriteMethods,
			"create" | "update" | "delete"
		> = true;
		expect(result).toBe(true);
	});
});
