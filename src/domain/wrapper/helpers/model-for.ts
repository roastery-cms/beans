import type { AnyValueObjectClass } from "@/domain/entity/types/any-value-object-class.type";
import { modelFor as entityModelFor } from "@/domain/entity/helpers/model-for";
import { modelOfValueObject } from "@/domain/entity/helpers/model-of-value-object";
import { definitionOf as entityDefinitionOf } from "@/domain/entity/helpers/read-definition";
import { modelFor as recordModelFor } from "@/domain/record/helpers/model-for";
import { definitionOf as recordDefinitionOf } from "@/domain/record/helpers/read-definition";
import { isEntityClass } from "@/shared/helpers/is-entity-class";
import { isRecordClass } from "@/shared/helpers/is-record-class";
import { t } from "@roastery/terroir";
import type { AnyWrapperClass } from "../types/any-wrapper-class.type";

/**
 * Derives the schema of a wrapper class: the inner class's own schema under
 * the declared multiplicity — `t.Array(inner)` for `arrayOf`,
 * `t.Union([inner, t.Undefined()])` for `optionalOf`, `t.Union([inner,
 * t.Null()])` for `nullableOf`.
 *
 * The `optional` form needs no special handling at the call sites: the
 * resulting schema accepts `undefined`, so each pillar's existing
 * `acceptsUndefined(model) ? t.Optional(model) : model` line emits the key as
 * optional on its own — the same way it already does for an `optionalVO`
 * property.
 *
 * **This module must stay class-free.** It imports both pillars' `modelFor`
 * and is imported back by both, forming the same mutual cycle
 * `domain/entity/helpers/model-for` and `domain/record/helpers/model-for`
 * already form with each other — safe for exactly the same reason: no class is
 * evaluated anywhere in the cycle, so the functions only reach each other at
 * call time, never during module evaluation. Reaching for `defineWrapper` (or
 * for `Entity`, or `DomainRecord`) from here would put a `class X extends Y`
 * inside it and reintroduce `ReferenceError: … before initialization`.
 *
 * Memoization is left to the two pillars: the inner schema each branch reads
 * is already memoized per blueprint object, and the wrapping call is a single
 * `t.Array`/`t.Union` on top of it.
 *
 * @param wrapperClass - The wrapper class to derive from.
 * @returns The derived schema.
 *
 * @throws `CyclicEntityDefinitionException` — when the wrapped blueprint
 *   references itself, directly or through the wrapper.
 *
 * @see `modelFor` in `@/domain/entity/helpers/model-for` — one of the two
 *   halves of the cycle this function sits in.
 */
export function wrapperModelFor(wrapperClass: AnyWrapperClass): t.TSchema {
	const inner = wrapperClass.wraps as unknown;

	let model: t.TSchema;

	if (isEntityClass(inner)) {
		const nested = entityDefinitionOf(inner);

		model = entityModelFor(nested.properties, nested.source);
	} else if (isRecordClass(inner)) {
		const nested = recordDefinitionOf(inner);

		model = recordModelFor(nested.properties, nested.source);
	} else {
		model = modelOfValueObject(inner as AnyValueObjectClass);
	}

	if (wrapperClass.wrapperKind === "array") return t.Array(model);

	return wrapperClass.wrapperKind === "optional"
		? t.Union([model, t.Undefined()])
		: t.Union([model, t.Null()]);
}
