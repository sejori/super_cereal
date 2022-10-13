# Super Cereal 🥣

Serialize and deserialize any object without any weird syntax.

**TL;DR:** You get to keep your lovely graph structure (even if its circular 🤯) and all of your lovely class methods too.

## But how?

```
import { Store, Model } from "./mod.ts";

const store = new Store();

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

const bobId = bob.save();
const freshBob = store.load(bobId) as Person;

const steve = new Person("Steve");
freshBob.addFriend(steve);

console.log(freshBob.friends);
```

The Al-Gore-ithm does a depth-first-search, leaving unique IDs on non-primitive values, then serializing and replacing all refs with their corresponding ID to "unlink" the structure so we never get stuck in circular reference loops.

First instantiate a `Store`, then make your classes extend `Model` and call `super(store, arguments)` in your constuctors. This allows the store to hold onto constructor clones that reinstantiate your classes before using `Object.assign` to apply the deserialized values.

## But why?

I don't want to use complex databases. I just want to serialize my data and then store it. No matter how complex the structure or whether in the browser on the server. 

The goal was to require minimal additional code beyond regular looking JS/TS and I think this fits the bill nicely, just extend from `Model` and call `super(store, arguments)` in your constructors. The only slight caveat is that you have use `store.load(id) as ClassName` to keep accurate TS syntax highlighting (there is currently no way for TS to infer this and generic types don't work with recursion).

