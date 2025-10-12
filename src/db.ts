import { openDB, type IDBPDatabase, type DBSchema } from 'idb';

export interface MyDB extends DBSchema {
  tasks: {
    key: number;
    value: {
      id?: number;
      text: string;
      date: string;
      synced: boolean;
    };
  };
}

const DB_NAME = 'myPWA-db';
const STORE_NAME = 'tasks';

export async function initDB(): Promise<IDBPDatabase<MyDB>> {
  return openDB<MyDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
}

export async function addTask(task: MyDB['tasks']['value']): Promise<number> {
  const db = await initDB();
  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  const id = await store.add(task);
  await tx.done;
  return id; // ✅ Devuelve el ID generado
}

export async function getTasks(): Promise<MyDB['tasks']['value'][]> {
  const db = await initDB();
  return db.getAll(STORE_NAME);
}

export async function deleteTask(id: number): Promise<void> {
  const db = await initDB();
  await db.delete(STORE_NAME, id);
}

// añade estas funciones a tu db.ts
export async function updateTask(task: MyDB['tasks']['value']): Promise<void> {
  const db = await initDB();
  await db.put(STORE_NAME, task);
}

export async function getPendingTasks(): Promise<MyDB['tasks']['value'][]> {
  const db = await initDB();
  const all = await db.getAll(STORE_NAME);
  return all.filter(t => !t.synced);
}

export async function markTaskSynced(id: number): Promise<void> {
  const db = await initDB();
  const tx = db.transaction('tasks', 'readwrite');
  const store = tx.objectStore('tasks');
  const task = await store.get(id);
  if (task) {
    task.synced = true;
    await store.put(task);
  }
  await tx.done;
}
