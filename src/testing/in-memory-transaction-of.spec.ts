import { commands } from "@/application/commands";
import type { IEventEmitter } from "@/application/commands/types";
import { transactional } from "@/application/command/decorators";
import { defineUseCase } from "@/application/command/helpers";
import { EmailVO, StringVO } from "@/domain/collections/value-objects";
import { emit } from "@/domain/entity/decorators";
import { defineDomainEvent } from "@/domain/domain-event";
import { blueprint, entityOf } from "@/domain/entity/helpers";
import type { RepositoryOf } from "@/domain/repository/types";
import { inMemoryRepositoryOf, inMemoryTransactionOf } from "@/testing";
import {
	DependencyNotWiredException,
	TransactionFailedException,
} from "@roastery/terroir/exceptions/infra";
import { describe, expect, it } from "bun:test";

const profileProperties = { bio: StringVO };
class Profile extends entityOf(profileProperties, "profile") {}

const UserWasActivatedEvent = defineDomainEvent("user-was-activated");

const userProperties = {
	name: StringVO,
	email: EmailVO,
	profile: Profile,
};
class User extends entityOf(userProperties, "user") {
	public rename(value: string): void {
		this.set("name", value);
	}

	@emit(UserWasActivatedEvent)
	public activate(): void {
		this.set("name", `${this.name} (active)`);
	}
}

const noteProperties = { text: StringVO };
class Note extends entityOf(noteProperties, "note") {}

function newUser(name: string, email: string): User {
	return new User({ name, email, profile: { bio: "none" } });
}

/** Collects what a registry published, so a rolled-back run can be shown to publish nothing. */
function fakeEmitter(): IEventEmitter & { readonly emitted: unknown[] } {
	const emitted: unknown[] = [];

	return {
		emitted,
		emit(event) {
			emitted.push(event);
		},
	};
}

describe("inMemoryTransactionOf — wiring", () => {
	it("throws when given no repository at all", () => {
		expect(() => inMemoryTransactionOf()).toThrow(DependencyNotWiredException);
	});

	it("throws for an object inMemoryRepositoryOf did not build", () => {
		expect(() => inMemoryTransactionOf({ create: async () => {} })).toThrow(
			DependencyNotWiredException,
		);
	});

	it("carries the datastore as the exception's source", () => {
		try {
			inMemoryTransactionOf();
			expect.unreachable("should have thrown");
		} catch (error) {
			expect((error as DependencyNotWiredException).source).toBe(
				"in-memory-repository",
			);
		}
	});

	it("satisfies the ITransactionRunner port", () => {
		const runner = inMemoryTransactionOf(inMemoryRepositoryOf(User));

		expect(typeof runner.run).toBe("function");
	});
});

describe("inMemoryTransactionOf — commit", () => {
	it("keeps every write the work performed", async () => {
		const users = inMemoryRepositoryOf(User);
		const runner = inMemoryTransactionOf(users);
		const alan = newUser("alan", "alan@roastery.dev");

		await runner.run(async () => {
			await users.create(alan);
		});

		expect((await users.findById(alan.id))?.name).toBe("alan");
	});

	it("resolves with whatever the work resolved to", async () => {
		const users = inMemoryRepositoryOf(User);
		const runner = inMemoryTransactionOf(users);

		expect(await runner.run(async () => 42)).toBe(42);
	});
});

describe("inMemoryTransactionOf — rollback", () => {
	it("undoes an insertion", async () => {
		const users = inMemoryRepositoryOf(User);
		const runner = inMemoryTransactionOf(users);
		const alan = newUser("alan", "alan@roastery.dev");

		await expect(
			runner.run(async () => {
				await users.create(alan);
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");

		expect(await users.findById(alan.id)).toBeNull();
		expect(await users.count()).toBe(0);
	});

	it("undoes an update, restoring the row that was there before", async () => {
		const users = inMemoryRepositoryOf(User);
		const runner = inMemoryTransactionOf(users);
		const alan = newUser("alan", "alan@roastery.dev");

		await users.create(alan);

		await expect(
			runner.run(async () => {
				alan.rename("bea");
				await users.update(alan);
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");

		expect((await users.findById(alan.id))?.name).toBe("alan");
	});

	it("undoes a deletion", async () => {
		const users = inMemoryRepositoryOf(User);
		const runner = inMemoryTransactionOf(users);
		const alan = newUser("alan", "alan@roastery.dev");

		await users.create(alan);

		await expect(
			runner.run(async () => {
				await users.delete(alan);
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");

		expect((await users.findById(alan.id))?.id).toBe(alan.id);
	});

	it("restores every repository it was given, not only the first", async () => {
		const users = inMemoryRepositoryOf(User);
		const notes = inMemoryRepositoryOf(Note);
		const runner = inMemoryTransactionOf(users, notes);

		await expect(
			runner.run(async () => {
				await users.create(newUser("alan", "alan@roastery.dev"));
				await notes.create(new Note({ text: "first" }));
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");

		expect(await users.count()).toBe(0);
		expect(await notes.count()).toBe(0);
	});

	it("leaves a repository outside the list untouched — the scope is explicit", async () => {
		const users = inMemoryRepositoryOf(User);
		const notes = inMemoryRepositoryOf(Note);
		const runner = inMemoryTransactionOf(users);

		await expect(
			runner.run(async () => {
				await users.create(newUser("alan", "alan@roastery.dev"));
				await notes.create(new Note({ text: "first" }));
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");

		expect(await users.count()).toBe(0);
		expect(await notes.count()).toBe(1);
	});

	it("propagates the very error the work threw, unwrapped", async () => {
		const users = inMemoryRepositoryOf(User);
		const runner = inMemoryTransactionOf(users);
		const failure = new Error("boom");

		try {
			await runner.run(async () => {
				throw failure;
			});
			expect.unreachable("should have thrown");
		} catch (error) {
			expect(error).toBe(failure);
		}
	});

	it("undoes an in-place mutation of a stored row, since the snapshot is deep", async () => {
		const users = inMemoryRepositoryOf(User, [], (context) => ({
			poke: (id: string, bio: string) => {
				const row = context.rows.get(id);

				if (row) (row.profile as { bio: string }).bio = bio;
			},
		}));
		const runner = inMemoryTransactionOf(users);
		const alan = newUser("alan", "alan@roastery.dev");

		await users.create(alan);

		await expect(
			runner.run(async () => {
				users.poke(alan.id, "poked");
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");

		expect((await users.findById(alan.id))?.profile.bio).toBe("none");
	});

	it("starts clean again after a rollback", async () => {
		const users = inMemoryRepositoryOf(User);
		const runner = inMemoryTransactionOf(users);
		const alan = newUser("alan", "alan@roastery.dev");

		await expect(
			runner.run(async () => {
				await users.create(alan);
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");

		await runner.run(async () => {
			await users.create(alan);
		});

		expect(await users.count()).toBe(1);
	});

	it("rolls back rows and never entities — a mutated aggregate keeps its new values", async () => {
		const users = inMemoryRepositoryOf(User);
		const runner = inMemoryTransactionOf(users);
		const alan = newUser("alan", "alan@roastery.dev");

		await users.create(alan);

		await expect(
			runner.run(async () => {
				alan.rename("bea");
				await users.update(alan);
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");

		expect(alan.name).toBe("bea");
		expect((await users.findById(alan.id))?.name).toBe("alan");
	});
});

// ---------------------------------------------------------------------------
// One at a time
//
// The runner models a single connection, and a single connection cannot hold
// two transactions. The alternative to refusing is not "it works": the
// snapshots are taken over the same stores, so two live transactions share
// them and whichever rolls back destroys what the other committed.
// ---------------------------------------------------------------------------

describe("inMemoryTransactionOf — one transaction at a time", () => {
	it("refuses a run opened while another is still live", async () => {
		const users = inMemoryRepositoryOf(User);
		const runner = inMemoryTransactionOf(users);

		await expect(
			runner.run(async () => {
				await runner.run(async () => {
					await users.create(newUser("bea", "bea@roastery.dev"));
				});
			}),
		).rejects.toThrow(TransactionFailedException);
	});

	it("carries the datastore as the source of that refusal", async () => {
		const users = inMemoryRepositoryOf(User);
		const runner = inMemoryTransactionOf(users);

		try {
			await runner.run(async () => {
				await runner.run(async () => {});
			});
			expect.unreachable("should have thrown");
		} catch (error) {
			expect((error as TransactionFailedException).source).toBe(
				"in-memory-repository",
			);
		}
	});

	it("keeps two overlapping transactions from destroying each other's rows", async () => {
		const users = inMemoryRepositoryOf(User);
		const runner = inMemoryTransactionOf(users);

		// `first` is still open when `second` starts. Joining silently is what
		// used to happen, and `first`'s rollback then took `second`'s committed
		// row with it — a test that passed while asserting a lie. Settled
		// together because `second` rejects immediately, long before `first`.
		const [first, second] = await Promise.allSettled([
			runner.run(async () => {
				await users.create(newUser("alan", "alan@roastery.dev"));
				await Bun.sleep(5);
				throw new Error("first failed");
			}),
			runner.run(async () => {
				await users.create(newUser("bea", "bea@roastery.dev"));
			}),
		]);

		expect(first.status).toBe("rejected");
		expect((first as PromiseRejectedResult).reason).toBeInstanceOf(Error);
		expect(((first as PromiseRejectedResult).reason as Error).message).toBe(
			"first failed",
		);

		expect(second.status).toBe("rejected");
		expect((second as PromiseRejectedResult).reason).toBeInstanceOf(
			TransactionFailedException,
		);

		// `first` rolled its own row back and there was never a second one to lose.
		expect(await users.count()).toBe(0);
	});

	it("runs the same two transactions fine in sequence", async () => {
		const users = inMemoryRepositoryOf(User);
		const runner = inMemoryTransactionOf(users);

		await expect(
			runner.run(async () => {
				await users.create(newUser("alan", "alan@roastery.dev"));
				throw new Error("first failed");
			}),
		).rejects.toThrow("first failed");

		await runner.run(async () => {
			await users.create(newUser("bea", "bea@roastery.dev"));
		});

		// The rollback undid only its own transaction's row.
		expect(await users.count()).toBe(1);
	});

	it("reopens normally once the previous transaction resolved", async () => {
		const users = inMemoryRepositoryOf(User);
		const runner = inMemoryTransactionOf(users);

		await runner.run(async () => {
			await users.create(newUser("bea", "bea@roastery.dev"));
		});

		await runner.run(async () => {
			await users.create(newUser("alan", "alan@roastery.dev"));
		});

		expect(await users.count()).toBe(2);
	});
});

// ---------------------------------------------------------------------------
// With a registry
//
// Dedicated fixtures, like `commands.spec.ts`'s own transaction block: the
// `transactional` decorator *mutates* the class it marks, so a fixture shared
// with another block would silently become transactional there too.
// ---------------------------------------------------------------------------

type UserDependencies = {
	users: RepositoryOf<typeof User, "create" | "count" | "findById">;
};

const signUpProperties = blueprint({
	name: StringVO,
	email: EmailVO,
}).done();

@transactional
class SignUpUseCase extends defineUseCase<
	typeof signUpProperties,
	UserDependencies,
	User
>(signUpProperties, "sign-up") {
	protected override async handle(deps: UserDependencies): Promise<User> {
		const user = newUser(this.get("name"), this.get("email"));

		user.activate();
		await deps.users.create(user);

		throw new Error("boom");
	}
}

/** Unmarked on purpose — the control proving only a marked command is wrapped. */
class ImportUserUseCase extends defineUseCase<
	typeof signUpProperties,
	UserDependencies,
	User
>(signUpProperties, "import-user") {
	protected override async handle(deps: UserDependencies): Promise<User> {
		const user = newUser(this.get("name"), this.get("email"));

		await deps.users.create(user);

		throw new Error("boom");
	}
}

describe("inMemoryTransactionOf — with a registry", () => {
	it("rolls a transactional command's writes back when it fails", async () => {
		const users = inMemoryRepositoryOf(User, ["create", "count", "findById"]);
		const runner = inMemoryTransactionOf(users);
		const registry = commands(
			{ signUp: SignUpUseCase },
			{ transaction: (work) => runner.run(work) },
		).withDependencies({ users });

		await expect(
			registry.signUp({ name: "alan", email: "alan@roastery.dev" }),
		).rejects.toThrow("boom");

		expect(await users.count()).toBe(0);
	});

	it("publishes nothing for an operation that rolled back", async () => {
		const users = inMemoryRepositoryOf(User, ["create", "count", "findById"]);
		const runner = inMemoryTransactionOf(users);
		const emitter = fakeEmitter();
		const registry = commands(
			{ signUp: SignUpUseCase },
			{ emitter, transaction: (work) => runner.run(work) },
		).withDependencies({ users });

		await expect(
			registry.signUp({ name: "alan", email: "alan@roastery.dev" }),
		).rejects.toThrow("boom");

		expect(emitter.emitted).toHaveLength(0);
		expect(await users.count()).toBe(0);
	});

	it("leaves an unmarked command's writes in place, since no boundary was opened", async () => {
		const users = inMemoryRepositoryOf(User, ["create", "count", "findById"]);
		const runner = inMemoryTransactionOf(users);
		const registry = commands(
			{ importUser: ImportUserUseCase },
			{ transaction: (work) => runner.run(work) },
		).withDependencies({ users });

		await expect(
			registry.importUser({ name: "alan", email: "alan@roastery.dev" }),
		).rejects.toThrow("boom");

		expect(await users.count()).toBe(1);
	});
});
