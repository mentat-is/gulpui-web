import { Engine } from "@/class/Engine.dto";
import { Icon } from "@impactium/icons";

export interface EngineMap {
  img: Icon.Name;
  title: string;
  plugin: Engine.List;
}

export const enginesBase: EngineMap[] = [
  {
    img: 'Barcode',
    title: 'Default',
    plugin: 'default'
  },
  {
    img: 'ChartBar',
    title: 'HeightMap',
    plugin: 'height'
  },
  {
    img: 'Waypoints',
    title: 'Graph',
    plugin: 'graph'
  },
  // {
  //   img: 'CodeXml',
  //   title: 'Status codes',
  //   plugin: 'apache'
  // }
]
