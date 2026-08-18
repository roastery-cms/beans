import { optionalVO } from "../custom";
import { UuidSchema } from "../../schemas";

/**
 * {@link UuidVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link UuidSchema} — same validation,
 * with `undefined` added to the accepted values. Its demo-mode default is
 * `undefined`, not `UuidVO`'s own fresh-v7-UUID thunk.
 *
 * @see `UuidVO` in `@roastery/beans/domain/collections/value-objects` — the required
 *   counterpart.
 *
 * @example
 * ```ts
 * new OptionalUuidVO(undefined, { name: "parentId", source: "post" });
 * new OptionalUuidVO("018f5c8e-2e1f-7b3a-8c4d-9a8b7c6d5e4f", { name: "parentId", source: "post" });
 * ```
 */
export const OptionalUuidVO = optionalVO(UuidSchema, {
	name: "OptionalUuidVO",
});
