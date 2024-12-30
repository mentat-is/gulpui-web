import { Link } from '@/class/Info';
import { useApplication } from '@/context/Application.context'
import { Banner } from '@/ui/Banner'
import { LinkCombination } from '@/components/LinkCombination';
import { λFile } from '@/dto/Dataset';

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