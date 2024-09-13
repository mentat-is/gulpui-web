export interface λIndex {
  name: string;
  indexes: IndexDetailed[];
  template: string;
  selected: boolean;
}

export interface IndexDetailed {
  index_name: string
  index_uuid: string;
}
