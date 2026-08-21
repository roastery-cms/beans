/**
 * @module @roastery/beans/application/wrapper/helpers
 *
 * Application-layer alias onto `@roastery/beans/domain/wrapper/helpers` — the
 * exact same three factories, re-exported here so a `Command` blueprint never
 * has to reach across into `@roastery/beans/domain` just to say a key holds
 * many of something, or optionally one.
 *
 * Kept in sync by hand with the domain barrel it mirrors, exactly as
 * `application/collections/*` is, and enforced the same way — by
 * `../wrapper-alias.spec.ts`, which checks both name parity (read from the
 * source) and reference identity at runtime. There is no logic here.
 *
 * Re-exports:
 * - {@link arrayOf}    — a key holding a list of the wrapped class.
 * - {@link nullableOf} — a key holding one, or an explicit `null`.
 * - {@link optionalOf} — a key holding one, or nothing at all.
 */

export { arrayOf, nullableOf, optionalOf } from "@/domain/wrapper/helpers";
