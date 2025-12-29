export class GulpIndexedDB {
    private DB_NAME: string;
    private DB_VERSION: number;
    private DB_STORE_NAME: string;
    private db: IDBDatabase | null = null;
    private READMODE: IDBTransactionMode = "readonly";
    private WRITEMODE: IDBTransactionMode = "readwrite";

    constructor(dbName: string, storeName: string, version: number = 1) {
        this.DB_NAME = dbName;
        this.DB_STORE_NAME = storeName;
        this.DB_VERSION = version;
    }

    private MakeTransaction(storeName: string, mode: IDBTransactionMode): Promise<IDBTransaction> {
        return new Promise(async (resolve) => {
            const db = await this.OpenDB();
            const tx = db.transaction(storeName, mode);
            tx.onerror = (err) => {
                console.warn(err);
            };
            resolve(tx);
        });
    }

    private static activeConnections: Map<string, Promise<IDBDatabase>> = new Map();

    private OpenDB(): Promise<IDBDatabase> {
        if (this.db) {
            return Promise.resolve(this.db);
        }

        if (GulpIndexedDB.activeConnections.has(this.DB_NAME)) {
            return GulpIndexedDB.activeConnections.get(this.DB_NAME)!.then((db) => {
                this.db = db;
                return db;
            });
        }

        const promise = new Promise<IDBDatabase>((resolve, reject) => {
            const request = window.indexedDB.open(this.DB_NAME, this.DB_VERSION);
            request.onsuccess = (ev) => {
                const db = (ev.target as IDBOpenDBRequest).result;
                resolve(db);
            };
            request.onerror = (ev) => {
                console.warn("error while opening db", ev);
                GulpIndexedDB.activeConnections.delete(this.DB_NAME);
                reject(ev);
            };
            request.onupgradeneeded = (ev) => {
                const db = (ev.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(this.DB_STORE_NAME)) {
                    db.createObjectStore(this.DB_STORE_NAME);
                }
            };
        });

        GulpIndexedDB.activeConnections.set(this.DB_NAME, promise);

        return promise.then((db) => {
            this.db = db;
            return db;
        });
    }

    public GetConfiguration(configurationKey: string): Promise<any> {
        return new Promise(async (resolve) => {
            const tx = await this.MakeTransaction(this.DB_STORE_NAME, this.READMODE);
            tx.oncomplete = (ev) => {
                // resolve(ev); 
                // Logic in original code resolved oncomplete with event, but get request result is handled in onsuccess below.
                // We usually resolve the data from the request.
            };
            const store = tx.objectStore(this.DB_STORE_NAME);
            const request = store.get(configurationKey);
            request.onsuccess = () => {
                resolve(request.result);
            };
            request.onerror = (err) => {
                console.warn(
                    "error in request to get configuration",
                    configurationKey,
                    { err }
                );
            };
        });
    }

    public AddConfiguration(configuration: any, configurationKey: string): Promise<Event> {
        return new Promise(async (resolve) => {
            const tx = await this.MakeTransaction(this.DB_STORE_NAME, this.WRITEMODE);
            tx.oncomplete = (ev) => {
                resolve(ev);
            };
            const store = tx.objectStore(this.DB_STORE_NAME);
            const request = store.add(configuration, configurationKey);
            request.onerror = (err) => {
                console.warn("error in request to add configuration", err);
            };
        });
    }

    public DeleteConfiguration(configurationKey: string): Promise<Event> {
        return new Promise(async (resolve) => {
            const tx = await this.MakeTransaction(this.DB_STORE_NAME, this.WRITEMODE);
            tx.oncomplete = (ev) => {
                resolve(ev);
            };
            const store = tx.objectStore(this.DB_STORE_NAME);
            const request = store.delete(configurationKey);
            request.onerror = (err) => {
                console.warn(
                    "error in request to delete configuration",
                    configurationKey,
                    err
                );
            };
        });
    }

    public UpdateConfiguration(configuration: any, configurationKey: string): Promise<Event> {
        return new Promise(async (resolve) => {
            const tx = await this.MakeTransaction(this.DB_STORE_NAME, this.WRITEMODE);
            tx.oncomplete = (ev) => {
                resolve(ev);
            };
            const store = tx.objectStore(this.DB_STORE_NAME);
            const request = store.put(configuration, configurationKey);
            request.onerror = (err) => {
                console.warn(
                    "error in request to update configuration",
                    configurationKey,
                    err
                );
            };
        });
    }
}
