import { UUID } from "crypto";
import { Source } from "./Source";
import { App } from "./App";
import { Arrayed } from "@/class/Info";
import { Parser } from "./addon/Parser";
import { Note } from "./Note";
import { Operation } from "./Operation";
import { Context } from "./Context";
import { Internal } from "./addon/Internal";
import { toast } from "sonner";
import { Icon } from "@impactium/icons";
import { Logger } from "@/dto/Logger.class";
import { DataStore } from "@/store/DataStore";

export namespace Doc {
  export const name = "Doc";
  const _ = Symbol(Doc.name);
  export type Id = UUID & {
    readonly [_]: unique symbol;
  };

  export interface Type {
    _id: Doc.Id;
    timestamp: number;
    "gulp.source_id": Source.Id;
    "gulp.event_code": number;
    "gulp.storage_id"?: string;
  }

  export type Minified = Pick<Doc.Type, "_id" | "gulp.source_id" | "timestamp">;

  interface Flag {
    KEY: string;
    getList: (operationId?: Operation.Id) => Set<Doc.Id>;
    getDocIds: (app: App.Type, operationId?: Operation.Id) => Doc.Id[];
    getDocs: (app: App.Type, operationId?: Operation.Id) => Doc.Type[];
    isLimitReached: (ids?: Set<Doc.Id>) => boolean;
    toggle: (id: Doc.Id, operationId?: Operation.Id) => boolean;
    reset: (operationId?: Operation.Id) => void;
    isFlagged: (id: Doc.Id, operationId?: Operation.Id) => boolean;
  }

  export class Entity {
    /**
     * Global event lookup index: maps Doc.Id → Doc.Type for O(1) access.
     *
     * ARCHITECTURAL DECISION: Previously, `Doc.Entity.id()` used
     * `Array.from(app.target.events.values()).flat().find(...)` which created
     * a new flat array of ALL events (up to 320k) on every single call.
     * With links calling `id()` per doc_id per link, this caused ~6.4M array
     * operations per render frame. The Map index reduces this to O(1).
     *
     * The index is maintained by `add()` and `delete()`, and must be cleared
     * via `clearIndex()` when switching operations to prevent memory leaks.
     */
    private static _index = new Map<Doc.Id, Doc.Type>();

    /** Clears the entire doc lookup index. Called during operation switch to free memory. */
    public static clearIndex = () => Doc.Entity._index.clear();

    /** Extracts a minimal Doc payload from a full event, keeping only essential fields. */
    public static toDoc = (event: Doc.Type) => ({
      _id: event._id,
      "gulp.source_id": event["gulp.source_id"],
      timestamp: event.timestamp,
    });

    /** Returns the Operation.Id for a doc by looking it up through its source. */
    public static operationId = (app: App.Type, doc: Doc.Type): Operation.Id =>
      Source.Entity.id(app, doc["gulp.source_id"]).operation_id;

    /** Returns the Context.Id for a doc by looking it up through its source. */
    public static contextId = (app: App.Type, doc: Doc.Type): Context.Id =>
      Source.Entity.id(app, doc["gulp.source_id"]).context_id;

    /**
     * Removes all events for the given source files.
     * Also removes corresponding entries from the `_index` to prevent stale references.
     */
    public static delete = (app: App.Type, files: Arrayed<Source.Type>) => {
      files = Parser.array(files);

      files.forEach((file) => {
        // Remove from index before deleting
        const events = DataStore.events.get(file.id);
        if (events) {
          events.forEach((e) => Doc.Entity._index.delete(e._id));
        }
        DataStore.events.delete(file.id);
        DataStore.events.set(file.id, []);
      });

      return DataStore.events;
    };

    /** Returns the time range (min/max) of a sorted event array. Assumes descending sort order. */
    public static range = (events: Doc.Type[]) => ({
      max: events[0].timestamp,
      min: events[events.length - 1].timestamp,
    });

    /** Finds a single event by its ID using the O(1) `_index` Map. */
    public static id = (_app: App.Type, event: Doc.Type["_id"]): Doc.Type =>
      Doc.Entity._index.get(event) as Doc.Type;

    /** Retrieves all events for a given source ID. Auto-initializes an empty array if none exist. */
    public static get = (_app: App.Type, id: Source.Id): Doc.Type[] =>
      DataStore.events.get(id) ||
      (DataStore.events.set(id, []).get(id) as Doc.Type[]);

    /** Sorts events in descending timestamp order (newest first). Mutates the array in place. */
    public static sort = (events: Doc.Type[]) =>
      events.sort((a, b) => b.timestamp - a.timestamp);

    private static _selectedCache: Doc.Type[] | null = null;
    private static _selectedCacheVersion = -1;

    public static invalidateSelectedCache = () => {
      Doc.Entity._selectedCache = null;
    };

    /** Returns all events from currently selected sources, flattened into a single array. */
    public static selected = (app: App.Type): Doc.Type[] => {
      if (Doc.Entity._selectedCache !== null && DataStore.renderVersion === Doc.Entity._selectedCacheVersion) {
        return Doc.Entity._selectedCache;
      }
      const result = Source.Entity.selected(app)
        .map((s) => Doc.Entity.get(app, s.id))
        .flat();
      Doc.Entity._selectedCache = result;
      Doc.Entity._selectedCacheVersion = DataStore.renderVersion;
      return result;
    };

    /**
     * Adds or updates events into the global event store.
     * Groups incoming events by source for batched processing.
     * Updates existing events in place, appends new ones, and maintains
     * the `_index` Map for O(1) lookups. Re-sorts only if changes were made.
     */
    public static add = (app: App.Type, events: Doc.Type[]) => {
      const sources = new Set<Source.Id>();

      // Group events by source to optimize processing
      const eventsBySource = new Map<Source.Id, Map<Doc.Id, Doc.Type>>();
      events.forEach((e) => {
        const sourceId = e["gulp.source_id"];
        sources.add(sourceId);
        if (!eventsBySource.has(sourceId)) {
          eventsBySource.set(sourceId, new Map());
        }
        eventsBySource.get(sourceId)!.set(e._id, e);
      });

      // Process each source: Update existing and Add new events
      sources.forEach((id) => {
        const existingEvents = Doc.Entity.get(app, id);
        const newEventsMap = eventsBySource.get(id)!;
        let hasChanges = false;

        // Updating existing events in place
        for (let i = 0; i < existingEvents.length; i++) {
          const evt = existingEvents[i];
          if (newEventsMap.has(evt._id)) {
            const updated = newEventsMap.get(evt._id)!;
            existingEvents[i] = updated;
            Doc.Entity._index.set(updated._id, updated);
            newEventsMap.delete(evt._id);
            hasChanges = true;
          }
        }

        // Add remaining new events
        if (newEventsMap.size > 0) {
          for (const evt of newEventsMap.values()) {
            Doc.Entity._index.set(evt._id, evt);
          }
          // Same fix as addAsync: avoid push(...spread) to prevent RangeError with 1M+ events
          for (const evt of newEventsMap.values()) {
            existingEvents.push(evt);
          }
          hasChanges = true;
        }

        // Sort if we modified the list, optimize performance
        if (hasChanges) {
          Doc.Entity.sort(existingEvents);
        }
      });

      DataStore.markDirty();
      Doc.Entity.invalidateSelectedCache();
      return DataStore.events;
    };

    /**
     * Asynchronous version of `add` that prevents main thread freeze.
     * Use in-place pushing with Event Loop Yielding (chunking) and native Array.prototype.sort().
     */
    public static addAsync = async (app: App.Type, events: Doc.Type[]) => {
      const sources = new Set<Source.Id>();
      const eventsBySource = new Map<Source.Id, Doc.Type[]>();

      // Group events
      events.forEach((e) => {
        const sourceId = e["gulp.source_id"];
        sources.add(sourceId);
        if (!eventsBySource.has(sourceId)) {
          eventsBySource.set(sourceId, []);
        }
        eventsBySource.get(sourceId)!.push(e);
      });

      for (const id of sources) {
        const existingEvents = Doc.Entity.get(app, id); // Ensure get() reads from DataStore
        const newEvents = eventsBySource.get(id)!;

        // Chunking to prevent Event Loop blocking
        const chunkSize = 10000;
        for (let i = 0; i < newEvents.length; i += chunkSize) {
          const chunk = newEvents.slice(i, i + chunkSize);
          for (const evt of chunk) {
            Doc.Entity._index.set(evt._id, evt);
            existingEvents.push(evt);
          }
          // Yield to main thread
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
        // Fast in-place native sort
        Doc.Entity.sort(existingEvents);
        DataStore.markDirty();
        Doc.Entity.invalidateSelectedCache();
      }

      return DataStore.events;
    };

    public static timestamp = (event: Doc.Type) => event.timestamp;

    /** Finds multiple events by their IDs using the O(1) `_index` Map. Filters out missing entries. */
    public static ids = (_app: App.Type, ids: Doc.Type["_id"][]) =>
      ids.map((id) => Doc.Entity._index.get(id)).filter(Boolean) as Doc.Type[];

    public static notes = (app: App.Type, event: Doc.Type) =>
      Note.Entity.findByFile(app, event["gulp.source_id"]).filter(
        (n) => n.doc._id === event._id,
      );

    public static links = (_app: App.Type, event: Doc.Type) =>
      DataStore.links.filter((l) => l.doc_ids.some((doc) => doc === event._id));

    public static normalize = (docs: Doc.Type[]): Doc.Type[] => {
      for (let i = 0; i < docs.length; i++) {
        const raw = docs[i] as any;
        docs[i] = {
          _id: raw._id,
          timestamp: Math.round(Number(raw['gulp.timestamp']) / 1_000_000),
          'gulp.source_id': raw['gulp.source_id'],
          'gulp.event_code': raw['gulp.event_code'],
          'gulp.storage_id': raw['gulp.storage_id'],
        } as Doc.Type;
      }
      return docs;
    };

    /**
     * Helper to get all flagged data from localStorage
     * @returns Record<Operation.Id, Doc.Id[]>
     */
    private static _flaggedCache: Record<string, string[]> | null = null;
    private static getFlaggedData = (): Record<string, string[]> => {
      if (Doc.Entity._flaggedCache) {
        return Doc.Entity._flaggedCache;
      }

      const raw = localStorage.getItem(Doc.Entity.flag.KEY);
      if (!raw) {
        return {};
      }

      try {
        const parsed = JSON.parse(raw);
        // Handle migration from old format (array) to new format (object)
        if (Array.isArray(parsed)) {
          Doc.Entity._flaggedCache = {};
          return Doc.Entity._flaggedCache;
        }
        Doc.Entity._flaggedCache = parsed as Record<string, string[]>;
        return Doc.Entity._flaggedCache;
      } catch (_) {
        Doc.Entity._flaggedCache = {};
        return Doc.Entity._flaggedCache;
      }
    };

    /**
     * Helper to save flagged data to localStorage
     */
    private static saveFlaggedData = (data: Record<string, string[]>) => {
      const cleaned = Object.fromEntries(
        Object.entries(data).filter(([_, ids]) => ids.length > 0),
      );
      Doc.Entity._flaggedCache = cleaned;
      localStorage.setItem(Doc.Entity.flag.KEY, JSON.stringify(cleaned));
    };

    public static flag: Flag = {
      KEY: "flagged-events",

      /**
       * Method to get all flagged events from local storage
       * @param operationId - Optional operation ID to filter by
       * @returns Set of Doc.Id for the specified operation (or all if not specified)
       */
      getList: (operationId?: Operation.Id): Set<Doc.Id> => {
        const ids: Set<Doc.Id> = new Set();
        const data = Doc.Entity.getFlaggedData();

        if (operationId) {
          // Return only IDs for the specified operation
          const operationIds = data[operationId] || [];
          operationIds.forEach((id) => ids.add(id as Doc.Id));
        } else {
          // Return all IDs across all operations
          Object.values(data)
            .flat()
            .forEach((id) => {
              if (typeof id === "string") {
                ids.add(id as Doc.Id);
              }
            });
        }

        return ids;
      },

      /**
       * Method to get all flagged event IDs for the specified operation
       * @param app - App state
       * @param operationId - Optional operation ID to filter by
       * @returns Array of Doc.Id
       */
      getDocIds: (app: App.Type, operationId?: Operation.Id): Doc.Id[] => {
        const ids = Doc.Entity.flag.getList(operationId);
        if (!ids.size) return [];
        const result: Doc.Id[] = [];

        for (const events of DataStore.events.values()) {
          for (const event of events) {
            if (ids.has(event._id)) {
              result.push(event._id);
            }
          }
        }
        return result;
      },

      /**
       * Method to get all flagged documents for the specified operation
       * @param app - App state
       * @param operationId - Optional operation ID to filter by
       * @returns Array of Doc.Type
       */
      getDocs: (app: App.Type, operationId?: Operation.Id): Doc.Type[] => {
        const ids = Doc.Entity.flag.getList(operationId);

        if (!ids.size) return [];

        const result: Doc.Type[] = [];

        for (const events of DataStore.events.values()) {
          for (const event of events) {
            if (ids.has(event._id)) {
              result.push(event);
            }
          }
        }

        return result;
      },

      isLimitReached: (ids = Doc.Entity.flag.getList()) => ids.size >= 10,

      /**
       * Toggle flag state for a document within a specific operation
       * @param id Doc.Id
       * @param operationId Operation.Id to associate the flag with
       * @returns New document flagged state
       */
      toggle: (id: Doc.Id, operationId?: Operation.Id) => {
        if (typeof id !== "string") {
          return false;
        }

        if (!operationId) {
          toast.error("Cannot flag document", {
            description: "No operation selected",
            richColors: true,
            icon: <Icon name="X" />,
          });
          return false;
        }

        const data = Doc.Entity.getFlaggedData();
        const operationIds = data[operationId] || [];
        const isFlagged = operationIds.includes(id);

        // Check limit for the specific operation
        if (!isFlagged && operationIds.length >= 10) {
          toast.error("Limit reached", {
            description: "Max 10 events can be flagged per operation",
            richColors: true,
            icon: <Icon name="X" />,
          });
          return isFlagged;
        }

        if (isFlagged) {
          // Remove the id
          data[operationId] = operationIds.filter((docId) => docId !== id);
        } else {
          // Add the id
          data[operationId] = [...operationIds, id];
        }

        toast.info(
          `Event has been successfully ${isFlagged ? "unflagged" : "flagged"}`,
        );

        Doc.Entity.saveFlaggedData(data);
        return !isFlagged;
      },

      /**
       * Resets flagged events for a specific operation
       * @param operationId - If provided, only resets flags for that operation. Otherwise resets all.
       */
      reset: (operationId?: Operation.Id) => {
        if (operationId) {
          const data = Doc.Entity.getFlaggedData();
          delete data[operationId];
          Doc.Entity.saveFlaggedData(data);
        } else {
          localStorage.setItem(Doc.Entity.flag.KEY, JSON.stringify({}));
        }
      },

      /**
       * Checks if document is flagged
       * @param id Doc.Id
       * @param operationId Optional operation ID to check within
       * @returns Whether the document is flagged
       */
      isFlagged: (id: Doc.Id, operationId?: Operation.Id) => {
        if (typeof id !== "string") {
          return false;
        }

        const ids = Doc.Entity.flag.getList(operationId);
        return ids.has(id);
      },
    };
  }
}
