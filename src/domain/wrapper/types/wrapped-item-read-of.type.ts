import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { AnyValueObjectClass } from "@/domain/entity/types/any-value-object-class.type";
import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";

/**
 * What one item of a wrapper reads back as: the nested **instance** for a
 * wrapped entity or record (so `post.tags[0].rename(…)` reaches the verb), and
 * the wrapped raw value for a wrapped value-object.
 *
 * Exactly the per-property rule `ReadValueOf` applies to an unwrapped key,
 * spelled once here so a wrapper's `unwrap()` and a blueprint's accessor
 * cannot disagree about it.
 *
 * Internal to the pillar: imported by direct path, never re-exported from the
 * barrel, the same status `PerKeyRepositoryContractOf` and friends keep.
 *
 * @typeParam Inner - The wrapped blueprint class.
 *
 * @see {@link WrappedReadOf} — the multiplicity applied over this.
 */
export type WrappedItemReadOf<Inner extends WrappableClass> =
	Inner extends AnyEntityClass
		? Inner["prototype"]
		: Inner extends AnyRecordClass
			? Inner["prototype"]
			: Inner extends AnyValueObjectClass
				? Inner["prototype"]["value"]
				: never;
