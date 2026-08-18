import { collectResult, commandOf } from "@/application/command/helpers";
import type { CommandResult } from "@/application/command/types";
import { eventedRegistry } from "@/application/evented-registry";
import type {
    IEventEmitter,
    IEventHandler,
} from "@/application/evented-registry/types";
import { blueprint } from "@/domain";
import {
    BooleanVO,
    SlugVO,
    StringVO,
} from "@/domain/collections/value-objects";
import { defineDomainEvent } from "@/domain/domain-event";
import type { IDomainEvent } from "@/domain/domain-event/types";
import { onCreate } from "@/domain/entity/decorators";
import { entityOf } from "@/domain/entity/helpers";
import { EventEmitter } from "node:events";

const postTagProperties = blueprint({
    name: StringVO,
    slug: SlugVO,
    hidden: BooleanVO,
}).with({ hidden: { default: false }, slug: { derive: (ctx) => ctx.name } });

const CreatePostTagEvent = defineDomainEvent("create-post-tag");

@onCreate(CreatePostTagEvent)
class PostTag extends entityOf(postTagProperties, "post-tag") {
    rename(value: string) {
        this.set("name", value);
    }

    reslug(value: string) {
        this.set("slug", value);
    }

    changeVisibility(value: boolean) {
        this.set("hidden", value);
    }
}

const postTag = new PostTag({ name: "Rock n' Roll" });

const createPostTagProperties = blueprint({ name: StringVO }).done();

class CreatePostTag extends commandOf<
    typeof createPostTagProperties,
    {},
    PostTag
>(createPostTagProperties, "create-post-tag") {
    public override async execute(_deps: {}): Promise<CommandResult<PostTag>> {
        const newPostTag = new PostTag({ name: this.get("name") });

        return collectResult(newPostTag);
    }
}

class CreatePostTagHandler implements IEventHandler<
    InstanceType<typeof CreatePostTagEvent>,
    {}
> {
    public async handle(
        event: InstanceType<typeof CreatePostTagEvent>,
    ): Promise<void> {
        console.log(`post tag created: ${event.aggregateId}`);
    }
}

/**
 * Adapts Node's own `EventEmitter` to the `IEventEmitter` contract
 * `eventedRegistry` publishes through. Node's `emit(name, ...args): boolean`
 * is a different shape entirely (synchronous, never `await`ed) — this class
 * is the whole translation: forward `event` as the sole listener argument,
 * keyed by its `name`.
 */
class NodeEventEmitterAdapter implements IEventEmitter {
    public constructor(private readonly inner: EventEmitter) {}

    public emit(event: IDomainEvent): void {
        this.inner.emit(event.name, event);
    }
}

const emitter = new NodeEventEmitterAdapter(new EventEmitter());

const postTagRegistry = eventedRegistry(
    { createPostTag: CreatePostTag },
    emitter,
)
    .withDependencies<{}>({})
    .on(CreatePostTagEvent, CreatePostTagHandler);

console.log("1");
postTagRegistry.get("createPostTag")({ name: "Alan" });
console.log("3");
