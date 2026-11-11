/**
 * ORBITAL SHIELD
 * DATA LAYER — SATELLITE CATALOG
 *
 * File: src/data/catalog.js
 *
 * Responsibilities:
 * - Manage satellite catalog records.
 * - Normalize satellite metadata.
 * - Validate satellite identity and TLE data.
 * - Add, update and remove catalog objects.
 * - Search and filter catalog records.
 * - Sort and paginate catalog results.
 * - Detect duplicate NORAD identifiers.
 * - Generate catalog statistics.
 * - Export catalog data into standard TLE format.
 *
 * Architecture:
 * - Framework independent.
 * - No network dependencies.
 * - No browser storage dependencies.
 * - Compatible with local persistence adapters.
 */

import {
  LIMITS,
  OBJECT_TYPES,
  ENUMS,
  classifyOrbit
} from "../engine/constants.js";

import {
  validateTle
} from "../engine/validation/tleValidator.js";

// ============================================================
// 1. CATALOG CONFIGURATION
// ============================================================

export const CATALOG_CONFIG = Object.freeze({
  VERSION: "1.0.0",

  DEFAULT_PAGE_SIZE: 25,

  MAX_PAGE_SIZE: 500,

  MAX_OBJECTS: LIMITS.MAX_CATALOG_OBJECTS,

  DEFAULT_SORT_FIELD: "name",

  DEFAULT_SORT_DIRECTION: "asc",

  SEARCH_FIELDS: Object.freeze([
    "name",
    "noradId",
    "internationalDesignator",
    "type",
    "status",
    "manufacturer",
    "operator",
    "country",
    "mission"
  ]),

  SUPPORTED_SORT_FIELDS: Object.freeze([
    "name",
    "noradId",
    "type",
    "status",
    "epoch",
    "createdAt",
    "updatedAt"
  ])
});

// ============================================================
// 2. CATALOG ERROR
// ============================================================

export class CatalogError extends Error {
  constructor(
    message,
    code = "CATALOG_ERROR",
    details = null
  ) {
    super(message);

    this.name = "CatalogError";
    this.code = code;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(
        this,
        CatalogError
      );
    }
  }
}

// ============================================================
// 3. BASIC VALIDATION
// ============================================================

function assertObject(value, name = "object") {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value)
  ) {
    throw new CatalogError(
      `${name} must be an object.`,
      "INVALID_OBJECT"
    );
  }
}

function assertString(
  value,
  name,
  {
    required = false,
    maxLength = 256
  } = {}
) {
  if (
    value === undefined ||
    value === null
  ) {
    if (required) {
      throw new CatalogError(
        `${name} is required.`,
        "MISSING_REQUIRED_FIELD"
      );
    }

    return "";
  }

  if (typeof value !== "string") {
    throw new CatalogError(
      `${name} must be a string.`,
      "INVALID_FIELD_TYPE"
    );
  }

  const normalized = value.trim();

  if (
    required &&
    normalized.length === 0
  ) {
    throw new CatalogError(
      `${name} cannot be empty.`,
      "EMPTY_REQUIRED_FIELD"
    );
  }

  if (normalized.length > maxLength) {
    throw new CatalogError(
      `${name} exceeds the maximum length.`,
      "FIELD_TOO_LONG"
    );
  }

  return normalized;
}

function assertNoradId(value) {
  const noradId = Number(value);

  if (
    !Number.isInteger(noradId) ||
    noradId < 1 ||
    noradId > 999999
  ) {
    throw new CatalogError(
      "NORAD ID must be an integer between 1 and 999999.",
      "INVALID_NORAD_ID"
    );
  }

  return noradId;
}

function normalizeOptionalDate(value, fieldName) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    throw new CatalogError(
      `${fieldName} is not a valid date.`,
      "INVALID_DATE"
    );
  }

  return date.toISOString();
}

function normalizeObjectType(value) {
  const allowed = Object.keys(
    OBJECT_TYPES
  );

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return "UNKNOWN";
  }

  const normalized =
    String(value).trim().toUpperCase();

  if (!allowed.includes(normalized)) {
    throw new CatalogError(
      `Unsupported object type: ${normalized}`,
      "INVALID_OBJECT_TYPE"
    );
  }

  return normalized;
}

function normalizeStatus(value) {
  const allowed = [
    "ACTIVE",
    "INACTIVE",
    "UNKNOWN",
    "DECAYED",
    "REENTERED",
    "UNDER_REVIEW"
  ];

  const normalized =
    String(value ?? "UNKNOWN")
      .trim()
      .toUpperCase();

  if (!allowed.includes(normalized)) {
    throw new CatalogError(
      `Unsupported object status: ${normalized}`,
      "INVALID_OBJECT_STATUS"
    );
  }

  return normalized;
}

// ============================================================
// 4. TEXT NORMALIZATION
// ============================================================

export function normalizeSearchText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .trim();
}

function normalizeMetadataText(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .trim();
}

// ============================================================
// 5. RECORD IDENTIFICATION
// ============================================================

export function createCatalogId(noradId) {
  const id = assertNoradId(noradId);

  return `NORAD-${String(id).padStart(6, "0")}`;
}

export function isCatalogRecord(value) {
  return Boolean(
    value &&
    typeof value === "object" &&
    Number.isInteger(value.noradId) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.line1 === "string" &&
    typeof value.line2 === "string"
  );
}

// ============================================================
// 6. TLE NORMALIZATION
// ============================================================

function normalizeTlePair(line1, line2) {
  const normalizedLine1 =
    assertString(
      line1,
      "line1",
      {
        required: true,
        maxLength: 69
      }
    );

  const normalizedLine2 =
    assertString(
      line2,
      "line2",
      {
        required: true,
        maxLength: 69
      }
    );

  const report =
    validateTle(
      normalizedLine1,
      normalizedLine2,
      {
        checkChecksum: true,
        checkEpoch: false
      }
    );

  if (!report.valid) {
    throw new CatalogError(
      "Satellite TLE validation failed.",
      "INVALID_TLE",
      report
    );
  }

  return {
    line1: normalizedLine1,
    line2: normalizedLine2,

    noradId: report.metadata.noradId,

    epoch: report.metadata.epoch,

    orbitalElements: {
      inclinationDeg:
        report.metadata.inclinationDeg,

      eccentricity:
        report.metadata.eccentricity,

      meanMotionRevPerDay:
        report.metadata.meanMotionRevPerDay
    },

    validation: report
  };
}

// ============================================================
// 7. RECORD FACTORY
// ============================================================

/**
 * Creates a normalized catalog record.
 *
 * Required:
 * - name
 * - line1
 * - line2
 *
 * Optional:
 * - objectType
 * - status
 * - manufacturer
 * - operator
 * - country
 * - mission
 * - internationalDesignator
 * - description
 */

export function createCatalogRecord(
  input,
  options = {}
) {
  assertObject(input, "catalog input");

  const {
    now = new Date(),
    source = ENUMS.DATA_SOURCE.IMPORTED
  } = options;

  if (
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime())
  ) {
    throw new CatalogError(
      "Creation date is invalid.",
      "INVALID_CREATION_DATE"
    );
  }

  const name =
    assertString(
      input.name,
      "name",
      {
        required: true,
        maxLength:
          LIMITS.MAX_OBJECT_NAME_LENGTH
      }
    );

  const tle =
    normalizeTlePair(
      input.line1,
      input.line2
    );

  if (
    input.noradId !== undefined &&
    assertNoradId(input.noradId) !== tle.noradId
  ) {
    throw new CatalogError(
      "Provided NORAD ID does not match the TLE.",
      "NORAD_ID_MISMATCH"
    );
  }

  const createdAt =
    normalizeOptionalDate(
      input.createdAt,
      "createdAt"
    ) ?? now.toISOString();

  const updatedAt =
    normalizeOptionalDate(
      input.updatedAt,
      "updatedAt"
    ) ?? createdAt;

  const objectType =
    normalizeObjectType(
      input.objectType ??
      input.type
    );

  const status =
    normalizeStatus(
      input.status
    );

  const metadata = {
    internationalDesignator:
      assertString(
        input.internationalDesignator,
        "internationalDesignator",
        {
          maxLength: 32
        }
      ),

    manufacturer:
      assertString(
        input.manufacturer,
        "manufacturer",
        {
          maxLength: 128
        }
      ),

    operator:
      assertString(
        input.operator,
        "operator",
        {
          maxLength: 128
        }
      ),

    country:
      assertString(
        input.country,
        "country",
        {
          maxLength: 64
        }
      ),

    mission:
      assertString(
        input.mission,
        "mission",
        {
          maxLength: 256
        }
      ),

    description:
      assertString(
        input.description,
        "description",
        {
          maxLength:
            LIMITS.MAX_DESCRIPTION_LENGTH
        }
      )
  };

  const record = {
    id: createCatalogId(
      tle.noradId
    ),

    noradId:
      tle.noradId,

    name,

    objectType,

    type: objectType,

    status,

    line1: tle.line1,

    line2: tle.line2,

    epoch: tle.epoch,

    orbitalElements:
      tle.orbitalElements,

    metadata,

    source,

    validation: {
      valid: true,

      errors: [],

      warnings:
        tle.validation.warnings
    },

    createdAt,

    updatedAt,

    revision: 1
  };

  return Object.freeze({
    ...record,

    orbitalElements:
      Object.freeze({
        ...record.orbitalElements
      }),

    metadata:
      Object.freeze({
        ...record.metadata
      }),

    validation:
      Object.freeze({
        ...record.validation
      })
  });
}

// ============================================================
// 8. RECORD UPDATE
// ============================================================

/**
 * Updates an existing catalog record.
 *
 * NORAD identity cannot be changed independently of TLE.
 * If TLE is updated, the new TLE must belong to the same
 * NORAD catalog identifier.
 */

export function updateCatalogRecord(
  existingRecord,
  updates,
  options = {}
) {
  if (!isCatalogRecord(existingRecord)) {
    throw new CatalogError(
      "Existing catalog record is invalid.",
      "INVALID_EXISTING_RECORD"
    );
  }

  assertObject(
    updates,
    "updates"
  );

  const {
    now = new Date()
  } = options;

  if (
    !(now instanceof Date) ||
    !Number.isFinite(now.getTime())
  ) {
    throw new CatalogError(
      "Update date is invalid.",
      "INVALID_UPDATE_DATE"
    );
  }

  const candidate = {
    ...existingRecord,

    ...updates,

    metadata: {
      ...existingRecord.metadata,
      ...(updates.metadata ?? {})
    },

    orbitalElements:
      existingRecord.orbitalElements
  };

  const updated =
    createCatalogRecord(
      candidate,
      {
        now,
        source: existingRecord.source
      }
    );

  if (
    updated.noradId !==
    existingRecord.noradId
  ) {
    throw new CatalogError(
      "NORAD identity cannot be changed during an update.",
      "IMMUTABLE_NORAD_ID"
    );
  }

  return Object.freeze({
    ...updated,

    id: existingRecord.id,

    createdAt:
      existingRecord.createdAt,

    updatedAt:
      now.toISOString(),

    revision:
      existingRecord.revision + 1
  });
}

// ============================================================
// 9. CATALOG CLASS
// ============================================================

export class SatelliteCatalog {
  #records = new Map();

  #revision = 0;

  #createdAt = new Date().toISOString();

  #updatedAt = this.#createdAt;

  constructor(initialRecords = []) {
    if (!Array.isArray(initialRecords)) {
      throw new CatalogError(
        "Initial records must be an array.",
        "INVALID_INITIAL_RECORDS"
      );
    }

    if (
      initialRecords.length >
      CATALOG_CONFIG.MAX_OBJECTS
    ) {
      throw new CatalogError(
        "Initial catalog exceeds the object limit.",
        "CATALOG_CAPACITY_EXCEEDED"
      );
    }

    for (const record of initialRecords) {
      this.add(record);
    }
  }

  // ----------------------------------------------------------
  // Internal helpers
  // ----------------------------------------------------------

  #touch() {
    this.#revision += 1;

    this.#updatedAt =
      new Date().toISOString();
  }

  #getKey(noradId) {
    return String(
      assertNoradId(noradId)
    );
  }

  #findRecord(noradId) {
    return this.#records.get(
      this.#getKey(noradId)
    ) ?? null;
  }

  // ----------------------------------------------------------
  // Basic information
  // ----------------------------------------------------------

  get size() {
    return this.#records.size;
  }

  get revision() {
    return this.#revision;
  }

  get createdAt() {
    return this.#createdAt;
  }

  get updatedAt() {
    return this.#updatedAt;
  }

  // ----------------------------------------------------------
  // Add
  // ----------------------------------------------------------

  add(input, options = {}) {
    if (
      this.#records.size >=
      CATALOG_CONFIG.MAX_OBJECTS
    ) {
      throw new CatalogError(
        "Catalog capacity exceeded.",
        "CATALOG_CAPACITY_EXCEEDED"
      );
    }

    const record =
      isCatalogRecord(input)
        ? createCatalogRecord(
            input,
            options
          )
        : createCatalogRecord(
            input,
            options
          );

    const key =
      this.#getKey(record.noradId);

    if (this.#records.has(key)) {
      throw new CatalogError(
        `NORAD ${record.noradId} already exists.`,
        "DUPLICATE_NORAD_ID",
        {
          noradId: record.noradId
        }
      );
    }

    this.#records.set(
      key,
      record
    );

    this.#touch();

    return record;
  }

  // ----------------------------------------------------------
  // Add multiple records
  // ----------------------------------------------------------

  addMany(inputs, options = {}) {
    if (!Array.isArray(inputs)) {
      throw new CatalogError(
        "Inputs must be an array.",
        "INVALID_INPUT_ARRAY"
      );
    }

    const results = {
      added: [],
      failed: []
    };

    for (
      let index = 0;
      index < inputs.length;
      index += 1
    ) {
      try {
        results.added.push(
          this.add(
            inputs[index],
            options
          )
        );
      } catch (error) {
        results.failed.push({
          index,

          name:
            inputs[index]?.name ?? null,

          code:
            error.code ?? "UNKNOWN",

          message:
            error.message
        });
      }
    }

    return {
      ...results,

      statistics: {
        requested: inputs.length,

        added: results.added.length,

        failed: results.failed.length
      }
    };
  }

  // ----------------------------------------------------------
  // Update
  // ----------------------------------------------------------

  update(noradId, updates, options = {}) {
    const key =
      this.#getKey(noradId);

    const existing =
      this.#records.get(key);

    if (!existing) {
      throw new CatalogError(
        `NORAD ${noradId} was not found.`,
        "RECORD_NOT_FOUND"
      );
    }

    const updated =
      updateCatalogRecord(
        existing,
        updates,
        options
      );

    this.#records.set(
      key,
      updated
    );

    this.#touch();

    return updated;
  }

  // ----------------------------------------------------------
  // Remove
  // ----------------------------------------------------------

  remove(noradId) {
    const key =
      this.#getKey(noradId);

    const existing =
      this.#records.get(key);

    if (!existing) {
      return {
        removed: false,
        record: null
      };
    }

    this.#records.delete(key);

    this.#touch();

    return {
      removed: true,
      record: existing
    };
  }

  // ----------------------------------------------------------
  // Clear
  // ----------------------------------------------------------

  clear() {
    const removedCount =
      this.#records.size;

    if (removedCount > 0) {
      this.#records.clear();

      this.#touch();
    }

    return {
      removedCount
    };
  }

  // ----------------------------------------------------------
  // Get
  // ----------------------------------------------------------

  get(noradId) {
    return this.#findRecord(
      noradId
    );
  }

  has(noradId) {
    return this.#findRecord(
      noradId
    ) !== null;
  }

  // ----------------------------------------------------------
  // Get all
  // ----------------------------------------------------------

  getAll() {
    return Array.from(
      this.#records.values()
    );
  }

  // ----------------------------------------------------------
  // Search
  // ----------------------------------------------------------

  search(query, options = {}) {
    const normalizedQuery =
      normalizeSearchText(query);

    if (!normalizedQuery) {
      return this.getAll();
    }

    const fields =
      options.fields ??
      CATALOG_CONFIG.SEARCH_FIELDS;

    if (!Array.isArray(fields)) {
      throw new CatalogError(
        "Search fields must be an array.",
        "INVALID_SEARCH_FIELDS"
      );
    }

    return this.getAll().filter(record => {
      const values = [
        ...fields.map(field => {
          if (field === "noradId") {
            return record.noradId;
          }

          if (field === "type") {
            return record.objectType;
          }

          if (field.startsWith("metadata.")) {
            return record.metadata[
              field.slice(9)
            ];
          }

          return record[field];
        })
      ];

      return values.some(value =>
        normalizeSearchText(value)
          .includes(normalizedQuery)
      );
    });
  }

  // ----------------------------------------------------------
  // Filter
  // ----------------------------------------------------------

  filter(criteria = {}) {
    assertObject(
      criteria,
      "filter criteria"
    );

    const {
      objectType,
      status,
      source,
      country,
      operator,
      epochBefore,
      epochAfter,
      noradMin,
      noradMax
    } = criteria;

    const before =
      epochBefore
        ? new Date(epochBefore).getTime()
        : null;

    const after =
      epochAfter
        ? new Date(epochAfter).getTime()
        : null;

    if (
      before !== null &&
      !Number.isFinite(before)
    ) {
      throw new CatalogError(
        "epochBefore is invalid.",
        "INVALID_FILTER_DATE"
      );
    }

    if (
      after !== null &&
      !Number.isFinite(after)
    ) {
      throw new CatalogError(
        "epochAfter is invalid.",
        "INVALID_FILTER_DATE"
      );
    }

    return this.getAll().filter(record => {
      if (
        objectType &&
        record.objectType !== objectType
      ) {
        return false;
      }

      if (
        status &&
        record.status !== status
      ) {
        return false;
      }

      if (
        source &&
        record.source !== source
      ) {
        return false;
      }

      if (
        country &&
        normalizeSearchText(
          record.metadata.country
        ) !== normalizeSearchText(country)
      ) {
        return false;
      }

      if (
        operator &&
        !normalizeSearchText(
          record.metadata.operator
        ).includes(
          normalizeSearchText(operator)
        )
      ) {
        return false;
      }

      const epoch =
        new Date(record.epoch).getTime();

      if (
        before !== null &&
        epoch > before
      ) {
        return false;
      }

      if (
        after !== null &&
        epoch < after
      ) {
        return false;
      }

      if (
        noradMin !== undefined &&
        record.noradId < noradMin
      ) {
        return false;
      }

      if (
        noradMax !== undefined &&
        record.noradId > noradMax
      ) {
        return false;
      }

      return true;
    });
  }

  // ----------------------------------------------------------
  // Sort
  // ----------------------------------------------------------

  sort(records = this.getAll(), options = {}) {
    if (!Array.isArray(records)) {
      throw new CatalogError(
        "Records must be an array.",
        "INVALID_SORT_INPUT"
      );
    }

    const {
      field =
        CATALOG_CONFIG.DEFAULT_SORT_FIELD,

      direction =
        CATALOG_CONFIG.DEFAULT_SORT_DIRECTION
    } = options;

    if (
      !CATALOG_CONFIG.SUPPORTED_SORT_FIELDS
        .includes(field)
    ) {
      throw new CatalogError(
        `Unsupported sort field: ${field}`,
        "UNSUPPORTED_SORT_FIELD"
      );
    }

    if (
      direction !== "asc" &&
      direction !== "desc"
    ) {
      throw new CatalogError(
        "Sort direction must be asc or desc.",
        "INVALID_SORT_DIRECTION"
      );
    }

    const multiplier =
      direction === "asc" ? 1 : -1;

    return [...records].sort((a, b) => {
      let valueA = a[field];
      let valueB = b[field];

      if (
        field === "name" ||
        field === "type" ||
        field === "status"
      ) {
        valueA =
          normalizeSearchText(valueA);

        valueB =
          normalizeSearchText(valueB);

        return (
          valueA.localeCompare(valueB) *
          multiplier
        );
      }

      if (
        field === "epoch" ||
        field === "createdAt" ||
        field === "updatedAt"
      ) {
        valueA =
          new Date(valueA).getTime();

        valueB =
          new Date(valueB).getTime();
      }

      return (
        (valueA - valueB) *
        multiplier
      );
    });
  }

  // ----------------------------------------------------------
  // Pagination
  // ----------------------------------------------------------

  paginate(records = this.getAll(), options = {}) {
    if (!Array.isArray(records)) {
      throw new CatalogError(
        "Records must be an array.",
        "INVALID_PAGINATION_INPUT"
      );
    }

    const {
      page = 1,
      pageSize =
        CATALOG_CONFIG.DEFAULT_PAGE_SIZE
    } = options;

    if (
      !Number.isInteger(page) ||
      page < 1
    ) {
      throw new RangeError(
        "Page must be a positive integer."
      );
    }

    if (
      !Number.isInteger(pageSize) ||
      pageSize < 1 ||
      pageSize >
        CATALOG_CONFIG.MAX_PAGE_SIZE
    ) {
      throw new RangeError(
        "Page size is outside the supported range."
      );
    }

    const total =
      records.length;

    const totalPages =
      Math.ceil(total / pageSize);

    const start =
      (page - 1) * pageSize;

    const items =
      records.slice(
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

        hasPrevious:
          page > 1,

        hasNext:
          page < totalPages
      }
    };
  }

  // ----------------------------------------------------------
  // Statistics
  // ----------------------------------------------------------

  getStatistics() {
    const records =
      this.getAll();

    const byType = {};
    const byStatus = {};
    const bySource = {};
    const byCountry = {};

    const orbitBands = {};

    for (const record of records) {
      byType[record.objectType] =
        (byType[record.objectType] ?? 0) + 1;

      byStatus[record.status] =
        (byStatus[record.status] ?? 0) + 1;

      bySource[record.source] =
        (bySource[record.source] ?? 0) + 1;

      const country =
        record.metadata.country || "UNKNOWN";

      byCountry[country] =
        (byCountry[country] ?? 0) + 1;

      const region =
        classifyOrbit(
          estimateAltitudeFromTle(record)
        ) ?? "UNKNOWN";

      orbitBands[region] =
        (orbitBands[region] ?? 0) + 1;
    }

    return {
      totalObjects:
        records.length,

      revision:
        this.#revision,

      byType,

      byStatus,

      bySource,

      byCountry,

      orbitBands,

      createdAt:
        this.#createdAt,

      updatedAt:
        this.#updatedAt
    };
  }

  // ----------------------------------------------------------
  // Export
  // ----------------------------------------------------------

  exportTle(options = {}) {
    const {
      includeNames = true,
      records = this.getAll()
    } = options;

    if (!Array.isArray(records)) {
      throw new CatalogError(
        "Export records must be an array.",
        "INVALID_EXPORT_INPUT"
      );
    }

    const lines = [];

    for (const record of records) {
      if (!isCatalogRecord(record)) {
        throw new CatalogError(
          "Export contains an invalid catalog record.",
          "INVALID_EXPORT_RECORD"
        );
      }

      if (includeNames) {
        lines.push(record.name);
      }

      lines.push(record.line1);
      lines.push(record.line2);
    }

    return lines.join("\n");
  }

  // ----------------------------------------------------------
  // Snapshot
  // ----------------------------------------------------------

  createSnapshot() {
    return {
      schemaVersion:
        CATALOG_CONFIG.VERSION,

      revision:
        this.#revision,

      createdAt:
        this.#createdAt,

      updatedAt:
        this.#updatedAt,

      records:
        this.getAll()
    };
  }

  // ----------------------------------------------------------
  // Restore
  // ----------------------------------------------------------

  restore(snapshot, options = {}) {
    assertObject(
      snapshot,
      "snapshot"
    );

    if (!Array.isArray(snapshot.records)) {
      throw new CatalogError(
        "Snapshot does not contain a valid records array.",
        "INVALID_SNAPSHOT"
      );
    }

    if (
      snapshot.records.length >
      CATALOG_CONFIG.MAX_OBJECTS
    ) {
      throw new CatalogError(
        "Snapshot exceeds catalog capacity.",
        "SNAPSHOT_TOO_LARGE"
      );
    }

    const {
      replace = false
    } = options;

    const staged = new Map();

    for (const input of snapshot.records) {
      const record =
        createCatalogRecord(input, {
          source:
            input.source ??
            ENUMS.DATA_SOURCE.IMPORTED
        });

      const key =
        String(record.noradId);

      if (staged.has(key)) {
        throw new CatalogError(
          `Duplicate NORAD ${record.noradId} in snapshot.`,
          "DUPLICATE_SNAPSHOT_RECORD"
        );
      }

      staged.set(
        key,
        record
      );
    }

    if (!replace) {
      for (const key of staged.keys()) {
        if (this.#records.has(key)) {
          throw new CatalogError(
            `NORAD ${key} already exists in catalog.`,
            "RESTORE_CONFLICT"
          );
        }
      }

      if (
        this.#records.size + staged.size >
        CATALOG_CONFIG.MAX_OBJECTS
      ) {
        throw new CatalogError(
          "Restored records exceed catalog capacity.",
          "CATALOG_CAPACITY_EXCEEDED"
        );
      }

      for (const [key, record] of staged) {
        this.#records.set(key, record);
      }
    } else {
      this.#records = staged;
    }

    this.#touch();

    return {
      restored: staged.size,

      totalObjects:
        this.#records.size,

      revision:
        this.#revision
    };
  }

  // ----------------------------------------------------------
  // Integrity validation
  // ----------------------------------------------------------

  validateIntegrity() {
    const errors = [];

    const ids = new Set();

    for (const record of this.#records.values()) {
      if (!isCatalogRecord(record)) {
        errors.push({
          code: "INVALID_RECORD",
          noradId: record?.noradId ?? null
        });

        continue;
      }

      if (ids.has(record.noradId)) {
        errors.push({
          code: "DUPLICATE_NORAD_ID",
          noradId: record.noradId
        });
      }

      ids.add(record.noradId);

      try {
        const report =
          validateTle(
            record.line1,
            record.line2,
            {
              checkChecksum: true,
              checkEpoch: false
            }
          );

        if (!report.valid) {
          errors.push({
            code: "INVALID_TLE",
            noradId: record.noradId,
            details: report.errors
          });
        }
      } catch (error) {
        errors.push({
          code: "TLE_VALIDATION_EXCEPTION",
          noradId: record.noradId,
          message: error.message
        });
      }
    }

    return {
      valid: errors.length === 0,

      totalRecords:
        this.#records.size,

      errorCount:
        errors.length,

      errors
    };
  }
}

// ============================================================
// 10. ORBITAL ALTITUDE ESTIMATION
// ============================================================

/**
 * Estimates a representative altitude from mean motion.
 *
 * This is a two-body estimate derived from mean motion.
 * It is not the instantaneous altitude of the satellite.
 *
 * It is useful only for approximate catalog grouping.
 */

export function estimateAltitudeFromTle(record) {
  if (
    !record ||
    typeof record.line2 !== "string" ||
    record.line2.length !== 69
  ) {
    return null;
  }

  const meanMotion =
    Number(
      record.line2.slice(52, 63)
    );

  if (
    !Number.isFinite(meanMotion) ||
    meanMotion <= 0
  ) {
    return null;
  }

  const meanMotionRadS =
    meanMotion *
    2 *
    Math.PI /
    86400;

  const gravitationalParameter =
    398600.4418;

  const semiMajorAxis =
    Math.cbrt(
      gravitationalParameter /
      (
        meanMotionRadS *
        meanMotionRadS
      )
    );

  const earthRadiusKm =
    6378.137;

  return (
    semiMajorAxis -
    earthRadiusKm
  );
}

// ============================================================
// 11. CATALOG FACTORY
// ============================================================

export function createSatelliteCatalog(
  initialRecords = []
) {
  return new SatelliteCatalog(
    initialRecords
  );
}

// ============================================================
// 12. MODULE EXPORT
// ============================================================

export const SatelliteCatalogAPI = Object.freeze({
  createCatalogId,

  isCatalogRecord,

  normalizeSearchText,

  createCatalogRecord,

  updateCatalogRecord,

  estimateAltitudeFromTle,

  createSatelliteCatalog
});