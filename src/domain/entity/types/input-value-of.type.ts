import type { AnyEntityClass } from "./any-entity-class.type";
import type { AnyPropertyClass } from "./any-property-class.type";
import type { AnyValueObjectClass } from "./any-value-object-class.type";
import type { IdentityInput } from "./identity-input.type";
import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { NestedRecordInput } from "@/domain/record/types/nested-record-input.type";
import type { NestedEntityInput } from "./nested-entity-input.type";
import type { WrappableClass } from "./wrappable-class.type";
import type { WrappedInputOf } from "@/domain/wrapper/types/wrapped-input-of.type";
import type { WrapperKind } from "@/domain/wrapper/types/wrapper-kind.type";

/**
 * The **input** form of one blueprint property, as accepted by construction
 * and by `set`: for a multiplicity wrapper, the inner class's own input form
 * under that multiplicity (a list, or the value widened with `undefined` /
 * `null`); the raw wrapped value for a value-object; for a nested entity,
 * its serialized form with the identity made optional (all-or-nothing, per
 * {@link IdentityInput}) and the properties its own blueprint rules cover made
 * optional too; for a nested record, the same thing **without** the identity
 * intersection.
 *
 * That missing intersection is the whole of what separates the two nested
 * kinds at the construction boundary, and this is the one place in the
 * package where it is written down.
 *
 * @typeParam Class - The blueprint property class.
 *
 * @see {@link RawValueOf} — the output-side counterpart, where identity is
 *   always present.
 * @see {@link NestedEntityInput} — the nested branch, which mirrors the
 *   nested entity's rules.
 */
export type InputValueOf<Class extends AnyPropertyClass> = Class extends {
	readonly wrapperKind: infer Kind extends WrapperKind;
	readonly wraps: infer Inner extends WrappableClass;
}
	? WrappedInputOf<Kind, Inner>
	: Class extends AnyEntityClass
		? NestedEntityInput<Class> & IdentityInput
		: Class extends AnyRecordClass
			? NestedRecordInput<Class>
			: Class extends AnyValueObjectClass
				? Class["prototype"]["value"]
				: never;
