import { UUID } from "crypto"
import { Filter } from "./Filter"

export namespace Query {
  export interface Type {
    string: string
    filters: Filter.Type[]
  }
}