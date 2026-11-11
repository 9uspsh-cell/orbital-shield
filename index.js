/**
 * ORBITAL SHIELD
 * Data Management Layer
 *
 * Integrates:
 * - SatelliteCatalog
 * - OrbitalStorage
 *
 * Responsibilities:
 * - Persistent catalog management
 * - Catalog hydration
 * - CRUD operations
 * - Import and export
 * - Backup and restore
 * - Data integrity checks
 * - Transaction-like catalog updates
 */

import {
  SatelliteCatalog,
  CatalogError,
  createCatalogRecord,
  updateCatalogRecord
} from "./catalog.js";

import {
  orbitalStorage,
  StorageError
} from "./storage.js";

const DATA_CONFIG = Object.freeze({
  STORAGE_KEY: "catalog",

  DEFAULT_PAGE_SIZE: 50,

  MAX_PAGE_SIZE: 500,

  MAX_IMPORT_RECORDS: 10000,

  SNAPSHOT_FORMAT: "ORBITAL_SHIELD_CATALOG",

  SNAPSHOT_VERSION: 1
});

export class DataManagerError extends Error {
  constructor(message, code = "DATA_MANAGER_ERROR", cause = null) {
    super(message);

    this.name = "DataManagerError";
    this.code = code;

    if (cause) {
      this.cause = cause;
    }
  }
}

function clone(value) {
  if (typeof structuredClone === "function") {
    return structuredClone(value);
  }

  return JSON.parse(JSON.stringify(value));
}

function validateRecordArray(records) {
  if (!Array.isArray(records)) {
    throw new DataManagerError(
      "بيانات الكتالوج يجب أن تكون مصفوفة.",
      "INVALID_RECORD_COLLECTION"
    );
  }

  if (records.length > DATA_CONFIG.MAX_IMPORT_RECORDS) {
    throw new DataManagerError(
      "عدد السجلات يتجاوز الحد المسموح به.",
      "IMPORT_LIMIT_EXCEEDED"
    );
  }
}

function normalizePageOptions(options = {}) {
  const page = Math.max(
    1,
    Math.floor(Number(options.page) || 1)
  );

  const pageSize = Math.min(
    DATA_CONFIG.MAX_PAGE_SIZE,
    Math.max(
      1,
      Math.floor(
        Number(options.pageSize) ||
        DATA_CONFIG.DEFAULT_PAGE_SIZE
      )
    )
  );

  return {
    page,
    pageSize
  };
}

function normalizeSearchQuery(query) {
  if (typeof query !== "string") {
    return "";
  }

  return query.trim().toLowerCase();
}

function makeSnapshot(records, metadata = {}) {
  return {
    application: "ORBITAL SHIELD",

    format: DATA_CONFIG.SNAPSHOT_FORMAT,

    version: DATA_CONFIG.SNAPSHOT_VERSION,

    exportedAt: new Date().toISOString(),

    recordCount: records.length,

    metadata: clone(metadata),

    records: clone(records)
  };
}

/* -------------------------------------------------------
   Data Manager
------------------------------------------------------- */

export class OrbitalDataManager {
  constructor(options = {}) {
    this.options = {
      autoSave: true,

      autoInitialize: true,

      ...options
    };

    this.catalog = new SatelliteCatalog();

    this.initialized = false;

    this.initializing = null;

    this.saving = Promise.resolve();

    this.listeners = new Set();

    this.lastModified = null;

    this.lastError = null;

    this.revision = 0;
  }

  /* -----------------------------------------------------
     Initialization
  ----------------------------------------------------- */

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
    try {
      await orbitalStorage.initialize();

      const storedRecords = await orbitalStorage.get(
        DATA_CONFIG.STORAGE_KEY
      );

      if (Array.isArray(storedRecords)) {
        this.catalog = this.createCatalogFromRecords(
          storedRecords
        );
      }

      this.initialized = true;

      this.lastModified = new Date().toISOString();

      this.emit("initialized", {
        count: this.catalog.getAll().length
      });

      return this.getStatus();
    } catch (error) {
      this.lastError = error;

      throw new DataManagerError(
        "تعذر تهيئة مدير البيانات.",
        "DATA_INITIALIZATION_FAILED",
        error
      );
    }
  }

  assertInitialized() {
    if (!this.initialized) {
      throw new DataManagerError(
        "يجب تهيئة مدير البيانات أولاً.",
        "DATA_MANAGER_NOT_INITIALIZED"
      );
    }
  }

  createCatalogFromRecords(records) {
    validateRecordArray(records);

    const catalog = new SatelliteCatalog();

    if (records.length > 0) {
      catalog.addMany(records);
    }

    return catalog;
  }

  /* -----------------------------------------------------
     Events
  ----------------------------------------------------- */

  subscribe(listener) {
    if (typeof listener !== "function") {
      throw new DataManagerError(
        "مستمع الأحداث يجب أن يكون دالة.",
        "INVALID_LISTENER"
      );
    }

    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  emit(event, details = {}) {
    const payload = {
      event,

      timestamp: new Date().toISOString(),

      revision: this.revision,

      details
    };

    for (const listener of this.listeners) {
      try {
        listener(payload);
      } catch (error) {
        console.error(
          "[ORBITAL SHIELD] Data listener error:",
          error
        );
      }
    }
  }

  /* -----------------------------------------------------
     Persistence
  ----------------------------------------------------- */

  async persist(options = {}) {
    this.assertInitialized();

    if (!this.options.autoSave && !options.force) {
      return {
        saved: false,
        reason: "AUTO_SAVE_DISABLED"
      };
    }

    const operation = async () => {
      try {
        const records = this.catalog.getAll();

        const result = await orbitalStorage.update(
          DATA_CONFIG.STORAGE_KEY,
          records
        );

        this.lastModified = new Date().toISOString();

        this.emit("saved", {
          count: records.length,
          storageRevision: result.revision
        });

        return {
          saved: true,
          count: records.length,
          storageRevision: result.revision
        };
      } catch (error) {
        this.lastError = error;

        throw new DataManagerError(
          "تعذر حفظ الكتالوج.",
          "CATALOG_PERSIST_FAILED",
          error
        );
      }
    };

    const result = this.saving.then(operation, operation);

    this.saving = result.catch(() => {});

    return result;
  }

  async flush() {
    await this.saving;

    return this.persist({
      force: true
    });
  }

  /* -----------------------------------------------------
     Catalog Access
  ----------------------------------------------------- */

  getCatalog() {
    this.assertInitialized();

    return this.catalog;
  }

  getAll(options = {}) {
    this.assertInitialized();

    const records = this.catalog.getAll();

    if (options.sortBy) {
      return this.catalog.sort(
        options.sortBy,
        options.direction || "asc"
      );
    }

    return records;
  }

  getById(id) {
    this.assertInitialized();

    return this.catalog.get(id);
  }

  has(id) {
    this.assertInitialized();

    return this.catalog.has(id);
  }

  count() {
    this.assertInitialized();

    return this.catalog.getAll().length;
  }

  /* -----------------------------------------------------
     Create
  ----------------------------------------------------- */

  async add(record, options = {}) {
    this.assertInitialized();

    try {
      const created = this.catalog.add(record);

      this.revision += 1;

      if (options.persist !== false) {
        await this.persist();
      }

      this.emit("record-added", {
        id: created.id,
        noradId: created.noradId
      });

      return created;
    } catch (error) {
      throw this.wrapCatalogError(
        "تعذرت إضافة الجسم المداري.",
        error
      );
    }
  }

  async addMany(records, options = {}) {
    this.assertInitialized();

    validateRecordArray(records);

    const previous = this.catalog.getAll();

    try {
      const result = this.catalog.addMany(records);

      this.revision += 1;

      if (options.persist !== false) {
        await this.persist();
      }

      this.emit("records-added", {
        count: result.length
      });

      return result;
    } catch (error) {
      this.catalog = this.createCatalogFromRecords(previous);

      throw this.wrapCatalogError(
        "تعذرت إضافة مجموعة الأجسام.",
        error
      );
    }
  }

  /* -----------------------------------------------------
     Update
  ----------------------------------------------------- */

  async update(id, updates, options = {}) {
    this.assertInitialized();

    const previous = this.catalog.get(id);

    if (!previous) {
      throw new DataManagerError(
        "الجسم المطلوب غير موجود في الكتالوج.",
        "RECORD_NOT_FOUND"
      );
    }

    try {
      const updated = this.catalog.update(
        id,
        updates
      );

      this.revision += 1;

      if (options.persist !== false) {
        await this.persist();
      }

      this.emit("record-updated", {
        id
      });

      return updated;
    } catch (error) {
      throw this.wrapCatalogError(
        "تعذر تحديث بيانات الجسم.",
        error
      );
    }
  }

  /* -----------------------------------------------------
     Delete
  ----------------------------------------------------- */

  async remove(id, options = {}) {
    this.assertInitialized();

    const existing = this.catalog.get(id);

    if (!existing) {
      return {
        removed: false,
        reason: "NOT_FOUND"
      };
    }

    try {
      const removed = this.catalog.remove(id);

      this.revision += 1;

      if (options.persist !== false) {
        await this.persist();
      }

      this.emit("record-removed", {
        id
      });

      return {
        removed,
        id
      };
    } catch (error) {
      throw this.wrapCatalogError(
        "تعذر حذف الجسم.",
        error
      );
    }
  }

  async clear(options = {}) {
    this.assertInitialized();

    const previous = this.catalog.getAll();

    try {
      this.catalog.clear();

      this.revision += 1;

      if (options.persist !== false) {
        await this.persist();
      }

      this.emit("catalog-cleared", {
        removedCount: previous.length
      });

      return {
        success: true,
        removedCount: previous.length
      };
    } catch (error) {
      this.catalog = this.createCatalogFromRecords(
        previous
      );

      throw this.wrapCatalogError(
        "تعذر تنظيف الكتالوج.",
        error
      );
    }
  }

  /* -----------------------------------------------------
     Search and Filtering
  ----------------------------------------------------- */

  search(query, options = {}) {
    this.assertInitialized();

    const normalized = normalizeSearchQuery(query);

    if (!normalized) {
      return this.paginate(
        this.getAll(),
        options
      );
    }

    const results = this.catalog.search(normalized);

    return this.paginate(
      results,
      options
    );
  }

  filter(criteria = {}, options = {}) {
    this.assertInitialized();

    const results = this.catalog.filter(criteria);

    return this.paginate(
      results,
      options
    );
  }

  paginate(records, options = {}) {
    const { page, pageSize } = normalizePageOptions(
      options
    );

    const total = records.length;

    const totalPages = Math.ceil(
      total / pageSize
    );

    const start = (page - 1) * pageSize;

    const items = records.slice(
      start,
      start + pageSize
    );

    return {
      items,

      pagination: {
        page,

        pageSize,

        total,

        totalPages,

        hasPrevious: page > 1,

        hasNext: page < totalPages
      }
    };
  }

  /* -----------------------------------------------------
     Statistics and Integrity
  ----------------------------------------------------- */

  getStatistics() {
    this.assertInitialized();

    return this.catalog.getStatistics();
  }

  checkIntegrity() {
    this.assertInitialized();

    return this.catalog.checkIntegrity();
  }

  getStatus() {
    return {
      initialized: this.initialized,

      recordCount: this.initialized
        ? this.catalog.getAll().length
        : 0,

      revision: this.revision,

      lastModified: this.lastModified,

      autoSave: this.options.autoSave,

      lastError: this.lastError
        ? this.lastError.message
        : null
    };
  }

  /* -----------------------------------------------------
     Snapshot Export / Import
  ----------------------------------------------------- */

  exportCatalog() {
    this.assertInitialized();

    const records = this.catalog.getAll();

    return makeSnapshot(
      records,
      {
        source: "LOCAL_CATALOG",

        catalogStatistics: this.getStatistics()
      }
    );
  }

  async importCatalog(snapshot, options = {}) {
    this.assertInitialized();

    if (
      !snapshot ||
      snapshot.format !== DATA_CONFIG.SNAPSHOT_FORMAT
    ) {
      throw new DataManagerError(
        "صيغة ملف الكتالوج غير صحيحة.",
        "INVALID_CATALOG_SNAPSHOT"
      );
    }

    if (snapshot.version !== DATA_CONFIG.SNAPSHOT_VERSION) {
      throw new DataManagerError(
        "إصدار ملف الكتالوج غير مدعوم.",
        "UNSUPPORTED_CATALOG_VERSION"
      );
    }

    validateRecordArray(snapshot.records);

    const previous = this.catalog.getAll();

    let stagedCatalog;

    try {
      stagedCatalog = this.createCatalogFromRecords(
        snapshot.records
      );
    } catch (error) {
      throw this.wrapCatalogError(
        "فشل التحقق من سجلات الملف المستورد.",
        error
      );
    }

    if (options.mode === "merge") {
      const merged = new SatelliteCatalog();

      merged.addMany(previous);

      merged.addMany(stagedCatalog.getAll());

      stagedCatalog = merged;
    }

    this.catalog = stagedCatalog;

    try {
      if (options.persist !== false) {
        await this.persist();
      }
    } catch (error) {
      this.catalog = this.createCatalogFromRecords(
        previous
      );

      throw error;
    }

    this.revision += 1;

    this.emit("catalog-imported", {
      count: this.catalog.getAll().length,

      mode: options.mode === "merge"
        ? "merge"
        : "replace"
    });

    return {
      success: true,

      count: this.catalog.getAll().length
    };
  }

  /* -----------------------------------------------------
     Backup and Restore
  ----------------------------------------------------- */

  async createBackup() {
    this.assertInitialized();

    await this.persist({
      force: true
    });

    return orbitalStorage.createBackup();
  }

  async getBackups() {
    this.assertInitialized();

    return orbitalStorage.getBackups();
  }

  async restoreBackup(backupId) {
    this.assertInitialized();

    const current = this.catalog.getAll();

    try {
      await orbitalStorage.restoreBackup(backupId);

      const restoredRecords = await orbitalStorage.get(
        DATA_CONFIG.STORAGE_KEY
      );

      if (!Array.isArray(restoredRecords)) {
        throw new DataManagerError(
          "النسخة المستعادة لا تحتوي على كتالوج صالح.",
          "RESTORE_INVALID_CATALOG"
        );
      }

      this.catalog = this.createCatalogFromRecords(
        restoredRecords
      );

      this.revision += 1;

      this.emit("backup-restored", {
        backupId,

        count: restoredRecords.length
      });

      return {
        success: true,

        count: restoredRecords.length
      };
    } catch (error) {
      this.catalog = this.createCatalogFromRecords(
        current
      );

      throw new DataManagerError(
        "تعذرت استعادة النسخة الاحتياطية.",
        "BACKUP_RESTORE_FAILED",
        error
      );
    }
  }

  /* -----------------------------------------------------
     Error Handling
  ----------------------------------------------------- */

  wrapCatalogError(message, error) {
    if (
      error instanceof CatalogError ||
      error instanceof StorageError
    ) {
      return new DataManagerError(
        message,
        error.code || "CATALOG_OPERATION_FAILED",
        error
      );
    }

    return new DataManagerError(
      message,
      "CATALOG_OPERATION_FAILED",
      error
    );
  }

  /* -----------------------------------------------------
     Lifecycle
  ----------------------------------------------------- */

  async shutdown() {
    if (!this.initialized) {
      return;
    }

    try {
      await this.flush();
    } finally {
      this.listeners.clear();

      this.initialized = false;
    }
  }
}

/* -------------------------------------------------------
   Default Manager
------------------------------------------------------- */

export const orbitalData = new OrbitalDataManager();

/* -------------------------------------------------------
   Public API
------------------------------------------------------- */

export async function initializeData() {
  return orbitalData.initialize();
}

export function getOrbitalCatalog() {
  return orbitalData.getCatalog();
}

export async function addOrbitalObject(record, options) {
  return orbitalData.add(record, options);
}

export async function updateOrbitalObject(id, updates, options) {
  return orbitalData.update(id, updates, options);
}

export async function removeOrbitalObject(id, options) {
  return orbitalData.remove(id, options);
}

export async function searchOrbitalObjects(query, options) {
  return orbitalData.search(query, options);
}

export async function getOrbitalStatistics() {
  return orbitalData.getStatistics();
}

export default orbitalData;