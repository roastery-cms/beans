/**
 * @module
 *
 * Public types of the multiplicity-wrapper pillar: the two structural
 * stand-ins a blueprint conditional discriminates on, the kind literal, the
 * generated class's own shape, and the three type functions that apply a
 * multiplicity to the inner class's input, read and raw forms.
 *
 * `WrappedItemReadOf` stays off this barrel: it is the per-item rule
 * `WrappedReadOf` is written in terms of, internal to the pillar and imported
 * by direct path — the same status every other pillar's internal types keep.
 */

export type { AnyWrapperClass } from "./any-wrapper-class.type";
export type { AnyWrapper } from "./any-wrapper.type";
export type { WrappedInputOf } from "./wrapped-input-of.type";
export type { WrappedRawOf } from "./wrapped-raw-of.type";
export type { WrappedReadOf } from "./wrapped-read-of.type";
export type { WrapperClassOf } from "./wrapper-class-of.type";
export type { IWrapper } from "./wrapper.interface";
export type { WrapperKind } from "./wrapper-kind.type";
