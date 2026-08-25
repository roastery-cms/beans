import { beforeEach, describe, expect, it } from "bun:test";
import { IntegerVO, StringVO } from "@/domain/collections/value-objects";
import { customStringVO } from "@/domain/collections/value-objects/custom";
import { OptionalStringVO } from "@/domain/collections/value-objects/optional";
import { defineDomainEvent } from "@/domain/domain-event";
import { blueprint, entityOf } from "@/domain/entity/helpers";
import { arrayOf } from "@/domain/wrapper/helpers";
import {
	CyclicEntityDefinitionException,
	InvalidDomainDataException,
	InvalidEntityDefinitionException,
	InvalidPropertyException,
	PropertyNameCollisionException,
} from "@roastery/terroir/exceptions/domain";
import { Properties } from "@roastery/terroir/symbols";
import { recordOf } from "./helpers";
import { BoundRecord, DomainRecord } from "./record";
import type {
	RecordAccessorsOf,
	RecordDefinition,
	RecordSetHandlersOf,
} from "./types";

const SecretVO = customStringVO({ name: "SecretVO", sensitive: true });

const moneyProperties = { amount: IntegerVO, currency: StringVO };

// biome-ignore lint/correctness/noUnusedVariables: merging with the class below is the use.
interface Money extends RecordAccessorsOf<typeof moneyProperties> {}
class Money extends DomainRecord<typeof moneyProperties> {
	protected defineRecord(): RecordDefinition<typeof moneyProperties> {
		return { properties: moneyProperties, source: "money" };
	}

	public add(cents: number): boolean {
		return this.set("amount", this.amount + cents);
	}
}

class Card extends recordOf({ label: StringVO, secret: SecretVO }, "card") {
	public rename(label: string): boolean {
		return this.set("label", label);
	}
}

describe("DomainRecord", () => {
	describe("construction", () => {
		it("builds from a raw payload and exposes typed accessors", () => {
			const money = new Money({ amount: 100, currency: "BRL" });

			expect(money.amount).toBe(100);
			expect(money.currency).toBe("BRL");
		});

		it("carries no identity of any kind", () => {
			const money = new Money({ amount: 1, currency: "BRL" });
			const serialized = money.toJSON() as Record<string, unknown>;

			expect(serialized).not.toHaveProperty("id");
			expect(serialized).not.toHaveProperty("createdAt");
			expect(serialized).not.toHaveProperty("updatedAt");
			expect((money as unknown as { id?: unknown }).id).toBeUndefined();
		});

		it("rejects an identity field as a blueprint key", () => {
			class Bad extends recordOf({ id: StringVO }, "bad") {}

			expect(() => new Bad({ id: "x" })).toThrow(
				PropertyNameCollisionException,
			);
		});

		it("rejects a defineRecord declared as a class field", () => {
			class Bad extends DomainRecord<typeof moneyProperties> {
				protected defineRecord = (): RecordDefinition<
					typeof moneyProperties
				> => ({ properties: moneyProperties, source: "bad" });
			}

			expect(() => new Bad({ amount: 1, currency: "BRL" })).toThrow(
				InvalidEntityDefinitionException,
			);
		});

		it("detects a blueprint cycle instead of overflowing the stack", () => {
			const cyclic: Record<string, unknown> = {};
			class Node extends DomainRecord<Record<string, never>> {
				protected defineRecord(): RecordDefinition<Record<string, never>> {
					return {
						properties: cyclic as Record<string, never>,
						source: "node",
					};
				}
			}
			cyclic.child = Node;

			expect(() => new Node({})).toThrow(CyclicEntityDefinitionException);
		});
	});

	describe("blueprint rules", () => {
		const ruled = blueprint({ name: StringVO, label: StringVO }).with({
			label: { derive: (raw) => `${raw.name}!` },
		});

		class Tag extends recordOf(ruled, "tag") {}

		it("resolves a derive from an already-built sibling", () => {
			expect(new Tag({ name: "alan" }).label).toBe("alan!");
		});

		it("still resolves rules in demo mode", () => {
			expect(Tag.demo().label).toBe(`${Tag.demo().name}!`);
		});
	});

	describe("mutation", () => {
		it("changes state only through the subclass's own verbs", () => {
			const money = new Money({ amount: 100, currency: "BRL" });

			expect(money.add(50)).toBe(true);
			expect(money.amount).toBe(150);
		});

		it("reports no change when the value matches", () => {
			const money = new Money({ amount: 100, currency: "BRL" });

			expect(money.add(0)).toBe(false);
		});

		it("leaves the record untouched when a value fails validation", () => {
			const card = new Card({ label: "one", secret: "s" });

			expect(() =>
				(
					card as unknown as {
						setMany(values: Record<string, unknown>): boolean;
					}
				).setMany({ label: 42, secret: "ok" }),
			).toThrow();

			expect(card.label).toBe("one");
			expect(card.secret).toBe("s");
		});

		it("rejects a key outside the blueprint", () => {
			const money = new Money({ amount: 1, currency: "BRL" });

			expect(() =>
				(
					money as unknown as {
						setMany(values: Record<string, unknown>): boolean;
					}
				).setMany({ nope: 1 }),
			).toThrow(InvalidPropertyException);
		});
	});

	describe("reading", () => {
		it("rejects an unknown key", () => {
			const money = new Money({ amount: 1, currency: "BRL" });

			expect(() =>
				(money as unknown as { get(key: string): unknown }).get("nope"),
			).toThrow(InvalidPropertyException);
		});

		it("reports a declared sensitive key", () => {
			const card = new Card({ label: "l", secret: "s" });

			expect(card.isSensitive("secret")).toBe(true);
			expect(card.isSensitive("label")).toBe(false);
		});
	});

	describe("serialization", () => {
		it("never redacts in toJSON, so it round-trips", () => {
			const card = new Card({ label: "l", secret: "s" });
			const raw = card.toJSON();

			expect(raw.secret).toBe("s");
			expect(Card.fromJSON(raw).secret).toBe("s");
		});

		it("redacts in toSafeJSON and toString", () => {
			const card = new Card({ label: "l", secret: "s" });

			expect(card.toSafeJSON().secret).not.toBe("s");
			expect(card.toString()).not.toContain('"s"');
		});

		it("rejects a payload with a missing key", () => {
			expect(() =>
				Money.fromJSON({ amount: 1 } as unknown as ReturnType<Money["toJSON"]>),
			).toThrow(InvalidDomainDataException);
		});

		it("rejects a payload with an extra key", () => {
			expect(() =>
				Money.fromJSON({
					amount: 1,
					currency: "BRL",
					extra: true,
				} as unknown as ReturnType<Money["toJSON"]>),
			).toThrow(InvalidDomainDataException);
		});

		it("omits an undefined-accepting key after a real round-trip", () => {
			class Draft extends recordOf({ note: OptionalStringVO }, "draft") {}
			const raw = JSON.parse(
				JSON.stringify(new Draft({}).toJSON()),
			) as ReturnType<Draft["toJSON"]>;

			expect(Draft.fromJSON(raw).note).toBeUndefined();
		});
	});

	describe("demo", () => {
		it("builds an instance of the subclass, not the base", () => {
			expect(Money.demo()).toBeInstanceOf(Money);
		});
	});

	describe("nesting", () => {
		const NoteAdded = defineDomainEvent("NoteAdded");

		class Note extends entityOf({ text: StringVO }, "note") {
			public rewrite(text: string): void {
				this.set("text", text);
				this.raiseEvent(NoteAdded);
			}
		}

		class Wallet extends recordOf({ money: Money, note: Note }, "wallet") {}
		class Post extends entityOf({ title: StringVO, wallet: Wallet }, "post") {}

		it("adopts an already-built entity instead of rebuilding it", () => {
			const note = new Note({ text: "n" });

			note.rewrite("rewritten");

			const wallet = new Wallet({
				money: { amount: 1, currency: "BRL" },
				note,
			});

			expect(wallet.note).toBe(note);
			expect(
				wallet.pullDomainEvents({ deep: true }).map((event) => event.name),
			).toEqual(["NoteAdded"]);
		});

		it("returns the nested instance, so verbs chain", () => {
			const post = new Post({
				title: "hi",
				wallet: { money: { amount: 1, currency: "BRL" }, note: { text: "n" } },
			});

			expect(post.wallet).toBeInstanceOf(Wallet);
			post.wallet.money.add(9);
			expect(post.wallet.money.amount).toBe(10);
		});

		it("round-trips a three-level aggregate", () => {
			const post = new Post({
				title: "hi",
				wallet: { money: { amount: 1, currency: "BRL" }, note: { text: "n" } },
			});
			const raw = JSON.parse(JSON.stringify(post.toJSON())) as Parameters<
				typeof Post.fromJSON
			>[0];

			expect(Post.fromJSON(raw).toJSON()).toEqual(post.toJSON());
		});

		it("gives the record no identity but the entity behind it one", () => {
			const wallet = Wallet.demo();
			const schema = wallet.schema.properties as Record<
				string,
				{ properties?: Record<string, unknown> }
			>;

			expect(Object.keys(wallet.schema.properties).sort()).toEqual([
				"money",
				"note",
			]);
			expect(Object.keys(schema.note?.properties ?? {})).toContain("id");
		});

		it("drains an entity buried behind a record", () => {
			const post = new Post({
				title: "hi",
				wallet: { money: { amount: 1, currency: "BRL" }, note: { text: "n" } },
			});

			post.wallet.note.rewrite("changed");

			expect(post.pullDomainEvents({ deep: false })).toHaveLength(0);

			const deep = post.pullDomainEvents();

			expect(deep).toHaveLength(1);
			expect(deep[0]?.name).toBe("NoteAdded");
			expect(deep[0]?.aggregateId).toBe(post.wallet.note.id);
		});

		it("returns nothing from the record's own buffer, which it has not got", () => {
			expect(Wallet.demo().pullDomainEvents({ deep: false })).toHaveLength(0);
		});

		it("detects a cycle that alternates pillars", () => {
			const entityShape: Record<string, unknown> = {};
			const recordShape: Record<string, unknown> = {};

			class Alternating extends entityOf(
				entityShape as Record<string, never>,
				"alternating",
			) {}
			class Bridge extends recordOf(
				recordShape as Record<string, never>,
				"bridge",
			) {}

			entityShape.bridge = Bridge;
			recordShape.back = Alternating;

			expect(() => Alternating.demo()).toThrow(CyclicEntityDefinitionException);
		});
	});

	describe("recordOf", () => {
		it("stamps the blueprint onto the generated class", () => {
			expect(Card.demo()[Properties]).toBeDefined();
		});

		it("explains itself when a bound base carries no definition", () => {
			// Extending `BoundRecord` directly is the one way to reach the bound
			// base without a factory having stamped a definition on the class.
			class Orphan extends BoundRecord<typeof moneyProperties> {}

			expect(() => new Orphan({ amount: 1, currency: "BRL" })).toThrow(
				InvalidEntityDefinitionException,
			);
		});
	});
	describe("onSet", () => {
		const guardedProperties = { amount: IntegerVO, currency: StringVO };

		const calls: { key: string; value: unknown; raw: unknown }[] = [];

		class Guarded extends recordOf(guardedProperties, "guarded") {
			protected override onSet(): RecordSetHandlersOf<
				typeof guardedProperties
			> {
				return {
					amount: (value, raw) => {
						calls.push({ key: "amount", value, raw: { ...raw } });

						if (value < 0)
							throw new InvalidPropertyException("amount", "guarded");
					},
				};
			}

			public credit(amount: number): boolean {
				return this.set("amount", amount);
			}
		}

		beforeEach(() => {
			calls.length = 0;
		});

		it("runs the handler on construction, with the raw payload value", () => {
			new Guarded({ amount: 100, currency: "BRL" });

			expect(calls).toEqual([
				{
					key: "amount",
					value: 100,
					raw: { amount: 100, currency: "BRL" },
				},
			]);
		});

		it("rejects a construction its handler refuses", () => {
			expect(() => new Guarded({ amount: -1, currency: "BRL" })).toThrow(
				InvalidPropertyException,
			);
		});

		it("fires on mutation, with the current values under the batch", () => {
			const guarded = new Guarded({ amount: 100, currency: "BRL" });

			calls.length = 0;

			guarded.credit(250);

			expect(calls[0]).toEqual({
				key: "amount",
				value: 250,
				raw: { amount: 250, currency: "BRL" },
			});
		});

		it("leaves the record untouched when the handler throws", () => {
			const guarded = new Guarded({ amount: 100, currency: "BRL" });

			expect(() => guarded.credit(-1)).toThrow(InvalidPropertyException);

			expect(guarded.toJSON()).toEqual({ amount: 100, currency: "BRL" });
		});

		/**
		 * The detectable half of the class-field trap — the constructor cannot
		 * see the field yet, so the guard fires on the first mutation instead of
		 * letting the rule stay silently dead. See `readSetHandlers`.
		 */
		it("rejects an onSet declared as a class field, on the first mutation", () => {
			class BadOnSet extends DomainRecord<typeof moneyProperties> {
				protected override onSet = (): RecordSetHandlersOf<
					typeof moneyProperties
				> => ({});

				protected defineRecord(): RecordDefinition<typeof moneyProperties> {
					return { properties: moneyProperties, source: "bad-on-set" };
				}

				public credit(amount: number): boolean {
					return this.set("amount", amount);
				}
			}

			const bad = new BadOnSet({ amount: 1, currency: "BRL" });

			expect(() => bad.credit(2)).toThrow(InvalidEntityDefinitionException);
		});
	});

	describe("equals", () => {
		class Tag extends recordOf({ label: StringVO }, "tag") {}
		class Basket extends recordOf({ tags: arrayOf(Tag) }, "basket") {}
		class Owner extends entityOf({ name: StringVO }, "owner") {}
		class Purse extends recordOf({ money: Money, owner: Owner }, "purse") {}

		it("is true for the same class holding the same values", () => {
			expect(
				new Money({ amount: 500, currency: "BRL" }).equals(
					new Money({ amount: 500, currency: "BRL" }),
				),
			).toBe(true);
		});

		it("is false when any single key differs", () => {
			const price = new Money({ amount: 500, currency: "BRL" });

			expect(price.equals(new Money({ amount: 500, currency: "USD" }))).toBe(
				false,
			);
			expect(price.equals(new Money({ amount: 900, currency: "BRL" }))).toBe(
				false,
			);
		});

		it("follows a mutation", () => {
			const price = new Money({ amount: 500, currency: "BRL" });
			const other = new Money({ amount: 500, currency: "BRL" });

			expect(price.add(0)).toBe(false);
			expect(price.equals(other)).toBe(true);

			price.add(100);

			expect(price.equals(other)).toBe(false);
		});

		it("recurses into a nested record", () => {
			const one = new Purse({
				money: { amount: 1, currency: "BRL" },
				owner: { name: "alan" },
			});
			const raw = one.toJSON();

			expect(
				Purse.fromJSON(raw).equals(
					Purse.fromJSON({ ...raw, money: { amount: 2, currency: "BRL" } }),
				),
			).toBe(false);
		});

		/** Same rule as `Entity.sameStateAs`: what a record holds is the entity's identity. */
		it("compares a nested entity by its id, not by its state", () => {
			const raw = new Purse({
				money: { amount: 1, currency: "BRL" },
				owner: { name: "alan" },
			}).toJSON();

			expect(
				Purse.fromJSON(raw).equals(
					Purse.fromJSON({ ...raw, owner: { ...raw.owner, name: "outro" } }),
				),
			).toBe(true);
		});

		it("goes through a wrapped key item by item, in order", () => {
			const one = new Basket({ tags: [{ label: "a" }, { label: "b" }] });

			expect(
				one.equals(new Basket({ tags: [{ label: "a" }, { label: "b" }] })),
			).toBe(true);
			expect(
				one.equals(new Basket({ tags: [{ label: "b" }, { label: "a" }] })),
			).toBe(false);
			expect(one.equals(new Basket({ tags: [{ label: "a" }] }))).toBe(false);
		});

		it("is false for a subclass, in both directions", () => {
			class Cents extends Money {}

			const base = new Money({ amount: 1, currency: "BRL" });
			const derived = new Cents({ amount: 1, currency: "BRL" });

			expect(base.equals(derived)).toBe(false);
			expect(derived.equals(base)).toBe(false);
		});

		/**
		 * The trap the whole package already states about blueprints, pinned
		 * here: two `recordOf` calls with identical arguments are two classes,
		 * and instances of them are never equal. Mint the class once.
		 */
		it("is false across two separate recordOf calls with identical arguments", () => {
			class One extends recordOf({ label: StringVO }, "same") {}
			class Two extends recordOf({ label: StringVO }, "same") {}

			expect(new One({ label: "x" }).equals(new Two({ label: "x" }))).toBe(
				false,
			);
		});

		it("is false for anything that is not a record", () => {
			const price = new Money({ amount: 1, currency: "BRL" });

			expect(price.equals(null)).toBe(false);
			expect(price.equals(undefined)).toBe(false);
			expect(price.equals(price.toJSON())).toBe(false);
			expect(price.equals(price)).toBe(true);
		});

		it("compares the real value of a sensitive key", () => {
			expect(
				new Card({ label: "l", secret: "hunter2" }).equals(
					new Card({ label: "l", secret: "hunter3" }),
				),
			).toBe(false);
		});

		it("rejects a blueprint key called equals", () => {
			class Bad extends recordOf({ equals: StringVO }, "bad-equals") {}

			expect(() => new Bad({ equals: "boom" })).toThrow(
				PropertyNameCollisionException,
			);
		});
	});
});
