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
 *
 * @see `metaOf` in `@/domain/value-object/helpers` — reads the class metadata without
 *   constructing an instance.
 * @see {@link IValueObjectMetadata} — the `{ default, schema }` that `defineMeta` returns.
 */
export abstract class ValueObject<ValueType, SchemaType extends t.TSchema> {
	/** The wrapped value, already normalised by {@link ValueObject.transform} and validated. */
	public readonly value: ValueType;

	/** The class's schema and default, obtained from {@link ValueObject.defineMeta} at construction. */
	public readonly [Meta]: IValueObjectMetadata<ValueType, SchemaType>;

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
	protected abstract defineMeta(): IValueObjectMetadata<ValueType, SchemaType>;

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
		this[Meta] = readMeta<ValueType, SchemaType>(this, context.source);

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
