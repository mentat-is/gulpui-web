import { Source } from '@/entities/Source';
import { Request } from '@/entities/Request';

export type IngestTask = {
  req_id: Request.Id;
  file: File;
  operation_id: string;
  context_name: string;
  ws_id: string;
  settings: any;
  server: string;
  token: string;
  frame?: { min: number; max: number };
  onProgress?: (progress: number, bytes: number) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
};

class IngestWorkerManager {
  private workers: Worker[] = [];
  private taskQueue: IngestTask[] = [];
  private activeTaskCount = 0;
  private readonly MAX_WORKERS = 5;
  private taskHandlers = new Map<string, { onProgress?: Function, onDone?: Function, onError?: Function }>();

  constructor() {
    if (typeof window !== 'undefined') {
      // Lazy initialization of workers could be done here or in execute task
    }
  }

  private createWorker(): Worker {
    const worker = new Worker(new URL('./Ingest.worker', import.meta.url), { type: 'module' });
    worker.onmessage = (event) => {
      const { type, payload } = event.data;
      const handlers = this.taskHandlers.get(payload.req_id);

      if (type === 'PROGRESS' && handlers?.onProgress) {
        handlers.onProgress(payload.progress, payload.bytes);
      } else if (type === 'DONE') {
        handlers?.onDone?.();
        this.finishTask(worker, payload.req_id);
      } else if (type === 'ERROR') {
        handlers?.onError?.(payload.message);
        this.finishTask(worker, payload.req_id);
      }
    };
    return worker;
  }

  public enqueue(task: IngestTask) {
    this.taskHandlers.set(task.req_id, {
      onProgress: task.onProgress,
      onDone: task.onDone,
      onError: task.onError
    });
    this.taskQueue.push(task);
    this.processQueue();
  }

  private processQueue() {
    while (this.activeTaskCount < this.MAX_WORKERS && this.taskQueue.length > 0) {
      const task = this.taskQueue.shift()!;
      this.runTask(task);
    }
  }

  private runTask(task: IngestTask) {
    this.activeTaskCount++;
    let worker = this.workers.pop() || this.createWorker();

    worker.postMessage({
      type: 'START_INGEST',
      payload: {
        file: task.file,
        req_id: task.req_id,
        operation_id: task.operation_id,
        context_name: task.context_name,
        ws_id: task.ws_id,
        settings: task.settings,
        server: task.server,
        token: task.token,
        frame: task.frame
      }
    });
  }

  private finishTask(worker: Worker, req_id: string) {
    this.activeTaskCount--;
    this.workers.push(worker);
    this.taskHandlers.delete(req_id);
    this.processQueue();
  }

  public abort(req_id: string) {
    // If task is in queue, remove it
    const queueIndex = this.taskQueue.findIndex(t => t.req_id === req_id);
    if (queueIndex !== -1) {
      this.taskQueue.splice(queueIndex, 1);
      this.taskHandlers.delete(req_id);
      return;
    }

    // If task is active, we currently don't have a clean way to "stop" the specific worker 
    // without terminating it, which is expensive. 
    // Better to just let the worker finish its current chunk and signal the worker to stop.
    // For now, we just delete the handlers so the main thread ignores future messages.
    this.taskHandlers.delete(req_id);
  }
}

export const ingestWorkerManager = new IngestWorkerManager();
