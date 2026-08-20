import {
	EmailVO,
	PasswordVO,
	StringArrayVO,
	StringVO,
} from "@/domain/collections/value-objects";
import { StringSchema } from "@/domain/collections/schemas";
import {
	customStringVO,
	optionalVO,
} from "@/domain/collections/value-objects/custom";
import { entityOf } from "@/domain/entity/helpers";
import type {
	RepositoryMethodsOf,
	RepositoryOf,
	RepositoryPageOf,
} from "@/domain/repository/types";
import { inMemoryRepositoryOf } from "@/testing";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import {
	ConflictException,
	ResourceNotFoundException,
} from "@roastery/terroir/exceptions/infra";
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
 * `tags` is a `StringArrayVO` — it serializes to an array, so filtering by it
 * only works if the double compares with `deepEquals` rather than `===`.
 * `profile` is a nested entity, and must generate nothing at all. `password`
 * is a self-declared sensitive value-object, and must generate nothing either
 * — for a different reason, and through a different code path, which is why
 * both are fixtures here rather than one standing in for the other.
 */
const userProperties = {
	name: StringVO,
	email: EmailVO,
	password: PasswordVO,
	tags: StringArrayVO,
	profile: Profile,
};
class User extends entityOf(userProperties, "user") {
	public rename(value: string): void {
		this.set("name", value);
	}
}

/**
 * The drift guard's fixture: `satisfies` makes the compiler check every literal
 * against the catalog type, and the `Equal` assertion below checks the reverse
 * — so this list cannot drift from `RepositoryMethodsOf` in either direction.
 */
const ALL_METHODS = [
	"count",
	"findMany",
	"findManyByIds",
	"findByName",
	"findByEmail",
	"findByTags",
	"findById",
	"findByCreatedAt",
	"findByUpdatedAt",
	"findManyByName",
	"findManyByEmail",
	"findManyByTags",
	"findManyByCreatedAt",
	"findManyByUpdatedAt",
	"countByName",
	"countByEmail",
	"countByTags",
	"countByCreatedAt",
	"countByUpdatedAt",
	"existsByName",
	"existsByEmail",
	"existsByTags",
	"existsById",
	"existsByCreatedAt",
	"existsByUpdatedAt",
	"create",
	"update",
	"delete",
] as const satisfies readonly RepositoryMethodsOf<typeof User>[];

const newUser = (name: string, email: string, tags: string[] = []): User =>
	new User({
		name,
		email,
		password: "S3cret!xy",
		tags,
		profile: { bio: "roaster" },
	});

const firstPage: RepositoryPageOf<typeof User> = {
	page: 1,
	perPage: 10,
	orderBy: "createdAt",
	direction: "asc",
};

describe("inMemoryRepositoryOf — catalog", () => {
	it("generates every method the blueprint derives when no spec is given", () => {
		const users = inMemoryRepositoryOf(User);

		expect(Object.keys(users).sort()).toEqual([...ALL_METHODS].sort());
	});

	it("treats an empty spec as the whole catalog, not as an empty repository", () => {
		const users = inMemoryRepositoryOf(User, []);

		expect(Object.keys(users).sort()).toEqual([...ALL_METHODS].sort());
	});

	it("does not drift from the type-level catalog", () => {
		const exhaustive: Equal<
			RepositoryMethodsOf<typeof User>,
			(typeof ALL_METHODS)[number]
		> = true;

		expect(exhaustive).toBe(true);
		expect(Object.keys(inMemoryRepositoryOf(User)).sort()).toEqual(
			[...ALL_METHODS].sort(),
		);
	});

	it("generates nothing for a key backed by a nested entity", () => {
		const keys = Object.keys(inMemoryRepositoryOf(User));

		expect(keys).not.toContain("findByProfile");
		expect(keys).not.toContain("findManyByProfile");
	});

	it("generates nothing for a key whose value-object is sensitive", () => {
		const keys = Object.keys(inMemoryRepositoryOf(User));

		expect(keys).not.toContain("findByPassword");
		expect(keys).not.toContain("findManyByPassword");
	});

	it("refuses to let a handler put a suppressed method back", () => {
		// The generator declining to derive `findByPassword` would only be a
		// naming convention if the escape hatch could re-add it, so `Extras` is
		// constrained too. The rejection lands on the handler argument as a
		// whole, with `findByPassword?: undefined` named in the expected type.
		const build = () =>
			// @ts-expect-error `findByPassword` is suppressed and cannot be re-added.
			inMemoryRepositoryOf(User, [], () => ({
				findByPassword: async (_value: string) => null,
			}));

		expect(build).toBeInstanceOf(Function);
	});

	it("refuses the collection half of a suppressed method too", () => {
		const build = () =>
			// @ts-expect-error `findManyByPassword` is suppressed as well.
			inMemoryRepositoryOf(User, [], () => ({
				findManyByPassword: async (_value: string) => [],
			}));

		expect(build).toBeInstanceOf(Function);
	});

	it("still accepts an extra whose name is not suppressed", () => {
		const users = inMemoryRepositoryOf(User, [], (context) => ({
			findByNameOrEmail: async (value: string) =>
				[...context.rows.values()].find(
					(row) => row.name === value || row.email === value,
				) ?? null,
		}));

		expect(Object.keys(users)).toContain("findByNameOrEmail");
	});

	it("still persists a sensitive key — suppression is about lookup, not storage", async () => {
		const users = inMemoryRepositoryOf(User);
		const user = newUser("alan", "alan@roastery.dev");

		await users.create(user);

		expect((await users.findById(user.id))?.get("password")).toBe("S3cret!xy");

		user.rename("Alan Reis");
		await users.update(user);

		expect((await users.findById(user.id))?.get("password")).toBe("S3cret!xy");
	});

	it("omits findManyById, which findManyByIds already covers", () => {
		expect(Object.keys(inMemoryRepositoryOf(User))).not.toContain(
			"findManyById",
		);
	});

	it("generates only the spec'd methods, leaving the rest absent at runtime", () => {
		const users = inMemoryRepositoryOf(User, ["findById", "create"]);

		expect(Object.keys(users).sort()).toEqual(["create", "findById"]);
	});

	it("resolves the grouped spec form to the same object as the array form", () => {
		const grouped = inMemoryRepositoryOf(User, {
			read: ["findById"],
			write: ["create"],
		});

		expect(Object.keys(grouped).sort()).toEqual(
			Object.keys(inMemoryRepositoryOf(User, ["findById", "create"])).sort(),
		);
	});

	it("throws InvalidPropertyException for a name off the catalog", () => {
		const build = () =>
			inMemoryRepositoryOf(User, ["findByNaoExiste"] as unknown as [
				"findById",
			]);

		expect(build).toThrow(InvalidPropertyException);
	});
});

describe("inMemoryRepositoryOf — storage", () => {
	it("round-trips an entity through create and findById", async () => {
		const users = inMemoryRepositoryOf(User);
		const alan = newUser("alan", "alan@roastery.dev");

		await users.create(alan);
		const found = await users.findById(alan.id);

		expect(found?.toJSON()).toEqual(alan.toJSON());
	});

	it("returns an equal but distinct instance, since every read rehydrates", async () => {
		const users = inMemoryRepositoryOf(User);
		const alan = newUser("alan", "alan@roastery.dev");

		await users.create(alan);
		const found = await users.findById(alan.id);

		expect(found).not.toBe(alan);
		expect(found?.id).toBe(alan.id);
	});

	it("does not persist a mutation made after create — only update does", async () => {
		const users = inMemoryRepositoryOf(User);
		const alan = newUser("alan", "alan@roastery.dev");

		await users.create(alan);
		alan.rename("alan reis");

		expect((await users.findById(alan.id))?.name).toBe("alan");

		await users.update(alan);

		expect((await users.findById(alan.id))?.name).toBe("alan reis");
	});

	it("removes a row on delete", async () => {
		const users = inMemoryRepositoryOf(User);
		const alan = newUser("alan", "alan@roastery.dev");

		await users.create(alan);
		await users.delete(alan);

		expect(await users.count()).toBe(0);
		expect(await users.findById(alan.id)).toBeNull();
	});
});

describe("inMemoryRepositoryOf — reads", () => {
	it("finds by a value-object-backed key, and resolves null on a miss", async () => {
		const users = inMemoryRepositoryOf(User);

		await users.create(newUser("alan", "alan@roastery.dev"));

		expect((await users.findByEmail("alan@roastery.dev"))?.name).toBe("alan");
		expect(await users.findByEmail("nobody@roastery.dev")).toBeNull();
	});

	it("compares with deepEquals, so an array-valued key is filterable", async () => {
		const users = inMemoryRepositoryOf(User);

		await users.create(
			newUser("alan", "alan@roastery.dev", ["roaster", "cms"]),
		);

		// Reference equality would never match a fresh array here.
		expect((await users.findByTags(["roaster", "cms"]))?.name).toBe("alan");
		expect(await users.findByTags(["roaster"])).toBeNull();
	});

	it("honours the page on a collection read", async () => {
		const users = inMemoryRepositoryOf(User);

		for (const index of [1, 2, 3])
			await users.create(newUser("alan", `alan${index}@roastery.dev`));

		const first = await users.findManyByName("alan", {
			...firstPage,
			page: 1,
			perPage: 2,
		});
		const second = await users.findManyByName("alan", {
			...firstPage,
			page: 2,
			perPage: 2,
		});

		expect(first).toHaveLength(2);
		expect(second).toHaveLength(1);
	});

	it("paginates findMany and counts every row", async () => {
		const users = inMemoryRepositoryOf(User);

		for (const index of [1, 2, 3])
			await users.create(newUser(`user${index}`, `user${index}@roastery.dev`));

		expect(
			await users.findMany({ ...firstPage, page: 1, perPage: 2 }),
		).toHaveLength(2);
		expect(
			await users.findMany({ ...firstPage, page: 2, perPage: 2 }),
		).toHaveLength(1);
		expect(await users.count()).toBe(3);
	});

	it("resolves an empty array when a collection read matches nothing", async () => {
		const users = inMemoryRepositoryOf(User);

		expect(await users.findManyByName("nobody", firstPage)).toEqual([]);
	});

	it("preserves order and length in findManyByIds, with null for a miss", async () => {
		const users = inMemoryRepositoryOf(User);
		const alan = newUser("alan", "alan@roastery.dev");
		const bea = newUser("bea", "bea@roastery.dev");

		await users.create(alan);
		await users.create(bea);

		const found = await users.findManyByIds([bea.id, "missing", alan.id]);

		expect(found).toHaveLength(3);
		expect(found[0]?.id).toBe(bea.id);
		expect(found[1]).toBeNull();
		expect(found[2]?.id).toBe(alan.id);
	});
});

describe("inMemoryRepositoryOf — ordering", () => {
	const paged = (
		over: RepositoryPageOf<typeof User>["orderBy"],
		direction: "asc" | "desc",
	): RepositoryPageOf<typeof User> => ({
		page: 1,
		perPage: 10,
		orderBy: over,
		direction,
	});

	const seed = async (): Promise<
		ReturnType<typeof inMemoryRepositoryOf<typeof User>>
	> => {
		const users = inMemoryRepositoryOf(User);

		for (const name of ["carol", "alan", "bea"])
			await users.create(newUser(name, `${name}@roastery.dev`));

		return users;
	};

	it("sorts ascending by the declared key", async () => {
		const users = await seed();

		expect(
			(await users.findMany(paged("name", "asc"))).map((e) => e.name),
		).toEqual(["alan", "bea", "carol"]);
	});

	it("reverses the whole comparison for desc", async () => {
		const users = await seed();

		expect(
			(await users.findMany(paged("name", "desc"))).map((e) => e.name),
		).toEqual(["carol", "bea", "alan"]);
	});

	it("orders before slicing, so a page is a window on the sorted set", async () => {
		const users = await seed();

		const [first] = await users.findMany({
			...paged("name", "asc"),
			perPage: 1,
		});
		const [second] = await users.findMany({
			...paged("name", "asc"),
			page: 2,
			perPage: 1,
		});

		expect([first?.name, second?.name]).toEqual(["alan", "bea"]);
	});

	it("orders a filtered collection read too", async () => {
		const users = inMemoryRepositoryOf(User);

		for (const email of ["c@roastery.dev", "a@roastery.dev", "b@roastery.dev"])
			await users.create(newUser("alan", email));

		expect(
			(await users.findManyByName("alan", paged("email", "asc"))).map(
				(each) => each.email,
			),
		).toEqual(["a@roastery.dev", "b@roastery.dev", "c@roastery.dev"]);
	});

	// The tie-break is the whole reason ordering is required: without it two
	// rows sharing an `orderBy` value could swap between two calls, and a page
	// boundary falling between them would repeat or skip one.
	it("breaks a tie by id, so a repeated read returns the same order", async () => {
		const users = await seed();

		await users.create(newUser("alan", "alan-2@roastery.dev"));

		const once = (await users.findMany(paged("name", "asc"))).map((e) => e.id);
		const twice = (await users.findMany(paged("name", "asc"))).map((e) => e.id);

		// The two "alan" rows lead, and among themselves they are ordered by id
		// — which is what makes the order repeatable rather than merely stable
		// within one call.
		const tied = once.slice(0, 2);

		expect(once).toEqual(twice);
		expect(tied).toEqual([...tied].sort());
	});

	it("sorts nullish last on asc, and therefore first on desc", async () => {
		const staff = inMemoryRepositoryOf(Staff);

		await staff.create(newStaff("A-1", "h1", "alan"));
		await staff.create(newStaff("A-2", "h2"));
		await staff.create(newStaff("A-3", "h3", "bea"));

		const asc = await staff.findMany({ ...staffPage, orderBy: "nickname" });
		const desc = await staff.findMany({
			...staffPage,
			orderBy: "nickname",
			direction: "desc",
		});

		expect(asc.map((each) => each.nickname)).toEqual([
			"alan",
			"bea",
			undefined,
		]);
		expect(desc.map((each) => each.nickname)).toEqual([
			undefined,
			"bea",
			"alan",
		]);
	});

	it("rejects a key with no total order at compile time", () => {
		type Orderable = RepositoryPageOf<typeof User>["orderBy"];

		// `tags` is a StringArrayVO — filterable (deepEquals) but not orderable;
		// `profile` is a nested entity, absent from both sets. `name` proves the
		// narrowing did not simply drop everything.
		const array: Equal<Extract<Orderable, "tags">, never> = true;
		const nested: Equal<Extract<Orderable, "profile">, never> = true;
		const scalar: Equal<Extract<Orderable, "name">, "name"> = true;

		expect([array, nested, scalar]).toEqual([true, true, true]);
	});
});

describe("inMemoryRepositoryOf — countBy and existsBy", () => {
	it("counts only the matching rows", async () => {
		const users = inMemoryRepositoryOf(User);

		await users.create(newUser("alan", "a@roastery.dev"));
		await users.create(newUser("alan", "b@roastery.dev"));
		await users.create(newUser("bea", "c@roastery.dev"));

		expect(await users.countByName("alan")).toBe(2);
		expect(await users.countByName("nobody")).toBe(0);
		expect(await users.count()).toBe(3);
	});

	it("answers existence without hydrating the row", async () => {
		const users = inMemoryRepositoryOf(User);
		const user = newUser("alan", "alan@roastery.dev");

		await users.create(user);

		expect(await users.existsByEmail("alan@roastery.dev")).toBe(true);
		expect(await users.existsByEmail("nobody@roastery.dev")).toBe(false);
		expect(await users.existsById(user.id)).toBe(true);
	});

	// The scan reads `rows` directly rather than any generated `findBy*`, which
	// is the only reason this spec can exist at all.
	it("works on a repository whose spec has no readers", async () => {
		const users = inMemoryRepositoryOf(User, ["create", "existsByEmail"]);

		await users.create(newUser("alan", "alan@roastery.dev"));

		expect(Object.keys(users).sort()).toEqual(["create", "existsByEmail"]);
		expect(await users.existsByEmail("alan@roastery.dev")).toBe(true);
	});

	it("compares an array-valued key with deepEquals, like the find halves", async () => {
		const users = inMemoryRepositoryOf(User);

		await users.create(
			newUser("alan", "alan@roastery.dev", ["roaster", "cms"]),
		);

		// Reference equality would never match a fresh array here.
		expect(await users.countByTags(["roaster", "cms"])).toBe(1);
		expect(await users.existsByTags(["roaster", "cms"])).toBe(true);
		expect(await users.existsByTags(["roaster"])).toBe(false);
	});

	it("generates neither half for a sensitive key", () => {
		const keys = Object.keys(inMemoryRepositoryOf(User));

		expect(keys).not.toContain("countByPassword");
		expect(keys).not.toContain("existsByPassword");
	});

	it("gives existsBy the id countBy is denied", () => {
		const keys = Object.keys(inMemoryRepositoryOf(User));

		expect(keys).toContain("existsById");
		expect(keys).not.toContain("countById");
	});
});

describe("inMemoryRepositoryOf — handler", () => {
	it("folds the returned methods into the repository", async () => {
		const users = inMemoryRepositoryOf(User, [], (context) => ({
			seed: (...rows: User[]) => {
				for (const row of rows) context.rows.set(row.id, row.toJSON());
			},
			clear: () => context.rows.clear(),
		}));

		users.seed(newUser("alan", "alan@roastery.dev"), newUser("bea", "b@c.dev"));

		expect(await users.count()).toBe(2);

		users.clear();

		expect(await users.count()).toBe(0);
	});

	it("gives the handler the generated methods and the raw store", async () => {
		const users = inMemoryRepositoryOf(User, [], (context) => ({
			async findFirstByBio(bio: string) {
				const row = [...context.rows.values()].find(
					(each) => each.profile.bio === bio,
				);

				return row ? context.hydrate(row) : null;
			},
			async createBoth(first: User, second: User) {
				await context.create(first);
				await context.create(second);
			},
		}));

		const alan = newUser("alan", "alan@roastery.dev");

		await users.createBoth(alan, newUser("bea", "bea@roastery.dev"));

		expect(await users.count()).toBe(2);
		expect((await users.findFirstByBio("roaster"))?.id).toBe(alan.id);
		expect(await users.findFirstByBio("nobody")).toBeNull();
	});

	it("lets an override delegate to the generated method it replaced", async () => {
		let calls = 0;

		const users = inMemoryRepositoryOf(User, [], (context) => ({
			callCount: () => calls,
			async findById(id: string) {
				calls += 1;
				if (calls === 2) throw new Error("connection lost");

				return context.findById(id);
			},
		}));

		const alan = newUser("alan", "alan@roastery.dev");
		await users.create(alan);

		expect((await users.findById(alan.id))?.id).toBe(alan.id);
		await expect(users.findById(alan.id)).rejects.toThrow("connection lost");
		expect(users.callCount()).toBe(2);
	});

	it("keeps the handler's methods when the spec narrowed the generated ones", async () => {
		const users = inMemoryRepositoryOf(User, ["create", "count"], () => ({
			label: () => "narrowed",
		}));

		expect(Object.keys(users).sort()).toEqual(["count", "create", "label"]);
		expect(users.label()).toBe("narrowed");
	});
});

describe("inMemoryRepositoryOf — typing", () => {
	it("returns exactly the RepositoryOf port for the given spec", () => {
		const result: Equal<
			ReturnType<
				typeof inMemoryRepositoryOf<
					typeof User,
					readonly ["findById", "create"]
				>
			>,
			RepositoryOf<typeof User, "findById" | "create">
		> = true;

		expect(result).toBe(true);
	});

	it("is assignable to the hand-written port a command would declare", async () => {
		const users: RepositoryOf<typeof User, "findById" | "create"> =
			inMemoryRepositoryOf(User, ["findById", "create"]);

		expect(await users.findById("missing")).toBeNull();
	});

	it("rejects a method the spec left out", () => {
		const users = inMemoryRepositoryOf(User, ["findById"]);

		const rejected = () => {
			// @ts-expect-error `create` was not in the spec, so it is not on the port.
			return users.create;
		};

		expect(rejected).toBeInstanceOf(Function);
	});
});

/** Declares uniqueness on the class, so it travels into the blueprint below. */
const BadgeCodeVO = customStringVO({ name: "BadgeCodeVO", unique: true });

/** Unique **and** optional — the pair that only works under SQL's NULL rule. */
const NicknameVO = optionalVO(StringSchema, {
	name: "NicknameVO",
	unique: true,
});

const staffProperties = {
	code: BadgeCodeVO,
	handle: StringVO,
	nickname: NicknameVO,
	name: StringVO,
};

const staffPage: RepositoryPageOf<typeof Staff> = {
	page: 1,
	perPage: 10,
	orderBy: "createdAt",
	direction: "asc",
};

class Staff extends entityOf(staffProperties, "staff", { unique: ["handle"] }) {
	public rename(value: string): void {
		this.set("name", value);
	}

	public rehandle(value: string): void {
		this.set("handle", value);
	}
}

const newStaff = (code: string, handle: string, nickname?: string): Staff =>
	new Staff({ code, handle, name: "staffer", nickname });

describe("inMemoryRepositoryOf — write guards", () => {
	it("refuses a create whose id is already stored", async () => {
		const staff = inMemoryRepositoryOf(Staff);
		const alan = newStaff("A-1", "alan");

		await staff.create(alan);

		await expect(staff.create(alan)).rejects.toBeInstanceOf(ConflictException);
		expect(await staff.count()).toBe(1);
	});

	it("refuses an update of an entity that was never persisted", async () => {
		const staff = inMemoryRepositoryOf(Staff);

		await expect(staff.update(newStaff("A-1", "alan"))).rejects.toBeInstanceOf(
			ResourceNotFoundException,
		);
		expect(await staff.count()).toBe(0);
	});

	it("refuses a delete of an entity that was never persisted", async () => {
		const staff = inMemoryRepositoryOf(Staff);

		await expect(staff.delete(newStaff("A-1", "alan"))).rejects.toBeInstanceOf(
			ResourceNotFoundException,
		);
	});
});

describe("inMemoryRepositoryOf — uniqueness", () => {
	it("refuses a create whose value-object-declared unique key is taken", async () => {
		const staff = inMemoryRepositoryOf(Staff);

		await staff.create(newStaff("A-1", "alan"));

		await expect(staff.create(newStaff("A-1", "bea"))).rejects.toBeInstanceOf(
			ConflictException,
		);
		expect(await staff.count()).toBe(1);
	});

	it("refuses a create whose definition-declared unique key is taken", async () => {
		const staff = inMemoryRepositoryOf(Staff);

		await staff.create(newStaff("A-1", "alan"));

		await expect(staff.create(newStaff("A-2", "alan"))).rejects.toBeInstanceOf(
			ConflictException,
		);
	});

	it("allows an update that leaves the unique value untouched", async () => {
		const staff = inMemoryRepositoryOf(Staff);
		const alan = newStaff("A-1", "alan");

		await staff.create(alan);
		alan.rename("Alan Reis");
		await staff.update(alan);

		expect((await staff.findById(alan.id))?.name).toBe("Alan Reis");
	});

	it("refuses an update that borrows a sibling row's unique value", async () => {
		const staff = inMemoryRepositoryOf(Staff);
		const alan = newStaff("A-1", "alan");

		await staff.create(alan);
		await staff.create(newStaff("A-2", "bea"));
		alan.rehandle("bea");

		await expect(staff.update(alan)).rejects.toBeInstanceOf(ConflictException);
		expect((await staff.findById(alan.id))?.handle).toBe("alan");
	});

	/** SQL's rule: a UNIQUE index takes any number of NULLs, since NULL <> NULL. */
	it("lets two rows share an absent value in a unique-but-optional key", async () => {
		const staff = inMemoryRepositoryOf(Staff);

		await staff.create(newStaff("A-1", "alan"));
		await staff.create(newStaff("A-2", "bea"));

		expect(await staff.count()).toBe(2);
		expect(
			(await staff.findMany(staffPage)).map((each) => each.nickname),
		).toEqual([undefined, undefined]);
	});

	it("still refuses a real duplicate in that same optional key", async () => {
		const staff = inMemoryRepositoryOf(Staff);

		await staff.create(newStaff("A-1", "alan", "roaster"));

		await expect(
			staff.create(newStaff("A-2", "bea", "roaster")),
		).rejects.toBeInstanceOf(ConflictException);
	});

	/** The scan reads `rows`, not the generated readers — which a narrow spec removes. */
	it("enforces uniqueness even when the spec generated no readers at all", async () => {
		const staff = inMemoryRepositoryOf(Staff, ["create"]);

		await staff.create(newStaff("A-1", "alan"));

		await expect(staff.create(newStaff("A-1", "bea"))).rejects.toBeInstanceOf(
			ConflictException,
		);
	});

	it("does not constrain a key nobody declared unique", async () => {
		const staff = inMemoryRepositoryOf(Staff);

		await staff.create(newStaff("A-1", "alan"));
		await staff.create(newStaff("A-2", "bea"));

		expect(await staff.count()).toBe(2);
	});
});
