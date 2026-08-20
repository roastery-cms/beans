import {
	EmailVO,
	PasswordVO,
	StringVO,
} from "@/domain/collections/value-objects";
import { entityOf } from "@/domain/entity/helpers";
import type {
	ICanReadId,
	ReaderOf,
	RepositoryOf,
	RepositoryPageOf,
	WriterOf,
} from "@/domain/repository/types";
import { describe, expect, it } from "bun:test";

/** Mutual assignability, both directions — the strictest equality a type test can assert. */
type Equal<Left, Right> =
	(<Probe>() => Probe extends Left ? 1 : 2) extends <
		Probe,
	>() => Probe extends Right ? 1 : 2
		? true
		: false;

const profileProperties = { bio: StringVO };
class Profile extends entityOf(profileProperties, "profile") {}

/**
 * `profile` is a nested entity and `password` a self-declared sensitive
 * value-object: neither may reach the filter-key catalog, for different
 * reasons — one would take a whole object graph as a predicate, the other
 * would offer a lookup by the secret it exists to hide.
 */
const userProperties = {
	name: StringVO,
	email: EmailVO,
	password: PasswordVO,
	profile: Profile,
};
class User extends entityOf(userProperties, "user") {}

const newUser = (email: string): User =>
	new User({
		name: "alan",
		email,
		password: "S3cret!xy",
		profile: { bio: "roaster" },
	});

type FlatSpec = RepositoryOf<
	typeof User,
	"findById" | "findByEmail" | "create"
>;

type GroupedSpec = RepositoryOf<
	typeof User,
	{ read: ["findById", "findByEmail"]; write: ["create"] }
>;

/** Never constructed — only the two rejection tests below reference them, and neither calls through. */
declare const flatRepository: FlatSpec;
declare const readOnlyRepository: RepositoryOf<
	typeof User,
	"findByEmail" | "create",
	"read"
>;

describe("RepositoryOf", () => {
	it("resolves the grouped spec form to the very same type as the flat one", () => {
		const result: Equal<FlatSpec, GroupedSpec> = true;
		expect(result).toBe(true);
	});

	it("types a lookup's argument from the value object backing that key", () => {
		const result: Equal<
			Parameters<FlatSpec["findByEmail"]>,
			[value: string]
		> = true;
		expect(result).toBe(true);
	});

	it("types a lookup's result as the entity or null", () => {
		const result: Equal<
			ReturnType<FlatSpec["findById"]>,
			Promise<User | null>
		> = true;
		expect(result).toBe(true);
	});

	it("requires a RepositoryPageOf as the second argument of a collection read", () => {
		type Repository = RepositoryOf<typeof User, "findManyByName">;

		const result: Equal<
			Parameters<Repository["findManyByName"]>,
			[value: string, page: RepositoryPageOf<typeof User>]
		> = true;
		expect(result).toBe(true);
	});

	it("is implementable by a class, and that implementation runs", async () => {
		class InMemoryUserRepository implements FlatSpec {
			private readonly rows: User[] = [];

			public async findById(value: string): Promise<User | null> {
				return this.rows.find((row) => row.id === value) ?? null;
			}

			public async findByEmail(value: string): Promise<User | null> {
				return this.rows.find((row) => row.email === value) ?? null;
			}

			public async create(entity: User): Promise<void> {
				this.rows.push(entity);
			}
		}

		const repository = new InMemoryUserRepository();
		const user = newUser("alan@roastery.dev");

		await repository.create(user);

		expect(await repository.findByEmail("alan@roastery.dev")).toBe(user);
		expect(await repository.findById(user.id)).toBe(user);
		expect(await repository.findByEmail("nobody@roastery.dev")).toBeNull();
	});

	it("drops the write half under Mode = read", () => {
		type ReadHalf = RepositoryOf<
			typeof User,
			"findById" | "findByEmail" | "create",
			"read"
		>;

		const result: Equal<
			ReadHalf,
			RepositoryOf<typeof User, "findById" | "findByEmail">
		> = true;
		expect(result).toBe(true);
	});

	it("resolves to never when the mode selects nothing from the spec", () => {
		type WriteHalfOfReadOnlySpec = RepositoryOf<
			typeof User,
			"findById",
			"write"
		>;

		const result: Equal<WriteHalfOfReadOnlySpec, never> = true;
		expect(result).toBe(true);
	});

	it("folds hand-written extras in alongside the generated methods", () => {
		type Extras = {
			findByEmailDomain(
				domain: string,
				page: RepositoryPageOf<typeof User>,
			): Promise<readonly User[]>;
		};
		type Repository = RepositoryOf<
			typeof User,
			"findById",
			"read" | "write",
			Extras
		>;

		const result: Equal<
			Repository,
			RepositoryOf<typeof User, "findById"> & Extras
		> = true;
		expect(result).toBe(true);
	});

	it("returns the extras on their own when the generated half selects nothing", () => {
		type Extras = { touch(): Promise<void> };
		type Repository = RepositoryOf<typeof User, "findById", "write", Extras>;

		const result: Equal<Repository, Extras> = true;
		expect(result).toBe(true);
	});

	it("keeps ICanReadId and the generated findById mutually assignable", () => {
		const result: Equal<
			ICanReadId<typeof User>,
			RepositoryOf<typeof User, "findById">
		> = true;
		expect(result).toBe(true);
	});

	it("rejects a method name outside the catalog", () => {
		// @ts-expect-error "findByNaoExiste" is not a RepositoryMethodsOf<typeof User>.
		type Rejected = RepositoryOf<typeof User, "findByNaoExiste">;

		expect<Rejected | undefined>(undefined).toBeUndefined();
	});

	it("rejects a write name listed under the grouped spec's read half", () => {
		// @ts-expect-error "create" is a write, so it cannot appear under `read`.
		type Rejected = RepositoryOf<typeof User, { read: ["create"] }>;

		expect<Rejected | undefined>(undefined).toBeUndefined();
	});

	it("rejects a key backed by a nested entity", () => {
		// @ts-expect-error `profile` is an Entity, so it generates no filter method.
		type Rejected = RepositoryOf<typeof User, "findByProfile">;

		expect<Rejected | undefined>(undefined).toBeUndefined();
	});

	it("rejects a lookup by a sensitive key", () => {
		// @ts-expect-error `password` is sensitive, so it generates no filter method.
		type Rejected = RepositoryOf<typeof User, "findByPassword">;

		expect<Rejected | undefined>(undefined).toBeUndefined();
	});

	it("rejects a collection lookup by a sensitive key", () => {
		// @ts-expect-error `password` is sensitive: findManyBy goes with findBy.
		type Rejected = RepositoryOf<typeof User, "findManyByPassword">;

		expect<Rejected | undefined>(undefined).toBeUndefined();
	});

	it("resolves countBy and existsBy to their own contracts", () => {
		type Repository = RepositoryOf<
			typeof User,
			"countByEmail" | "existsByEmail" | "existsById"
		>;

		const counts: Equal<
			Repository["countByEmail"],
			(value: string) => Promise<number>
		> = true;
		const exists: Equal<
			Repository["existsByEmail"],
			(value: string) => Promise<boolean>
		> = true;
		const byId: Equal<
			Repository["existsById"],
			(value: string) => Promise<boolean>
		> = true;

		expect([counts, exists, byId]).toEqual([true, true, true]);
	});

	it("keeps countBy off id, the same way findManyBy is", () => {
		// @ts-expect-error counting by a primary key is always 0 or 1 — that is
		// `existsById`, phrased honestly.
		type Rejected = RepositoryOf<typeof User, "countById">;

		expect<Rejected | undefined>(undefined).toBeUndefined();
	});

	it("rejects countBy and existsBy on a sensitive key", () => {
		// @ts-expect-error `password` is sensitive: every derived half goes.
		type NoCount = RepositoryOf<typeof User, "countByPassword">;
		// @ts-expect-error the boolean half leaks the secret one bit at a time.
		type NoExists = RepositoryOf<typeof User, "existsByPassword">;

		expect<NoCount | NoExists | undefined>(undefined).toBeUndefined();
	});

	it("refuses to let Extras put a suppressed existsBy back", () => {
		type Rejected = RepositoryOf<
			typeof User,
			"findById",
			"read",
			// @ts-expect-error `existsByPassword` is in RepositorySuppressedNamesOf.
			{ existsByPassword(value: string): Promise<boolean> }
		>;

		expect<Rejected | undefined>(undefined).toBeUndefined();
	});

	it("partitions the new reads onto the reader half, not the writer", () => {
		type Repository = RepositoryOf<
			typeof User,
			"countByEmail" | "existsByEmail" | "create"
		>;

		const reads: Equal<
			keyof ReaderOf<Repository>,
			"countByEmail" | "existsByEmail"
		> = true;
		const writes: Equal<keyof WriterOf<Repository>, "create"> = true;

		expect([reads, writes]).toEqual([true, true]);
	});

	it("rejects findManyById, which findManyByIds already covers", () => {
		// @ts-expect-error `id` is excluded from the collection filter keys.
		type Rejected = RepositoryOf<typeof User, "findManyById">;

		expect<Rejected | undefined>(undefined).toBeUndefined();
	});

	it("rejects a lookup argument of the wrong primitive type", () => {
		const rejected = (): Promise<User | null> => {
			// @ts-expect-error `email` is an EmailVO, so findByEmail takes a string.
			return flatRepository.findByEmail(123);
		};

		expect(rejected).toBeInstanceOf(Function);
	});

	it("rejects a write call on a read-only repository", () => {
		const rejected = (): Promise<void> => {
			// @ts-expect-error Mode = "read" dropped `create` from the port.
			return readOnlyRepository.create(newUser("a@b.dev"));
		};

		expect(rejected).toBeInstanceOf(Function);
	});
});
