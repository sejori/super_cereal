import Store from "./Store.ts"

export class Model {
  #storage

  constructor(store: Store, constructArgs: IArguments) {
    const This = Object.getPrototypeOf(this).constructor

    this.#storage = store
    this.#storage.addConstructor(This.name, 
      (nodeStr: string) => {
        return Object.assign(new This(...constructArgs), JSON.parse(nodeStr))
      }
    )
  }

  save() {
    return this.#storage.save(this)
  }
}

export default Model