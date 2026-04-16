import { Note } from '@/entities/Note';
import { Link } from '@/entities/Link';
import { Source } from '@/entities/Source';
import { Context } from '@/entities/Context';
import { Doc } from '@/entities/Doc';
import { Highlight } from '@/entities/Highlight';
import { Glyph } from '@/entities/Glyph';

export class DataStore {
  // Pure mutable data structures. No React proxies.
  static notes: Note.Type[] = [];
  static links: Link.Type[] = [];
  
  // Manteniamo la Map per O(1) lookup durante il render, ma mutabile e fuori da React
  static events: Map<string, Doc.Type[]> = new Map(); 
  
  static highlights: Highlight.Type[] = [];
  static glyphs: Glyph.Type[] = [];

  // Atomic flag to signal requestAnimationFrame that data has changed
  static isDirty: boolean = false;

  // Mutation utility
  static markDirty() {
    this.isDirty = true;
  }
}
