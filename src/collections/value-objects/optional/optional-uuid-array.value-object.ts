import { optionalVO } from "../custom";
import { UuidArraySchema } from "../../schemas";

/**
 * {@link UuidArrayVO}, but the value may also be `undefined`.
 *
 * Built with {@link optionalVO} over {@link UuidArraySchema} — same
 * validation, with `undefined` added to the accepted values (on top of the
 * empty array, already valid on its own). Its demo-mode default is
 * `undefined`, not `UuidArrayVO`'s own `[]`.
 *
 * @see `UuidArrayVO` in `@roastery/beans/collections/value-objects` — the
 *   required counterpart.
 *
 * @example
 * ```ts
 * new OptionalUuidArrayVO(undefined, { name: "authorIds", source: "post" });
 * new OptionalUuidArrayVO([id1, id2], { name: "authorIds", source: "post" });
 * ```
 */
export const OptionalUuidArrayVO = optionalVO(UuidArraySchema, {
	name: "OptionalUuidArrayVO",
});
