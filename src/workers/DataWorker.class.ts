import { generateUUID } from '@/ui/utils';

let workerMap = new Map<string, { resolve: Function; reject: Function }>();

const isBrowser = typeof window !== 'undefined';
let workerInstance: Worker | null = null;

if (isBrowser) {
  workerInstance = new Worker(new URL('./Data.worker', import.meta.url), { type: 'module' });

  workerInstance.onmessage = (event: MessageEvent) => {
    const { id, result, error } = event.data;

    const promiseHandlers = workerMap.get(id);
    if (promiseHandlers) {
      if (error) {
        promiseHandlers.reject(new Error(error));
      } else {
        promiseHandlers.resolve(result);
      }
      workerMap.delete(id);
    }
  };
}

export class DataWorker {
  static async execute<T>(type: string, payload: any): Promise<T> {
    if (!workerInstance) {
      throw new Error('Worker not initialized in correct environment.');
    }

    const id = generateUUID() as string;
    
    return new Promise((resolve, reject) => {
      workerMap.set(id, { resolve, reject });
      workerInstance!.postMessage({
        type,
        payload,
        id 
      });
    });
  }

  static binarySearchDesc(items: any[], timestamp: number, findFirst: boolean): Promise<number> {
    return this.execute<number>('BINARY_SEARCH_DESC', { items, timestamp, findFirst });
  }

  static sortEventsAsync(events: any[]): Promise<any[]> {
    return this.execute<any[]>('SORT_EVENTS', events);
  }
}
