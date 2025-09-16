import { UUID } from "crypto";
import { Operation } from "./Operation";
import { App } from "./App";
import { Range } from "@/class/Info";
import { Glyph } from "./Glyph";

export namespace Highlight {
  export const name = 'Highlight';
  const _ = Symbol(Highlight.name)
  export type Id = UUID & {
    readonly [_]: unique symbol
  }

  export interface Type {
    id: Highlight.Id
    type: 'highlight',
    time_range: Range,
    tags: string[],
    name: string;
    operation_id: Operation.Id;
    color: string
    glyph_id: Glyph.Id
  }

  export class Entity {
    static selected = (app: App.Type): Highlight.Type[] => {
      const operation = Operation.Entity.selected(app);
      if (!operation) {
        return [];
      }

      return app.target.highlights.filter(h => h.operation_id === operation.id);
    }
  }
}
