/**
 * ORBITAL SHIELD
 * ORBITAL ENGINE — ASTRONOMICAL TIME SYSTEM
 *
 * File: src/engine/time/julianDate.js
 *
 * Responsibilities:
 * - Convert JavaScript dates to Julian Date.
 * - Convert Julian Date to JavaScript dates.
 * - Calculate Julian centuries from J2000.
 * - Calculate Greenwich Mean Sidereal Time (GMST).
 * - Calculate Greenwich Apparent Sidereal Time (GAST approximation).
 * - Handle Unix timestamps and fractional days.
 * - Provide time arithmetic and validation utilities.
 *
 * Time convention:
 * - Application timestamps are UTC.
 * - Julian Date is a continuous day count.
 * - GMST uses UT1 in a high-accuracy implementation.
 * - Without DUT1, UTC is used as an approximation.
 *
 * Accuracy note:
 * This module does not implement leap-second tables,
 * Earth Orientation Parameters, or a full IAU 2006/2000A
 * precession-nutation model.
 */

import {
  TIME,
  MATH
} from "../constants.js";

// ============================================================
// 1. INTERNAL CONSTANTS
// ============================================================

const JULIAN = Object.freeze({
  UNIX_EPOCH: 2440587.5,
  J2000: 2451545.0,

  GREGORIAN_CUTOVER: 2299161,

  SECONDS_PER_DAY: 86400,
  MILLISECONDS_PER_DAY: 86400000,

  DAYS_PER_CENTURY: 36525,

  GMST_COEFFICIENT_0: 280.46061837,
  GMST_COEFFICIENT_1: 360.98564736629,
  GMST_COEFFICIENT_2: 0.000387933,
  GMST_COEFFICIENT_3: 38710000
});

const VALIDATION = Object.freeze({
  MIN_JULIAN_DATE: 0,
  MAX_JULIAN_DATE: 10000000,
  MAX_ABSOLUTE_UNIX_TIME: 8640000000000000
});

// ============================================================
// 2. DATE VALIDATION
// ============================================================

export function isValidDate(date) {
  return (
    date instanceof Date &&
    Number.isFinite(date.getTime())
  );
}

export function assertValidDate(date, name = "date") {
  if (!isValidDate(date)) {
    throw new TypeError(
      `${name} must be a valid JavaScript Date.`
    );
  }

  return date;
}

export function assertValidJulianDate(jd) {
  if (
    !Number.isFinite(jd) ||
    jd < VALIDATION.MIN_JULIAN_DATE ||
    jd > VALIDATION.MAX_JULIAN_DATE
  ) {
    throw new RangeError(
      "Julian Date is outside the supported range."
    );
  }

  return jd;
}

// ============================================================
// 3. UNIX TIME CONVERSION
// ============================================================

/**
 * Converts a JavaScript Date to Unix time in seconds.
 */
export function dateToUnixSeconds(date) {
  assertValidDate(date);

  return date.getTime() / TIME.MILLISECONDS_PER_SECOND;
}

/**
 * Converts Unix time in seconds to JavaScript Date.
 */
export function unixSecondsToDate(seconds) {
  if (!Number.isFinite(seconds)) {
    throw new TypeError(
      "Unix timestamp must be finite."
    );
  }

  const milliseconds =
    seconds * TIME.MILLISECONDS_PER_SECOND;

  if (
    Math.abs(milliseconds) >
    VALIDATION.MAX_ABSOLUTE_UNIX_TIME
  ) {
    throw new RangeError(
      "Unix timestamp is outside the JavaScript Date range."
    );
  }

  const date = new Date(milliseconds);

  assertValidDate(date);

  return date;
}

/**
 * Converts Unix time in milliseconds to JavaScript Date.
 */
export function unixMillisecondsToDate(milliseconds) {
  if (!Number.isFinite(milliseconds)) {
    throw new TypeError(
      "Unix milliseconds must be finite."
    );
  }

  const date = new Date(milliseconds);

  assertValidDate(date);

  return date;
}

// ============================================================
// 4. JULIAN DATE CONVERSION
// ============================================================

/**
 * Converts a UTC JavaScript Date to Julian Date.
 *
 * Formula:
 *
 * JD = Unix milliseconds / milliseconds per day
 *      + 2440587.5
 *
 * JavaScript Date represents UTC-based timestamps.
 */
export function dateToJulianDate(date) {
  assertValidDate(date);

  const jd =
    date.getTime() /
    JULIAN.MILLISECONDS_PER_DAY +
    JULIAN.UNIX_EPOCH;

  return assertValidJulianDate(jd);
}

/**
 * Converts Julian Date to JavaScript Date.
 *
 * Precision is limited by JavaScript Date's
 * millisecond resolution.
 */
export function julianDateToDate(jd) {
  assertValidJulianDate(jd);

  const milliseconds =
    (jd - JULIAN.UNIX_EPOCH) *
    JULIAN.MILLISECONDS_PER_DAY;

  const date = new Date(milliseconds);

  assertValidDate(date);

  return date;
}

/**
 * Returns Julian Date split into integer and fractional parts.
 *
 * The split is useful for numerical calculations where
 * retaining fractional-day precision matters.
 */
export function splitJulianDate(jd) {
  assertValidJulianDate(jd);

  const integer = Math.floor(jd);

  return Object.freeze({
    integer,
    fraction: jd - integer
  });
}

/**
 * Reconstructs Julian Date from two parts.
 */
export function combineJulianDate(integer, fraction) {
  if (
    !Number.isFinite(integer) ||
    !Number.isFinite(fraction)
  ) {
    throw new TypeError(
      "Julian Date components must be finite."
    );
  }

  return assertValidJulianDate(
    integer + fraction
  );
}

// ============================================================
// 5. MODIFIED JULIAN DATE
// ============================================================

/**
 * Modified Julian Date:
 *
 * MJD = JD - 2400000.5
 */
export function julianDateToModified(jd) {
  assertValidJulianDate(jd);

  return jd - 2400000.5;
}

export function modifiedJulianToDate(mjd) {
  if (!Number.isFinite(mjd)) {
    throw new TypeError(
      "Modified Julian Date must be finite."
    );
  }

  return julianDateToDate(
    mjd + 2400000.5
  );
}

// ============================================================
// 6. JULIAN CENTURIES
// ============================================================

/**
 * Julian centuries from J2000.0.
 *
 * T = (JD - 2451545.0) / 36525
 */
export function julianCenturiesSinceJ2000(jd) {
  assertValidJulianDate(jd);

  return (
    jd - JULIAN.J2000
  ) / JULIAN.DAYS_PER_CENTURY;
}

// ============================================================
// 7. GREENWICH MEAN SIDEREAL TIME
// ============================================================

/**
 * Calculates Greenwich Mean Sidereal Time.
 *
 * Input:
 * - Julian Date in UT1, or UTC as an approximation.
 *
 * Output:
 * - Radians in range [0, 2π).
 *
 * Formula is the commonly used polynomial expression
 * around J2000.0.
 */
export function calculateGMST(jd) {
  assertValidJulianDate(jd);

  const T =
    (jd - JULIAN.J2000) /
    JULIAN.DAYS_PER_CENTURY;

  const gmstDegrees =
    JULIAN.GMST_COEFFICIENT_0 +
    JULIAN.GMST_COEFFICIENT_1 *
      (jd - JULIAN.J2000) +
    JULIAN.GMST_COEFFICIENT_2 *
      T * T -
    T * T * T /
      JULIAN.GMST_COEFFICIENT_3;

  const normalizedDegrees =
    ((gmstDegrees % 360) + 360) % 360;

  return normalizedDegrees *
    MATH.DEG_TO_RAD;
}

/**
 * Calculates GMST directly from a JavaScript Date.
 *
 * UTC is used as an approximation for UT1.
 */
export function calculateGMSTFromDate(date) {
  return calculateGMST(
    dateToJulianDate(date)
  );
}

// ============================================================
// 8. GREENWICH APPARENT SIDEREAL TIME
// ============================================================

/**
 * Calculates a simplified GAST approximation.
 *
 * GAST = GMST + equation of equinoxes
 *
 * This implementation uses a simplified nutation term.
 * It is not a replacement for a full IAU model.
 */

export function calculateGAST(jd) {
  assertValidJulianDate(jd);

  const gmst = calculateGMST(jd);

  const T =
    julianCenturiesSinceJ2000(jd);

  const meanLongitudeSun =
    (
      280.4665 +
      36000.7698 * T
    ) * MATH.DEG_TO_RAD;

  const meanLongitudeMoon =
    (
      218.3165 +
      481267.8813 * T
    ) * MATH.DEG_TO_RAD;

  const ascendingNode =
    (
      125.04452 -
      1934.136261 * T
    ) * MATH.DEG_TO_RAD;

  const deltaPsiArcseconds =
    -17.20 * Math.sin(ascendingNode) -
    1.32 * Math.sin(2 * meanLongitudeSun) -
    0.23 * Math.sin(2 * meanLongitudeMoon) +
    0.21 * Math.sin(2 * ascendingNode);

  const meanObliquityDegrees =
    23.439291 -
    0.0130042 * T;

  const meanObliquity =
    meanObliquityDegrees * MATH.DEG_TO_RAD;

  const equationOfEquinoxes =
    (
      deltaPsiArcseconds /
      3600
    ) *
    Math.cos(meanObliquity) *
    MATH.DEG_TO_RAD;

  return normalizeRadians(
    gmst + equationOfEquinoxes
  );
}

// ============================================================
// 9. ANGLE NORMALIZATION
// ============================================================

export function normalizeRadians(angle) {
  if (!Number.isFinite(angle)) {
    throw new TypeError(
      "Angle must be finite."
    );
  }

  return (
    (angle % MATH.TWO_PI) +
    MATH.TWO_PI
  ) % MATH.TWO_PI;
}

export function normalizeDegrees(angle) {
  if (!Number.isFinite(angle)) {
    throw new TypeError(
      "Angle must be finite."
    );
  }

  return (
    (angle % 360) + 360
  ) % 360;
}

// ============================================================
// 10. TIME ARITHMETIC
// ============================================================

export function addSeconds(date, seconds) {
  assertValidDate(date);

  if (!Number.isFinite(seconds)) {
    throw new TypeError(
      "Seconds must be finite."
    );
  }

  return new Date(
    date.getTime() +
    seconds * TIME.MILLISECONDS_PER_SECOND
  );
}

export function addMinutes(date, minutes) {
  if (!Number.isFinite(minutes)) {
    throw new TypeError(
      "Minutes must be finite."
    );
  }

  return addSeconds(
    date,
    minutes * TIME.SECONDS_PER_MINUTE
  );
}

export function addHours(date, hours) {
  if (!Number.isFinite(hours)) {
    throw new TypeError(
      "Hours must be finite."
    );
  }

  return addSeconds(
    date,
    hours * TIME.SECONDS_PER_HOUR
  );
}

export function addDays(date, days) {
  if (!Number.isFinite(days)) {
    throw new TypeError(
      "Days must be finite."
    );
  }

  return addSeconds(
    date,
    days * TIME.SECONDS_PER_DAY
  );
}

/**
 * Returns elapsed seconds between two dates.
 */
export function elapsedSeconds(startDate, endDate) {
  assertValidDate(startDate, "startDate");
  assertValidDate(endDate, "endDate");

  return (
    endDate.getTime() -
    startDate.getTime()
  ) / TIME.MILLISECONDS_PER_SECOND;
}

/**
 * Returns elapsed days between two Julian Dates.
 */
export function elapsedJulianDays(startJD, endJD) {
  assertValidJulianDate(startJD);
  assertValidJulianDate(endJD);

  return endJD - startJD;
}

// ============================================================
// 11. DATE DIFFERENCE AND COMPARISON
// ============================================================

export function compareDates(first, second) {
  assertValidDate(first, "first");
  assertValidDate(second, "second");

  const difference =
    first.getTime() - second.getTime();

  if (difference < 0) return -1;
  if (difference > 0) return 1;

  return 0;
}

export function isDateBefore(first, second) {
  return compareDates(first, second) < 0;
}

export function isDateAfter(first, second) {
  return compareDates(first, second) > 0;
}

export function isSameInstant(first, second) {
  return compareDates(first, second) === 0;
}

// ============================================================
// 12. TIME FORMATTING
// ============================================================

export function formatUTC(date) {
  assertValidDate(date);

  return date.toISOString();
}

export function formatUTCClock(date) {
  assertValidDate(date);

  return date.toISOString().slice(11, 23) + " UTC";
}

export function formatUTCDate(date) {
  assertValidDate(date);

  return date.toISOString().slice(0, 10);
}

export function formatJulianDate(jd, decimals = 8) {
  assertValidJulianDate(jd);

  if (
    !Number.isInteger(decimals) ||
    decimals < 0 ||
    decimals > 15
  ) {
    throw new RangeError(
      "Decimals must be an integer between 0 and 15."
    );
  }

  return jd.toFixed(decimals);
}

// ============================================================
// 13. SIDEREAL TIME HELPERS
// ============================================================

/**
 * Converts Greenwich sidereal angle into sidereal hours.
 *
 * 2π radians = 24 sidereal hours.
 */
export function radiansToSiderealHours(radians) {
  if (!Number.isFinite(radians)) {
    throw new TypeError(
      "Radians must be finite."
    );
  }

  return normalizeRadians(radians) *
    24 / MATH.TWO_PI;
}

/**
 * Converts sidereal hours to radians.
 */
export function siderealHoursToRadians(hours) {
  if (!Number.isFinite(hours)) {
    throw new TypeError(
      "Sidereal hours must be finite."
    );
  }

  return normalizeRadians(
    hours * MATH.TWO_PI / 24
  );
}

// ============================================================
// 14. TIME SNAPSHOT
// ============================================================

/**
 * Generates a complete time snapshot for the simulation.
 */
export function createTimeSnapshot(date = new Date()) {
  assertValidDate(date);

  const jd = dateToJulianDate(date);
  const mjd = julianDateToModified(jd);
  const gmst = calculateGMST(jd);
  const gast = calculateGAST(jd);

  return Object.freeze({
    unixSeconds: dateToUnixSeconds(date),

    utc: date.toISOString(),

    julianDate: jd,

    modifiedJulianDate: mjd,

    julianCenturiesJ2000:
      julianCenturiesSinceJ2000(jd),

    gmstRadians: gmst,

    gmstDegrees:
      gmst * MATH.RAD_TO_DEG,

    gmstHours:
      radiansToSiderealHours(gmst),

    gastRadians: gast,

    gastDegrees:
      gast * MATH.RAD_TO_DEG,

    gastHours:
      radiansToSiderealHours(gast)
  });
}

// ============================================================
// 15. MODULE EXPORT
// ============================================================

export const JulianDate = Object.freeze({
  isValidDate,
  assertValidDate,
  assertValidJulianDate,

  dateToUnixSeconds,
  unixSecondsToDate,
  unixMillisecondsToDate,

  dateToJulianDate,
  julianDateToDate,

  splitJulianDate,
  combineJulianDate,

  julianDateToModified,
  modifiedJulianToDate,

  julianCenturiesSinceJ2000,

  calculateGMST,
  calculateGMSTFromDate,
  calculateGAST,

  normalizeRadians,
  normalizeDegrees,

  addSeconds,
  addMinutes,
  addHours,
  addDays,

  elapsedSeconds,
  elapsedJulianDays,

  compareDates,
  isDateBefore,
  isDateAfter,
  isSameInstant,

  formatUTC,
  formatUTCClock,
  formatUTCDate,
  formatJulianDate,

  radiansToSiderealHours,
  siderealHoursToRadians,

  createTimeSnapshot
});