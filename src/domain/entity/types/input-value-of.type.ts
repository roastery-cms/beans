import type { AnyEntityClass } from "./any-entity-class.type";
import type { AnyPropertyClass } from "./any-property-class.type";
import type { AnyValueObjectClass } from "./any-value-object-class.type";
import type { IdentityInput } from "./identity-input.type";
import type { NestedEntityInput } from "./nested-entity-input.type";

/**
 * The **input** form of one blueprint property, as accepted by construction
 * and by `set`: the raw wrapped value for a value-object; for a nested entity,
 * its serialized form with the identity made optional (all-or-nothing, per
 * {@link IdentityInput}) and the properties its own blueprint rules cover made
 * optional too.
 *
 * @typeParam Class - The blueprint property class.
 *
 * @see {@link RawValueOf} — the output-side counterpart, where identity is
 *   always present.
 * @see {@link NestedEntityInput} — the nested branch, which mirrors the
 *   nested entity's rules.
 */
export type InputValueOf<Class extends AnyPropertyClass> =
	Class extends AnyEntityClass
		? NestedEntityInput<Class> & IdentityInput
		: Class extends AnyValueObjectClass
			? Class["prototype"]["value"]
			: never;
