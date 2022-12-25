import { serialize, parseFcnString } from "./utils.ts"

const encoder = new TextEncoder()

interface Shelf {
  get: (nodeId:string) => Promise<string> | Promise<undefined> | string | undefined,
  set: (nodeId:string, nodeStr: string) => Promise<string> | Promise<void> | string | void,
}

export class Store {
  code = `_${crypto.randomUUID()}`
  // deno-lint-ignore no-explicit-any
  constructors: Map<string, any> = new Map()
  shelf: Shelf | Map<string, string> = new Map()
  #basket: Map<string, unknown> = new Map()

  constructor(storage?: Shelf | Map<string, string>) {
    if (storage) this.shelf = storage

    this.addConstructor("Object", (nodeStr: string): Record<string, unknown> => Object.assign({}, JSON.parse(nodeStr)))
    this.addConstructor("Array", (nodeStr: string): unknown[] => Object.assign([], JSON.parse(nodeStr)))
    this.addConstructor("Date", (nodeStr: string) => new Date(Number(nodeStr)))
    this.addConstructor("Set", (nodeStr: string) => {
      const set = new Set()
      this.constructors.get("Array")(nodeStr).forEach((item: string) => set.add(item))
      return set
    })
    this.addConstructor("Map", (nodeStr: string) => {
      const map = new Map()
      this.constructors.get("Array")(nodeStr).forEach(([key,value]: [key: string, value: string]) => map.set(key, value))
      return map
    })
    this.addConstructor("Function", (nodeStr: string) => {
      const fcn = parseFcnString(nodeStr)
      return fcn
    })
    this.addConstructor("Response", (nodeStr: string) => {
      const data = JSON.parse(nodeStr)

      const headers = new Headers()
      data.headers.forEach((entry: string[]) => headers.set(entry[0], entry[1]))

      return new Response(data.body, {
        status: data.status,
        statusText: data.statusText,
        headers
      })
    })
  }

  addConstructor(name: string, fcn: (nodeStr: string) => unknown) {
    this.constructors.set(name, fcn)
  }
  
  // https://github.com/microsoft/TypeScript/issues/47357#issuecomment-1249977221
  // deno-lint-ignore no-explicit-any
  async save(node: any): Promise<string> {
    // DFS - assign unique id to nodes for breadcrumbs
    // then replace refs with linked node id and stringify to items
    const proto = Object.getPrototypeOf(node)

    node[this.code] = `${proto.constructor.name}+${crypto.randomUUID()}`

    // responses handled entirely in serialize util
    if (proto.constructor.name !== "Response") for (const key in node) {
      if (node[key] === Object(node[key])) { // non-primitive
        if (!node[key][this.code]) await this.save(node[key])
        node[key] = node[key][this.code]
      }
    }

    const serialized = await serialize(node)
    await this.shelf.set(node[this.code], serialized)

    return node[this.code]
  }

  async load(nodeId: string) {
    const objType = nodeId.slice(0, nodeId.indexOf("+"))
    const constructor = this.constructors.get(objType)
    if (!constructor) throw new Error(`No constructor found for ${objType} in id ${nodeId}`)
    
    const nodeString = await this.shelf.get(nodeId)
    if (!nodeString) throw new Error(`No node string found for item with id ${nodeId}`)

    const nodeObj = constructor(nodeString)
    this.#basket.set(nodeId, nodeObj)

    for (const key in nodeObj) {
      // remove store code property
      if (key === this.code) delete nodeObj[key]

      if (this.#basket.has(nodeObj[key])) {
        // replace id with object ref
        nodeObj[key] = this.#basket.get(nodeObj[key])
      } else if (await this.shelf.get(nodeObj[key])) {
        // otherwise deserialize next object from id
        nodeObj[key] = await this.load(nodeObj[key])
      }
    }

    return nodeObj
  }
}

export default Store