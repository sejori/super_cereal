# Super Cereal 🥣

Serialize and deserialize any object and all of its references. Supports:
- Class (with inheritance set-up)
- Object
- Array
- Function
- Map
- Set
- Date

**TL;DR:** You get to keep your lovely graph structure (even if its circular 🤯) and all of your lovely class methods too.

## But how?

```
import { Store, Model } from "./mod.ts";

const storeObj: Record<string, string> = {};

const store = new Store({
  get: (id: string) => storeObj[id],
  set: (id:string, value: string) => storeObj[id] = value
});

class Person extends Model {
  name: string;
  friends: Person[] = [];

  constructor(name: string) {
    super(store, arguments);
    this.name = name;
  }

  addFriend(friend: Person) {
    this.friends.push(friend);
    friend.friends.push(this);
  }
}

const jim = new Person("Jim");
const bob = new Person("Bob");
jim.addFriend(bob);

const jimId = jim.save();
const freshJim = store.load(jimId) as Person;

console.log(freshJim.friends);

const steve = new Person("Steve");
freshJim.addFriend(steve);

console.log(freshJim.friends);
```

The Al-Gore-ithm does a depth-first-search, leaving unique IDs on non-primitive values. It then serializes and stores objects by ID, replacing all refs with the corresponding ID to "unlink" the structure so it never gets stuck in a circular reference loop.

First instantiate a `Store`, then make your classes extend `Model` and call `super(store, arguments)` in their constuctors. This allows the store to reinstantiate them with their initial arguments before using `Object.assign` to apply deserialized property values.

## But why?

I wanted a tool that could serialize any in-memory data structure with classes and store it in a key-value store. This allows for browser-based storage of OOP software state that can extend to the edge/cloud.

The goal was to require minimal additional class boilerplate and I think this fits the bill nicely, just extend from `Model` and call `super(store, arguments)` in constructors. The only caveat is that you have use `store.load(id) as Classname` to keep accurate TS syntax highlighting (there is currently no way for TS to infer this and generic types don't work with nested structures).

