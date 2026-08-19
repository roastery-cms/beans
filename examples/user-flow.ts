import { commandRegistry } from "@/application/command-registry";
import type { CommandRunner } from "@/application/command-registry/types";
import { collectDomainEvents, commandOf } from "@/application/command/helpers";
import type { CommandResult } from "@/application/command/types";
import { blueprint } from "@/domain";
import {
    EmailVO,
    PasswordVO,
    SlugVO,
    StringVO,
    UuidVO,
} from "@/domain/collections/value-objects";
import {
    OptionalEmailVO,
    OptionalPasswordVO,
    OptionalStringVO,
} from "@/domain/collections/value-objects/optional";
import { defineDomainEvent } from "@/domain/domain-event";
import { onCreate, onDelete, onUpdate } from "@/domain/entity/decorators";
import { entityOf, generateUUID } from "@/domain/entity/helpers";
import type {
    RepositoryOf,
    ICanReadBy,
    ICanDelete,
} from "@/domain/repository/types";
import { inMemoryRepositoryOf } from "@/testing";
import {
    ResourceNotFoundException,
    UnauthorizedException,
} from "@roastery/terroir/exceptions/application";

const userProperties = blueprint({
    name: StringVO,
    email: EmailVO,
    password: UuidVO,
    slug: SlugVO,
}).with({
    slug: { derive: (ctx) => ctx.name },
});

/*
TODO: Create a value-object type that can accept a varying type. Example: document could be number or string.
// TODO: Criar uma forma de esses campos sensíveis de object-values impedirem até de que o RepositoryOf pudesse gerar auto-inferência. Ou seja, não permitir que desse pra criar métodos sobre isso
*/

const CreateUserEvent = defineDomainEvent("create-user-event");
const UpdateUserEvent = defineDomainEvent("update-user-event");
const DeleteUserEvent = defineDomainEvent("delete-user-event");

@onCreate(CreateUserEvent)
@onUpdate(UpdateUserEvent)
@onDelete(DeleteUserEvent)
class User extends entityOf(userProperties, "user") {
    rename(value: string) {
        this.set("name", value);
    }

    changeEmail(value: string) {
        this.set("email", value);
    }

    changePassword(value: string) {
        this.set("password", value);
    }
}

// The port, derived from User's own blueprint rather than written by hand:
// `findByEmail` exists because the blueprint declares `email`, and takes a
// string because that key is an EmailVO. Nothing here is emitted at runtime.
type UserRepository = RepositoryOf<
    typeof User,
    "findById" | "findByEmail" | "create" | "update" | "delete" | "findMany"
>;

type SecretsService = {
    create(value: string): Promise<string>;
    remove(id: string): Promise<void>;
    find(id: string): Promise<string>;
    check(id: string, value: string): Promise<boolean>;
};

const createUserProperties = blueprint({
    name: StringVO,
    email: EmailVO,
    password: PasswordVO,
}).done();

type CreateUserDeps = {
    secrets: SecretsService;
    users: UserRepository;
};

class CreateUser extends commandOf<
    typeof createUserProperties,
    CreateUserDeps,
    User
>(createUserProperties, "create-user") {
    public override async execute(
        deps: CreateUserDeps,
    ): Promise<CommandResult<User>> {
        const passwordId = await deps.secrets.create(this.password);

        const newUser = new User({
            name: this.name,
            email: this.email,
            password: passwordId,
        });

        await deps.users.create(newUser);

        return { result: newUser, events: collectDomainEvents(newUser) };
    }
}

const updateUserProperties = blueprint({
    email: EmailVO,
    password: PasswordVO,
    newName: OptionalStringVO,
    newEmail: OptionalEmailVO,
    newPassword: OptionalPasswordVO,
}).done();

type UpdateUserDeps = {
    secrets: SecretsService;
    users: UserRepository;
    commands: { login: CommandRunner<typeof UserLogin> };
};

class UpdateUser extends commandOf<
    typeof updateUserProperties,
    UpdateUserDeps,
    User
>(updateUserProperties, "update-user") {
    public override async execute(
        deps: UpdateUserDeps,
    ): Promise<CommandResult<User>> {
        // Reuses the already-registered Login command instead of just trusting
        // the email: this both finds the target user and verifies the current
        // password before allowing any change to go through.
        const { result: targetUser } = await deps.commands.login({
            email: this.email,
            password: this.password,
        });

        const newEmail = this.newEmail;
        if (newEmail) targetUser.changeEmail(newEmail);

        const newPassword = this.newPassword;

        // Create Application Services in @roastery-capsules/secrets, easing password creation/update/validation/removal

        if (newPassword) {
            await deps.secrets.remove(targetUser.get("password"));
            const newPasswordId = await deps.secrets.create(newPassword);
            targetUser.changePassword(newPasswordId);
        }

        const name = this.newName;
        if (name) targetUser.rename(name);

        await deps.users.update(targetUser);

        return { result: targetUser, events: collectDomainEvents(targetUser) };
    }
}

// The idea that used to be only a comment: login by email + password, checking
// the submitted password against the id stored on the entity via secrets.check.
const userLoginProperties = blueprint({
    email: EmailVO,
    password: StringVO,
}).done();

type UserLoginDeps = {
    secrets: SecretsService;
    users: UserRepository;
};

class UserLogin extends commandOf<
    typeof userLoginProperties,
    UserLoginDeps,
    User
>(userLoginProperties, "user-login") {
    public override async execute(
        deps: UserLoginDeps,
    ): Promise<CommandResult<User>> {
        const user = await deps.users.findByEmail(this.email);

        if (!user)
            throw new UnauthorizedException(
                "user-login",
                "Invalid email or password.",
            );

        const matches = await deps.secrets.check(
            user.get("password"),
            this.password,
        );

        if (!matches)
            throw new UnauthorizedException(
                "user-login",
                "Invalid email or password.",
            );

        return { result: user, events: collectDomainEvents(user) };
    }
}

const readUserProperties = blueprint({ id: UuidVO }).done();

type ReadUserDeps = {
    users: UserRepository;
};

class ReadUser extends commandOf<typeof readUserProperties, ReadUserDeps, User>(
    readUserProperties,
    "read-user",
) {
    public override async execute(
        deps: ReadUserDeps,
    ): Promise<CommandResult<User>> {
        const user = await deps.users.findById(this.id);

        if (!user)
            throw new ResourceNotFoundException(
                "read-user",
                `No user found for id "${this.id}".`,
            );

        // Hydrating raises no event: there is no `onRead`. A read returns the
        // aggregate and an empty list, which is correct.
        return { result: user, events: collectDomainEvents(user) };
    }
}

const deleteUserProperties = { id: UuidVO };

type DeleteUserDeps = {
    users: ICanReadBy<typeof User, "id"> & ICanDelete<typeof User>;
};

class DeleteUser extends commandOf<
    typeof deleteUserProperties,
    DeleteUserDeps,
    User
>(deleteUserProperties, "delete-user") {
    public override async execute(
        deps: DeleteUserDeps,
    ): Promise<CommandResult<User>> {
        const user = await deps.users.findById(this.id);

        if (!user)
            throw new ResourceNotFoundException(
                "delete-user",
                `No user found for id "${this.id}".`,
            );

        user.destroy(); // dispara onDelete (destroy-user-event) e marca isDestroyed
        await deps.users.delete(user);

        // Collects both the read-user-event (from findById) and the
        // destroy-user-event (from destroy()) — in that order.
        return { result: user, events: collectDomainEvents(user) };
    }
}

// --- fakes to run the flow end-to-end, without real infrastructure ---

// The other half of the pillar: the same blueprint that generated the
// UserRepository *type* above generates a working double for it. Stores
// serialized rows, not live instances — the way a real table would — and each
// read re-hydrates via fromJSON, exercising the strict real-world path.
const userRepository: UserRepository = inMemoryRepositoryOf(User, [
    "findById",
    "findByEmail",
    "create",
    "update",
    "delete",
    "findMany",
]);

const newUser = new User({
    email: "account@email.com",
    name: "John Doe",
    password: generateUUID(),
});

await userRepository.create(newUser);

console.log(
    (await userRepository.findMany({ page: 1, perPage: 20 })).map((i) =>
        i.toJSON(),
    ),
);

newUser.rename("John Doe 2");

console.log(
    (await userRepository.findMany({ page: 1, perPage: 20 })).map((i) =>
        i.toJSON(),
    ),
);

await userRepository.update(newUser);

console.log(
    (await userRepository.findMany({ page: 1, perPage: 20 })).map((i) =>
        i.toJSON(),
    ),
);

// const secretsVault = new Map<string, string>();

// const secrets: SecretsService = {
//     async create(value) {
//         const id = generateUUID();
//         secretsVault.set(id, value);
//         return id;
//     },
//     async remove(id) {
//         secretsVault.delete(id);
//     },
//     async find(id) {
//         const value = secretsVault.get(id);
//         if (value === undefined)
//             throw new Error(`No secret found for id "${id}".`);
//         return value;
//     },
//     async check(id, value) {
//         return secretsVault.get(id) === value;
//     },
// };

// const createUserCommand = new CreateUser({
//     name: "Alan",
//     email: "alan@roastery.dev",
//     password: "AikoIsDead-13",
// });

// const { events: createdEvents, result: user } = await createUserCommand.execute(
//     {
//         secrets,
//         users: userRepository,
//     },
// );

// console.log(
//     "created:",
//     createdEvents.map((event) => event.name),
//     user.toJSON(),
// );

// const updateUserCommand = new UpdateUser({
//     email: "alan@roastery.dev",
//     password: "AikoIsDead-13",
//     newName: "Alan Reis",
// });

// const { events: updatedEvents, result: updatedUser } =
//     await updateUserCommand.execute({
//         secrets,
//         users: userRepository,
//         // Calling execute() directly, off the registry, still owes UpdateUser
//         // the same `commands.login` its Deps declares — this is the manual
//         // equivalent of what commandRegistry wires up automatically below.
//         commands: {
//             login: (payload) =>
//                 new UserLogin(payload).execute({
//                     secrets,
//                     users: userRepository,
//                 }),
//         },
//     });

// console.log(
//     "updated:",
//     updatedEvents.map((event) => event.name),
//     updatedUser.toJSON(),
// );

// const loginCommand = new UserLogin({
//     email: "alan@roastery.dev",
//     password: "AikoIsDead-13",
// });

// const { result: loggedInUser, events } = await loginCommand.execute({
//     secrets,
//     users: userRepository,
// });

// console.log("logged in:", {
//     output: loggedInUser.toJSON(),
//     events: events.map((e) => e.name),
// });

// const readUserCommand = new ReadUser({ id: user.id });

// const { events: readEvents, result: readUser } = await readUserCommand.execute({
//     users: userRepository,
// });

// console.log(
//     "read:",
//     readEvents.map((event) => event.name),
//     readUser.toJSON(),
// );

// const deleteUserCommand = new DeleteUser({ id: user.id });

// const { events: deletedEvents, result: deletedUser } =
//     await deleteUserCommand.execute({ users: userRepository });

// console.log(
//     "deleted:",
//     deletedEvents.map((event) => event.name),
//     deletedUser.isDestroyed,
// );

// const registry = commandRegistry({
//     createUser: CreateUser,
//     updateUser: UpdateUser,
//     login: UserLogin,
// }).withDependencies<CreateUserDeps>({ secrets, users: userRepository });

// const registeredCreateUser = await registry.get("createUser")({
//     name: "Registry User",
//     email: "registry@roastery.dev",
//     password: "Password-123",
// });

// console.log("via registry:", registeredCreateUser.result.toJSON());

// // UpdateUser reuses the already-registered Login command internally (via
// // deps.commands.login) instead of duplicating credential verification.
// const { result: renamedUser } = await registry.get("updateUser")({
//     email: "registry@roastery.dev",
//     password: "Password-123",
//     newName: "Registry User Renamed",
// });

// console.log(
//     "updated via registry (composed with login):",
//     renamedUser.toJSON(),
// );
