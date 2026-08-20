import { StringVO } from "@/domain/collections/value-objects";
import { DomainEvent } from "@/domain/domain-event";
import { Entity } from "@/domain/entity";
import type { AccessorsOf, EntityDefinition } from "@/domain/entity/types";
import type { InputValueOf } from "@/domain/entity/types/input-value-of.type";
import type { InputValuesOf } from "@/domain/entity/types/input-values-of.type";
import { describe, expect, it } from "bun:test";
import { emit } from "./emit.decorator";
import { fromClass } from "./helpers/from-class";
import { onCreate } from "./on-create.decorator";
import { onDelete } from "./on-delete.decorator";
import { onError } from "./on-error.decorator";
import { onUpdate } from "./on-update.decorator";

class UserCreated extends DomainEvent {
	protected defineName(): string {
		return "user.created";
	}
}

class UserUpdated extends DomainEvent {
	protected defineName(): string {
		return "user.updated";
	}
}

class UserDeleted extends DomainEvent {
	protected defineName(): string {
		return "user.deleted";
	}
}

class PromotionStarted extends DomainEvent {
	protected defineName(): string {
		return "promotion.started";
	}
}

class PromotionFinished extends DomainEvent {
	protected defineName(): string {
		return "promotion.finished";
	}
}

class PromotionMidpoint extends DomainEvent {
	protected defineName(): string {
		return "promotion.midpoint";
	}
}

class PromotionFailed extends DomainEvent {
	public constructor(
		aggregateId: string,
		public readonly reason: string,
	) {
		super(aggregateId);
	}

	protected defineName(): string {
		return "promotion.failed";
	}
}

const promotionFailedFrom = (error: unknown): PromotionFailed =>
	new PromotionFailed(
		"",
		error instanceof Error ? error.message : String(error),
	);

class PromotionAborted extends DomainEvent {
	protected defineName(): string {
		return "promotion.aborted";
	}
}

const userProperties = { name: StringVO };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface User extends AccessorsOf<typeof userProperties> {}
@onCreate(UserCreated)
@onUpdate(UserUpdated)
@onDelete(UserDeleted)
class User extends Entity<typeof userProperties> {
	protected defineEntity(): EntityDefinition<typeof userProperties> {
		return { properties: userProperties, source: "user" };
	}

	/** Widens `set`/`setMany` back to public — the `onUpdate` tests below exercise them directly, from outside the class. */
	public override set<Key extends keyof typeof userProperties>(
		key: Key,
		value: InputValueOf<(typeof userProperties)[Key]>,
	): boolean {
		return super.set(key, value);
	}

	public override setMany(
		values: Partial<InputValuesOf<typeof userProperties>>,
	): boolean {
		return super.setMany(values);
	}

	@emit(PromotionFinished)
	public finishPromoting(): string {
		this.raiseEvent(PromotionMidpoint);
		return "finished";
	}

	/** Two stacked `emit`s: the one closer to the method wraps innermost, so it raises first. */
	@emit(PromotionStarted)
	@emit(PromotionFinished)
	public promoteTwice(): string {
		this.raiseEvent(PromotionMidpoint);
		return "promoted";
	}

	@emit(PromotionFinished)
	public explodeBeforeEmit(): never {
		throw new Error("boom");
	}

	@onError(promotionFailedFrom)
	public promoteOrFail(shouldFail: boolean): string {
		if (shouldFail) throw new Error("promotion blocked");
		return "promoted";
	}

	@onError(PromotionAborted)
	public promoteOrAbort(shouldFail: boolean): string {
		if (shouldFail) throw new Error("promotion blocked");
		return "promoted";
	}

	@emit(PromotionFinished)
	@onError(promotionFailedFrom)
	public promoteWithFullStackOrFail(shouldFail: boolean): string {
		if (shouldFail) throw new Error("promotion blocked");
		return "promoted";
	}
}

const eventNames = (user: User): string[] =>
	user.pullDomainEvents().map((event) => event.name);

describe("lifecycle decorators", () => {
	describe("onCreate", () => {
		it("raises the event on a fresh construction", () => {
			const user = new User({ name: "Alan" });

			expect(eventNames(user)).toEqual(["user.created"]);
		});

		it("raises the event on .demo()", () => {
			const user = User.demo();

			expect(eventNames(user)).toEqual(["user.created"]);
		});

		it("does not raise the event on a hydration", () => {
			const seed = new User({ name: "Alan" });
			seed.pullDomainEvents();

			const hydrated = new User({
				id: seed.id,
				createdAt: seed.createdAt,
				name: "Alan",
			});

			expect(eventNames(hydrated)).not.toContain("user.created");
		});
	});

	describe("onUpdate", () => {
		it("raises the event when set() changes something", () => {
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			user.set("name", "Alan Reis");

			expect(eventNames(user)).toEqual(["user.updated"]);
		});

		it("raises the event when setMany() changes something", () => {
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			user.setMany({ name: "Alan Reis" });

			expect(eventNames(user)).toEqual(["user.updated"]);
		});

		it("does not raise the event when nothing actually changes", () => {
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			user.set("name", "Alan");

			expect(eventNames(user)).toEqual([]);
		});

		it("raises one event per mutation, even within the same millisecond", () => {
			// The signal is setMany's own return value, not `updatedAt`: two real
			// mutations in the same tick produce the same ISO timestamp, so
			// inferring the change from it would silently swallow the second one.
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			user.set("name", "Alan Reis");
			user.set("name", "Alan Reis Anjo");

			expect(eventNames(user)).toEqual(["user.updated", "user.updated"]);
		});

		it("does not raise the event on an empty setMany", () => {
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			user.setMany({});

			expect(eventNames(user)).toEqual([]);
		});
	});

	describe("onDelete", () => {
		it("raises the event on the first destroy() call", () => {
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			user.destroy();

			expect(eventNames(user)).toEqual(["user.deleted"]);
		});

		it("does not raise the event again on a repeated destroy() call", () => {
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			user.destroy();
			user.pullDomainEvents();
			user.destroy();

			expect(eventNames(user)).toEqual([]);
		});

		it("still marks the entity destroyed", () => {
			const user = new User({ name: "Alan" });

			user.destroy();

			expect(user.isDestroyed).toBe(true);
		});
	});

	it("keeps the decorated class's own name, through all three wrappers", () => {
		// Each decorator returns `class Decorated extends target`; without
		// copying `name`, every decorated entity would identify itself as
		// "Decorated" in stack traces, logs, and DI containers.
		expect(User.name).toBe("User");
	});

	it("stacks all three without interfering with one another", () => {
		const user = new User({ name: "Alan" });
		expect(eventNames(user)).toEqual(["user.created"]);

		user.set("name", "Alan Reis");
		expect(eventNames(user)).toEqual(["user.updated"]);

		user.destroy();
		expect(eventNames(user)).toEqual(["user.deleted"]);
	});

	it("raises nothing at all on a hydration", () => {
		// There is no `onRead`, and that's deliberate: rehydration is not a
		// domain fact. A repository reconstructing the entity via `fromJSON`
		// must not inject any event into the buffer — otherwise every
		// `CommandResult` would carry a "read" alongside the real event.
		const seed = new User({ name: "Alan" });
		seed.pullDomainEvents();

		expect(eventNames(User.fromJSON(seed.toJSON()))).toEqual([]);
		expect(
			eventNames(
				new User({ id: seed.id, createdAt: seed.createdAt, name: "Alan" }),
			),
		).toEqual([]);
	});
});

describe("method decorators", () => {
	describe("emit", () => {
		it("raises the event after the method body has run to completion", () => {
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			user.finishPromoting();

			expect(eventNames(user)).toEqual([
				"promotion.midpoint",
				"promotion.finished",
			]);
		});

		it("does not raise the event if the method throws", () => {
			// No `try`/`catch` is involved: the `raiseEvent` call written after
			// `target.apply(...)` simply never executes.
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			expect(() => user.explodeBeforeEmit()).toThrow("boom");

			expect(eventNames(user)).toEqual([]);
		});

		it("lets the original exception propagate untouched", () => {
			const user = new User({ name: "Alan" });

			expect(() => user.explodeBeforeEmit()).toThrow("boom");
		});

		it("stacks with itself, the decorator closest to the method raising first", () => {
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			user.promoteTwice();

			expect(eventNames(user)).toEqual([
				"promotion.midpoint",
				"promotion.finished",
				"promotion.started",
			]);
		});
	});

	describe("onError", () => {
		it("raises an event built by the factory when the method throws, carrying the error", () => {
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			expect(() => user.promoteOrFail(true)).toThrow("promotion blocked");

			const [event] = user.pullDomainEvents();
			expect(event?.name).toBe("promotion.failed");
			expect((event as PromotionFailed).reason).toBe("promotion blocked");
		});

		it("re-throws the original error after raising the event", () => {
			const user = new User({ name: "Alan" });

			expect(() => user.promoteOrFail(true)).toThrow("promotion blocked");
		});

		it("does not raise anything when the method succeeds", () => {
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			expect(user.promoteOrFail(false)).toBe("promoted");

			expect(eventNames(user)).toEqual([]);
		});

		it("accepts a bare event-class reference directly, the same way onCreate does", () => {
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			expect(() => user.promoteOrAbort(true)).toThrow("promotion blocked");

			expect(eventNames(user)).toEqual(["promotion.aborted"]);
		});

		it("does not raise anything for the bare-class form when the method succeeds", () => {
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			expect(user.promoteOrAbort(false)).toBe("promoted");

			expect(eventNames(user)).toEqual([]);
		});

		it("stacks with emit: on a throw only onError's event is raised", () => {
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			expect(() => user.promoteWithFullStackOrFail(true)).toThrow(
				"promotion blocked",
			);

			expect(eventNames(user)).toEqual(["promotion.failed"]);
		});

		it("stacks with emit: on success only emit's event is raised", () => {
			const user = new User({ name: "Alan" });
			user.pullDomainEvents();

			expect(user.promoteWithFullStackOrFail(false)).toBe("promoted");

			expect(eventNames(user)).toEqual(["promotion.finished"]);
		});

		it("keeps the decorated method's own name", () => {
			const user = new User({ name: "Alan" });

			expect(user.promoteOrFail.name).toBe("promoteOrFail");
		});
	});

	describe("fromClass", () => {
		it("builds a fresh instance of the given class on every call, ignoring the error", () => {
			const factory = fromClass(PromotionAborted);

			const first = factory(new Error("first"));
			const second = factory(new Error("second"));

			expect(first).not.toBe(second);
			expect(first.name).toBe("promotion.aborted");
			expect(second.name).toBe("promotion.aborted");
		});
	});

	it("passes the method's return value through unaffected", () => {
		const user = new User({ name: "Alan" });

		expect(user.promoteTwice()).toBe("promoted");
	});

	it("keeps the decorated method's own name", () => {
		// The replacement is typed as `typeof target`, but the function's own
		// name only survives because `emit` calls `renameDecorated` with
		// `context.name` — without that, every decorated function would be
		// called "replacement" in stack traces and logs.
		const user = new User({ name: "Alan" });

		expect(user.promoteTwice.name).toBe("promoteTwice");
	});
});
