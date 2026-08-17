import { nullableVO } from "../custom";
import { UuidSchema } from "../../schemas";

/**
 * {@link UuidVO}, but the value may also be `null`.
 *
 * Built with {@link nullableVO} over {@link UuidSchema} — same validation,
 * with `null` added to the accepted values. Its demo-mode default is `null`,
 * not `UuidVO`'s own fresh-v7-UUID thunk. Unlike an `Optional*VO`, the
 * blueprint key stays **required** — `null` must be passed explicitly, which
 * is exactly the shape a nullable foreign key needs (e.g. `parentId`).
 *
 * @see `UuidVO` in `@roastery/beans/collections/value-objects` — the required
 *   counterpart.
 *
 * @example
 * ```ts
 * new NullableUuidVO(null, { name: "parentId", source: "post" });
 * new NullableUuidVO("018f5c8e-2e1f-7b3a-8c4d-9a8b7c6d5e4f", { name: "parentId", source: "post" });
 * ```
 */
export const NullableUuidVO = nullableVO(UuidSchema, {
	name: "NullableUuidVO",
});
