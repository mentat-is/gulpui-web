import { Link, File } from "@/class/Info";
import { useApplication } from "@/context/Application.context"
import { λFile } from "@/dto/File.dto"
import { Banner } from "@/ui/Banner"
import { LinkCombination } from "@/components/LinkCombination";

interface LinkVisualizerProps {
  file: λFile
};

export function LinkVisualizer({ file }: LinkVisualizerProps) {
  const { app } = useApplication();

  const links = Link.findByFile(app, file)

  return (
    <Banner title='File links'>
      {links.map(link => <LinkCombination key={link.id} link={link} />)}
    </Banner>
  )
}