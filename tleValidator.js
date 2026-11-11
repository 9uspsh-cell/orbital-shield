/**
 * ORBITAL SHIELD
 * ORBITAL ENGINE — TLE VALIDATION
 *
 * File: src/engine/validation/tleValidator.js
 *
 * Responsibilities:
 * - Validate Two-Line Element (TLE) records.
 * - Verify line identifiers and standard field positions.
 * - Calculate and verify TLE checksums.
 * - Validate matching NORAD catalog identifiers.
 * - Validate epoch fields and orbital element ranges.
 * - Parse standard 2LE and 3LE input formats.
 * - Return structured validation reports.
 *
 * Important:
 * Structural validation does not prove that orbital data
 * is current, accurate, or suitable for operational use.
 */

import {
  TLE,
  TIME,
  LIMITS
} from "../constants.js";

// ============================================================
// 1. VALIDATION CONSTANTS
// ============================================================

const VALIDATION_RULES = Object.freeze({
  MIN_NORAD_ID: 1,
  MAX_NORAD_ID: 999999,

  MIN_INCLINATION_DEG: 0,
  MAX_INCLINATION_DEG: 180,

  MIN_ECCENTRICITY: 0,
  MAX_ECCENTRICITY: 1,

  MIN_MEAN_MOTION_REV_DAY: 0,
  MAX_MEAN_MOTION_REV_DAY: 20,

  MIN_BSTAR_ABSOLUTE: 0,
  MAX_BSTAR_ABSOLUTE: 1,

  MIN_EPOCH_YEAR: 1957,
  MAX_FUTURE_EPOCH_DAYS: 366,

  MAX_LINE_LENGTH: 256
});

const MONTH_LENGTHS = Object.freeze([
  31, 28, 31, 30, 31, 30,
  31, 31, 30, 31, 30, 31
]);

// ============================================================
// 2. RESULT HELPERS
// ============================================================

function createIssue(
  code,
  message,
  severity = "ERROR",
  line = null,
  field = null
) {
  return Object.freeze({
    code,
    message,
    severity,
    line,
    field
  });
}

function createReport({
  valid = false,
  errors = [],
  warnings = [],
  metadata = null
} = {}) {
  return Object.freeze({
    valid,
    errors: Object.freeze([...errors]),
    warnings: Object.freeze([...warnings]),
    metadata
  });
}

function isDigit(character) {
  return (
    typeof character === "string" &&
    character.length === 1 &&
    character >= "0" &&
    character <= "9"
  );
}

function isNumericField(value) {
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    Number.isFinite(Number(value))
  );
}

// ============================================================
// 3. INPUT NORMALIZATION
// ============================================================

export function normalizeTleLine(line) {
  if (typeof line !== "string") {
    throw new TypeError("TLE line must be a string.");
  }

  return line
    .replace(/\r/g, "")
    .trimEnd();
}

export function normalizeTleInput(input) {
  if (typeof input !== "string") {
    throw new TypeError("TLE input must be a string.");
  }

  if (input.length > LIMITS.MAX_TLE_IMPORT_BYTES) {
    throw new RangeError(
      "TLE input exceeds the configured import size limit."
    );
  }

  return input
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map(line => line.trim())
    .filter(Boolean);
}

// ============================================================
// 4. TLE CHECKSUM
// ============================================================

/**
 * Standard TLE checksum:
 *
 * - Each digit contributes its numeric value.
 * - Each minus sign contributes 1.
 * - All other characters contribute 0.
 * - The sum of the first 68 columns is modulo 10.
 */

export function calculateTleChecksum(line) {
  if (typeof line !== "string") {
    throw new TypeError("TLE line must be a string.");
  }

  if (line.length < 68) {
    throw new RangeError(
      "TLE line must contain at least 68 characters."
    );
  }

  let checksum = 0;

  for (let index = 0; index < 68; index += 1) {
    const character = line[index];

    if (isDigit(character)) {
      checksum += Number(character);
    } else if (character === "-") {
      checksum += 1;
    }
  }

  return checksum % TLE.CHECKSUM_MODULUS;
}

export function verifyTleChecksum(line) {
  if (
    typeof line !== "string" ||
    line.length !== TLE.STANDARD_LINE_LENGTH
  ) {
    return {
      valid: false,
      expected: null,
      actual: null,
      reason: "INVALID_LINE_LENGTH"
    };
  }

  const checksumCharacter = line[68];

  if (!isDigit(checksumCharacter)) {
    return {
      valid: false,
      expected: null,
      actual: null,
      reason: "INVALID_CHECKSUM_CHARACTER"
    };
  }

  const expected = calculateTleChecksum(line);
  const actual = Number(checksumCharacter);

  return {
    valid: expected === actual,
    expected,
    actual,
    reason: expected === actual
      ? null
      : "CHECKSUM_MISMATCH"
  };
}

// ============================================================
// 5. NORAD CATALOG NUMBER
// ============================================================

export function extractNoradId(line) {
  if (typeof line !== "string" || line.length < 7) {
    return null;
  }

  const raw = line.slice(2, 7);

  if (!/^\d{5}$/.test(raw)) {
    return null;
  }

  const id = Number(raw);

  if (
    id < VALIDATION_RULES.MIN_NORAD_ID ||
    id > VALIDATION_RULES.MAX_NORAD_ID
  ) {
    return null;
  }

  return id;
}

// ============================================================
// 6. EPOCH PARSING
// ============================================================

/**
 * TLE epoch format:
 *
 * YYDDD.DDDDDDDD
 *
 * YY = two-digit year.
 * DDD = day of year.
 *
 * The standard pivot:
 * 00–56 => 2000–2056
 * 57–99 => 1957–1999
 */

export function parseTleEpoch(epochField) {
  if (
    typeof epochField !== "string" ||
    !/^\d{2}\d{3}\.\d{8}$/.test(epochField)
  ) {
    return {
      valid: false,
      date: null,
      year: null,
      dayOfYear: null,
      reason: "INVALID_EPOCH_FORMAT"
    };
  }

  const shortYear = Number(epochField.slice(0, 2));
  const dayOfYear = Number(epochField.slice(2));

  const year = shortYear >= 57
    ? 1900 + shortYear
    : 2000 + shortYear;

  const isLeapYear =
    year % 4 === 0 &&
    (year % 100 !== 0 || year % 400 === 0);

  const daysInYear = isLeapYear ? 366 : 365;

  if (
    year < VALIDATION_RULES.MIN_EPOCH_YEAR ||
    dayOfYear < 1 ||
    dayOfYear >= daysInYear + 1
  ) {
    return {
      valid: false,
      date: null,
      year,
      dayOfYear,
      reason: "EPOCH_OUT_OF_RANGE"
    };
  }

  const epochStart = Date.UTC(year, 0, 1);

  const epochMilliseconds =
    epochStart + (dayOfYear - 1) * TIME.MILLISECONDS_PER_SECOND *
    TIME.SECONDS_PER_DAY;

  const date = new Date(epochMilliseconds);

  if (Number.isNaN(date.getTime())) {
    return {
      valid: false,
      date: null,
      year,
      dayOfYear,
      reason: "INVALID_EPOCH_DATE"
    };
  }

  return {
    valid: true,
    date,
    year,
    dayOfYear,
    reason: null
  };
}

// ============================================================
// 7. IMPLIED EXPONENT PARSING
// ============================================================

/**
 * Parses TLE compact scientific notation.
 *
 * Example:
 *  10270-3 => 0.10270 × 10^-3
 * -12345-4 => -0.12345 × 10^-4
 */

export function parseTleImpliedExponent(field) {
  if (typeof field !== "string") {
    return null;
  }

  const normalized = field.trim();

  const match = normalized.match(
    /^([+-]?)(\d{5})([+-]\d)$/
  );

  if (!match) {
    return null;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const mantissa = Number(match[2]) / 100000;
  const exponent = Number(match[3]);

  const result = sign * mantissa * Math.pow(10, exponent);

  return Number.isFinite(result) ? result : null;
}

// ============================================================
// 8. LINE STRUCTURE VALIDATION
// ============================================================

export function validateTleLineStructure(
  line,
  expectedLineNumber
) {
  const errors = [];
  const warnings = [];

  if (typeof line !== "string") {
    errors.push(
      createIssue(
        "LINE_NOT_STRING",
        "TLE line must be a string.",
        "ERROR",
        expectedLineNumber
      )
    );

    return createReport({
      errors,
      warnings
    });
  }

  if (line.length !== TLE.STANDARD_LINE_LENGTH) {
    errors.push(
      createIssue(
        "INVALID_LINE_LENGTH",
        `Line must contain exactly ${TLE.STANDARD_LINE_LENGTH} characters.`,
        "ERROR",
        expectedLineNumber
      )
    );
  }

  const expectedIdentifier = String(expectedLineNumber);

  if (line[0] !== expectedIdentifier) {
    errors.push(
      createIssue(
        "INVALID_LINE_IDENTIFIER",
        `Expected TLE line identifier ${expectedIdentifier}.`,
        "ERROR",
        expectedLineNumber
      )
    );
  }

  if (line.length >= 7) {
    const noradId = extractNoradId(line);

    if (noradId === null) {
      errors.push(
        createIssue(
          "INVALID_NORAD_ID",
          "NORAD catalog number is invalid.",
          "ERROR",
          expectedLineNumber,
          "NORAD_ID"
        )
      );
    }
  }

  if (line.length === TLE.STANDARD_LINE_LENGTH) {
    const checksum = verifyTleChecksum(line);

    if (!checksum.valid) {
      errors.push(
        createIssue(
          "INVALID_CHECKSUM",
          `Checksum mismatch. Expected ${checksum.expected}, received ${checksum.actual}.`,
          "ERROR",
          expectedLineNumber,
          "CHECKSUM"
        )
      );
    }
  }

  return createReport({
    valid: errors.length === 0,
    errors,
    warnings
  });
}

// ============================================================
// 9. ORBITAL ELEMENT VALIDATION
// ============================================================

function validateOrbitalElements(line2) {
  const errors = [];

  if (typeof line2 !== "string" || line2.length !== 69) {
    errors.push(
      createIssue(
        "INVALID_LINE_2",
        "Orbital elements cannot be read from an invalid line 2.",
        "ERROR",
        2
      )
    );

    return errors;
  }

  const inclination = Number(line2.slice(8, 16));
  const rightAscension = Number(line2.slice(17, 25));
  const eccentricityText = line2.slice(26, 33);
  const argumentOfPerigee = Number(line2.slice(34, 42));
  const meanAnomaly = Number(line2.slice(43, 51));
  const meanMotion = Number(line2.slice(52, 63));

  const fields = [
    ["INCLINATION", inclination],
    ["RAAN", rightAscension],
    ["ARGUMENT_OF_PERIGEE", argumentOfPerigee],
    ["MEAN_ANOMALY", meanAnomaly],
    ["MEAN_MOTION", meanMotion]
  ];

  for (const [field, value] of fields) {
    if (!Number.isFinite(value)) {
      errors.push(
        createIssue(
          "NON_NUMERIC_ORBITAL_FIELD",
          `${field} must be numeric.`,
          "ERROR",
          2,
          field
        )
      );
    }
  }

  if (!/^\d{7}$/.test(eccentricityText)) {
    errors.push(
      createIssue(
        "INVALID_ECCENTRICITY_FORMAT",
        "Eccentricity must contain seven digits.",
        "ERROR",
        2,
        "ECCENTRICITY"
      )
    );
  }

  const eccentricity = Number(`0.${eccentricityText}`);

  if (
    Number.isFinite(inclination) &&
    (
      inclination < VALIDATION_RULES.MIN_INCLINATION_DEG ||
      inclination > VALIDATION_RULES.MAX_INCLINATION_DEG
    )
  ) {
    errors.push(
      createIssue(
        "INCLINATION_OUT_OF_RANGE",
        "Inclination must be between 0 and 180 degrees.",
        "ERROR",
        2,
        "INCLINATION"
      )
    );
  }

  if (
    Number.isFinite(eccentricity) &&
    (
      eccentricity < VALIDATION_RULES.MIN_ECCENTRICITY ||
      eccentricity >= VALIDATION_RULES.MAX_ECCENTRICITY
    )
  ) {
    errors.push(
      createIssue(
        "ECCENTRICITY_OUT_OF_RANGE",
        "Eccentricity must be greater than or equal to zero and less than one.",
        "ERROR",
        2,
        "ECCENTRICITY"
      )
    );
  }

  if (
    Number.isFinite(meanMotion) &&
    (
      meanMotion <= VALIDATION_RULES.MIN_MEAN_MOTION_REV_DAY ||
      meanMotion > VALIDATION_RULES.MAX_MEAN_MOTION_REV_DAY
    )
  ) {
    errors.push(
      createIssue(
        "MEAN_MOTION_OUT_OF_RANGE",
        "Mean motion is outside the supported validation range.",
        "ERROR",
        2,
        "MEAN_MOTION"
      )
    );
  }

  return errors;
}

// ============================================================
// 10. COMPLETE TLE VALIDATION
// ============================================================

export function validateTle(
  line1,
  line2,
  options = {}
) {
  const {
    checkChecksum = true,
    checkEpoch = true,
    referenceDate = new Date()
  } = options;

  const errors = [];
  const warnings = [];

  const normalizedLine1 = normalizeTleLine(line1);
  const normalizedLine2 = normalizeTleLine(line2);

  if (normalizedLine1.length !== 69) {
    errors.push(
      createIssue(
        "LINE_1_LENGTH",
        "TLE line 1 must contain exactly 69 characters.",
        "ERROR",
        1
      )
    );
  }

  if (normalizedLine2.length !== 69) {
    errors.push(
      createIssue(
        "LINE_2_LENGTH",
        "TLE line 2 must contain exactly 69 characters.",
        "ERROR",
        2
      )
    );
  }

  if (normalizedLine1[0] !== "1") {
    errors.push(
      createIssue(
        "LINE_1_IDENTIFIER",
        "First TLE line must start with identifier 1.",
        "ERROR",
        1
      )
    );
  }

  if (normalizedLine2[0] !== "2") {
    errors.push(
      createIssue(
        "LINE_2_IDENTIFIER",
        "Second TLE line must start with identifier 2.",
        "ERROR",
        2
      )
    );
  }

  if (errors.length > 0) {
    return createReport({
      errors,
      warnings
    });
  }

  const noradId1 = extractNoradId(normalizedLine1);
  const noradId2 = extractNoradId(normalizedLine2);

  if (noradId1 === null || noradId2 === null) {
    errors.push(
      createIssue(
        "INVALID_CATALOG_NUMBER",
        "Could not extract a valid NORAD catalog number.",
        "ERROR"
      )
    );
  } else if (noradId1 !== noradId2) {
    errors.push(
      createIssue(
        "NORAD_ID_MISMATCH",
        "The two TLE lines belong to different catalog numbers.",
        "ERROR"
      )
    );
  }

  if (checkChecksum) {
    for (const [line, lineNumber] of [
      [normalizedLine1, 1],
      [normalizedLine2, 2]
    ]) {
      const checksum = verifyTleChecksum(line);

      if (!checksum.valid) {
        errors.push(
          createIssue(
            "CHECKSUM_MISMATCH",
            `Line ${lineNumber} checksum is invalid.`,
            "ERROR",
            lineNumber,
            "CHECKSUM"
          )
        );
      }
    }
  }

  const epochField = normalizedLine1.slice(18, 32);
  const epochResult = parseTleEpoch(epochField);

  if (!epochResult.valid) {
    errors.push(
      createIssue(
        "INVALID_EPOCH",
        "TLE epoch field is invalid.",
        "ERROR",
        1,
        "EPOCH"
      )
    );
  } else if (checkEpoch) {
    const referenceTime = referenceDate instanceof Date
      ? referenceDate.getTime()
      : new Date(referenceDate).getTime();

    if (!Number.isFinite(referenceTime)) {
      errors.push(
        createIssue(
          "INVALID_REFERENCE_DATE",
          "Reference date is invalid.",
          "ERROR"
        )
      );
    } else {
      const ageDays =
        (referenceTime - epochResult.date.getTime()) /
        (TIME.MILLISECONDS_PER_SECOND * TIME.SECONDS_PER_DAY);

      if (ageDays > TLE.MAX_EPOCH_AGE_DAYS_CRITICAL) {
        warnings.push(
          createIssue(
            "STALE_TLE",
            `TLE epoch is approximately ${Math.floor(ageDays)} days old.`,
            "WARNING",
            1,
            "EPOCH"
          )
        );
      } else if (ageDays > TLE.MAX_EPOCH_AGE_DAYS_WARNING) {
        warnings.push(
          createIssue(
            "AGING_TLE",
            `TLE epoch is approximately ${Math.floor(ageDays)} days old.`,
            "WARNING",
            1,
            "EPOCH"
          )
        );
      }

      if (
        ageDays < -VALIDATION_RULES.MAX_FUTURE_EPOCH_DAYS
      ) {
        errors.push(
          createIssue(
            "FUTURE_EPOCH",
            "TLE epoch is too far in the future.",
            "ERROR",
            1,
            "EPOCH"
          )
        );
      }
    }
  }

  errors.push(
    ...validateOrbitalElements(normalizedLine2)
  );

  const metadata = {
    noradId: noradId1,
    epoch: epochResult.valid
      ? epochResult.date.toISOString()
      : null,
    inclinationDeg: Number(normalizedLine2.slice(8, 16)),
    eccentricity: Number(
      `0.${normalizedLine2.slice(26, 33)}`
    ),
    meanMotionRevPerDay: Number(
      normalizedLine2.slice(52, 63)
    )
  };

  return createReport({
    valid: errors.length === 0,
    errors,
    warnings,
    metadata
  });
}

// ============================================================
// 11. TLE RECORD PARSER
// ============================================================

/**
 * Parses either:
 *
 * 2LE:
 *   line 1
 *   line 2
 *
 * 3LE:
 *   object name
 *   line 1
 *   line 2
 */

export function parseTleRecords(input, options = {}) {
  const lines = normalizeTleInput(input);

  const records = [];
  const errors = [];
  const warnings = [];

  let index = 0;

  while (index < lines.length) {
    let name = "UNKNOWN OBJECT";

    if (lines[index].startsWith("1 ")) {
      // 2LE format.
    } else {
      name = lines[index].trim();
      index += 1;
    }

    const line1 = lines[index];
    const line2 = lines[index + 1];

    if (!line1 || !line2) {
      errors.push(
        createIssue(
          "INCOMPLETE_TLE_RECORD",
          "A TLE record must contain both element lines.",
          "ERROR"
        )
      );

      break;
    }

    if (
      !line1.startsWith("1 ") ||
      !line2.startsWith("2 ")
    ) {
      errors.push(
        createIssue(
          "INVALID_TLE_RECORD_ORDER",
          "Expected line 1 followed by line 2.",
          "ERROR"
        )
      );

      index += 1;
      continue;
    }

    const report = validateTle(
      line1,
      line2,
      options
    );

    if (report.valid) {
      records.push({
        id: report.metadata.noradId,
        name: name.slice(
          0,
          LIMITS.MAX_OBJECT_NAME_LENGTH
        ),
        line1,
        line2,
        epoch: report.metadata.epoch,
        orbitalElements: {
          inclinationDeg: report.metadata.inclinationDeg,
          eccentricity: report.metadata.eccentricity,
          meanMotionRevPerDay:
            report.metadata.meanMotionRevPerDay
        },
        source: "IMPORTED",
        validation: report
      });
    } else {
      errors.push(
        ...report.errors
      );
    }

    warnings.push(
      ...report.warnings
    );

    index += 2;
  }

  return {
    success: records.length > 0 && errors.length === 0,
    records,
    errors,
    warnings,
    statistics: {
      totalRecords: records.length,
      errorCount: errors.length,
      warningCount: warnings.length
    }
  };
}

// ============================================================
// 12. VALIDATION SUMMARY
// ============================================================

export function summarizeTleValidation(report) {
  if (!report || typeof report !== "object") {
    throw new TypeError(
      "A validation report is required."
    );
  }

  return {
    valid: Boolean(report.valid),
    status: report.valid
      ? report.warnings?.length
        ? "VALID_WITH_WARNINGS"
        : "VALID"
      : "INVALID",

    errorCount: report.errors?.length ?? 0,
    warningCount: report.warnings?.length ?? 0,

    messages: [
      ...(report.errors ?? []),
      ...(report.warnings ?? [])
    ].map(issue => ({
      code: issue.code,
      message: issue.message,
      severity: issue.severity
    }))
  };
}

// ============================================================
// 13. MODULE EXPORTS
// ============================================================

export const TleValidator = Object.freeze({
  normalizeTleLine,
  normalizeTleInput,

  calculateTleChecksum,
  verifyTleChecksum,

  extractNoradId,
  parseTleEpoch,
  parseTleImpliedExponent,

  validateTleLineStructure,
  validateTle,

  parseTleRecords,
  summarizeTleValidation
});