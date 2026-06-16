type UUID = string;

export namespace Group {
  export const name = 'Group';
  const _ = Symbol(Group.name)
  export type Id = UUID & {
    readonly [_]: unique symbol
  }

  export interface Type {
    [key: string]: any;
  }
}
