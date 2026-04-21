/// <reference lib="webworker" />

type WorkerMessage =
  | { type: 'SORT_EVENTS'; payload: any[]; id: string }
  | { type: 'BINARY_SEARCH_DESC'; payload: { items: any[]; timestamp: number; findFirst: boolean }; id: string }

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload, id } = event.data;

  try {
    switch (type) {
      case 'SORT_EVENTS': {
        // payload is an array of Doc.Type. We sort it by timestamp desc
        // e.timestamp is already rounded by Internal.Transformator
        const sorted = payload.sort((a, b) => b.timestamp - a.timestamp);
        self.postMessage({ id, result: sorted });
        break;
      }

      case 'BINARY_SEARCH_DESC': {
        const { items, timestamp, findFirst } = payload;
        let left = 0, right = items.length - 1, result = -1;

        while (left <= right) {
          const mid = Math.floor((left + right) / 2);
          // items are Notes. We expect their pre-calculated timestamp or standard structure.
          // Fallback to direct timestamp property if Note.Entity is unavailable
          const noteTime = items[mid].timestamp;

          if (findFirst) {
            // Finding first note <= timestamp (leftmost)
            if (noteTime <= timestamp) {
              result = mid;
              right = mid - 1;
            } else {
              left = mid + 1;
            }
          } else {
            // Finding last note >= timestamp (rightmost)
            if (noteTime >= timestamp) {
              result = mid;
              left = mid + 1;
            } else {
              right = mid - 1;
            }
          }
        }

        self.postMessage({ id, result });
        break;
      }

      default:
        self.postMessage({ id, error: 'Unknown worker action' });
    }
  } catch (error: any) {
    self.postMessage({ id, error: error.message });
  }
};
