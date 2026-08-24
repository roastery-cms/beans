import { definitionOf as recordDefinitionOf } from "@/domain/record/helpers/read-definition";
import type { AnyRecordClass } from "@/domain/record/types/any-record-class.type";
import type { AnyWrapperClass } from "@/domain/wrapper/types/any-wrapper-class.type";
import type { WrapperKind } from "@/domain/wrapper/types/wrapper-kind.type";
import { cycleError } from "@/shared/helpers/cycle-error";
import { isEntityClass } from "@/shared/helpers/is-entity-class";
import { isRecordClass } from "@/shared/helpers/is-record-class";
import { isWrapperClass } from "@/shared/helpers/is-wrapper-class";
import { propertyMatches } from "@/shared/helpers/property-matches";
import {
	InvalidDomainDataException,
	InvalidPropertyException,
} from "@roastery/terroir/exceptions/domain";
import { Properties, Source } from "@roastery/terroir/symbols";
import type { AnyEntityClass } from "../types/any-entity-class.type";
import type { AnyPropertyClass } from "../types/any-property-class.type";
import type { PropertiesShapeBase } from "../types/properties-shape-base.type";
import type { ReshapableModel } from "../types/reshapable-model.type";
import type { ReshapeShapeBase } from "../types/reshape-shape-base.type";
import type { ReshapedTo } from "../types/reshaped-to.type";
import { RAW_ENTITY_KEYS } from "./raw-entity-keys";
import { definitionOf } from "./read-definition";

/**
 * Cuts an `Entity` or `DomainRecord` down to the shape of a **reshape target**:
 * checks that the instance carries every key `shape` asks for, then serializes
 * it and drops everything `shape` did not ask for.
 *
 * **Nothing about the instance changes.** The return is a fresh DTO — the same
 * payload `toJSON()` would produce, minus the keys outside `shape`, and cut
 * recursively so a nested entity, a nested record and every item of a wrapper
 * are narrowed too.
 *
 * Identity rides along whenever the source is an `Entity` — at the root and at
 * every nested level — which is what makes the result feed another entity's
 * `fromJSON`. A `DomainRecord` has no identity to carry, so it contributes
 * none. See {@link ReshapedTo}, where the same rule is expressed as a type.
 *
 * ### What "matches the target" means here
 *
 * Per key, and recursively: a value-object must be the declared class or a
 * subclass of it (a domain-vocabulary alias like
 * `class PostAuthorId extends UuidVO {}`), a wrapper must have the same
 * multiplicity and a matching inner class, and a nested entity or record must
 * satisfy the nested blueprint **structurally** — the two classes need no
 * relationship at all.
 *
 * ### A key may nest a target instead of naming a class
 *
 * A target key may hold another target — a plain shape from `reshapeShape` —
 * rather than an `Entity` or `DomainRecord` class, which is what saves
 * declaring a throwaway subclass per level just to name three keys.
 *
 * **A class states multiplicity; a nested target does not.** A class target
 * still has to match the source's multiplicity exactly (`tags: TagCard` against
 * `tags: arrayOf(PostTag)` throws, as it always did). A nested target says
 * nothing about multiplicity and adopts the source's: `arrayOf` comes back as
 * an array of cut items, `optionalOf` as the cut item or `undefined`,
 * `nullableOf` as the cut item or `null`, an unwrapped aggregate as one object.
 * It says nothing about identity either, so that too is read off the source —
 * a nested entity contributes it, a nested record has none to give.
 *
 * That last part is the whole point, and it is where this parts ways with
 * `entityHas`. `entityHas` asks "does this key hold *this class*?" and answers
 * by identity; `reshapeTo` asks "can this key be *cut down to* this shape?",
 * and a source whose class is unrelated to the target's is precisely the case
 * worth cutting. The two share `propertyMatches` at the value-object leaf,
 * where the question is the same one.
 *
 * ### Two things it deliberately does not do
 *
 * - **Rules do not participate.** `default` and `derive` act on construction
 *   input; this reads an instance that is already built. A key the source does
 *   not declare is an error even when `shape` declares a `default` for it.
 * - **It does not redact.** The cut is taken from `toJSON()`, not
 *   `toSafeJSON()`, because the result is a round-trip payload — redacting
 *   here would break `Target.fromJSON(reshapeTo(...))`. Pass the result of
 *   `toSafeJSON()` through your own filter if you want the safe form.
 *
 * @typeParam Shape - The reshape target: the keys the result is cut down to.
 * @typeParam Model - The source instance type, an `Entity` or a `DomainRecord`.
 *
 * @param shape - The target to reshape onto, from `reshapeShape(...)`,
 *   `blueprint(...)` or a plain shape.
 * @param model - The instance to read, left untouched.
 * @returns The serialized instance, cut down to `shape`.
 *
 * @throws `InvalidPropertyException` — when a key of `shape` is missing from
 *   the source's blueprint, is backed by a class that does not satisfy it, or
 *   nests a target where the source holds a value object. `property` carries
 *   the dotted path to the offending key (`"author.name"`, `"tags[].label"`).
 * @throws `InvalidDomainDataException` — when `model` is not an `Entity` or
 *   `DomainRecord` instance.
 * @throws `CyclicEntityDefinitionException` — when `shape` references itself.
 *
 * @example
 * ```ts
 * import { reshapeShape, reshapeTo } from "@roastery/beans/domain/entity/helpers";
 *
 * const cardShape = reshapeShape({ title: StringVO, author: AuthorCard });
 *
 * reshapeTo(cardShape, post);
 * // { id, createdAt, updatedAt, title: "…", author: { id, createdAt, name: "…" } }
 * // — `body`, `tags` and Author's extra keys are gone
 *
 * PostCard.fromJSON(reshapeTo(cardShape, post)); // the intended use
 * ```
 *
 * @example
 * ```ts
 * // The same cut, with no throwaway class per level — and `tags` comes back as
 * // an array because `Post` declares `arrayOf(PostTag)`.
 * const nameOnly = reshapeShape({ name: StringVO });
 * const cardShape = reshapeShape({ title: StringVO, author: nameOnly, tags: nameOnly });
 *
 * reshapeTo(cardShape, post);
 * // { id, createdAt, title, author: { id, createdAt, name },
 * //   tags: [{ id, createdAt, name }, …] }
 * ```
 *
 * @see `reshapeShape` in `./reshape-shape` — how a target is declared.
 * @see {@link ReshapedTo} — the return type, and where identity is decided.
 * @see `entityHas` in `./entity-has` — the class-level question, answered
 *   without producing anything.
 * @see `PropertyClassMatches` in `../types/property-class-matches.type` — the
 *   type-level matcher. `reshapeTo` deliberately keeps its gate at runtime:
 *   a compile-time one would duplicate the exception this already throws, and
 *   recursing a conditional through nested blueprints is the TS2589 case
 *   `docs/decisions/wrapper-type-constraints.md` documents.
 */
export function reshapeTo<
	const Shape extends ReshapeShapeBase,
	Model extends ReshapableModel,
>(shape: Shape, model: Model): ReshapedTo<Shape, Model> {
	const sourceShape = model[Properties];
	const sourceName = model[Source];

	if (typeof sourceName !== "string" || typeof sourceShape !== "object")
		throw new InvalidDomainDataException(
			"reshape",
			"reshapeTo: the second argument must be an Entity or DomainRecord instance — it carries neither a blueprint nor a source name.",
		);

	assertConforms(shape, sourceShape, sourceName, "", new Set());

	return project(
		shape,
		sourceShape,
		model.toJSON() as Record<string, unknown>,
	) as ReshapedTo<Shape, Model>;
}

/**
 * Whether a reshape target's key holds a **nested target shape** rather than a
 * property class — the one discriminant this helper adds to the four the
 * package already has.
 *
 * A class is a function; a target shape is a plain object. That is the same
 * test `isEntityClass`, `isRecordClass` and `isWrapperClass` all open with, and
 * the runtime twin of the construct-signature probe `ReshapedValueOf` writes
 * inline at the type level. Private to this module: `reshapeTo` is the only
 * consumer that ever sees a value which may be either.
 *
 * @param candidate - A value read off a reshape target.
 * @returns `true` when it is a nested target shape.
 *
 * @see `ReshapedValueOf` in `../types/reshaped-value-of.type` — the type-level half.
 */
function isReshapeShape(
	candidate: AnyPropertyClass | ReshapeShapeBase,
): candidate is ReshapeShapeBase {
	return typeof candidate !== "function";
}

/**
 * The blueprint behind an aggregate class, whichever pillar it belongs to —
 * `undefined` when the class is neither an entity nor a record.
 *
 * The nested-target branches are the only place in the package that has to ask
 * this without already knowing the answer: every other blueprint walk
 * discriminates on the kind it is *looking for*, while a nested target accepts
 * either. Asking once, here, is what keeps the `undefined` case — the value
 * object a nested target cannot cut — a single decision rather than one per
 * caller.
 *
 * @param source - The class the source blueprint declares for a key.
 * @returns Its blueprint, or `undefined` when it has none to give.
 *
 * @see `definitionOf` in `./read-definition` and its record twin — the
 *   probe-based reads this picks between.
 */
function blueprintOf(
	source: AnyPropertyClass,
): PropertiesShapeBase | undefined {
	if (isEntityClass(source)) return definitionOf(source).properties;

	if (isRecordClass(source)) return recordDefinitionOf(source).properties;

	return undefined;
}

/**
 * Asserts that `source` satisfies every key of `target`, depth-first, throwing
 * at the first divergence so nothing is projected from a shape that does not
 * hold. The same atomicity `PropertyNameCollisionException` applies: validate
 * the whole thing, then act.
 *
 * `Object.keys` skips the `[Rules]` symbol slot, so a `blueprint(...).with(...)`
 * target is traversed over its domain keys alone — the same reason no other
 * blueprint walk in the package needs to filter it out.
 *
 * @param target - The blueprint being reshaped onto.
 * @param source - The blueprint the instance was built from.
 * @param sourceName - The instance's `[Source]`, for the exception.
 * @param path - Dotted path walked so far, `""` at the root.
 * @param visiting - Target blueprints currently on the stack, for cycle detection.
 *
 * @throws `InvalidPropertyException` — on the first key that does not satisfy.
 * @throws `CyclicEntityDefinitionException` — when `target` references itself.
 */
function assertConforms(
	target: ReshapeShapeBase,
	source: PropertiesShapeBase,
	sourceName: string,
	path: string,
	visiting: Set<ReshapeShapeBase>,
): void {
	// The target comes from the caller and may never have been through
	// `modelFor`, so its cycle is this function's to catch, not one already
	// caught upstream.
	if (visiting.has(target)) throw cycleError(sourceName, "Entity");

	visiting.add(target);

	try {
		for (const [key, targetClass] of Object.entries(target)) {
			const at = path === "" ? key : `${path}.${key}`;
			const sourceClass = source[key];

			if (sourceClass === undefined)
				throw new InvalidPropertyException(
					at,
					sourceName,
					`reshapeTo: "${sourceName}" declares no "${at}", which the target blueprint asks for.`,
				);

			assertPropertyConforms(
				targetClass,
				sourceClass,
				sourceName,
				at,
				visiting,
			);
		}
	} finally {
		visiting.delete(target);
	}
}

/**
 * The per-property half of {@link assertConforms}: the nested-target branch
 * first, then one branch per blueprint kind with the wrapper leading — the same
 * order and the same inline two-statics probe `modelFor` uses, and the reason a
 * missing branch here would silently answer for a kind it never examined.
 *
 * The nested-target branch comes first because it is the only one that reads
 * multiplicity off the **source** rather than the target. It peels one wrapper
 * level and re-enters this function, exactly as the wrapper branch below does;
 * the second pass cannot be a wrapper — a wrapper does not wrap a wrapper — so
 * it falls straight through to the aggregate read. Everything below keeps the
 * older rule, where a wrapper in the target must meet a wrapper in the source.
 *
 * The nested branches recurse **structurally**, comparing blueprints rather
 * than classes, which is what lets an unrelated source class be cut down to
 * the target's shape. Only the value-object leaf defers to `propertyMatches`,
 * where identity-or-subclass is the right answer and `entityHas` needs the
 * same one.
 *
 * @param target - The class the target blueprint declares for the key.
 * @param source - The class the instance's blueprint declares for it.
 * @param sourceName - The instance's `[Source]`, for the exception.
 * @param at - Dotted path to this key, for the exception's `property`.
 * @param visiting - Target blueprints currently on the stack.
 *
 * @throws `InvalidPropertyException` — when the two do not match.
 */
function assertPropertyConforms(
	target: AnyPropertyClass | ReshapeShapeBase,
	source: AnyPropertyClass,
	sourceName: string,
	at: string,
	visiting: Set<ReshapeShapeBase>,
): void {
	if (isReshapeShape(target)) {
		// Peel one level of the source's multiplicity and re-enter, the same way
		// the wrapper branch below does: the second pass cannot be a wrapper —
		// a wrapper does not wrap a wrapper — so it falls straight through to the
		// aggregate read.
		if (isWrapperClass(source)) {
			assertPropertyConforms(
				target,
				source.wraps,
				sourceName,
				source.wrapperKind === "array" ? `${at}[]` : at,
				visiting,
			);

			return;
		}

		const properties = blueprintOf(source);

		if (properties === undefined)
			throw new InvalidPropertyException(
				at,
				sourceName,
				`reshapeTo: "${at}" must hold a nested entity or record — a nested target shape cuts an aggregate down, and there is nothing to cut in a value object.`,
			);

		assertConforms(target, properties, sourceName, at, visiting);

		return;
	}

	if (isWrapperClass(target)) {
		if (!isWrapperClass(source) || source.wrapperKind !== target.wrapperKind)
			throw new InvalidPropertyException(
				at,
				sourceName,
				`reshapeTo: "${at}" must hold a ${target.wrapperKind} wrapper — multiplicity is part of the shape.`,
			);

		assertPropertyConforms(
			target.wraps,
			source.wraps,
			sourceName,
			target.wrapperKind === "array" ? `${at}[]` : at,
			visiting,
		);

		return;
	}

	if (isEntityClass(target)) {
		if (!isEntityClass(source))
			throw new InvalidPropertyException(
				at,
				sourceName,
				`reshapeTo: "${at}" must hold a nested entity.`,
			);

		assertConforms(
			definitionOf(target).properties,
			definitionOf(source).properties,
			sourceName,
			at,
			visiting,
		);

		return;
	}

	if (isRecordClass(target)) {
		if (!isRecordClass(source))
			throw new InvalidPropertyException(
				at,
				sourceName,
				`reshapeTo: "${at}" must hold a nested record.`,
			);

		assertConforms(
			recordDefinitionOf(target).properties,
			recordDefinitionOf(source).properties,
			sourceName,
			at,
			visiting,
		);

		return;
	}

	if (!propertyMatches(source, target))
		throw new InvalidPropertyException(
			at,
			sourceName,
			`reshapeTo: "${at}" is not backed by the class the target blueprint asks for, nor by a subclass of it.`,
		);
}

/**
 * Cuts one serialized object down to `target`'s keys, recursing wherever the
 * target declares a nested aggregate or a wrapper.
 *
 * Runs only after {@link assertConforms} has passed, which is what lets the
 * nested branches read the source class's kind off `source[key]` without
 * re-checking it.
 *
 * Identity is copied when the payload has it, never synthesized: a
 * `DomainRecord`'s `toJSON()` carries none of {@link RAW_ENTITY_KEYS}, so it
 * simply gains nothing here — no per-pillar branch needed.
 *
 * @param target - The blueprint being reshaped onto.
 * @param source - The blueprint the payload was serialized from.
 * @param raw - The serialized payload to cut.
 * @returns A fresh object carrying identity (when present) plus `target`'s keys.
 */
function project(
	target: ReshapeShapeBase,
	source: PropertiesShapeBase,
	raw: Record<string, unknown>,
): Record<string, unknown> {
	const out: Record<string, unknown> = {};

	for (const key of RAW_ENTITY_KEYS) {
		const name = key as string;

		if (Object.hasOwn(raw, name)) out[name] = raw[name];
	}

	for (const [key, targetClass] of Object.entries(target)) {
		// Mirror `toJSON()`'s own key set rather than the blueprint's: it drops a
		// key whose built property is `undefined`, and an empty `optionalOf`
		// arrives as present-with-`undefined` instead. Reproducing both exactly
		// is what keeps the projection a payload `fromJSON` still accepts.
		if (!Object.hasOwn(raw, key)) continue;

		out[key] = projectValue(
			targetClass,
			source[key] as AnyPropertyClass,
			raw[key],
		);
	}

	return out;
}

/**
 * Applies a per-item cut under a multiplicity: every item for `array`, the
 * value itself when there is no wrapper, and the empty form straight through
 * for `optional`/`nullable` — an absent value has nothing to cut.
 *
 * Both of {@link projectValue}'s wrapper-aware branches route through this. They
 * differ only in *which* cut they apply and in whose `wrapperKind` is the
 * authority — the target's for a class target, the source's for a nested target
 * — so the multiplicity itself is a parameter rather than a shape repeated in
 * two places.
 *
 * @param kind - The multiplicity to apply, `undefined` when the key is unwrapped.
 * @param value - The serialized value, as `toJSON()` emitted it.
 * @param cut - The per-item projection.
 * @returns The value under that multiplicity, each item cut.
 */
function projectUnder(
	kind: WrapperKind | undefined,
	value: unknown,
	cut: (item: unknown) => unknown,
): unknown {
	if (kind === undefined) return cut(value);

	if (kind === "array") return (value as readonly unknown[]).map(cut);

	return value === undefined || value === null ? value : cut(value);
}

/**
 * The per-value half of {@link project}, branching on the same kinds in the
 * same order. A value-object value is the leaf and is copied as-is.
 *
 * The nested-target branch is the mirror of `assertPropertyConforms`': it
 * unwraps the *source's* multiplicity rather than the target's, and cuts each
 * item against the nested target. Both wrapper-aware branches share
 * {@link projectUnder}, which is where the multiplicity itself is applied.
 *
 * Every `as` here is sound because {@link assertConforms} has already
 * established what it asserts: that `source` is the same kind as `target` — a
 * wrapper of the same multiplicity, an entity, or a record — and, on the
 * nested-target branch, that `blueprintOf` has a blueprint to give.
 *
 * @param target - The class the target blueprint declares for the key.
 * @param source - The class the payload was serialized from.
 * @param value - The serialized value to cut.
 * @returns The value, narrowed to `target`.
 */
function projectValue(
	target: AnyPropertyClass | ReshapeShapeBase,
	source: AnyPropertyClass,
	value: unknown,
): unknown {
	if (isReshapeShape(target)) {
		const wrapped = isWrapperClass(source);
		const inner = wrapped ? source.wraps : source;
		// Read once, not once per item: `inner` is the same class for the whole
		// list, and `blueprintOf` probes a fresh instance on every call.
		const properties = blueprintOf(inner) as PropertiesShapeBase;

		return projectUnder(
			wrapped ? source.wrapperKind : undefined,
			value,
			(item) => project(target, properties, item as Record<string, unknown>),
		);
	}

	if (isWrapperClass(target)) {
		const inner = (source as AnyWrapperClass).wraps;

		return projectUnder(target.wrapperKind, value, (item) =>
			projectValue(target.wraps, inner, item),
		);
	}

	if (isEntityClass(target))
		return project(
			definitionOf(target).properties,
			definitionOf(source as AnyEntityClass).properties,
			value as Record<string, unknown>,
		);

	if (isRecordClass(target))
		return project(
			recordDefinitionOf(target).properties,
			recordDefinitionOf(source as AnyRecordClass).properties,
			value as Record<string, unknown>,
		);

	return value;
}
