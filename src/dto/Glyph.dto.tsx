import { μ } from '@/class/Info';
import { generateUUID } from '@/ui/utils';
import { Icon } from '@impactium/icons';

export const GlyphMap: Map<μ.Glyph, Icon.Name> = new Map();

const newGlyphId = () => {
  return generateUUID() as μ.Glyph;
}

GlyphMap.set(newGlyphId(), 'TriangleAlert');
GlyphMap.set(newGlyphId(), 'CircleHelp');
GlyphMap.set(newGlyphId(), 'CircleAlert');
GlyphMap.set(newGlyphId(), 'ShieldAlert');
GlyphMap.set(newGlyphId(), 'CircleCheck');
GlyphMap.set(newGlyphId(), 'CircleX');
GlyphMap.set(newGlyphId(), 'ShieldQuestion');
GlyphMap.set(newGlyphId(), 'X');
GlyphMap.set(newGlyphId(), 'Check');
GlyphMap.set(newGlyphId(), 'Info');
GlyphMap.set(newGlyphId(), 'Battery');
GlyphMap.set(newGlyphId(), 'BatteryLow');
GlyphMap.set(newGlyphId(), 'BatteryMedium');
GlyphMap.set(newGlyphId(), 'BatteryFull');
GlyphMap.set(newGlyphId(), 'BatteryCharging');
GlyphMap.set(newGlyphId(), 'StickyNote');
GlyphMap.set(newGlyphId(), 'Mail');
GlyphMap.set(newGlyphId(), 'MailOpen');
GlyphMap.set(newGlyphId(), 'Paperclip');
GlyphMap.set(newGlyphId(), 'Flame');
GlyphMap.set(newGlyphId(), 'HardDrive');
GlyphMap.set(newGlyphId(), 'HardDriveDownload');
GlyphMap.set(newGlyphId(), 'HardDriveUpload');
GlyphMap.set(newGlyphId(), 'Key');
GlyphMap.set(newGlyphId(), 'QrCode');
GlyphMap.set(newGlyphId(), 'Barcode');
GlyphMap.set(newGlyphId(), 'Ticket');
GlyphMap.set(newGlyphId(), 'Usb');
GlyphMap.set(newGlyphId(), 'ThumbsUp');
GlyphMap.set(newGlyphId(), 'ThumbsDown');
GlyphMap.set(newGlyphId(), 'Heart');
GlyphMap.set(newGlyphId(), 'Biohazard');
GlyphMap.set(newGlyphId(), 'Bitcoin');
GlyphMap.set(newGlyphId(), 'Bluetooth');
GlyphMap.set(newGlyphId(), 'BluetoothOff');
GlyphMap.set(newGlyphId(), 'Bug');
GlyphMap.set(newGlyphId(), 'Map');
GlyphMap.set(newGlyphId(), 'MapPin');
GlyphMap.set(newGlyphId(), 'MapPinOff');
GlyphMap.set(newGlyphId(), 'MapPinned');
GlyphMap.set(newGlyphId(), 'Fingerprint');
GlyphMap.set(newGlyphId(), 'Sigma');
GlyphMap.set(newGlyphId(), 'SquareSigma');
GlyphMap.set(newGlyphId(), 'Radio');
GlyphMap.set(newGlyphId(), 'Package');
GlyphMap.set(newGlyphId(), 'Settings');
GlyphMap.set(newGlyphId(), 'Gift');
GlyphMap.set(newGlyphId(), 'Link');
GlyphMap.set(newGlyphId(), 'Wrench');
GlyphMap.set(newGlyphId(), 'Chrome');
GlyphMap.set(newGlyphId(), 'Zap');

export const CustomGlyphs: Record<μ.Glyph, string> = {}