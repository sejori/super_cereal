import { assert } from "https://deno.land/std@0.150.0/testing/asserts.ts"
import { Store, Model } from "./mod.ts"

Deno.test("UTIL: Storage", async (t) => {
  const store = new Store()

  class Person extends Model {
    name: string
    friends: Person[] = []
    hobbies: Hobby[] = []

    constructor(name: string) {
      super(store, arguments)
      this.name = name
    }

    addHobby(hobby: Hobby) {
      this.hobbies.push(hobby)
    }

    addFriend(friend: Person) {
      this.friends.push(friend)
      friend.friends.push(this)
    }
  }

  class Hobby extends Model {
    #title: string
    
    constructor(title: string) {
      super(store, arguments)
      this.#title = title
    }

    getTitle () { return this.#title }
  }

  const fencing = new Hobby("fencing")
  const bob = new Person("Bob")
  const jim = new Person("Jim")
  bob.addFriend(jim)

  await t.step("circular ref object retains methods after serializing and deserializing", () => {
    assert(bob.name === "Bob" && bob.friends.includes(jim))

    const jimId = jim.save()
    const freshJim = store.load(jimId) as Person
    freshJim.addHobby(fencing)

    assert(jim !== freshJim)
    assert(freshJim.hobbies[0].getTitle() === "fencing")
    assert(freshJim.friends[0].name === "Bob")
  }) 

  await t.step("array retains all non-primitive items", () => {
    const now = new Date()

    const testArray = [
      { hello: "world" },
      [ "I'm a nested array", 123 ],
      new Map().set("key", "value"),
      new Set().add(5),
      new Date(now),
      function addNums(x: number, y: number) { return x + y },
      function (x: number) { return x*x },
      (x: number) => { return x * x },
      (x: number, y: number) => x * y
    ]
    const arrayId = store.save(testArray)

    // deno-lint-ignore no-explicit-any
    const freshArray = store.load(arrayId) as Array<any>

    console.log(freshArray[2])

    assert(freshArray[0].hello = "world")
    // deno-lint-ignore no-explicit-any
    assert(freshArray[1].every((item: any) => [ "I'm a nested array", 123 ].some(i => item === i)))
    assert(freshArray[2].get("key") === "value")
    assert(freshArray[3].has(5))
    assert(freshArray[4].valueOf() === now.valueOf())
    assert(freshArray[5](1,2) === 3)
    assert(freshArray[6](5) === 25)
    assert(freshArray[7](3) === 9)
    assert(freshArray[8](7, 8) === 56)
  }) 
})