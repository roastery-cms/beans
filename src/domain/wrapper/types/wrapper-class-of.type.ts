import type { WrappableClass } from "@/domain/entity/types/wrappable-class.type";
import type { WrappedInputOf } from "./wrapped-input-of.type";
import type { IWrapper } from "./wrapper.interface";
import type { WrapperKind } from "./wrapper-kind.type";

/**
 * The **class** `arrayOf` / `optionalOf` / `nullableOf` return — not an
 * instance.
 *
 * The annotation is load-bearing, for the same reason `ValueObjectClassOf`'s,
 * `RecordClassOf`'s and `DomainEventClassOf`'s are: the class is declared
 * *inside* the factory body, so without a named public type the declaration
 * build fails with **TS4060** (`Return type of exported function has or is
 * using private name`). `tsconfig.build.json` sets `declaration: true` and
 * `bun run build` runs `tsup --dts`, so an inferred return type would simply
 * not compile — and it would fail at build time, not in the test suite.
 *
 * The two statics are declared with their exact literal types, which is what
 * lets a blueprint conditional read the multiplicity (`Class["wrapperKind"]`)
 * and the wrapped class (`Class["wraps"]`) back off the key. They are also
 * what makes the type disjoint from `AnyEntityClass` and `AnyRecordClass`,
 * both of which declare `readonly wraps?: never`.
 *
 * @typeParam Kind - The wrapper's declared multiplicity.
 * @typeParam Inner - The wrapped blueprint class.
 *
 * @see `defineWrapper` in `../helpers/define-wrapper` — the factory returning this shape.
 */
export type WrapperClassOf<
	Kind extends WrapperKind,
	Inner extends WrappableClass,
> = {
	/** The wrapped class, readable back off the blueprint key. */
	readonly wraps: Inner;

	/** The declared multiplicity, and the runtime discriminant. */
	readonly wrapperKind: Kind;

	/** Instance side: the container contract, already typed against the inner class. */
	readonly prototype: IWrapper<Kind, Inner>;

	/** Mirrors `buildProperty`'s non-value-object branch: one payload argument. */
	new (payload: WrappedInputOf<Kind, Inner>): IWrapper<Kind, Inner>;

	/**
	 * The empty contents for this multiplicity: `[]`, `undefined` or `null`.
	 *
	 * No-argument, exactly like `Entity.demo` and `DomainRecord.demo`, which is
	 * what lets `buildProperty` treat a wrapper as one more nested container.
	 *
	 * @returns A wrapper holding nothing.
	 */
	demo(): IWrapper<Kind, Inner>;
};
