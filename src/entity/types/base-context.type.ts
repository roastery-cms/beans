import type { DateTimeVO, UuidVO } from "@/collections/value-objects";

/**
 * The identity slice of an entity's built context: the three base fields every
 * entity carries, each backed by its validated value-object. `updatedAt` stays
 * `undefined` until the first mutation stamps it.
 *
 * @see {@link ContextOf} — this plus one built property per blueprint key.
 */
export type BaseContext = {
	id: UuidVO;
	createdAt: DateTimeVO;
	updatedAt?: DateTimeVO;
};
