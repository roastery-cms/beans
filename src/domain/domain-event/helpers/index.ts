/**
 * @module @roastery/beans/domain/domain-event/helpers
 *
 * Re-exports:
 * - {@link validatePayload} — checks a received payload against the shape its
 *   event class declared, the arrival half of the contract `eventPayloadOf`
 *   writes on departure.
 */

export { validatePayload } from "./validate-payload";
