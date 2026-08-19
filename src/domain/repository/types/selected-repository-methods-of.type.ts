import type { AnyEntityClass } from "@/domain/entity/types/any-entity-class.type";
import type { RepositoryMode } from "./repository-mode.type";
import type { RepositoryReadMethodsOf } from "./repository-read-methods-of.type";
import type { RepositorySpecNamesOf } from "./repository-spec-names-of.type";
import type { RepositorySpecOf } from "./repository-spec-of.type";
import type { RepositoryWriteMethods } from "./repository-write-methods.type";

/**
 * The method names a spec actually selects, once the requested {@link
 * RepositoryMode} has filtered them.
 *
 * Each half is gated by `"read" extends Mode` rather than
 * `Mode extends "read"`. The parameter on the *right* of `extends` does not
 * distribute, which makes this exactly the question worth asking — "does the
 * requested mode include reading?" — true both for `"read"` and for the
 * default `"read" | "write"`. Written the other way round, the default mode
 * would distribute into two branches and select nothing in each.
 *
 * The names are re-derived from the catalog with `Extract`, not trusted from
 * the spec, so both spec forms end up filtered by the same rule.
 *
 * @typeParam EntityClass - The concrete `Entity` subclass, e.g. `typeof User`.
 * @typeParam Spec - The spec, in either form.
 * @typeParam Mode - Which half to keep.
 *
 * @see {@link RepositoryOf} — the only consumer.
 */
export type SelectedRepositoryMethodsOf<
	EntityClass extends AnyEntityClass,
	Spec extends RepositorySpecOf<EntityClass>,
	Mode extends RepositoryMode,
> =
	| ("read" extends Mode
			? Extract<
					RepositorySpecNamesOf<Spec>,
					RepositoryReadMethodsOf<EntityClass>
				>
			: never)
	| ("write" extends Mode
			? Extract<RepositorySpecNamesOf<Spec>, RepositoryWriteMethods>
			: never);
