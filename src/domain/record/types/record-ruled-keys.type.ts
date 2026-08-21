import type { RuledKeys } from "@/domain/entity/types/ruled-keys.type";

/**
 * The keys a ruled record blueprint declares a `default` or `derive` for —
 * read off the `Rules` symbol slot `blueprint().with()` attaches. `never` for
 * a plain blueprint, which is what collapses the relaxation in
 * {@link RecordConstructionValuesOf} back to "every key required".
 *
 * A named alias of `RuledKeys`: the slot and its shape belong to `blueprint`,
 * which both pillars share unmodified.
 *
 * @typeParam Blueprint - The record's blueprint, ruled or plain.
 *
 * @see `blueprint` in `@/domain/entity/helpers/blueprint` — what writes the slot.
 */
export type RecordRuledKeys<Blueprint> = RuledKeys<Blueprint>;
