import s from './styles/Link.module.css';
import { useApplication } from '@/context/Application.context';
import { Event, Link } from '@/class/Info';
import { DisplayEventDialog } from '@/dialogs/Event.dialog';
import { DisplayGroupDialog } from '@/dialogs/Group.dialog';
import { λLink } from '@/dto/Dataset';
import { Point } from './Point';

export namespace LinkPoint {
  export interface Props extends Omit<Point.Props, 'icon' | 'name' | 'accent'> {
    link: λLink
  }
}

export function LinkPoint({ link, ...props }: LinkPoint.Props) {
  const { app, spawnDialog } = useApplication();

  const openEvent = () => {
    if (link.docs.length === 0) {
      return null;
    }

    const dialog = link.docs.length === 1
      ? <DisplayEventDialog event={Event.id(app, link.docs[0].id)} />
      : <DisplayGroupDialog events={link.docs.map(doc => Event.id(app, doc.id))} />;s

    spawnDialog(dialog);
  };

  

  return (
    <Point onClick={openEvent} icon={Link.icon(link)} name={link.name} accent={link.color} {...props} />
  )
}
