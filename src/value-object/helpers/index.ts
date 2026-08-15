/**
 * @module @roastery/beans/value-object/helpers
 *
 * Helper functions of the value-object pillar. Only {@link metaOf} is public —
 * `readMeta` and `resolveDefault` are internals of the base's constructor,
 * imported by direct path.
 *
 * Re-exports:
 * - {@link metaOf} — reads a class's `{ default, schema }` without constructing an instance.
 */

export { metaOf } from "./meta-of";
