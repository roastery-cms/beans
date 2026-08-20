import { t } from "@roastery/terroir";
import { defineValueObject } from "./define-value-object";
import type { ICustomValueObjectArgs, ValueObjectClassOf } from "./types";

/** Placeholder default: the empty record, valid under any key/value pair. */
const RECORD_PLACEHOLDER: Record<string, unknown> = {};

/**
 * Builds a free-form object `ValueObject` **class** — the "object *without* a
 * schema" case, for a bag whose keys are not known ahead of time (arbitrary
 * metadata, a settings blob, a third-party payload kept verbatim).
 *
 * The schema is `t.Record(t.String(), t.Unknown())`, so any string key with any
 * value passes. That is deliberately permissive: the moment the keys *are*
 * known, `customObjectVO` says so in the schema and gets the checking for free.
 *
 * **Call it at module scope, once** — see `defineValueObject` for why.
 *
 * @typeParam Sensitive - Literal `true` when `sensitive: true` is passed;
 *   inferred from the argument, and what suppresses the key's `findBy`/
 *   `findManyBy` methods in a `RepositoryOf` built over a blueprint holding
 *   the generated class.
 * @param args - Object options, demo-mode default, and behaviour hooks.
 * @returns The generated record value-object class.
 *
 * @throws `InvalidEntityDefinitionException` — when the default (declared or
 *   placeholder `{}`) does not pass the resulting schema; only a constraint
 *   like `minProperties` makes that possible.
 *
 * @see {@link defineValueObject} — the core this lowers into.
 * @see `customObjectVO` — the counterpart for a known shape.
 *
 * @example
 * ```ts
 * const Metadata = customRecordVO({ name: "Metadata" });
 *
 * const postProperties = { metadata: Metadata };
 * new Post({ title: "Hi", metadata: { featured: true, weight: 3 } });
 * ```
 */
export function customRecordVO<Sensitive extends boolean = false>(
	args: ICustomValueObjectArgs<
		Record<string, unknown>,
		t.ObjectOptions,
		Sensitive
	> = {},
): ValueObjectClassOf<
	Record<string, unknown>,
	t.TRecord<t.TString, t.TUnknown>,
	Sensitive
> {
	const { default: fallback = RECORD_PLACEHOLDER, options, ...hooks } = args;

	return defineValueObject({
		...hooks,
		default: fallback,
		schema: t.Record(t.String(), t.Unknown(), options),
	});
}
