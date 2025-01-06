export namespace λMapping {
  export interface Raw {
    metadata: {
      plugin: string[]
    },
    filename: string;
    mapping_ids: string[];
  }

  export interface Plugin {
    name: string;
    methods: Method[]
  }

  export interface Method {
    name: string;
    mappings: Mapping[]
  }

  export type Mapping = string;
}
