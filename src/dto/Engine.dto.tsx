import { EngineList } from "@/class/Engine.dto";
import { Icon } from "@impactium/icons";

export interface EngineMap {
  img: Icon.Name;
  title: string;
  plugin: EngineList;
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
  {
    img: 'CodeXml',
    title: 'Status codes',
    plugin: 'apache'
  }
]
