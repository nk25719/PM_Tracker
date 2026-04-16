const DB_NAME = "pm-tracker-db";
const STORE_NAME = "tracker";
const STORE_KEY = "rows";
const STORAGE_KEY = "pm-tracker-rows";
const STORAGE_BACKUP_KEY = "pm-tracker-rows-backup";
const STORAGE_BACKUP_TIMESTAMP_KEY = "pm-tracker-rows-backup-at";

function safeParseRows(rawValue) {
  if (!rawValue) return null;
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionComplete(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

function supportsIndexedDb() {
  return typeof indexedDB !== "undefined";
}

export function readRowsFromLocalStorage() {
  if (typeof localStorage === "undefined") return null;
  return safeParseRows(localStorage.getItem(STORAGE_KEY));
}

export function writeRowsToLocalStorageBackup(rows) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(rows));
  localStorage.setItem(STORAGE_BACKUP_TIMESTAMP_KEY, new Date().toISOString());
}

export async function readRowsFromIndexedDb() {
  if (!supportsIndexedDb()) return null;

  const db = await openDb();
  try {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const request = transaction.objectStore(STORE_NAME).get(STORE_KEY);

    const value = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return Array.isArray(value) ? value : null;
  } finally {
    db.close();
  }
}

export async function writeRowsToIndexedDb(rows) {
  if (!supportsIndexedDb()) return false;

  const db = await openDb();
  try {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(rows, STORE_KEY);
    await transactionComplete(transaction);
    return true;
  } finally {
    db.close();
  }
}

export async function loadRowsWithFallback(defaultRows) {
  const indexedRows = await readRowsFromIndexedDb();
  if (indexedRows?.length) {
    writeRowsToLocalStorageBackup(indexedRows);
    return indexedRows;
  }

  const legacyLocalRows = readRowsFromLocalStorage();
  if (legacyLocalRows?.length) {
    await writeRowsToIndexedDb(legacyLocalRows);
    writeRowsToLocalStorageBackup(legacyLocalRows);
    return legacyLocalRows;
  }

  await writeRowsToIndexedDb(defaultRows);
  writeRowsToLocalStorageBackup(defaultRows);
  return defaultRows;
}

export async function persistRows(rows) {
  await writeRowsToIndexedDb(rows);
  writeRowsToLocalStorageBackup(rows);
}

export const storageKeys = {
  STORAGE_KEY,
  STORAGE_BACKUP_KEY,
  STORAGE_BACKUP_TIMESTAMP_KEY,
};
