import { serialize, parseFcnString } from "./utils.ts"

export class Store {
  code = crypto.randomUUID()
  constructors = new Map()
  items = new Map()

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
    this.items.set(node[this.code], serialized)
    return node[this.code]
  }

  load(rootId: string) {
    const parsed = new Map()

    const parseNode = (nodeId: string) => {
      const objType = nodeId.slice(0, nodeId.indexOf("+"))
      const constructor = this.constructors.get(objType)
      if (!constructor) throw new Error(`No constructor found for ${objType} in id ${nodeId}`)
      
      const nodeString = this.items.get(nodeId)
      if (!nodeString) throw new Error(`No node string found for item with id ${nodeId}`)

      const nodeObj = constructor(nodeString)     
      parsed.set(nodeId, nodeObj)
 
      for (const key in nodeObj) {
        // remove store code property
        if (nodeObj[key] === nodeId) delete nodeObj[key]

        if (parsed.has(nodeObj[key])) {
          // replace id with object ref
          nodeObj[key] = parsed.get(nodeObj[key])
        } else if (this.items.has(nodeObj[key])) {
          // otherwise deserialize next object from id
          nodeObj[key] = parseNode(nodeObj[key])
        }
      }

      return nodeObj
    }

    return parseNode(rootId)
  }
}

export class Model {
  #storage

  constructor(store: Store, constructArgs: IArguments) {
    const This = Object.getPrototypeOf(this).constructor

    this.#storage = store
    this.#storage.constructors.set(This.name, () => new This(...constructArgs))
  }

  save() {
    return this.#storage.save(this)
  }
}