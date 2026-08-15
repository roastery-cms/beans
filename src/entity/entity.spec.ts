import { SlugSchema } from "@/collections/schemas";
import { StringVO, SlugVO } from "@/collections/value-objects";
import { Entity } from "@/entity";
import type {
	AccessorsOf,
	EntityDefinition,
	IEntity,
	RawContextOf,
	SerializedEntity,
} from "@/entity/types";
import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
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

const beanProperties = {
	name: StringVO,
	slug: SlugVO,
};

// biome-ignore lint/correctness/noUnusedVariables: o merge com a classe abaixo é o uso.
interface Bean extends AccessorsOf<typeof beanProperties> {}
class Bean extends Entity<typeof beanProperties> {
	protected defineEntity(): EntityDefinition<typeof beanProperties> {
		return { properties: beanProperties, source: "bean" };
	}

	/** Fachada pública para o `[Storage]`, que é protegido. */
	public remember(key: string, value: string): string {
		return this[Storage].set(key, value);
	}

	/** Fachada pública para o `[Storage]`, que é protegido. */
	public recall(key: string): string | null {
		return this[Storage].get(key);
	}
}

const authorProperties = {
	name: StringVO,
};

// biome-ignore lint/correctness/noUnusedVariables: o merge com a classe abaixo é o uso.
interface Author extends AccessorsOf<typeof authorProperties> {}
class Author extends Entity<typeof authorProperties> {
	protected defineEntity(): EntityDefinition<typeof authorProperties> {
		return { properties: authorProperties, source: "author" };
	}
}

const postProperties = {
	title: StringVO,
	author: Author,
};

// biome-ignore lint/correctness/noUnusedVariables: o merge com a classe abaixo é o uso.
interface Post extends AccessorsOf<typeof postProperties> {}
class Post extends Entity<typeof postProperties> {
	protected defineEntity(): EntityDefinition<typeof postProperties> {
		return { properties: postProperties, source: "post" };
	}
}

const tagProperties = {
	label: StringVO,
};

/** Prova que `defineEntity` não tira da subclasse o direito a um construtor próprio. */
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

/** Subclasse com class field — só funciona porque a base constrói via `Reflect.construct`. */
// biome-ignore lint/correctness/noUnusedVariables: o merge com a classe abaixo é o uso.
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
			const tag = new Tag("lançamento");

			expect(tag.get("label")).toBe("lançamento");
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
			// O tipo já recusa cada um destes (ver o bloco de `@ts-expect-error`
			// abaixo); o cast reproduz o que um consumidor de JavaScript puro
			// conseguiria fazer.
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
					// A classe não tem slot `property` — a identidade é uma unidade
					// só, e é a unidade inteira que está incompleta —, então a chave
					// que faltou sobrevive apenas na mensagem.
					expect((error as IncompleteIdentityException).message).toContain(
						`"${missing}" is missing`,
					);
					expect((error as IncompleteIdentityException).source).toBe("bean");
				}
			}
		});

		it("refuses a half-given identity at compile time", () => {
			const domain = { name: "alan", slug: "hello-world" };

			// @ts-expect-error — `id` sozinho não basta: `createdAt` é inseparável.
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
			// O schema é lido do `defineMeta` da classe, sem construir VO nenhum,
			// então um default inválido não contamina a derivação — só o modo demo.
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
			// O tipo de `Key` já exclui as chaves base; o cast reproduz o que um
			// consumidor de JavaScript puro conseguiria fazer.
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
				untyped.set("inexistente", "whatever");
				expect.unreachable("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidPropertyException);
				expect((error as InvalidPropertyException).property).toBe(
					"inexistente",
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

			// `StringVO` aceita qualquer string, `""` inclusive — o que a recusa
			// aqui é o tipo, o caso real de um payload vindo de fora do TS.
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
			// O tipo de `Key` já recusa; o cast reproduz um consumidor de JS puro.
			const untyped = bean as unknown as { get(key: string): unknown };

			try {
				untyped.get("inexistente");
				expect.unreachable("should have thrown");
			} catch (error) {
				expect(error).toBeInstanceOf(InvalidPropertyException);
				expect((error as InvalidPropertyException).property).toBe(
					"inexistente",
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

			// A instalação é atômica: uma tentativa recusada não pode marcar o
			// protótipo como já instalado e deixar a seguinte passar calada.
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
			// `Tag` só aceita string ou contexto — o contrato é repassar ao `super`
			// o que não reconhecer, e é isso que mantém demo/fromJSON funcionando.
			const serialized = new Tag("lançamento").toJSON();

			expect(Tag.demo().get("label")).toBe("string");
			expect(Tag.fromJSON(serialized).get("label")).toBe("lançamento");
		});
	});

	describe("blueprint cycles", () => {
		it("rejects a self-referencing blueprint instead of overflowing", () => {
			// O `const` vem depois da classe de propósito: é a única ordem em que
			// um blueprint auto-referente chega a existir (antes dela, TDZ).
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

			// `fromJSON` deriva o schema *antes* de construir, então é o caminho
			// que exercita a guarda da derivação, e não a da construção.
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
					// O blueprint da subclasse é mais largo que o do pai, e o tipo do
					// pai não tem como expressar isso — o cast reproduz o que um
					// consumidor de JavaScript puro conseguiria fazer.
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

			bean.remember("name", "não é o campo name");

			expect(bean.name).toBe("alan");
			expect(bean.recall("name")).toBe("não é o campo name");
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
	});
});
