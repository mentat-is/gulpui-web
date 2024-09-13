import { RawContext } from "./Context.dto";

export interface λOperation {
  id: number,
  name: string,
  description: string,
  glyph_id: number,
  workflow_id: number | null,
  selected: boolean;
  contexts: string[]
}

export interface RawOperation {
  name: string
  id: number
  contexts: RawContext[]
}