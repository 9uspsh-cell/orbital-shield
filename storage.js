/**
 * ORBITAL SHIELD
 * Local Persistence Layer
 *
 * Primary storage: IndexedDB
 * Fallback storage: localStorage
 *
 * Features:
 * - Versioned database schema
 * - IndexedDB initialization and migrations
 * - LocalStorage fallback
 * - Verified writes
 * - Backup and restore
 * - Snapshot validation
 * - Storage diagnostics
 * - Graceful handling of unavailable storage
 *
 * No network access. All data remains on the local device.
 */

const STORAGE_CONFIG = Object.freeze({
  DATABASE_NAME: "orbital-shield-db",
  DATABASE_VERSION: 1,

  OBJECT_STORE: "application-data",

  PRIMARY_KEY: "orbital-shield-state",
  BACKUP_KEY: "orbital-shield-backup",
  TEMP_KEY: "orbital-shield-pending",

  SCHEMA_VERSION: 1,

  MAX_BACKUPS: 5,
  MAX_LOCAL_STORAGE_BYTES: 4 * 1024 * 1024,

  WRITE_RETRY_COUNT: 2,
  WRITE_RETRY_DELAY_MS: 100
});

export class StorageError extends Error {
  constructor(message, code = "STORAGE_ERROR", cause = null) {
    super(message);

    this.name = "StorageError";
    this.code = code;

    if (cause) {
      this.cause = cause;
    }
  }
}

export const STORAGE_BACKENDS = Object.freeze({
  INDEXED_DB: "indexeddb",
  LOCAL_STORAGE: "localstorage",
  MEMORY: "memory"
});

function getBrowserWindow() {
  if (typeof window === "undefined") {
    return null;
  }

  return window;
}

function getIndexedDB() {
  const browser = getBrowserWindow();

  if (!browser || !browser.indexedDB) {
    return null;
  }

  return browser.indexedDB;
}

function getLocalStorage() {
  const browser = getBrowserWindow();

  if (!browser) {
    return null;
  }

  try {
    const storage = browser.localStorage;
    const testKey = "__orbital_storage_test__";

    storage.setItem(testKey, "1");
    storage.removeItem(testKey);

    return storage;
  } catch {
    return null;
  }
}

function createTimestamp() {
  return new Date().toISOString();
}

function createId() {
  if (
    typeof globalThis.crypto !== "undefined" &&
    typeof globalThis.crypto.randomUUID === "function"
  ) {
    return globalThis.crypto.randomUUID();
  }

  return [
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10)
  ].join("-");
}

function serialize(value) {
  try {
    return JSON.stringify(value);
  } catch (error) {
    throw new StorageError(
      "تعذر تحويل البيانات إلى صيغة التخزين.",
      "SERIALIZATION_FAILED",
      error
    );
  }
}

function deserialize(value) {
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new StorageError(
      "البيانات المخزنة تالفة أو غير قابلة للقراءة.",
      "DESERIALIZATION_FAILED",
      error
    );
  }
}

function estimateBytes(value) {
  const serialized = serialize(value);

  if (typeof TextEncoder !== "undefined") {
    return new TextEncoder().encode(serialized).length;
  }

  return serialized.length * 2;
}

function cloneData(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return deserialize(serialize(value));
}

function validateEnvelope(envelope) {
  if (!envelope || typeof envelope !== "object") {
    return false;
  }

  if (envelope.schemaVersion !== STORAGE_CONFIG.SCHEMA_VERSION) {
    return false;
  }

  if (typeof envelope.updatedAt !== "string") {
    return false;
  }

  if (!envelope.payload || typeof envelope.payload !== "object") {
    return false;
  }

  return true;
}

function createEnvelope(payload, previousRevision = 0) {
  return {
    id: STORAGE_CONFIG.PRIMARY_KEY,

    schemaVersion: STORAGE_CONFIG.SCHEMA_VERSION,

    revision: previousRevision + 1,

    createdAt: createTimestamp(),

    updatedAt: createTimestamp(),

    payload: cloneData(payload)
  };
}

function createEmptyEnvelope() {
  return createEnvelope({
    catalog: [],
    settings: {},
    simulation: {},
    metadata: {
      initialized: false,
      lastSession: null
    }
  });
}

function delay(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

/* -------------------------------------------------------
   IndexedDB Adapter
------------------------------------------------------- */

class IndexedDBAdapter {
  constructor() {
    this.database = null;
    this.openPromise = null;
  }

  get available() {
    return Boolean(getIndexedDB());
  }

  async open() {
    if (!this.available) {
      throw new StorageError(
        "IndexedDB غير متوفر في هذا المتصفح.",
        "INDEXEDDB_UNAVAILABLE"
      );
    }

    if (this.database) {
      return this.database;
    }

    if (this.openPromise) {
      return this.openPromise;
    }

    this.openPromise = new Promise((resolve, reject) => {
      const indexedDB = getIndexedDB();

      let request;

      try {
        request = indexedDB.open(
          STORAGE_CONFIG.DATABASE_NAME,
          STORAGE_CONFIG.DATABASE_VERSION
        );
      } catch (error) {
        reject(
          new StorageError(
            "تعذر فتح قاعدة البيانات المحلية.",
            "INDEXEDDB_OPEN_FAILED",
            error
          )
        );

        return;
      }

      request.onupgradeneeded = (event) => {
        const database = event.target.result;

        if (
          !database.objectStoreNames.contains(
            STORAGE_CONFIG.OBJECT_STORE
          )
        ) {
          database.createObjectStore(
            STORAGE_CONFIG.OBJECT_STORE,
            {
              keyPath: "id"
            }
          );
        }
      };

      request.onsuccess = () => {
        this.database = request.result;

        this.database.onversionchange = () => {
          this.database.close();
          this.database = null;
        };

        this.database.onclose = () => {
          this.database = null;
        };

        resolve(this.database);
      };

      request.onerror = () => {
        reject(
          new StorageError(
            "فشل الاتصال بقاعدة البيانات المحلية.",
            "INDEXEDDB_OPEN_FAILED",
            request.error
          )
        );
      };

      request.onblocked = () => {
        reject(
          new StorageError(
            "قاعدة البيانات مشغولة بنافذة أخرى.",
            "INDEXEDDB_BLOCKED"
          )
        );
      };
    });

    try {
      return await this.openPromise;
    } finally {
      this.openPromise = null;
    }
  }

  async get(key = STORAGE_CONFIG.PRIMARY_KEY) {
    const database = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        STORAGE_CONFIG.OBJECT_STORE,
        "readonly"
      );

      const store = transaction.objectStore(
        STORAGE_CONFIG.OBJECT_STORE
      );

      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result ?? null);
      };

      request.onerror = () => {
        reject(
          new StorageError(
            "تعذرت قراءة البيانات من IndexedDB.",
            "INDEXEDDB_READ_FAILED",
            request.error
          )
        );
      };
    });
  }

  async put(value) {
    const database = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        STORAGE_CONFIG.OBJECT_STORE,
        "readwrite"
      );

      const store = transaction.objectStore(
        STORAGE_CONFIG.OBJECT_STORE
      );

      store.put(cloneData(value));

      transaction.oncomplete = () => {
        resolve(true);
      };

      transaction.onerror = () => {
        reject(
          new StorageError(
            "فشل حفظ البيانات في IndexedDB.",
            "INDEXEDDB_WRITE_FAILED",
            transaction.error
          )
        );
      };

      transaction.onabort = () => {
        reject(
          new StorageError(
            "تم إلغاء عملية حفظ البيانات.",
            "INDEXEDDB_WRITE_ABORTED",
            transaction.error
          )
        );
      };
    });
  }

  async remove(key = STORAGE_CONFIG.PRIMARY_KEY) {
    const database = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        STORAGE_CONFIG.OBJECT_STORE,
        "readwrite"
      );

      transaction.objectStore(
        STORAGE_CONFIG.OBJECT_STORE
      ).delete(key);

      transaction.oncomplete = () => {
        resolve(true);
      };

      transaction.onerror = () => {
        reject(
          new StorageError(
            "تعذر حذف البيانات.",
            "INDEXEDDB_DELETE_FAILED",
            transaction.error
          )
        );
      };
    });
  }

  async clear() {
    const database = await this.open();

    return new Promise((resolve, reject) => {
      const transaction = database.transaction(
        STORAGE_CONFIG.OBJECT_STORE,
        "readwrite"
      );

      transaction.objectStore(
        STORAGE_CONFIG.OBJECT_STORE
      ).clear();

      transaction.oncomplete = () => {
        resolve(true);
      };

      transaction.onerror = () => {
        reject(
          new StorageError(
            "تعذر تنظيف قاعدة البيانات.",
            "INDEXEDDB_CLEAR_FAILED",
            transaction.error
          )
        );
      };
    });
  }

  close() {
    if (this.database) {
      this.database.close();
      this.database = null;
    }
  }
}

/* -------------------------------------------------------
   LocalStorage Adapter
------------------------------------------------------- */

class LocalStorageAdapter {
  get available() {
    return Boolean(getLocalStorage());
  }

  async get(key = STORAGE_CONFIG.PRIMARY_KEY) {
    const storage = getLocalStorage();

    if (!storage) {
      throw new StorageError(
        "التخزين المحلي غير متاح.",
        "LOCAL_STORAGE_UNAVAILABLE"
      );
    }

    const value = storage.getItem(key);

    if (value === null) {
      return null;
    }

    return deserialize(value);
  }

  async put(value) {
    const storage = getLocalStorage();

    if (!storage) {
      throw new StorageError(
        "التخزين المحلي غير متاح.",
        "LOCAL_STORAGE_UNAVAILABLE"
      );
    }

    const serialized = serialize(value);

    const bytes = new Blob([serialized]).size;

    if (bytes > STORAGE_CONFIG.MAX_LOCAL_STORAGE_BYTES) {
      throw new StorageError(
        "حجم البيانات يتجاوز الحد المسموح به للتخزين الاحتياطي.",
        "LOCAL_STORAGE_QUOTA_EXCEEDED"
      );
    }

    const temporaryKey = STORAGE_CONFIG.TEMP_KEY;

    try {
      storage.setItem(temporaryKey, serialized);

      const temporaryValue = storage.getItem(temporaryKey);

      if (temporaryValue !== serialized) {
        throw new Error("Temporary write verification failed.");
      }

      storage.setItem(
        STORAGE_CONFIG.PRIMARY_KEY,
        temporaryValue
      );

      const savedValue = storage.getItem(
        STORAGE_CONFIG.PRIMARY_KEY
      );

      if (savedValue !== serialized) {
        throw new Error("Primary write verification failed.");
      }

      storage.removeItem(temporaryKey);

      return true;
    } catch (error) {
      throw new StorageError(
        "فشل حفظ البيانات في التخزين المحلي.",
        "LOCAL_STORAGE_WRITE_FAILED",
        error
      );
    }
  }

  async remove(key = STORAGE_CONFIG.PRIMARY_KEY) {
    const storage = getLocalStorage();

    if (!storage) {
      throw new StorageError(
        "التخزين المحلي غير متاح.",
        "LOCAL_STORAGE_UNAVAILABLE"
      );
    }

    storage.removeItem(key);

    return true;
  }

  async clear() {
    const storage = getLocalStorage();

    if (!storage) {
      throw new StorageError(
        "التخزين المحلي غير متاح.",
        "LOCAL_STORAGE_UNAVAILABLE"
      );
    }

    storage.removeItem(STORAGE_CONFIG.PRIMARY_KEY);
    storage.removeItem(STORAGE_CONFIG.BACKUP_KEY);
    storage.removeItem(STORAGE_CONFIG.TEMP_KEY);

    return true;
  }
}

/* -------------------------------------------------------
   In-Memory Adapter
------------------------------------------------------- */

class MemoryAdapter {
  constructor() {
    this.records = new Map();
  }

  get available() {
    return true;
  }

  async get(key = STORAGE_CONFIG.PRIMARY_KEY) {
    const value = this.records.get(key);

    return value ? cloneData(value) : null;
  }

  async put(value) {
    this.records.set(value.id, cloneData(value));

    return true;
  }

  async remove(key = STORAGE_CONFIG.PRIMARY_KEY) {
    this.records.delete(key);

    return true;
  }

  async clear() {
    this.records.clear();

    return true;
  }
}

/* -------------------------------------------------------
   Main Storage Manager
------------------------------------------------------- */

export class OrbitalStorage {
  constructor(options = {}) {
    this.options = {
      preferIndexedDB: true,
      enableFallback: true,
      autoBackup: true,
      ...options
    };

    this.indexedDB = new IndexedDBAdapter();
    this.localStorage = new LocalStorageAdapter();
    this.memory = new MemoryAdapter();

    this.backend = null;

    this.initialized = false;
    this.initializing = null;

    this.writeQueue = Promise.resolve();

    this.lastError = null;
  }

  async initialize() {
    if (this.initialized) {
      return this.getStatus();
    }

    if (this.initializing) {
      return this.initializing;
    }

    this.initializing = this.initializeInternal();

    try {
      return await this.initializing;
    } finally {
      this.initializing = null;
    }
  }

  async initializeInternal() {
    const candidates = [];

    if (this.options.preferIndexedDB) {
      candidates.push(this.indexedDB);
    }

    if (this.options.enableFallback) {
      candidates.push(this.localStorage);
    }

    candidates.push(this.memory);

    for (const adapter of candidates) {
      try {
        if (!adapter.available) {
          continue;
        }

        const current = await adapter.get();

        if (current && !validateEnvelope(current)) {
          this.lastError = new StorageError(
            "تم العثور على سجل تخزين غير صالح.",
            "INVALID_STORAGE_ENVELOPE"
          );

          continue;
        }

        this.backend = adapter;

        if (!current) {
          await adapter.put(createEmptyEnvelope());
        }

        this.initialized = true;

        return this.getStatus();
      } catch (error) {
        this.lastError = error;

        if (!this.options.enableFallback) {
          break;
        }
      }
    }

    throw new StorageError(
      "تعذر تهيئة جميع أنظمة التخزين.",
      "STORAGE_INITIALIZATION_FAILED",
      this.lastError
    );
  }

  assertInitialized() {
    if (!this.initialized || !this.backend) {
      throw new StorageError(
        "يجب تهيئة نظام التخزين أولاً.",
        "STORAGE_NOT_INITIALIZED"
      );
    }
  }

  async getEnvelope() {
    this.assertInitialized();

    const envelope = await this.backend.get();

    if (!envelope || !validateEnvelope(envelope)) {
      throw new StorageError(
        "سجل البيانات الرئيسي غير صالح.",
        "INVALID_STORAGE_ENVELOPE"
      );
    }

    return envelope;
  }

  async read() {
    const envelope = await this.getEnvelope();

    return cloneData(envelope.payload);
  }

  async get(key) {
    const payload = await this.read();

    if (!key) {
      return payload;
    }

    return payload[key] ?? null;
  }

  async write(payload, options = {}) {
    this.assertInitialized();

    if (!payload || typeof payload !== "object") {
      throw new StorageError(
        "يجب تقديم كائن بيانات صالح.",
        "INVALID_PAYLOAD"
      );
    }

    const operation = async () => {
      return this.writeInternal(payload, options);
    };

    const result = this.writeQueue.then(operation, operation);

    this.writeQueue = result.catch(() => {});

    return result;
  }

  async writeInternal(payload, options = {}) {
    const previous = await this.getEnvelope();

    const next = createEnvelope(
      payload,
      previous.revision || 0
    );

    if (this.options.autoBackup && options.skipBackup !== true) {
      await this.createBackup(previous);
    }

    let lastError = null;

    for (
      let attempt = 0;
      attempt <= STORAGE_CONFIG.WRITE_RETRY_COUNT;
      attempt += 1
    ) {
      try {
        await this.backend.put(next);

        const verification = await this.backend.get();

        if (
          !verification ||
          verification.revision !== next.revision
        ) {
          throw new StorageError(
            "لم يتم التحقق من سلامة عملية الحفظ.",
            "WRITE_VERIFICATION_FAILED"
          );
        }

        return {
          success: true,
          revision: next.revision,
          updatedAt: next.updatedAt,
          backend: this.getBackendName()
        };
      } catch (error) {
        lastError = error;

        if (
          attempt < STORAGE_CONFIG.WRITE_RETRY_COUNT
        ) {
          await delay(
            STORAGE_CONFIG.WRITE_RETRY_DELAY_MS
          );
        }
      }
    }

    throw new StorageError(
      "تعذر إتمام عملية حفظ البيانات.",
      "WRITE_FAILED",
      lastError
    );
  }

  async update(key, value) {
    if (typeof key !== "string" || !key.trim()) {
      throw new StorageError(
        "مفتاح التحديث غير صالح.",
        "INVALID_UPDATE_KEY"
      );
    }

    const payload = await this.read();

    payload[key] = cloneData(value);

    return this.write(payload);
  }

  async remove(key) {
    if (typeof key !== "string" || !key.trim()) {
      throw new StorageError(
        "مفتاح الحذف غير صالح.",
        "INVALID_REMOVE_KEY"
      );
    }

    const payload = await this.read();

    delete payload[key];

    return this.write(payload);
  }

  async reset() {
    this.assertInitialized();

    const empty = createEmptyEnvelope();

    const current = await this.getEnvelope();

    empty.revision = (current.revision || 0) + 1;

    await this.createBackup(current);

    await this.backend.put(empty);

    return {
      success: true,
      revision: empty.revision
    };
  }

  /* -----------------------------------------------------
     Backup Management
  ----------------------------------------------------- */

  async createBackup(envelope = null) {
    this.assertInitialized();

    const source = envelope || await this.getEnvelope();

    const backup = {
      id: createId(),

      createdAt: createTimestamp(),

      schemaVersion: STORAGE_CONFIG.SCHEMA_VERSION,

      revision: source.revision,

      data: cloneData(source)
    };

    const existing = await this.getBackups();

    const backups = [
      backup,
      ...existing
    ].slice(0, STORAGE_CONFIG.MAX_BACKUPS);

    await this.saveBackups(backups);

    return backup;
  }

  async getBackups() {
    this.assertInitialized();

    try {
      if (this.backend === this.indexedDB) {
        const record = await this.backend.get(
          STORAGE_CONFIG.BACKUP_KEY
        );

        return Array.isArray(record?.items)
          ? record.items
          : [];
      }

      if (this.backend === this.localStorage) {
        const record = await this.backend.get(
          STORAGE_CONFIG.BACKUP_KEY
        );

        return Array.isArray(record?.items)
          ? record.items
          : [];
      }

      return [];
    } catch {
      return [];
    }
  }

  async saveBackups(backups) {
    this.assertInitialized();

    const record = {
      id: STORAGE_CONFIG.BACKUP_KEY,
      items: backups
    };

    if (this.backend === this.indexedDB) {
      await this.backend.put(record);
      return;
    }

    if (this.backend === this.localStorage) {
      const storage = getLocalStorage();

      if (!storage) {
        throw new StorageError(
          "التخزين المحلي غير متاح.",
          "LOCAL_STORAGE_UNAVAILABLE"
        );
      }

      storage.setItem(
        STORAGE_CONFIG.BACKUP_KEY,
        serialize(record)
      );
    }
  }

  async restoreBackup(backupId) {
    this.assertInitialized();

    const backups = await this.getBackups();

    const selected = backups.find(
      (item) => item.id === backupId
    );

    if (!selected || !selected.data) {
      throw new StorageError(
        "النسخة الاحتياطية المطلوبة غير موجودة.",
        "BACKUP_NOT_FOUND"
      );
    }

    if (!validateEnvelope(selected.data)) {
      throw new StorageError(
        "النسخة الاحتياطية تالفة أو غير متوافقة.",
        "INVALID_BACKUP"
      );
    }

    const current = await this.getEnvelope();

    await this.createBackup(current);

    const restored = createEnvelope(
      selected.data.payload,
      current.revision || 0
    );

    await this.backend.put(restored);

    return {
      success: true,
      restoredFrom: backupId,
      revision: restored.revision
    };
  }

  async deleteBackup(backupId) {
    const backups = await this.getBackups();

    const filtered = backups.filter(
      (item) => item.id !== backupId
    );

    await this.saveBackups(filtered);

    return {
      success: true,
      remaining: filtered.length
    };
  }

  /* -----------------------------------------------------
     Import / Export
  ----------------------------------------------------- */

  async exportSnapshot() {
    const envelope = await this.getEnvelope();

    return {
      application: "ORBITAL SHIELD",

      format: "ORBITAL_SHIELD_SNAPSHOT",

      schemaVersion: STORAGE_CONFIG.SCHEMA_VERSION,

      exportedAt: createTimestamp(),

      revision: envelope.revision,

      payload: cloneData(envelope.payload)
    };
  }

  async importSnapshot(snapshot, options = {}) {
    this.assertInitialized();

    if (!snapshot || typeof snapshot !== "object") {
      throw new StorageError(
        "ملف الاستيراد غير صالح.",
        "INVALID_IMPORT"
      );
    }

    if (
      snapshot.format !== "ORBITAL_SHIELD_SNAPSHOT"
    ) {
      throw new StorageError(
        "صيغة الملف غير مدعومة.",
        "UNSUPPORTED_IMPORT_FORMAT"
      );
    }

    if (
      snapshot.schemaVersion !== STORAGE_CONFIG.SCHEMA_VERSION
    ) {
      throw new StorageError(
        "إصدار الملف لا يتوافق مع إصدار النظام.",
        "IMPORT_VERSION_MISMATCH"
      );
    }

    if (
      !snapshot.payload ||
      typeof snapshot.payload !== "object"
    ) {
      throw new StorageError(
        "ملف الاستيراد لا يحتوي على بيانات صالحة.",
        "INVALID_IMPORT_PAYLOAD"
      );
    }

    const current = await this.getEnvelope();

    if (options.createBackup !== false) {
      await this.createBackup(current);
    }

    const next = createEnvelope(
      snapshot.payload,
      current.revision || 0
    );

    await this.backend.put(next);

    return {
      success: true,
      revision: next.revision,
      importedAt: createTimestamp()
    };
  }

  async downloadSnapshot(filename = "orbital-shield-backup.json") {
    const browser = getBrowserWindow();

    if (!browser || !browser.document) {
      throw new StorageError(
        "تنزيل الملفات غير متاح في هذه البيئة.",
        "DOWNLOAD_UNAVAILABLE"
      );
    }

    const snapshot = await this.exportSnapshot();

    const blob = new Blob(
      [serialize(snapshot)],
      {
        type: "application/json;charset=utf-8"
      }
    );

    const url = browser.URL.createObjectURL(blob);

    const anchor = browser.document.createElement("a");

    anchor.href = url;
    anchor.download = filename;

    browser.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    browser.URL.revokeObjectURL(url);

    return {
      success: true,
      filename
    };
  }

  /* -----------------------------------------------------
     Diagnostics
  ----------------------------------------------------- */

  async inspect() {
    const envelope = await this.getEnvelope();

    const backups = await this.getBackups();

    return {
      backend: this.getBackendName(),

      initialized: this.initialized,

      schemaVersion: envelope.schemaVersion,

      revision: envelope.revision,

      createdAt: envelope.createdAt,

      updatedAt: envelope.updatedAt,

      payloadSizeBytes: estimateBytes(envelope.payload),

      backupCount: backups.length,

      backupLimit: STORAGE_CONFIG.MAX_BACKUPS,

      lastError: this.lastError
        ? {
            message: this.lastError.message,
            code: this.lastError.code || "UNKNOWN"
          }
        : null
    };
  }

  getBackendName() {
    if (this.backend === this.indexedDB) {
      return STORAGE_BACKENDS.INDEXED_DB;
    }

    if (this.backend === this.localStorage) {
      return STORAGE_BACKENDS.LOCAL_STORAGE;
    }

    if (this.backend === this.memory) {
      return STORAGE_BACKENDS.MEMORY;
    }

    return null;
  }

  getStatus() {
    return {
      initialized: this.initialized,

      backend: this.getBackendName(),

      indexedDBAvailable: this.indexedDB.available,

      localStorageAvailable: this.localStorage.available,

      fallbackEnabled: this.options.enableFallback
    };
  }

  async destroy() {
    this.indexedDB.close();

    this.backend = null;

    this.initialized = false;

    this.initializing = null;

    this.lastError = null;
  }
}

/* -------------------------------------------------------
   Default Storage Instance
------------------------------------------------------- */

export const orbitalStorage = new OrbitalStorage();

/* -------------------------------------------------------
   Convenience API
------------------------------------------------------- */

export async function initializeStorage(options = {}) {
  if (options && Object.keys(options).length > 0) {
    return new OrbitalStorage(options).initialize();
  }

  return orbitalStorage.initialize();
}

export async function readStorage() {
  return orbitalStorage.read();
}

export async function writeStorage(payload, options = {}) {
  return orbitalStorage.write(payload, options);
}

export async function updateStorage(key, value) {
  return orbitalStorage.update(key, value);
}

export async function exportStorageSnapshot() {
  return orbitalStorage.exportSnapshot();
}

export async function importStorageSnapshot(snapshot, options = {}) {
  return orbitalStorage.importSnapshot(snapshot, options);
}

export async function getStorageDiagnostics() {
  return orbitalStorage.inspect();
}

export default orbitalStorage;