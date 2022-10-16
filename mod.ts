import { serialize, parseFcnString, replacer } from "./utils.ts"

export class Store {
  code = crypto.randomUUID()
  constructors = new Map()
  serialized = new Map()
  deserialised = new Map()

  constructor() {
    this.constructors.set("Object", (nodeStr: string): Record<string, unknown> => Object.assign({}, JSON.parse(nodeStr)))
    this.constructors.set("Array", (nodeStr: string): unknown[] => Object.assign([], JSON.parse(nodeStr)))
    this.constructors.set("Date", (nodeStr: string) => new Date(nodeStr))
    this.constructors.set("Set", (nodeStr: string) => {
      const set = new Set()
      this.constructors.get("Array")(nodeStr).forEach((item: string) => set.add(item))
      return set
    })
    this.constructors.set("Map", (nodeStr: string) => {
      const map = new Map()
      this.constructors.get("Array")(nodeStr).forEach(([key,value]: [key: string, value: string]) => map.set(key, value))
      return map
    })
    this.constructors.set("Function", (nodeStr: string) => {
      const fcn = parseFcnString(nodeStr)
      return fcn
    })
  }
  
  // deno-lint-ignore no-explicit-any
  save(node: any) {
    // DFS - assign unique id to nodes for breadcrumbs
    // then replace refs with linked node id and stringify to items
    const proto = Object.getPrototypeOf(node)
    node[this.code] = `${proto.constructor.name}+${crypto.randomUUID()}`

    for (const key in node) {
      if (node[key] === Object(node[key])) { // non-primitive
        if (!node[key][this.code]) this.save(node[key])
        node[key] = node[key][this.code]
      }
    }

    const serialized = serialize(node)
    this.serialized.set(node[this.code], serialized)
    return node[this.code]
  }

  load(nodeId: string) {
    const objType = nodeId.slice(0, nodeId.indexOf("+"))
    const constructor = this.constructors.get(objType)
    if (!constructor) throw new Error(`No constructor found for ${objType} in id ${nodeId}`)
    
    const nodeString = this.serialized.get(nodeId)
    if (!nodeString) throw new Error(`No node string found for item with id ${nodeId}`)

    const nodeObj = constructor(nodeString)     
    this.deserialised.set(nodeId, nodeObj)

    for (const key in nodeObj) {
      // remove store code property
      if (nodeObj[key] === nodeId) delete nodeObj[key]

      if (this.deserialised.has(nodeObj[key])) {
        // replace id with object ref
        nodeObj[key] = this.deserialised.get(nodeObj[key])
      } else if (this.serialized.has(nodeObj[key])) {
        // otherwise deserialize next object from id
        nodeObj[key] = this.load(nodeObj[key])
      }
    }

    return nodeObj
  }
}

export class Model {
  #storage

  constructor(store: Store, constructArgs: IArguments) {
    const This = Object.getPrototypeOf(this).constructor

    this.#storage = store
    this.#storage.constructors.set(This.name, 
      (nodeStr: string) => {
        return Object.assign(new This(...constructArgs), JSON.parse(nodeStr))
      }
    )
  }

  save() {
    return this.#storage.save(this)
  }
}