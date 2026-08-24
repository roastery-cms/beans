/**
 * @module @roastery/beans/application/command/decorators
 *
 * Standard (TC39) decorators for a `Command` subclass. Unlike
 * `@roastery/beans/domain/entity/decorators`, whose five decorators all *do*
 * something (each ends in `raiseEvent`), everything here is **declarative**:
 * a decorator states a fact about the class, and something one layer up reads
 * that fact and acts on it. Nothing in this directory wraps `execute()`.
 *
 * Re-exports:
 * - {@link transactional} — class decorator: declares that this command must
 *   run inside a transaction, for `commands` to honour when — and only when —
 *   it was given a `transaction` option.
 */

export { transactional } from "./transactional.decorator";
