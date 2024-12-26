import { μ } from '@/class/Info';
import { generateUUID } from '@/ui/utils';
import { Icon } from '@impactium/icons';

// @ts-ignore
export const GlyphMap: Record<μ.Glyph, Array<Icon.Name>> = {
  [generateUUID()]:'TriangleAlert',
  [generateUUID()]:'CircleHelp',
  [generateUUID()]:'CircleAlert',
  [generateUUID()]:'ShieldAlert',
  [generateUUID()]:'CircleCheck',
  [generateUUID()]:'CircleX',
  [generateUUID()]:'ShieldQuestion',
  [generateUUID()]:'X',
  [generateUUID()]:'Check',
  [generateUUID()]:'Info',
  [generateUUID()]:'Battery',
  [generateUUID()]:'BatteryLow',
  [generateUUID()]:'BatteryMedium',
  [generateUUID()]:'BatteryFull',
  [generateUUID()]:'BatteryCharging',
  [generateUUID()]:'StickyNote',
  [generateUUID()]:'Mail',
  [generateUUID()]:'MailOpen',
  [generateUUID()]:'Paperclip',
  [generateUUID()]:'Flame',
  [generateUUID()]:'HardDrive',
  [generateUUID()]:'HardDriveDownload',
  [generateUUID()]:'HardDriveUpload',
  [generateUUID()]:'Key',
  [generateUUID()]:'QrCode',
  [generateUUID()]:'Barcode',
  [generateUUID()]:'Ticket',
  [generateUUID()]:'Usb',
  [generateUUID()]:'ThumbsUp',
  [generateUUID()]:'ThumbsDown',
  [generateUUID()]:'Heart',
  [generateUUID()]:'Biohazard',
  [generateUUID()]:'Bitcoin',
  [generateUUID()]:'Bluetooth',
  [generateUUID()]:'BluetoothOff',
  [generateUUID()]:'Bug',
  [generateUUID()]:'Map',
  [generateUUID()]:'MapPin',
  [generateUUID()]:'MapPinOff',
  [generateUUID()]:'MapPinned',
  [generateUUID()]:'Fingerprint',
  [generateUUID()]:'Sigma',
  [generateUUID()]:'SquareSigma',
  [generateUUID()]:'Radio',
  [generateUUID()]:'Package',
  [generateUUID()]:'Settings',
  [generateUUID()]:'Gift',
  [generateUUID()]:'Link',
  [generateUUID()]:'Wrench',
  [generateUUID()]:'Chrome',
  [generateUUID()]:'Zap'
}

export const CustomGlyphs: Record<μ.Glyph, string> = {}