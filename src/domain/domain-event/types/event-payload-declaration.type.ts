import type { Json, SafeJson } from "@roastery/terroir/symbols";
import type { PayloadShapeBase } from "./payload-shape-base.type";

/**
 * What a domain-event class may declare as `static readonly payload`: a payload
 * shape, or one of the two serialization directives.
 *
 * @remarks
 * The three forms answer the same question — *what does this event carry?* —
 * at three levels of precision:
 *
 * - a **shape** cuts the raising entity down to exactly the declared keys, and
 *   is the only form that can be validated on arrival (it is the only one with
 *   a static format);
 * - **`Json`** carries `entity.toJSON()`, the complete unredacted serialization;
 * - **`SafeJson`** carries `entity.toSafeJSON()`, the same with every
 *   `sensitive` key redacted.
 *
 * `Json` and `SafeJson` are used here as **sentinels**, the way `Demo` is — not
 * as slot keys. A shape is always an object and a directive always a symbol, so
 * `typeof declaration === "symbol"` discriminates the two with nothing to
 * configure. Neither symbol keys a member on `Entity`, `DomainRecord` or
 * `ValueObject`.
 *
 * @see {@link PayloadShapeBase} — the shape form.
 * @see `eventPayloadOf` in `@/domain/entity/helpers` — what resolves a declaration.
 */
export type EventPayloadDeclaration =
	| PayloadShapeBase
	| typeof Json
	| typeof SafeJson;
