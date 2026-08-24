/**
 * `inMemoryTransactionOf` in motion.
 *
 * Run it with:
 *
 *     mise exec -- bun examples/testing-transaction.ts
 *
 * Four scenes, all printed: a transactional command that commits, one that
 * fails (rows rolled back, nothing published), the unmarked control that keeps
 * its writes, and the line the runner deliberately does not cross — a rollback
 * restores rows, never the entity you are still holding.
 */

import { transactional } from "@/application/command/decorators";
import { defineUseCase } from "@/application/command/helpers";
import { commands } from "@/application/commands";
import type { IEventEmitter } from "@/application/commands/types";
import {
    IntegerVO,
    PositiveIntegerVO,
    SlugVO,
    StringVO,
} from "@/domain/collections/value-objects";
import { defineDomainEvent } from "@/domain/domain-event";
import { emit } from "@/domain/entity/decorators";
import { blueprint, entityOf } from "@/domain/entity/helpers";
import type {
    ICanCreate,
    ICanReadBy,
    ICanUpdate,
} from "@/domain/repository/types";
import { inMemoryRepositoryOf, inMemoryTransactionOf } from "@/testing";

// ---------------------------------------------------------------------------
// The model
// ---------------------------------------------------------------------------

const OrderWasPlacedEvent = defineDomainEvent("order-was-placed");

const orderProperties = blueprint({
    customer: StringVO,
    total: PositiveIntegerVO,
}).done();

class Order extends entityOf(orderProperties, "order") {
    @emit(OrderWasPlacedEvent)
    public place(): void {
        this.set("customer", this.customer.trim());
    }
}

const stockProperties = blueprint({
    sku: SlugVO,
    quantity: IntegerVO,
}).done();

class StockItem extends entityOf(stockProperties, "stock-item") {
    public reserve(units: number): void {
        this.set("quantity", this.quantity - units);
    }
}

// ---------------------------------------------------------------------------
// The use cases
// ---------------------------------------------------------------------------

type PlaceOrderDependencies = {
    orders: ICanCreate<typeof Order>;
    stockItems: ICanReadBy<typeof StockItem, "sku"> &
        ICanUpdate<typeof StockItem>;
};

const placeOrderProperties = blueprint({
    customer: StringVO,
    total: PositiveIntegerVO,
}).done();

/**
 * Writes twice — one `create`, one `update` — and only then talks to the
 * payment gateway, which declines anything above 100. Both writes are already
 * in the store by the time it throws, which is exactly what makes the rollback
 * visible.
 */
@transactional
class PlaceOrderUseCase extends defineUseCase<
    typeof placeOrderProperties,
    PlaceOrderDependencies,
    Order
>(placeOrderProperties, "place-order") {
    protected override async handle(
        deps: PlaceOrderDependencies,
    ): Promise<Order> {
        const order = new Order({
            customer: this.get("customer"),
            total: this.get("total"),
        });

        order.place();
        await deps.orders.create(order);

        const coffee = await deps.stockItems.findBySku("house-blend");

        if (coffee === null) throw new Error("house-blend is not stocked");

        coffee.reserve(1);
        await deps.stockItems.update(coffee);

        if (this.get("total") > 100)
            throw new Error("payment declined by the gateway");

        return order;
    }
}

/** The control: same writes, same failure, no marker — so no boundary. */
class ImportOrderUseCase extends defineUseCase<
    typeof placeOrderProperties,
    PlaceOrderDependencies,
    Order
>(placeOrderProperties, "import-order") {
    protected override async handle(
        deps: PlaceOrderDependencies,
    ): Promise<Order> {
        const order = new Order({
            customer: this.get("customer"),
            total: this.get("total"),
        });

        await deps.orders.create(order);

        throw new Error("the legacy CSV was truncated");
    }
}

// ---------------------------------------------------------------------------
// The wiring — three lines of it
// ---------------------------------------------------------------------------

const orders = inMemoryRepositoryOf(Order);
const stockItems = inMemoryRepositoryOf(StockItem);
const runner = inMemoryTransactionOf(orders, stockItems);

const published: string[] = [];
const emitter: IEventEmitter = {
    emit: (event) => {
        published.push(String((event as { name?: unknown }).name));
    },
};

const registry = commands(
    { placeOrder: PlaceOrderUseCase, importOrder: ImportOrderUseCase },
    { emitter, transaction: (work) => runner.run(work) },
).withDependencies({ orders, stockItems });

// ---------------------------------------------------------------------------
// The report
// ---------------------------------------------------------------------------

type Snapshot = { orders: number; stock: number; published: number };

async function snapshot(): Promise<Snapshot> {
    const coffee = await stockItems.findBySku("house-blend");

    return {
        orders: await orders.count(),
        stock: coffee?.quantity ?? 0,
        published: published.length,
    };
}

/** `3` when nothing moved, `3 → 2` when it did — so a rollback reads as a flat line. */
function move(before: number, after: number): string {
    return before === after ? `${before}` : `${before} → ${after}`;
}

async function attempt(label: string, work: () => Promise<unknown>) {
    const before = await snapshot();
    let outcome: string;

    try {
        await work();
        outcome = "resolved";
    } catch (error) {
        outcome = `rejected: ${(error as Error).message}`;
    }

    const after = await snapshot();

    console.log(
        `\n▸ ${label}\n` +
            `    → ${outcome}\n` +
            `    orders stored : ${move(before.orders, after.orders)}\n` +
            `    house-blend   : ${move(before.stock, after.stock)} in stock\n` +
            `    published     : ${move(before.published, after.published)}`,
    );
}

await stockItems.create(new StockItem({ sku: "house-blend", quantity: 3 }));

console.log("═══ inMemoryTransactionOf ═══");
console.log(
    "\nOne stock item seeded with 3 units, no orders, nothing published.",
);

await attempt("placeOrder({ total: 40 }) — @transactional, and it commits", () =>
    registry.placeOrder({ customer: "alan", total: 40 }),
);
console.log("    ↑ the order landed, a unit was reserved, the event went out");

await attempt(
    "placeOrder({ total: 500 }) — @transactional, the gateway declines",
    () => registry.placeOrder({ customer: "bea", total: 500 }),
);
console.log(
    "    ↑ both writes were already in the store when it threw. The order is\n" +
        "      gone, the reserved unit is back, and the event it raised was\n" +
        "      never published — COMMIT → emit → react, and there was no commit",
);

await attempt(
    "importOrder({ total: 500 }) — same write, same failure, unmarked",
    () => registry.importOrder({ customer: "cris", total: 500 }),
);
console.log("    ↑ no marker, no boundary: the half-written order stayed put");

// ---------------------------------------------------------------------------
// Rows, never entities
// ---------------------------------------------------------------------------

const coffee = (await stockItems.findBySku("house-blend")) as StockItem;

await attempt("a hand-rolled run() that reserves 2 and then throws", () =>
    runner.run(async () => {
        coffee.reserve(2);
        await stockItems.update(coffee);

        throw new Error("the roaster caught fire");
    }),
);

console.log(
    `    entity in hand : ${coffee.quantity} — kept the value it was given\n` +
        `    row in store   : ${(await stockItems.findBySku("house-blend"))?.quantity} — restored\n` +
        "    ↑ there is no change tracking here: only repository.update() ever\n" +
        "      wrote anything, so that is the only thing a rollback undoes",
);
