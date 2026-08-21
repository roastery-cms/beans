/**
 * Which multiplicity a wrapper class declares: a list, an optional value or a
 * nullable one.
 *
 * The literal reaches both halves of the package from a **single** place — the
 * `wrapperKind` static on the generated class — so `isWrapperClass` (runtime)
 * and `WrappedInputOf` / `WrappedReadOf` / `WrappedRawOf` (type level) always
 * answer about the same declaration.
 *
 * @see `arrayOf`, `optionalOf`, `nullableOf` in `../helpers` — one factory per kind.
 */
export type WrapperKind = "array" | "optional" | "nullable";
