import { SlugSchema } from "@/domain/collections/schemas";
import { StringVO, SlugVO } from "@/domain/collections/value-objects";
import { customStringVO } from "@/domain/collections/value-objects/custom";
import { NullableDateTimeVO } from "@/domain/collections/value-objects/nullable";
import { OptionalStringVO } from "@/domain/collections/value-objects/optional";
import { DomainEvent } from "@/domain/domain-event";
import { Entity } from "@/domain/entity";
import type {
	AccessorsOf,
	EntityDefinition,
	IEntity,
	RawContextOf,
	SerializedEntity,
} from "@/domain/entity/types";
import type { InputValueOf } from "@/domain/entity/types/input-value-of.type";
import type { InputValuesOf } from "@/domain/entity/types/input-values-of.type";
import { ValueObject } from "@/domain/value-object";
import type { IValueObjectMetadata } from "@/domain/value-object/types";
import {
	CyclicEntityDefinitionException,
	ImmutablePropertyException,
	IncompleteIdentityException,
	InvalidDomainDataException,
	InvalidEntityDefinitionException,
	InvalidPropertyException,
	PropertyNameCollisionException,
} from "@roastery/terroir/exceptions/domain";
import { Storage } from "@roastery/terroir/symbols";
import { describe, expect, it } from "bun:test";

/** Event with no payload of its own — constructor inherited from `DomainEvent`, just `aggregateId`. */
class BeanPlanted extends DomainEvent {
	protected defineName(): string {
		return "bean.planted";
	}
}

/** Event with a payload of its own — constructor requires more than `aggregateId`. */
class BeanWatered extends DomainEvent {
	public constructor(
		aggregateId: string,
		public readonly amount: number,
	) {
		super(aggregateId);
	}

	protected defineName(): string {
		return "bean.watered";
	}
}

const beanProperties = {
	name: StringVO,
	slug: SlugVO,
};

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Bean extends AccessorsOf<typeof beanProperties> {}
class Bean extends Entity<typeof beanProperties> {
	protected defineEntity(): EntityDefinition<typeof beanProperties> {
		return { properties: beanProperties, source: "bean" };
	}

	/** Widens `set`/`setMany` back to public — this fixture's tests exercise the mutation primitive itself, from outside the class. */
	public override set<Key extends keyof typeof beanProperties>(
		key: Key,
		value: InputValueOf<(typeof beanProperties)[Key]>,
	): boolean {
		return super.set(key, value);
	}

	public override setMany(
		values: Partial<InputValuesOf<typeof beanProperties>>,
	): boolean {
		return super.setMany(values);
	}

	/** Public facade for `[Storage]`, which is protected. */
	public remember(key: string, value: string): string {
		return this[Storage].set(key, value);
	}

	/** Public facade for `[Storage]`, which is protected. */
	public recall(key: string): string | null {
		return this[Storage].get(key);
	}

	/** Public facade for `raiseEvent`, which is protected. */
	public announce(name: string, payload: Record<string, unknown> = {}): void {
		this.raiseEvent({ name, ...payload });
	}

	/** Public facade for `raiseEvent` taking a bare class reference, no `new`. */
	public plant(): void {
		this.raiseEvent(BeanPlanted);
	}

	/** Public facade for `raiseEvent` taking a built instance, for when there's a payload of its own. */
	public water(amount: number): void {
		this.raiseEvent(new BeanWatered(this.id, amount));
	}

	/** Facade solely to prove, at compile time, that an event with its own payload does not satisfy the bare-class overload. */
	public waterWithoutAmount(): void {
		// @ts-expect-error — BeanWatered's constructor also requires `amount`;
		// only a payload-less DomainEvent subclass satisfies the bare-class overload.
		this.raiseEvent(BeanWatered);
	}
}

const authorProperties = {
	name: StringVO,
};

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Author extends AccessorsOf<typeof authorProperties> {}
class Author extends Entity<typeof authorProperties> {
	protected defineEntity(): EntityDefinition<typeof authorProperties> {
		return { properties: authorProperties, source: "author" };
	}

	/** Public facade for `raiseEvent`, which is protected. */
	public announce(name: string): void {
		this.raiseEvent({ name });
	}
}

const postProperties = {
	title: StringVO,
	author: Author,
};

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Post extends AccessorsOf<typeof postProperties> {}
class Post extends Entity<typeof postProperties> {
	protected defineEntity(): EntityDefinition<typeof postProperties> {
		return { properties: postProperties, source: "post" };
	}

	/** Public facade for `raiseEvent`, which is protected. */
	public announce(name: string): void {
		this.raiseEvent({ name });
	}

	/** Widens `set` back to public — this fixture's tests exercise nested-entity mutation from outside the class. */
	public override set<Key extends keyof typeof postProperties>(
		key: Key,
		value: InputValueOf<(typeof postProperties)[Key]>,
	): boolean {
		return super.set(key, value);
	}
}

/** Third nesting level, solely to prove `deep` really does recurse. */
const blogProperties = {
	post: Post,
};

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Blog extends AccessorsOf<typeof blogProperties> {}
class Blog extends Entity<typeof blogProperties> {
	protected defineEntity(): EntityDefinition<typeof blogProperties> {
		return { properties: blogProperties, source: "blog" };
	}
}

/**
 * Blueprint with both halves of the `optional`/`nullable` distinction, for
 * the round-trip tests: `body` may be omitted, `deletedAt` must be present —
 * and present explicitly as `null`.
 */
const noteProperties = {
	title: StringVO,
	body: OptionalStringVO,
	deletedAt: NullableDateTimeVO,
};

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Note extends AccessorsOf<typeof noteProperties> {}
class Note extends Entity<typeof noteProperties> {
	protected defineEntity(): EntityDefinition<typeof noteProperties> {
		return { properties: noteProperties, source: "note" };
	}
}

const tagProperties = {
	label: StringVO,
};

/** Proves `defineEntity` doesn't take away the subclass's right to its own constructor. */
class Tag extends Entity<typeof tagProperties> {
	public constructor(label: string);
	public constructor(context: RawContextOf<typeof tagProperties>);
	public constructor(arg: RawContextOf<typeof tagProperties> | string) {
		super(typeof arg === "string" ? { label: arg } : arg);
	}

	protected defineEntity(): EntityDefinition<typeof tagProperties> {
		return { properties: tagProperties, source: "tag" };
	}
}

const trackedProperties = {
	label: StringVO,
};

/** Subclass with a class field — only works because the base constructs via `Reflect.construct`. */
// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Tracked extends AccessorsOf<typeof trackedProperties> {}
class Tracked extends Entity<typeof trackedProperties> {
	public readonly origin: string = "class-field";
	public readonly tags: string[] = [];

	protected defineEntity(): EntityDefinition<typeof trackedProperties> {
		return { properties: trackedProperties, source: "tracked" };
	}
}

const makeTracked = (): Tracked => new Tracked({ label: "alan" });

const makeBean = (): Bean => new Bean({ name: "alan", slug: "hello-world" });

const makePost = (): Post =>
	new Post({ title: "primeiro", author: { name: "alan" } });

/** Identidade fixa, para os testes que a informam em vez de deixar a base gerar. */
const IDENTITY = {
	id: "0197c9f4-6b2a-7c3d-8e4f-9a8b7c6d5e4f",
	createdAt: "2026-04-27T10:00:00.000Z",
	updatedAt: "2026-04-28T10:00:00.000Z",
} as const;

describe("Entity", () => {
	describe("defineEntity", () => {
		it("supplies the blueprint without the subclass declaring a constructor", () => {
			const bean = makeBean();

			expect(bean.get("name")).toBe("alan");
			expect(bean).toBeInstanceOf(Bean);
		});

		it("coexists with a constructor of the subclass's own", () => {
			const tag = new Tag("launch");

			expect(tag.get("label")).toBe("launch");
			expect(new Tag({ label: "direto" }).get("label")).toBe("direto");
		});

		it("satisfies the IEntity contract for its own blueprint", () => {
			const bean: IEntity<typeof beanProperties> = makeBean();

			expect(bean.get("name")).toBe("alan");
			expect(JSON.parse(bean.toString())).toEqual(bean.toJSON());
		});

		it("rejects an implementation declared as a class field", () => {
			class Broken extends Entity<typeof authorProperties> {
				protected defineEntity = (): EntityDefinition<
					typeof authorProperties
				> => ({ properties: authorProperties, source: "broken" });
			}

			expect(() => Broken.demo()).toThrow(InvalidEntityDefinitionException);
		});
	});

	describe("construction", () => {
		it("exposes the raw values it was built from", () => {
			const bean = makeBean();

			expect(bean.get("name")).toBe("alan");
			expect(bean.get("slug")).toBe("hello-world");
		});

		it("stamps a fresh identity", () => {
			const bean = makeBean();

			expect(bean.get("id")).toMatch(/^[0-9a-f-]{36}$/);
			expect(() => new Date(bean.get("createdAt"))).not.toThrow();
			expect(bean.get("updatedAt")).toBeUndefined();
		});

		it("gives each instance its own id", () => {
			expect(makeBean().get("id")).not.toBe(makeBean().get("id"));
		});

		it("runs each value-object's transform", () => {
			const bean = new Bean({ name: "alan", slug: "Hello World" });

			expect(bean.get("slug")).toBe("hello-world");
		});

		it("throws InvalidPropertyException naming the offending field", () => {
			expect(() => new Bean({ name: "alan", slug: "" })).toThrow(
				InvalidPropertyException,
			);

			try {
				new Bean({ name: "alan", slug: "" });
				expect.unreachable("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidPropertyException);
				expect((error as InvalidPropertyException).property).toBe("slug");
				expect((error as InvalidPropertyException).source).toBe("bean");
			}
		});
	});

	describe("construction with identity", () => {
		it("preserves the id and createdAt it was given", () => {
			const bean = new Bean({
				name: "alan",
				slug: "hello-world",
				id: IDENTITY.id,
				createdAt: IDENTITY.createdAt,
			});

			expect(bean.get("id")).toBe(IDENTITY.id);
			expect(bean.get("createdAt")).toBe(IDENTITY.createdAt);
			expect(bean.get("updatedAt")).toBeUndefined();
		});

		it("carries updatedAt when it comes along", () => {
			const bean = new Bean({
				name: "alan",
				slug: "hello-world",
				...IDENTITY,
			});

			expect(bean.get("updatedAt")).toBe(IDENTITY.updatedAt);
			expect(bean.toJSON()).toEqual({
				...IDENTITY,
				name: "alan",
				slug: "hello-world",
			});
		});

		it("round-trips a serialized payload through the constructor", () => {
			const bean = makeBean();

			expect(new Bean({ ...bean.toJSON() }).toJSON()).toEqual(bean.toJSON());
		});

		it("rejects a malformed identity, naming the offending field", () => {
			const cases = [
				{ key: "id", context: { ...IDENTITY, id: "not-a-uuid" } },
				{ key: "createdAt", context: { ...IDENTITY, createdAt: "yesterday" } },
			];

			for (const { key, context } of cases) {
				try {
					new Bean({ name: "alan", slug: "hello-world", ...context });
					expect.unreachable("should have thrown");
				} catch (error) {
					expect(error).toBeInstanceOf(InvalidPropertyException);
					expect((error as InvalidPropertyException).property).toBe(key);
					expect((error as InvalidPropertyException).source).toBe("bean");
				}
			}
		});

		it("refuses a half-given identity at runtime", () => {
			// The type already rejects each of these (see the `@ts-expect-error`
			// block below); the cast reproduces what a plain-JavaScript consumer
			// could get away with.
			const untyped = Bean as unknown as new (
				context: Record<string, string>,
			) => Bean;

			const cases: { missing: string; context: Record<string, string> }[] = [
				{ missing: "createdAt", context: { id: IDENTITY.id } },
				{ missing: "id", context: { createdAt: IDENTITY.createdAt } },
				{ missing: "id", context: { updatedAt: IDENTITY.updatedAt } },
			];

			for (const { missing, context } of cases) {
				try {
					new untyped({ name: "alan", slug: "hello-world", ...context });
					expect.unreachable("should have thrown");
				} catch (error) {
					expect(error).toBeInstanceOf(IncompleteIdentityException);
					// The class has no `property` slot — identity is one unit, and
					// it's the whole unit that's incomplete —, so the missing key
					// survives only in the message.
					expect((error as IncompleteIdentityException).message).toContain(
						`"${missing}" is missing`,
					);
					expect((error as IncompleteIdentityException).source).toBe("bean");
				}
			}
		});

		it("refuses a half-given identity at compile time", () => {
			const domain = { name: "alan", slug: "hello-world" };

			// @ts-expect-error — `id` alone isn't enough: `createdAt` is inseparable from it.
			expect(() => new Bean({ ...domain, id: IDENTITY.id })).toThrow(
				IncompleteIdentityException,
			);

			expect(
				// @ts-expect-error — `createdAt` sozinho tampouco.
				() => new Bean({ ...domain, createdAt: IDENTITY.createdAt }),
			).toThrow(IncompleteIdentityException);

			expect(
				// @ts-expect-error — `updatedAt` exige a identidade inteira.
				() => new Bean({ ...domain, updatedAt: IDENTITY.updatedAt }),
			).toThrow(IncompleteIdentityException);
		});
	});

	describe("demo mode", () => {
		it("falls back to each value-object's default", () => {
			const bean = Bean.demo();

			expect(bean.get("name")).toBe("string");
			expect(bean.get("slug")).toBe("slug");
		});

		it("still produces a real identity", () => {
			const bean = Bean.demo();

			expect(bean.get("id")).toMatch(/^[0-9a-f-]{36}$/);
			expect(bean.get("createdAt")).toEqual(expect.any(String));
		});

		it("builds nested entities in demo mode too", () => {
			const post = Post.demo();

			expect(post.get("author")).toBeInstanceOf(Author);
			expect(post.get("author").get("name")).toBe("string");
		});
	});

	describe("schema", () => {
		it("combines the blueprint's schemas with the identity keys", () => {
			const { properties } = makeBean().schema;

			expect(Object.keys(properties).sort()).toEqual([
				"createdAt",
				"id",
				"name",
				"slug",
				"updatedAt",
			]);
		});

		it("marks updatedAt optional even before the first mutation", () => {
			const bean = makeBean();

			expect(bean.get("updatedAt")).toBeUndefined();
			expect(bean.schema.properties).toHaveProperty("updatedAt");
			expect(bean.schema.required ?? []).not.toContain("updatedAt");
		});

		it("keeps the same schema across a mutation", () => {
			const bean = makeBean();
			const before = bean.schema;

			bean.set("name", "hoyasumii");

			expect(bean.schema).toBe(before);
		});

		it("shares one schema object across instances of the same class", () => {
			expect(makeBean().schema).toBe(makeBean().schema);
		});

		it("refuses additional properties at every level", () => {
			expect(makeBean().schema.additionalProperties).toBe(false);
			expect(makePost().schema.properties.author.additionalProperties).toBe(
				false,
			);
		});

		it("nests the schema of an entity property", () => {
			const { author } = makePost().schema.properties;

			expect(Object.keys(author.properties).sort()).toEqual([
				"createdAt",
				"id",
				"name",
				"updatedAt",
			]);
		});

		it("does not depend on the value-objects' defaults being valid", () => {
			// The schema is read off the class's `defineMeta`, without constructing
			// any VO, so an invalid default doesn't contaminate derivation — only demo mode.
			class BadDefaultVO extends ValueObject<string, typeof SlugSchema> {
				protected defineMeta(): IValueObjectMetadata<
					string,
					typeof SlugSchema
				> {
					return { default: "", schema: SlugSchema };
				}
			}

			const brokenProperties = { broken: BadDefaultVO };

			class BrokenEntity extends Entity<typeof brokenProperties> {
				protected defineEntity(): EntityDefinition<typeof brokenProperties> {
					return { properties: brokenProperties, source: "broken" };
				}
			}

			const entity = new BrokenEntity({ broken: "ok" });

			expect(Object.keys(entity.schema.properties).sort()).toEqual([
				"broken",
				"createdAt",
				"id",
				"updatedAt",
			]);
			expect(() => BrokenEntity.demo()).toThrow(InvalidPropertyException);
		});
	});

	describe("toJSON", () => {
		it("flattens every value-object into its raw value", () => {
			const bean = makeBean();

			expect(bean.toJSON()).toEqual({
				id: bean.get("id"),
				createdAt: bean.get("createdAt"),
				name: "alan",
				slug: "hello-world",
			});
		});

		it("omits updatedAt until the entity is mutated", () => {
			expect(makeBean().toJSON()).not.toHaveProperty("updatedAt");
		});

		it("backs toString", () => {
			const bean = makeBean();

			expect(JSON.parse(bean.toString())).toEqual(bean.toJSON());
		});

		it("recurses into an entity property", () => {
			const post = makePost();
			const author = post.get("author");

			expect(post.toJSON()).toEqual({
				id: post.get("id"),
				createdAt: post.get("createdAt"),
				title: "primeiro",
				author: {
					id: author.get("id"),
					createdAt: author.get("createdAt"),
					name: "alan",
				},
			});
		});
	});

	describe("set", () => {
		it("replaces the value and stamps updatedAt", () => {
			const bean = makeBean();

			bean.set("name", "hoyasumii");

			expect(bean.get("name")).toBe("hoyasumii");
			expect(bean.get("updatedAt")).toEqual(expect.any(String));
		});

		it("does not stamp updatedAt on a no-op", () => {
			const bean = makeBean();

			bean.set("name", "alan");

			expect(bean.get("updatedAt")).toBeUndefined();
		});

		it("treats a value that normalises to the current one as a no-op", () => {
			const bean = makeBean();

			bean.set("slug", "Hello World");

			expect(bean.get("slug")).toBe("hello-world");
			expect(bean.get("updatedAt")).toBeUndefined();
		});

		it("leaves the entity untouched when the new value is invalid", () => {
			const bean = makeBean();

			expect(() => bean.set("slug", "")).toThrow(InvalidPropertyException);
			expect(bean.get("slug")).toBe("hello-world");
			expect(bean.get("updatedAt")).toBeUndefined();
		});

		it("overwrites a given updatedAt with a more recent one", () => {
			const bean = new Bean({ name: "alan", slug: "hello-world", ...IDENTITY });

			bean.set("name", "hoyasumii");

			const updatedAt = bean.get("updatedAt") as string;

			expect(new Date(updatedAt).getTime()).toBeGreaterThan(
				new Date(IDENTITY.updatedAt).getTime(),
			);
		});

		it("leaves id and createdAt untouched", () => {
			const bean = new Bean({ name: "alan", slug: "hello-world", ...IDENTITY });

			bean.set("name", "hoyasumii");

			expect(bean.get("id")).toBe(IDENTITY.id);
			expect(bean.get("createdAt")).toBe(IDENTITY.createdAt);
		});

		it("refuses the identity keys at runtime", () => {
			const bean = makeBean();
			// `Key`'s type already excludes the base keys; the cast reproduces
			// what a plain-JavaScript consumer could get away with.
			const untyped = bean as unknown as {
				set(key: string, value: string): void;
			};

			for (const key of ["id", "createdAt", "updatedAt"])
				expect(() => untyped.set(key, "whatever")).toThrow(
					ImmutablePropertyException,
				);
		});

		it("throws a domain exception on a key outside the blueprint", () => {
			const bean = makeBean();
			const untyped = bean as unknown as {
				set(key: string, value: string): void;
			};

			try {
				untyped.set("nonexistent", "whatever");
				expect.unreachable("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidPropertyException);
				expect((error as InvalidPropertyException).property).toBe(
					"nonexistent",
				);
			}
		});

		it("rebuilds an entity property from its raw payload", () => {
			const post = makePost();

			post.set("author", { name: "hoyasumii" });

			expect(post.get("author")).toBeInstanceOf(Author);
			expect(post.get("author").get("name")).toBe("hoyasumii");
			expect(post.get("updatedAt")).toEqual(expect.any(String));
		});

		it("preserves the identity handed to an entity property", () => {
			const post = makePost();

			post.set("author", { name: "hoyasumii", ...IDENTITY });

			expect(post.get("author").get("id")).toBe(IDENTITY.id);
		});

		it("does not stamp updatedAt when the entity property is unchanged", () => {
			const post = makePost();

			post.set("author", post.get("author").toJSON());

			expect(post.get("updatedAt")).toBeUndefined();
		});

		it("leaves the post untouched when the nested value is invalid", () => {
			const post = makePost();

			// `StringVO` accepts any string, `""` included — what rejects this is
			// the type, the real-world case of a payload arriving from outside TS.
			expect(() =>
				post.set("author", { name: 42 as unknown as string }),
			).toThrow(InvalidPropertyException);
			expect(post.get("author").get("name")).toBe("alan");
			expect(post.get("updatedAt")).toBeUndefined();
		});
	});

	describe("setMany", () => {
		it("applies every key with a single updatedAt stamp", () => {
			const bean = makeBean();

			bean.setMany({ name: "hoyasumii", slug: "outro-slug" });

			expect(bean.get("name")).toBe("hoyasumii");
			expect(bean.get("slug")).toBe("outro-slug");
			expect(bean.get("updatedAt")).toEqual(expect.any(String));
		});

		it("leaves the entity untouched when any value is invalid", () => {
			const bean = makeBean();

			expect(() => bean.setMany({ name: "hoyasumii", slug: "" })).toThrow(
				InvalidPropertyException,
			);
			expect(bean.get("name")).toBe("alan");
			expect(bean.get("slug")).toBe("hello-world");
			expect(bean.get("updatedAt")).toBeUndefined();
		});

		it("does not stamp updatedAt when nothing actually changes", () => {
			const bean = makeBean();

			bean.setMany({ name: "alan", slug: "Hello World" });

			expect(bean.get("updatedAt")).toBeUndefined();
		});

		it("returns whether anything actually changed", () => {
			const bean = makeBean();

			expect(bean.setMany({ name: "hoyasumii" })).toBe(true);
			expect(bean.setMany({ name: "hoyasumii" })).toBe(false);
			expect(bean.setMany({})).toBe(false);
		});

		it("reports the change through set too", () => {
			const bean = makeBean();

			expect(bean.set("name", "hoyasumii")).toBe(true);
			expect(bean.set("name", "hoyasumii")).toBe(false);
		});

		it("stamps once even when several keys change", () => {
			const bean = makeBean();

			bean.setMany({ name: "hoyasumii", slug: "outro" });

			const first = bean.get("updatedAt");

			bean.setMany({ name: "hoyasumii", slug: "outro" });

			expect(bean.get("updatedAt")).toBe(first);
		});

		it("refuses the identity keys", () => {
			const bean = makeBean();
			const untyped = bean as unknown as {
				setMany(values: Record<string, string>): void;
			};

			expect(() => untyped.setMany({ id: IDENTITY.id })).toThrow(
				ImmutablePropertyException,
			);
		});
	});

	describe("get", () => {
		it("returns the instance of an entity property, not its raw form", () => {
			const post = makePost();

			expect(post.get("author")).toBeInstanceOf(Author);
			expect(post.get("author").get("name")).toBe("alan");
		});

		it("throws on a key outside the blueprint", () => {
			const bean = makeBean();
			// `Key`'s type already rejects this; the cast reproduces a plain-JS consumer.
			const untyped = bean as unknown as { get(key: string): unknown };

			try {
				untyped.get("nonexistent");
				expect.unreachable("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidPropertyException);
				expect((error as InvalidPropertyException).property).toBe(
					"nonexistent",
				);
				expect((error as InvalidPropertyException).source).toBe("bean");
			}
		});

		it("still returns undefined for updatedAt before the first mutation", () => {
			expect(makeBean().get("updatedAt")).toBeUndefined();
		});
	});

	describe("accessors", () => {
		it("exposes every blueprint key as a property", () => {
			const bean = makeBean();

			expect(bean.name).toBe("alan");
			expect(bean.slug).toBe("hello-world");
		});

		it("reflects a later set", () => {
			const bean = makeBean();

			bean.set("name", "hoyasumii");

			expect(bean.name).toBe("hoyasumii");
		});

		it("exposes identity through the base's own getters", () => {
			const bean = makeBean();

			expect(bean.id).toBe(bean.get("id"));
			expect(bean.createdAt).toBe(bean.get("createdAt"));
			expect(bean.updatedAt).toBeUndefined();

			bean.set("name", "hoyasumii");

			expect(bean.updatedAt).toEqual(expect.any(String));
		});

		it("returns the nested instance, so accessors chain", () => {
			const post = makePost();

			expect(post.author).toBeInstanceOf(Author);
			expect(post.author.name).toBe("alan");
		});

		it("works on instances built by fromJSON", () => {
			const bean = Bean.fromJSON(makeBean().toJSON());

			expect(bean.name).toBe("alan");
			expect(bean.id).toBe(bean.get("id"));
		});

		it("works on instances built by demo", () => {
			const post = Post.demo();

			expect(post.title).toBe("string");
			expect(post.author.name).toBe("string");
		});

		it("does not leak into the serialized form", () => {
			expect(Object.keys(makeBean().toJSON()).sort()).toEqual([
				"createdAt",
				"id",
				"name",
				"slug",
			]);
		});

		it("refuses a blueprint key that collides with an existing member", () => {
			const collidingProperties = { schema: StringVO };

			class Colliding extends Entity<typeof collidingProperties> {
				protected defineEntity(): EntityDefinition<typeof collidingProperties> {
					return { properties: collidingProperties, source: "colliding" };
				}
			}

			try {
				new Colliding({ schema: "boom" });
				expect.unreachable("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(PropertyNameCollisionException);
				expect((error as PropertyNameCollisionException).property).toBe(
					"schema",
				);
				expect((error as PropertyNameCollisionException).source).toBe(
					"colliding",
				);
			}

			// The install is atomic: a rejected attempt must not mark the
			// prototype as already installed and let the next one slip through unnoticed.
			expect(() => new Colliding({ schema: "boom" })).toThrow(
				PropertyNameCollisionException,
			);
		});
	});

	describe("subclass construction", () => {
		it("initialises class fields on every construction path", () => {
			const serialized = makeTracked().toJSON();

			expect(new Tracked({ label: "alan" }).origin).toBe("class-field");
			expect(Tracked.demo().origin).toBe("class-field");
			expect(Tracked.fromJSON(serialized).origin).toBe("class-field");
		});

		it("gives each instance its own class-field value", () => {
			const serialized = makeTracked().toJSON();
			const first = Tracked.fromJSON(serialized);

			first.tags.push("marcado");

			expect(Tracked.fromJSON(serialized).tags).toEqual([]);
			expect(Tracked.demo().tags).toEqual([]);
		});

		it("runs the subclass constructor body on every path", () => {
			let built = 0;

			const countedProperties = { label: StringVO };

			class Counted extends Entity<typeof countedProperties> {
				public constructor(context: RawContextOf<typeof countedProperties>) {
					super(context);
					built += 1;
				}

				protected defineEntity(): EntityDefinition<typeof countedProperties> {
					return { properties: countedProperties, source: "counted" };
				}
			}

			const serialized = new Counted({ label: "alan" }).toJSON();

			expect(built).toBe(1);

			Counted.demo();
			Counted.fromJSON(serialized);

			expect(built).toBe(3);
		});

		it("keeps a subclass with its own constructor signature working", () => {
			// `Tag` only accepts a string or a context — the contract is to forward
			// to `super` whatever it doesn't recognise, which is what keeps demo/fromJSON working.
			const serialized = new Tag("launch").toJSON();

			expect(Tag.demo().get("label")).toBe("string");
			expect(Tag.fromJSON(serialized).get("label")).toBe("launch");
		});
	});

	describe("blueprint cycles", () => {
		it("rejects a self-referencing blueprint instead of overflowing", () => {
			// The `const` comes after the class on purpose: it's the only order in
			// which a self-referencing blueprint manages to exist (before it, TDZ).
			class Node extends Entity<typeof nodeProperties> {
				protected defineEntity(): EntityDefinition<typeof nodeProperties> {
					return { properties: nodeProperties, source: "node" };
				}
			}
			const nodeProperties = { child: Node };

			try {
				new Node({ child: { child: {} } as never });
				expect.unreachable("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(CyclicEntityDefinitionException);
				expect((error as CyclicEntityDefinitionException).source).toBe("node");
			}
		});

		it("rejects the cycle when deriving the schema too", () => {
			class Loop extends Entity<typeof loopProperties> {
				protected defineEntity(): EntityDefinition<typeof loopProperties> {
					return { properties: loopProperties, source: "loop" };
				}
			}
			const loopProperties = { child: Loop };

			// `fromJSON` derives the schema *before* constructing, so this is the
			// path that exercises the derivation guard, not the construction one.
			try {
				Loop.fromJSON({ ...IDENTITY, child: {} } as never);
				expect.unreachable("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(CyclicEntityDefinitionException);
				expect((error as CyclicEntityDefinitionException).source).toBe("loop");
			}
		});

		it("does not mistake two properties of the same class for a cycle", () => {
			const reviewProperties = {
				author: Author,
				reviewer: Author,
			};

			class Review extends Entity<typeof reviewProperties> {
				protected defineEntity(): EntityDefinition<typeof reviewProperties> {
					return { properties: reviewProperties, source: "review" };
				}
			}

			const review = new Review({
				author: { name: "alan" },
				reviewer: { name: "hoyasumii" },
			});

			expect(review.get("author").get("name")).toBe("alan");
			expect(review.get("reviewer").get("name")).toBe("hoyasumii");
			expect(review.get("author").get("id")).not.toBe(
				review.get("reviewer").get("id"),
			);
		});
	});

	describe("accessors on a subclass of a subclass", () => {
		it("inherits the parent's accessors when the blueprint is the same", () => {
			class Special extends Bean {}

			const special = new Special({ name: "alan", slug: "hello-world" });

			expect(special.name).toBe("alan");
			expect(special.slug).toBe("hello-world");
		});

		it("installs accessors for keys the parent's blueprint did not have", () => {
			const wideProperties = { ...beanProperties, extra: StringVO };

			class Wide extends Bean {
				protected override defineEntity(): EntityDefinition<
					typeof beanProperties
				> {
					// The subclass's blueprint is wider than the parent's, and the
					// parent's type has no way to express that — the cast reproduces
					// what a plain-JavaScript consumer could get away with.
					return {
						properties: wideProperties,
						source: "wide",
					} as unknown as EntityDefinition<typeof beanProperties>;
				}
			}

			const wide = new Wide({
				name: "alan",
				slug: "hello-world",
				extra: "novo",
			} as never) as unknown as Bean & { extra: string };

			expect(wide.name).toBe("alan");
			expect(wide.extra).toBe("novo");
		});
	});

	describe("storage", () => {
		it("keeps transient state off the serialized form", () => {
			const bean = makeBean();

			bean.remember("lookup", "cached");

			expect(bean.recall("lookup")).toBe("cached");
			expect(bean.toJSON()).not.toHaveProperty("lookup");
			expect(Object.keys(bean.schema.properties)).not.toContain("lookup");
		});

		it("gives each instance its own store", () => {
			const first = makeBean();
			const second = makeBean();

			first.remember("lookup", "do primeiro");

			expect(second.recall("lookup")).toBeNull();
		});

		it("survives a mutation", () => {
			const bean = makeBean();

			bean.remember("lookup", "cached");
			bean.set("name", "hoyasumii");
			bean.setMany({ slug: "outro" });

			expect(bean.recall("lookup")).toBe("cached");
		});

		it("starts empty on an instance built by fromJSON", () => {
			const bean = makeBean();

			bean.remember("lookup", "cached");

			expect(Bean.fromJSON(bean.toJSON()).recall("lookup")).toBeNull();
		});

		it("starts empty on an instance built by demo", () => {
			expect(Bean.demo().recall("lookup")).toBeNull();
		});

		it("does not collide with a blueprint accessor", () => {
			const bean = makeBean();

			bean.remember("name", "not the name field");

			expect(bean.name).toBe("alan");
			expect(bean.recall("name")).toBe("not the name field");
		});
	});

	describe("domain events", () => {
		it("keeps raised events off the serialized form", () => {
			const bean = makeBean();

			bean.announce("bean.planted", { name: "not the name field" });

			expect(bean.toJSON()).toEqual({
				id: bean.id,
				createdAt: bean.createdAt,
				name: "alan",
				slug: "hello-world",
			});
			expect(Object.keys(bean.schema.properties)).not.toContain("events");
		});

		it("gives each instance its own buffer", () => {
			const first = makeBean();
			const second = makeBean();

			first.announce("bean.planted");

			expect(second.pullDomainEvents()).toEqual([]);
		});

		it("survives an unrelated mutation", () => {
			const bean = makeBean();

			bean.announce("bean.planted");
			bean.set("name", "hoyasumii");
			bean.setMany({ slug: "outro" });

			expect(bean.pullDomainEvents()).toHaveLength(1);
		});

		it("does not stamp updatedAt", () => {
			const bean = makeBean();

			bean.announce("bean.planted");

			expect(bean.get("updatedAt")).toBeUndefined();
		});

		it("stamps aggregateId with the entity's own id", () => {
			const bean = makeBean();

			bean.announce("bean.planted");

			const [event] = bean.pullDomainEvents();

			expect(event?.aggregateId).toBe(bean.id);
		});

		it("stamps a fresh occurredAt timestamp", () => {
			const bean = makeBean();
			const before = Date.now();

			bean.announce("bean.planted");

			const [event] = bean.pullDomainEvents();
			const occurredAt = new Date(event?.occurredAt ?? "").getTime();

			expect(occurredAt).toBeGreaterThanOrEqual(before);
			expect(occurredAt).toBeLessThanOrEqual(Date.now());
		});

		it("keeps the extra payload the caller attached", () => {
			const bean = makeBean();

			bean.announce("bean.planted", { seeds: 3 });

			const [event] = bean.pullDomainEvents();

			expect(event).toMatchObject({ name: "bean.planted", seeds: 3 });
		});

		it("instantiates a bare class reference, using the entity's own id", () => {
			const bean = makeBean();

			bean.plant();

			const [event] = bean.pullDomainEvents();

			expect(event).toMatchObject({
				name: "bean.planted",
				aggregateId: bean.id,
			});
		});

		it("still accepts an already-built instance for an event with its own payload", () => {
			const bean = makeBean();

			bean.water(50);

			const [event] = bean.pullDomainEvents();

			expect(event).toMatchObject({
				name: "bean.watered",
				aggregateId: bean.id,
				amount: 50,
			});
		});

		it("refuses a class reference whose constructor needs more than aggregateId, at compile time", () => {
			const bean = makeBean();

			bean.waterWithoutAmount();

			const [event] = bean.pullDomainEvents();

			expect(event?.name).toBe("bean.watered");
			expect(
				(event as { amount?: number } | undefined)?.amount,
			).toBeUndefined();
		});

		it("returns events in the order they were raised", () => {
			const bean = makeBean();

			bean.announce("bean.planted");
			bean.announce("bean.watered");

			expect(bean.pullDomainEvents().map((event) => event.name)).toEqual([
				"bean.planted",
				"bean.watered",
			]);
		});

		it("drains the buffer — a second pull returns nothing", () => {
			const bean = makeBean();

			bean.announce("bean.planted");
			bean.pullDomainEvents();

			expect(bean.pullDomainEvents()).toEqual([]);
		});

		it("starts empty on an instance built by fromJSON", () => {
			const bean = makeBean();

			bean.announce("bean.planted");

			expect(Bean.fromJSON(bean.toJSON()).pullDomainEvents()).toEqual([]);
		});

		it("starts empty on an instance built by demo", () => {
			expect(Bean.demo().pullDomainEvents()).toEqual([]);
		});

		it("does not surface an event raised by a nested entity", () => {
			const post = makePost();

			post.get("author").announce("author.followed");

			expect(post.pullDomainEvents()).toEqual([]);
		});

		it("surfaces a nested entity's events when pulled deep", () => {
			const post = makePost();

			post.announce("post.published");
			post.get("author").announce("author.followed");

			expect(
				post.pullDomainEvents({ deep: true }).map((event) => event.name),
			).toEqual(["post.published", "author.followed"]);
		});

		it("recurses past the first nested level", () => {
			const blog = new Blog({ post: { title: "t", author: { name: "alan" } } });

			blog.get("post").get("author").announce("author.followed");

			expect(
				blog.pullDomainEvents({ deep: true }).map((event) => event.name),
			).toEqual(["author.followed"]);
		});

		it("empties the nested buffers it drained", () => {
			const post = makePost();
			const author = post.get("author");

			author.announce("author.followed");
			post.pullDomainEvents({ deep: true });

			expect(author.pullDomainEvents()).toEqual([]);
		});

		it("leaves the nested buffer intact on a shallow pull", () => {
			const post = makePost();
			const author = post.get("author");

			author.announce("author.followed");
			post.pullDomainEvents();

			expect(author.pullDomainEvents().map((event) => event.name)).toEqual([
				"author.followed",
			]);
		});
	});

	describe("destroy", () => {
		it("starts undestroyed", () => {
			expect(makeBean().isDestroyed).toBe(false);
		});

		it("marks the entity destroyed", () => {
			const bean = makeBean();

			bean.destroy();

			expect(bean.isDestroyed).toBe(true);
		});

		it("releases the transient [Storage]", () => {
			const bean = makeBean();

			bean.remember("lookup", "cached");
			bean.destroy();

			expect(bean.recall("lookup")).toBeNull();
		});

		it("is idempotent — a second call is a no-op", () => {
			const bean = makeBean();

			bean.destroy();
			bean.remember("lookup", "cached after destroy");
			bean.destroy();

			// The second call must not clear Storage again — only the first one
			// needs to release what existed until then.
			expect(bean.recall("lookup")).toBe("cached after destroy");
		});

		it("is a soft marker — get/toJSON keep working afterwards", () => {
			const bean = makeBean();

			bean.destroy();

			expect(bean.get("name")).toBe("alan");
			expect(() => bean.toJSON()).not.toThrow();
		});
	});

	describe("fromJSON", () => {
		it("is a static, needing no throwaway instance", () => {
			const bean = Bean.fromJSON(makeBean().toJSON());

			expect(bean).toBeInstanceOf(Bean);
		});

		it("preserves the identity carried by the payload", () => {
			const bean = makeBean();
			const copy = Bean.fromJSON(bean.toJSON());

			expect(copy.get("id")).toBe(bean.get("id"));
			expect(copy.get("createdAt")).toBe(bean.get("createdAt"));
		});

		it("carries updatedAt across when present", () => {
			const bean = makeBean();

			bean.set("name", "hoyasumii");

			const copy = Bean.fromJSON(bean.toJSON());

			expect(copy.get("updatedAt")).toBe(bean.get("updatedAt"));
		});

		it("round-trips through toJSON", () => {
			const bean = makeBean();

			expect(Bean.fromJSON(bean.toJSON()).toJSON()).toEqual(bean.toJSON());
		});

		it("rejects a payload missing a blueprint key", () => {
			const { slug: _slug, ...incomplete } = makeBean().toJSON();

			expect(() =>
				Bean.fromJSON(incomplete as SerializedEntity<typeof beanProperties>),
			).toThrow(InvalidDomainDataException);
		});

		it("rejects a payload carrying an unknown key", () => {
			const payload = { ...makeBean().toJSON(), rogue: "surprise" };

			expect(() =>
				Bean.fromJSON(payload as SerializedEntity<typeof beanProperties>),
			).toThrow(InvalidDomainDataException);
		});

		it("rejects a payload whose identity is malformed", () => {
			const bean = makeBean();

			expect(() =>
				Bean.fromJSON({ ...bean.toJSON(), id: "not-a-uuid" }),
			).toThrow(InvalidDomainDataException);
		});

		it("rejects a payload with a value the schema refuses", () => {
			const bean = makeBean();

			expect(() => Bean.fromJSON({ ...bean.toJSON(), slug: "" })).toThrow(
				InvalidDomainDataException,
			);
		});

		it("round-trips an aggregate, preserving the nested identity", () => {
			const post = makePost();
			const copy = Post.fromJSON(post.toJSON());

			expect(copy.get("author")).toBeInstanceOf(Author);
			expect(copy.get("author").get("id")).toBe(post.get("author").get("id"));
			expect(copy.toJSON()).toEqual(post.toJSON());
		});

		it("rejects an aggregate whose nested payload is invalid", () => {
			const post = makePost();

			expect(() =>
				Post.fromJSON({
					...post.toJSON(),
					author: {
						...post.get("author").toJSON(),
						name: 42 as unknown as string,
					},
				}),
			).toThrow(InvalidDomainDataException);
		});

		it("rejects an aggregate whose nested payload carries an unknown key", () => {
			const post = makePost();

			const payload = {
				...post.toJSON(),
				author: { ...post.get("author").toJSON(), rogue: "surprise" },
			};

			expect(() =>
				Post.fromJSON(payload as SerializedEntity<typeof postProperties>),
			).toThrow(InvalidDomainDataException);
		});

		it("accepts a payload whose optional key survived a real JSON round-trip", () => {
			// `JSON.stringify` drops the key whose value is `undefined`, so the
			// payload coming back off the wire simply doesn't have it. `modelFor`
			// emits that key via `t.Optional`, precisely so "optional" means the
			// same thing on both sides of serialization.
			const note = new Note({ title: "no body", deletedAt: null });
			const wire = JSON.parse(
				JSON.stringify(note.toJSON()),
			) as SerializedEntity<typeof noteProperties>;

			expect(wire).not.toHaveProperty("body");

			const copy = Note.fromJSON(wire);

			expect(copy.get("body")).toBeUndefined();
			expect(copy.get("id")).toBe(note.get("id"));
		});

		it("still accepts an optional key present with an explicit value", () => {
			const note = new Note({
				title: "with body",
				body: "text",
				deletedAt: null,
			});
			const wire = JSON.parse(
				JSON.stringify(note.toJSON()),
			) as SerializedEntity<typeof noteProperties>;

			expect(Note.fromJSON(wire).get("body")).toBe("text");
		});

		it("keeps a nullable key required — null is not undefined", () => {
			// `nullableVO` doesn't make the key omittable: `null` survives
			// `JSON.stringify`, so a payload without it is genuinely incomplete.
			const note = new Note({ title: "t", body: "b", deletedAt: null });
			const { deletedAt: _deletedAt, ...incomplete } = note.toJSON();

			expect(() =>
				Note.fromJSON(incomplete as SerializedEntity<typeof noteProperties>),
			).toThrow(InvalidDomainDataException);
		});
	});
	describe("isUnique", () => {
		/** Declares uniqueness on the class, so every blueprint using it inherits the fact. */
		const BadgeCodeVO = customStringVO({ name: "BadgeCodeVO", unique: true });

		const staffProperties = {
			code: BadgeCodeVO,
			handle: SlugVO,
			name: StringVO,
		};

		class Staff extends Entity<typeof staffProperties> {
			protected defineEntity(): EntityDefinition<typeof staffProperties> {
				return {
					properties: staffProperties,
					source: "staff",
					unique: ["handle"],
				};
			}
		}

		const newStaff = (): Staff =>
			new Staff({ code: "A-1", handle: "alan", name: "Alan" });

		it("reports a key its value-object declared unique", () => {
			expect(newStaff().isUnique("code")).toBe(true);
		});

		it("reports a key the definition named unique", () => {
			expect(newStaff().isUnique("handle")).toBe(true);
		});

		it("reports false for a key neither source named", () => {
			expect(newStaff().isUnique("name")).toBe(false);
		});

		it("always reports id, even where nothing was declared unique", () => {
			const plainProperties = { name: StringVO };

			class Plain extends Entity<typeof plainProperties> {
				protected defineEntity(): EntityDefinition<typeof plainProperties> {
					return { properties: plainProperties, source: "plain" };
				}
			}

			expect(new Plain({ name: "n" }).isUnique("id")).toBe(true);
		});

		it("reports false for the timestamps, which repeat freely", () => {
			const staff = newStaff();

			expect(staff.isUnique("createdAt")).toBe(false);
			expect(staff.isUnique("updatedAt")).toBe(false);
		});

		it("throws for a key outside the blueprint, rather than answering false", () => {
			// A typo answering `false` would read as "not unique" — the silent
			// failure `get`'s identical guard exists to prevent.
			const read = () =>
				(newStaff() as unknown as { isUnique(key: string): boolean }).isUnique(
					"nope",
				);

			expect(read).toThrow(InvalidPropertyException);
		});

		/**
		 * The contract in one assertion: the method reports the *declaration*,
		 * never the stored data. Only a repository can answer "is this value
		 * taken", because only it sees the set of rows.
		 */
		it("does not stop two entities from carrying the same unique value", () => {
			const first = newStaff();
			const second = newStaff();

			expect(first.isUnique("code")).toBe(true);
			expect(first.get("code")).toBe(second.get("code"));
			expect(first.id).not.toBe(second.id);
		});
	});

	describe("isSensitive", () => {
		/** Declares sensitivity on the class, so every blueprint using it inherits the fact. */
		const ApiKeyVO = customStringVO({ name: "ApiKeyVO", sensitive: true });

		const staffProperties = {
			key: ApiKeyVO,
			token: StringVO,
			name: StringVO,
		};

		class Staff extends Entity<typeof staffProperties> {
			protected defineEntity(): EntityDefinition<typeof staffProperties> {
				return {
					properties: staffProperties,
					source: "staff",
					sensitive: ["token"],
				};
			}
		}

		const newStaff = (): Staff =>
			new Staff({ key: "k-1", token: "t-1", name: "Alan" });

		it("reports a key its value-object declared sensitive", () => {
			expect(newStaff().isSensitive("key")).toBe(true);
		});

		it("reports a key the definition named sensitive", () => {
			expect(newStaff().isSensitive("token")).toBe(true);
		});

		it("reports false for a key neither source named", () => {
			expect(newStaff().isSensitive("name")).toBe(false);
		});

		/**
		 * Where `isUnique` always answers `true` for `id`, this answers `false`:
		 * an identifier is not a secret — it is what makes a log useful.
		 */
		it("reports false for id and the timestamps, unlike isUnique", () => {
			const staff = newStaff();

			expect(staff.isSensitive("id")).toBe(false);
			expect(staff.isSensitive("createdAt")).toBe(false);
			expect(staff.isSensitive("updatedAt")).toBe(false);
			expect(staff.isUnique("id")).toBe(true);
		});

		it("throws for a key outside the blueprint, rather than answering false", () => {
			// A typo answering `false` would read as "not a secret" — the silent
			// failure `get`'s identical guard exists to prevent.
			const read = () =>
				(
					newStaff() as unknown as { isSensitive(key: string): boolean }
				).isSensitive("nope");

			expect(read).toThrow(InvalidPropertyException);
		});

		/**
		 * The declaration changes where a value may surface, never whether it is
		 * readable: `get` and `toJSON` stay lossless, because `toJSON` is the
		 * persistence contract and has to round-trip through `fromJSON`.
		 */
		it("does not hide the value from get or toJSON", () => {
			const staff = newStaff();

			expect(staff.get("key")).toBe("k-1");
			expect(staff.toJSON().key).toBe("k-1");
		});
	});
});
