import { ValueObject } from "@/value-object";
import type { IValueObjectMetadata } from "@/value-object/types";
import {
	InvalidEntityDefinitionException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import { SchemaManager } from "@roastery/terroir/schema";
import { Context } from "@roastery/terroir/symbols";
import type { t } from "@roastery/terroir";
import type { IDefineValueObjectArgs, ValueObjectClassOf } from "./types";

/** Fallback `source` for the eager-default exception when no `name` was given. */
const ANONYMOUS_SOURCE = "value-object";

/**
 * Builds a `ValueObject` **class** from a schema and a set of hooks — the core
 * every custom value-object factory lowers into.
 *
 * It exists so a domain constraint that fits on one line does not need a whole
 * subclass. The result is an ordinary `ValueObject` subclass: it satisfies the
 * blueprint contract, `metaOf` reads it, `demo()` builds it, and `Entity`
 * derives its schema from it, all through the same structural machinery that
 * handles a hand-written class.
 *
 * **Call this at module scope, once.** Every call mints a fresh schema object
 * and a fresh class. `SchemaManager` caches compiled validators against the
 * schema's object identity and `Entity` memoises aggregate models against the
 * blueprint object, so a factory called inside `defineEntity()` or
 * `defineMeta()` recompiles on every construction. Nothing fails and nothing
 * warns — it is only slow. A corollary: two calls with identical arguments
 * produce two *different* classes, so `instanceof` does not relate them.
 *
 * @typeParam ValueType - Runtime type of the value the generated VO wraps.
 * @typeParam SchemaType - TypeBox schema type validating `ValueType`.
 *
 * @param args - The schema, the demo-mode default, and the optional hooks.
 * @returns The generated `ValueObject` subclass, ready for a blueprint.
 *
 * @throws `InvalidEntityDefinitionException` — when `args.default` is a ready
 *   value that does not pass `args.schema`. Thunk defaults are not checked
 *   here; the base validates them at demo time.
 *
 * @see {@link ValueObjectClassOf} — the returned shape.
 * @see `customStringVO`, `customNumberVO`, `customObjectVO`, `customRecordVO`,
 *   `customArrayVO` — the sugar factories built on this one.
 *
 * @example
 * ```ts
 * const CompanyEmail = defineValueObject({
 * 	schema: EmailSchema,
 * 	default: "alan@roastery.dev",
 * 	name: "CompanyEmail",
 * 	transform: (value) => value.trim().toLowerCase(),
 * 	validate: (value) => value.endsWith("@roastery.dev"),
 * });
 *
 * const staffProperties = { email: CompanyEmail };
 * ```
 */
export function defineValueObject<ValueType, SchemaType extends t.TSchema>({
	default: fallback,
	name,
	schema,
	transform,
	validate,
}: IDefineValueObjectArgs<ValueType, SchemaType>): ValueObjectClassOf<
	ValueType,
	SchemaType
> {
	// Built once, in the closure: `defineMeta()` runs on every construction, so
	// a literal declared inside the class body would allocate per instance and
	// hand `SchemaManager` a new cache key each time.
	const meta: IValueObjectMetadata<ValueType, SchemaType> = {
		default: fallback,
		schema,
	};

	if (typeof fallback !== "function" && !SchemaManager.match(schema, fallback))
		throw new InvalidEntityDefinitionException(
			name ?? ANONYMOUS_SOURCE,
			"Custom value-object: the declared default does not pass the declared schema. The base validates the default like any other value, so demo mode — and every entity whose blueprint includes this class — would fail on it.",
		);

	class CustomValueObject extends ValueObject<ValueType, SchemaType> {
		/** @returns The schema and default captured by the factory call. */
		protected defineMeta(): IValueObjectMetadata<ValueType, SchemaType> {
			return meta;
		}

		/**
		 * Delegates to the `transform` hook, if one was given.
		 *
		 * @param value - The raw value received by the constructor.
		 * @returns The normalised value, which will be validated and stored.
		 */
		protected override transform(value: ValueType): ValueType {
			return transform ? transform(value) : value;
		}

		/**
		 * Runs the schema first, then the `validate` hook over the value it
		 * accepted — so the hook only ever sees transformed, schema-valid input.
		 *
		 * @throws `InvalidPropertyException` — when the schema rejects the value,
		 *   or when the hook returns `false`.
		 */
		protected override validate(): void {
			super.validate();

			if (validate && !validate(this.value, this[Context]))
				throw new InvalidPropertyException(
					this[Context].name,
					this[Context].source,
				);
		}
	}

	if (name)
		Object.defineProperty(CustomValueObject, "name", {
			configurable: true,
			value: name,
		});

	// The cast covers `demo` alone. The base declares it generic over `this`
	// (`Self extends { prototype: { value: unknown } }`), so assignability
	// instantiates `Self` at that constraint and the return type collapses to
	// `{ value: unknown }` — narrower than what the call actually produces.
	// Everything else on the class matches `ValueObjectClassOf` structurally.
	return CustomValueObject as ValueObjectClassOf<ValueType, SchemaType>;
}
