import { Operation } from "./Operation";
import { App } from "./App";
import { Range } from "@/class/Info";
import { Glyph } from "./Glyph";
import { User } from "./User";

type UUID = string;

export namespace Highlight {
  export const name = 'Highlight';
  const _ = Symbol(Highlight.name)
  export type Id = UUID & {
    readonly [_]: unique symbol
  }

  export interface Type {
    id: Highlight.Id
    type: 'highlight',
    owner_user_id: User.Id;
    description: string;
    time_range: Range,
    tags: string[],
    name: string;
    operation_id: Operation.Id;
    color: string
    glyph_id: Glyph.Id
    [key: string]: any;
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
