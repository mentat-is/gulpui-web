import { Link } from "@/class/Info";
import { useApplication } from "@/context/Application.context"
import { Banner } from "@/ui/Banner"
import { LinkCombination } from "@/components/LinkCombination";
import { λSource } from "@/dto/Operation.dto";

interface LinkVisualizerProps {
  source: λSource
};

export function LinkVisualizer({ source }: LinkVisualizerProps) {
  const { app } = useApplication();

  const links = Link.findByFile(app, source)

  return (
    <Banner title='File links'>
      {links.map(link => <LinkCombination key={link.id} link={link} />)}
    </Banner>
  )
}