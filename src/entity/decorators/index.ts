/**
 * @module @roastery/beans/entity/decorators
 *
 * Re-exports:
 * - {@link AutoUpdate} — legacy TC39 method decorator that calls `this.update()`
 *   after every successful invocation (stamps `updatedAt`).
 */

export { AutoUpdate } from "./auto-update.decorator";
