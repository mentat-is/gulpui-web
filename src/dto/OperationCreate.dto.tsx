import { ResponseBase } from "./ResponseBase.dto";

export type OperationCreate = ResponseBase<{
  id: number,
  name: string,
  description: string,
  glyph_id: null,
  workflow_id: null
}>