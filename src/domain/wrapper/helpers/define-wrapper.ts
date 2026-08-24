import type { IDomainEvent } from "@/domain/domain-event/types";
import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import { metaOf } from "@/domain/value-object/helpers";
import { isValueObject } from "@/shared/helpers/is-value-object";
import { isValueObjectClass } from "@/shared/helpers/is-value-object-class";
import { rawOf } from "@/shared/helpers/raw-of";
import { redactedValue } from "@/shared/redaction/redaction-config";
import type { ISensitiveKey } from "@/shared/redaction/sensitive-keys-of";
import { InvalidPropertyException } from "@roastery/terroir/exceptions/domain";
import type { t } from "@roastery/terroir";
import type { AnyWrapperClass } from "../types/any-wrapper-class.type";
import type { WrapperClassOf } from "../types/wrapper-class-of.type";
import type { WrapperKind } from "../types/wrapper-kind.type";
import { buildItem } from "./build-item";
import { wrapperModelFor } from "./model-for";

/** The item name a single-valued wrapper reports in an item's error context. */
const SINGLE_ITEM_NAME = "value";

/**
 * Builds a multiplicity-wrapper **class** around another blueprint class — the
 * core `arrayOf`, `optionalOf` and `nullableOf` all lower into.
 *
 * The generated class is, to every traversal in the package, one more nested
 * container: it constructs from a single payload argument, exposes a
 * no-argument `demo()`, serializes through `toJSON`/`toSafeJSON`, and forwards
 * a deep domain-event drain. That is what makes the whole feature cheap —
 * `buildProperty`, `rawOf`, `toSafeJSON`, `pullDomainEvents` and `setMany`'s
 * change detection all take their existing non-value-object branch, unchanged.
 * Only `get` (which unwraps) and each pillar's `modelFor` (which derives the
 * multiplicity into the schema) needed a branch of their own.
 *
 * **Call it at module scope, once.** Every call mints a fresh class *and* a
 * fresh schema. A factory called inside `defineEntity()` would hand
 * `SchemaManager` a new cache key on every construction — nothing fails and
 * nothing warns, it is only slower. The corollary is the usual one: two calls
 * with identical arguments produce classes `instanceof` does not relate.
 *
 * **A wrapper does not wrap a wrapper.** The inner class is one of the three
 * blueprint kinds; `arrayOf(arrayOf(Tag))` is not part of the contract, and a
 * list of lists is better modeled as a record with a named verb.
 *
 * @typeParam Kind - The multiplicity to declare.
 * @typeParam Inner - The blueprint class to wrap.
 *
 * @param kind - The multiplicity.
 * @param inner - The wrapped blueprint class.
 * @param source - The generated class's own source, used as the error context
 *   of every item it builds.
 * @returns The generated wrapper class, ready for a blueprint.
 *
 * @see {@link WrapperClassOf} — the returned shape, and why the annotation is
 *   required rather than inferred.
 * @see `wrapperModelFor` in `./model-for` — where the multiplicity reaches the schema.
 */
export function defineWrapper<
	Kind extends WrapperKind,
	Inner extends WrappableClass,
>(kind: Kind, inner: Inner, source: string): WrapperClassOf<Kind, Inner> {
	/**
	 * The wrapped class's own redaction settings, resolved on first use and
	 * kept for the life of this wrapper class.
	 *
	 * Memoized for the reason `sensitiveKeysOf` memoizes its own map: `metaOf`
	 * builds a probe and runs `defineMeta()` on every call, so reading it per
	 * serialization would pay that on every `toString()`. `null` means "not a
	 * value-object, nothing to read" — resolved lazily rather than at class
	 * creation so a wrapper that is never redacted never runs `defineMeta` at
	 * all.
	 */
	let redaction: ISensitiveKey | null | undefined;

	/**
	 * Replaces one wrapped value-object's value when its class declared itself
	 * sensitive, and hands it back untouched otherwise.
	 *
	 * @param value - The item's real value.
	 * @param name - The item's index, or `"value"` for a single-valued kind.
	 * @returns The replacement, or `value` when the wrapped class is not
	 *   sensitive.
	 */
	function redactedItem(value: unknown, name: string): unknown {
		if (redaction === undefined) {
			const meta = isValueObjectClass(inner) ? metaOf(inner) : undefined;

			redaction =
				meta?.sensitive === true ? { redactWith: meta.redactWith } : null;
		}

		return redaction === null
			? value
			: redactedValue(value, { name, source }, redaction.redactWith);
	}

	class Wrapper {
		/** The wrapped class — the single source both the runtime and the type level read. */
		public static readonly wraps: Inner = inner;

		/** The declared multiplicity, and what `isWrapperClass` probes. */
		public static readonly wrapperKind: Kind = kind;

		/**
		 * The built contents: every item for an array, the single item (or
		 * nothing) otherwise. A true JS private field — nothing outside the
		 * class reads it, so it needs no shared declaration site.
		 */
		readonly #items: readonly unknown[];

		/**
		 * Builds the container from its raw payload, constructing each item
		 * through the same contract an unwrapped key of the inner class would
		 * use.
		 *
		 * @param payload - The raw contents.
		 *
		 * @throws `InvalidPropertyException` — when an `arrayOf` payload is not
		 *   an array, or when an item fails its own validation.
		 */
		public constructor(payload: unknown) {
			if (kind === "array") {
				if (!Array.isArray(payload))
					throw new InvalidPropertyException(
						SINGLE_ITEM_NAME,
						source,
						`${source}: expected a list of items, received ${payload === null ? "null" : typeof payload}.`,
					);

				this.#items = payload.map((value, index) =>
					buildItem(inner, source, String(index), value),
				);

				return;
			}

			const empty = kind === "optional" ? undefined : null;

			this.#items =
				payload === empty
					? []
					: [buildItem(inner, source, SINGLE_ITEM_NAME, payload)];
		}

		/**
		 * Builds the wrapper holding nothing: `[]`, `undefined` or `null`,
		 * according to the declared multiplicity.
		 *
		 * An empty container is a coherent fixture and a cheap one — the same
		 * call `customArrayVO`'s own placeholder makes. A demo with items is
		 * written by passing them.
		 *
		 * @returns A wrapper holding nothing.
		 */
		public static demo(): Wrapper {
			return new Wrapper(
				kind === "array" ? [] : kind === "optional" ? undefined : null,
			);
		}

		/** The derived schema: the inner class's own, under the multiplicity. */
		public get schema(): t.TSchema {
			return wrapperModelFor(Wrapper as unknown as AnyWrapperClass);
		}

		/**
		 * The contents, unwrapped: the built instances for a wrapped entity or
		 * record, the raw values for a wrapped value-object.
		 *
		 * @returns The contents, under the declared multiplicity.
		 */
		public unwrap(): unknown {
			const read = this.#items.map((item) =>
				isValueObject(item) ? item.value : item,
			);

			if (kind === "array") return read;

			return read.length === 0
				? kind === "optional"
					? undefined
					: null
				: read[0];
		}

		/**
		 * Serializes the container. Never redacts — this is the persistence
		 * contract, and it has to round-trip through the owner's `fromJSON`.
		 *
		 * @returns The serialized contents.
		 */
		public toJSON(): unknown {
			return this.#collect((item) => rawOf(item));
		}

		/**
		 * The redacted view: each item applies its **own** declared sensitive
		 * keys. A wrapper declares none of its own — it has no blueprint to
		 * mark a key on — so an entity or record item recurses into its
		 * `toSafeJSON`, and a **value-object item is redacted when its class
		 * declares `sensitive: true`**.
		 *
		 * That last case is the whole reason this is not a plain projection:
		 * a value-object has no `toSafeJSON` to recurse into, so without it
		 * `arrayOf(PasswordVO)` would print its secrets through `toString()`
		 * and through the inspect hook, while the same unwrapped key redacts.
		 * Wrapping a value-object must not un-declare what the value-object
		 * declares.
		 *
		 * @returns The serialized contents, each item redacted by its own rules.
		 */
		public toSafeJSON(): unknown {
			return this.#collect((item, name) =>
				isValueObject(item)
					? redactedItem(item.value, name)
					: (item as { toSafeJSON(): unknown }).toSafeJSON(),
			);
		}

		/**
		 * Forwards a deep domain-event drain to each item, in order. The
		 * shallow form always returns `[]`: a wrapper has no buffer and never
		 * raises.
		 *
		 * Without the forward, an entity inside an `arrayOf` would keep its
		 * events forever — the one failure in this feature that would be
		 * completely silent.
		 *
		 * @param options - `deep: true` walks into the items.
		 * @returns The drained events, or `[]`.
		 */
		public pullDomainEvents(options?: {
			readonly deep?: boolean;
		}): readonly IDomainEvent[] {
			if (options?.deep !== true) return [];

			return this.#items.flatMap((item) =>
				isValueObject(item)
					? []
					: (
							item as {
								pullDomainEvents(options?: {
									readonly deep?: boolean;
								}): readonly IDomainEvent[];
							}
						).pullDomainEvents({ deep: true }),
			);
		}

		/**
		 * Applies a per-item projection and restores the declared multiplicity
		 * around the result — the shared half of `toJSON` and `toSafeJSON`.
		 *
		 * The projection receives the item's **name** alongside it — its index
		 * for an `arrayOf`, `"value"` otherwise — the same identification
		 * `buildItem` puts in an item's error context, and what a redaction
		 * placeholder function reads as the field it is replacing.
		 *
		 * @param project - What to read off each built item.
		 * @returns The projected contents, under the declared multiplicity.
		 */
		#collect(project: (item: unknown, name: string) => unknown): unknown {
			const projected = this.#items.map((item, index) =>
				project(item, kind === "array" ? String(index) : SINGLE_ITEM_NAME),
			);

			if (kind === "array") return projected;

			return projected.length === 0
				? kind === "optional"
					? undefined
					: null
				: projected[0];
		}
	}

	// The cast covers the multiplicity alone: `unwrap`/`toJSON`/`toSafeJSON`
	// resolve their exact shape from `Kind` and `Inner`, which a class body
	// written against `unknown` cannot express.
	return Wrapper as unknown as WrapperClassOf<Kind, Inner>;
}
