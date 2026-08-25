import { deepEquals } from "@/domain/entity/helpers/deep-equals";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import type { t } from "@roastery/terroir";
import { readMeta } from "./helpers/read-meta";
import { resolveDefault } from "./helpers/resolve-default";
import type { IValueObjectContext, IValueObjectMetadata } from "./types";
import { Context, Demo, Meta } from "@roastery/terroir/symbols";
import { SchemaManager } from "@roastery/terroir/schema";

/**
 * Immutable, self-validating base for domain values.
 *
 * The subclass declares **only** `defineMeta()` — the schema that validates
 * the value and the demo-mode default. Constructor, validation and demo mode
 * come from the base:
 *
 * ```ts
 * class Note extends ValueObject<string, typeof StringSchema> {
 *   protected defineMeta(): IValueObjectMetadata<string, typeof StringSchema> {
 *     return { default: "note", schema: StringSchema };
 *   }
 * }
 *
 * new Note("ground this morning", { name: "note", source: "bean" });
 * Note.demo({ name: "note", source: "bean" });
 * ```
 *
 * Override {@link ValueObject.transform} when the value needs normalising
 * before validation (e.g. `slugify`).
 *
 * @typeParam ValueType - Runtime type of the value the VO wraps.
 * @typeParam SchemaType - TypeBox schema type validating `ValueType`.
 * @typeParam Sensitive - `true` when the class declares itself sensitive. Pass
 *   it alongside `sensitive: true` in `defineMeta` — the literal travels into
 *   the public `[Meta]` slot, which is what lets `RepositoryOf` suppress the
 *   key's `findBy`/`findManyBy` methods. Defaults to `false`, so declaring
 *   `sensitive: true` without it is a compile error rather than a no-op.
 *
 * @see `metaOf` in `@/domain/value-object/helpers` — reads the class metadata without
 *   constructing an instance.
 * @see {@link IValueObjectMetadata} — the `{ default, schema }` that `defineMeta` returns.
 */
export abstract class ValueObject<
	ValueType,
	SchemaType extends t.TSchema,
	Sensitive extends boolean = false,
> {
	/** The wrapped value, already normalised by {@link ValueObject.transform} and validated. */
	public readonly value: ValueType;

	/** The class's schema and default, obtained from {@link ValueObject.defineMeta} at construction. */
	public readonly [Meta]: IValueObjectMetadata<
		ValueType,
		SchemaType,
		Sensitive
	>;

	/** Whose value this is: `{ name, source }`, used in error messages. */
	public readonly [Context]: IValueObjectContext;

	/**
	 * Declares what the class **is**: the schema that validates its values and
	 * the default demo mode uses.
	 *
	 * **Must be a prototype method, never a class field** — the base invokes it
	 * inside the constructor, before any field initializer runs. And it must be
	 * **pure**: `metaOf` calls it on a probe created without running any
	 * constructor.
	 *
	 * @returns The class's metadata.
	 */
	protected abstract defineMeta(): IValueObjectMetadata<
		ValueType,
		SchemaType,
		Sensitive
	>;

	/**
	 * @param value - The raw value. Goes through `transform` and then validation.
	 * @param context - `{ name, source }` — whose value this is, for the error message.
	 *
	 * @throws `InvalidPropertyException` — when the value fails `meta.schema`.
	 * @throws `InvalidEntityDefinitionException` — when `defineMeta` is not a
	 *   prototype method.
	 */
	public constructor(value: ValueType, context: IValueObjectContext) {
		this[Context] = context;
		this[Meta] = readMeta<ValueType, SchemaType, Sensitive>(
			this,
			context.source,
		);

		this.value =
			(value as unknown) === Demo
				? resolveDefault(this[Meta].default)
				: this.transform(value);

		this.validate();
	}

	/**
	 * Builds the VO with the class's own `meta.default` instead of a given
	 * value. The entry point without data, mirroring `Entity.demo()`.
	 *
	 * @param context - `{ name, source }` — whose value this is.
	 * @returns An instance of the subclass the call was made on.
	 *
	 * @throws `InvalidPropertyException` — when the default itself fails
	 *   `meta.model`. The default is validated like any other value.
	 */
	public static demo<
		Self extends { readonly prototype: { readonly value: unknown } },
	>(this: Self, context: IValueObjectContext): Self["prototype"] {
		// biome-ignore lint/complexity/noThisInStatic: `this` is the concrete subclass the call was made on; replacing it with `ValueObject` would construct the abstract base.
		return Reflect.construct(this as never, [
			Demo,
			context,
		]) as Self["prototype"];
	}

	/** @returns The class's schema serialized as a JSON string. */
	public get schema(): string {
		return SchemaManager.serialize(this[Meta].schema);
	}

	/**
	 * Whether another value is **the same value of the same kind** — a
	 * value-object has no identity, so this is the only equality it has.
	 *
	 * The type check is the class itself, by exact prototype rather than by
	 * `instanceof`, which keeps the relation symmetric: `EmailVO` and a
	 * `UserEmail extends EmailVO` holding the same string are two kinds and are
	 * not equal, in **both** directions. The corollary is the rule that already
	 * governs putting a generated class in a blueprint — call a factory like
	 * `customStringVO()` once, at module scope. Two calls with identical
	 * arguments mint two classes, and instances of them are never equal.
	 *
	 * The value is compared with `deepEquals`, not `===`: a `customObjectVO` or
	 * a `customArrayVO` wraps a structure, and two structurally identical ones
	 * are the same value.
	 *
	 * It compares the **real** value, never the redacted one, so a class
	 * declaring `sensitive: true` compares correctly — it is `toSafeJSON` that
	 * loses the information, not this. Nothing is revealed either way: the
	 * answer is one boolean.
	 *
	 * @param other - Anything. A non-object, a `null` or an instance of another
	 *   class is simply not equal.
	 * @returns `true` when `other` is an instance of the exact same class
	 *   holding a structurally identical value.
	 *
	 * @example
	 * ```ts
	 * const context = { name: "email", source: "user" };
	 *
	 * new EmailVO("a@b.c", context).equals(new EmailVO("a@b.c", context)); // true
	 * new EmailVO("a@b.c", context).equals(new EmailVO("d@e.f", context)); // false
	 * new EmailVO("a@b.c", context).equals(new UserEmail("a@b.c", context)); // false
	 * ```
	 *
	 * @see `Entity.equals` in `@/domain/entity/entity` — the same question one
	 *   pillar up, answered by identity instead.
	 */
	public equals(other: unknown): boolean {
		if ((this as unknown) === other) return true;

		if (other === null || typeof other !== "object") return false;

		if (Object.getPrototypeOf(this) !== Object.getPrototypeOf(other))
			return false;

		return deepEquals(this.value, (other as { readonly value: unknown }).value);
	}

	/**
	 * Normalises the value before validation. The base returns it untouched;
	 * override when the class has a canonical form (e.g. `slugify`). Not
	 * applied to `meta.default` — declare defaults already in canonical form.
	 *
	 * @param value - The raw value received by the constructor.
	 * @returns The normalised value, which will be validated and stored.
	 */
	protected transform(value: ValueType): ValueType {
		return value;
	}

	/**
	 * Runs the schema against the value and throws when it does not match.
	 *
	 * @throws `InvalidPropertyException` — carrying the context's `name` and
	 *   `source`, so the caller can locate which field of which entity failed.
	 */
	protected validate(): void {
		if (!SchemaManager.match(this[Meta].schema, this.value))
			throw new InvalidPropertyException(
				this[Context].name,
				this[Context].source,
			);
	}
}
