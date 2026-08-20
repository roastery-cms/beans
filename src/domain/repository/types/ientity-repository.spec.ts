import { EmailVO, StringVO } from "@/domain/collections/value-objects";
import { entityOf } from "@/domain/entity/helpers";
import type {
	ICanCount,
	ICanCreate,
	ICanReadId,
	IEntityReader,
	IEntityRepository,
	IEntityWriter,
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

/**
 * One-way assignability. `ReaderOf`/`WriterOf` return a `Pick`/`Omit`, which is
 * a structurally equal but not *identical* type to the named intersection the
 * aggregates resolve to — so those pairs are asserted in both directions with
 * this rather than with `Equal`.
 */
type Extends<Left, Right> = [Left] extends [Right] ? true : false;

const userProperties = { name: StringVO, email: EmailVO };
class User extends entityOf(userProperties, "user") {}

describe("IEntityReader", () => {
	it("satisfies any spec'd read repository, being strictly wider", () => {
		const result: Extends<
			IEntityReader<typeof User>,
			RepositoryOf<typeof User, "findById" | "findByEmail" | "count">
		> = true;
		expect(result).toBe(true);
	});

	it("carries every read method the catalog names", () => {
		const reader: Equal<
			keyof IEntityReader<typeof User>,
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
			| "countByCreatedAt"
			| "countByUpdatedAt"
			| "countByName"
			| "countByEmail"
			| "existsById"
			| "existsByCreatedAt"
			| "existsByUpdatedAt"
			| "existsByName"
			| "existsByEmail"
		> = true;
		expect(reader).toBe(true);
	});

	it("carries no write method", () => {
		const result: Equal<
			Extract<keyof IEntityReader<typeof User>, "create" | "update" | "delete">,
			never
		> = true;
		expect(result).toBe(true);
	});
});

describe("IEntityWriter", () => {
	it("carries exactly the three writes, whatever the blueprint says", () => {
		const result: Equal<
			keyof IEntityWriter<typeof User>,
			"create" | "update" | "delete"
		> = true;
		expect(result).toBe(true);
	});
});

describe("IEntityRepository", () => {
	it("carries both halves", () => {
		const readable: Extends<
			IEntityRepository<typeof User>,
			IEntityReader<typeof User>
		> = true;
		const writable: Extends<
			IEntityRepository<typeof User>,
			IEntityWriter<typeof User>
		> = true;

		expect([readable, writable]).toEqual([true, true]);
	});

	it("satisfies a use case asking only for the capabilities it needs", () => {
		const result: Extends<
			IEntityRepository<typeof User>,
			ICanReadId<typeof User> & ICanCreate<typeof User> & ICanCount
		> = true;
		expect(result).toBe(true);
	});
});

describe("ReaderOf", () => {
	it("projects the read half back out of a full repository", () => {
		const forward: Extends<
			ReaderOf<IEntityRepository<typeof User>>,
			IEntityReader<typeof User>
		> = true;
		const backward: Extends<
			IEntityReader<typeof User>,
			ReaderOf<IEntityRepository<typeof User>>
		> = true;

		expect([forward, backward]).toEqual([true, true]);
	});

	it("keeps a hand-written method whose name matches the read pattern", () => {
		type Custom = RepositoryOf<
			typeof User,
			"create",
			"read" | "write",
			{
				findArchived(
					page: RepositoryPageOf<typeof User>,
				): Promise<readonly User[]>;
			}
		>;

		const result: Equal<keyof ReaderOf<Custom>, "findArchived"> = true;
		expect(result).toBe(true);
	});
});

describe("WriterOf", () => {
	it("projects the write half back out of a full repository", () => {
		const forward: Extends<
			WriterOf<IEntityRepository<typeof User>>,
			IEntityWriter<typeof User>
		> = true;
		const backward: Extends<
			IEntityWriter<typeof User>,
			WriterOf<IEntityRepository<typeof User>>
		> = true;

		expect([forward, backward]).toEqual([true, true]);
	});

	it("treats an unrecognised hand-written method as a write, not as a dropped one", () => {
		type Custom = RepositoryOf<
			typeof User,
			"findById",
			"read" | "write",
			{ archive(entity: User): Promise<void> }
		>;

		const result: Equal<keyof WriterOf<Custom>, "archive"> = true;
		expect(result).toBe(true);
	});

	it("partitions a repository with ReaderOf, dropping nothing", () => {
		type Repository = IEntityRepository<typeof User>;

		const result: Equal<
			keyof ReaderOf<Repository> | keyof WriterOf<Repository>,
			keyof Repository
		> = true;
		expect(result).toBe(true);
	});
});
