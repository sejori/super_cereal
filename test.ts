import { assert } from "https://deno.land/std@0.150.0/testing/asserts.ts"
import { Store, Model } from "./mod.ts"

Deno.test("super_cereal", async (t) => {
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

    getTitle() { return this.#title }
  }

  const fencing = new Hobby("fencing")
  const bob = new Person("Bob")
  const jim = new Person("Jim")
  bob.addFriend(jim)

  await t.step("circular ref object retains methods after serializing and deserializing", () => {
    assert(bob.name === "Bob" && bob.friends.includes(jim))

    const { nodeId } = jim.save()
    const freshJim = store.load(nodeId) as Person
    freshJim.addHobby(fencing)

    assert(jim !== freshJim)
    assert(freshJim.hobbies[0].getTitle() === "fencing")
    assert(freshJim.friends[0].name === "Bob")
  }) 

  await t.step("array retains all non-primitive items & sets retain primitive types", () => {
    const now = new Date()

    const testArray = [
      { hello: "world" },
      [ "I'm a nested array", 123 ],
      new Map().set("key1", 1).set("key2", "value2"),
      new Set().add(5).add(10),
      new Date(now),
      function addNums(x: number, y: number) { return x + y },
      function (x: number) { return x*x },
      (x: number) => { return x * x },
      (x: number, y: number) => x * y
    ]
    const { nodeId } = store.save(testArray)

    // deno-lint-ignore no-explicit-any
    const freshArray = store.load(nodeId) as Array<any>

    assert(freshArray[0].hello = "world")
    // deno-lint-ignore no-explicit-any
    assert(freshArray[1].every((item: any) => [ "I'm a nested array", 123 ].some(i => item === i)))
    assert(freshArray[2].get("key1") === 1 && freshArray[2].get("key2") === "value2")
    assert(freshArray[3].has(5) && freshArray[3].has(10))
    assert(freshArray[4].valueOf() === now.valueOf())
    assert(freshArray[5](1,2) === 3)
    assert(freshArray[6](5) === 25)
    assert(freshArray[7](3) === 9)
    assert(freshArray[8](7, 8) === 56)
  }) 

  let lex_nodeId: string | undefined
  let lex_map: Map<string, string> | undefined
  await t.step("serialized map returned as expected", () => {
    const store1 = new Store()

    class List extends Model {
      things: string[]
      constructor(things: string[]) {
        super(store1, arguments)
        this.things = things
      }
    }

    const list = new List(["swords", "sandals"])
    const {nodeId, map} = list.save()

    lex_nodeId = nodeId
    lex_map = map

    assert(lex_nodeId)
    assert(lex_map.size > 0)
  }) 

  await t.step("providing map works", () => {
    const store2 = new Store(lex_map)

    class List extends Model {
      things: string[]
      constructor(things: string[]) {
        super(store2, arguments)
        this.things = things
      }
    }
    new List(["test"])

    const fresh_list = store2.load(lex_nodeId!)

    assert(fresh_list.things[0] === "swords")
    assert(fresh_list.things[1] === "sandals")
  })

  await t.step("inheritance serialization", () => {
    class Employee extends Person {
      job: string

      constructor(name: string, job_title: string) {
        super(name)
        this.job = job_title
      }
    }

    const test_employee = new Employee("Kevin", "engineer")
    const { nodeId } = test_employee.save()
    const fresh_employee = store.load(nodeId)
    
    assert(fresh_employee.job === "engineer" && fresh_employee.name === "Kevin")
  })

  await t.step("response serialization", async () => {
    const res = new Response("This is a test response!", {
      status: 201,
      statusText: "OK",
      headers: new Headers({
        "Content-Type": "text/plain"
      })
    })

    const { nodeId } = store.save(res)
    const fresh_res = store.load(nodeId) as Response

    assert(await fresh_res.text() === "This is a test response!")
    assert(fresh_res.status === 204)
    assert(fresh_res.statusText === "OK")
    assert(fresh_res.headers.get("Content-Type") === "text/plain")
  })
})