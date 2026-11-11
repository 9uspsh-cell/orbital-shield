/**
 * ORBITAL SHIELD
 * Orbital Mechanics & Space Situational Awareness Engine
 *
 * File: src/engine/constants.js
 * Purpose: Centralized scientific constants, physical parameters,
 * simulation configuration, unit conversions and domain definitions.
 *
 * Design principles:
 * - SI units internally wherever practical.
 * - Explicit coordinate-frame and time-system definitions.
 * - Immutable configuration.
 * - No network dependencies.
 * - Suitable for offline simulation.
 */

// ============================================================
// 1. MATHEMATICAL CONSTANTS
// ============================================================

export const MATH = Object.freeze({
  PI: Math.PI,
  TWO_PI: 2 * Math.PI,
  HALF_PI: Math.PI / 2,

  DEG_TO_RAD: Math.PI / 180,
  RAD_TO_DEG: 180 / Math.PI,

  SQRT_TWO: Math.SQRT2,
  EPSILON: Number.EPSILON,

  ARCSECONDS_PER_DEGREE: 3600,
  SECONDS_PER_MINUTE: 60,
  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24
});

// ============================================================
// 2. TIME CONSTANTS
// ============================================================

export const TIME = Object.freeze({
  MILLISECONDS_PER_SECOND: 1000,
  SECONDS_PER_MINUTE: 60,
  SECONDS_PER_HOUR: 3600,
  SECONDS_PER_DAY: 86400,

  MINUTES_PER_HOUR: 60,
  HOURS_PER_DAY: 24,
  DAYS_PER_JULIAN_CENTURY: 36525,

  JULIAN_DATE_UNIX_EPOCH: 2440587.5,
  JULIAN_DATE_J2000: 2451545.0,

  // UTC is used for application timestamps.
  // SGP4 internally uses the epoch encoded in the TLE.
  DEFAULT_TIME_SCALE: "UTC",

  SUPPORTED_TIME_SCALES: Object.freeze([
    "UTC",
    "UT1",
    "TT"
  ])
});

// ============================================================
// 3. EARTH REFERENCE MODEL
// ============================================================

/**
 * WGS-84 reference ellipsoid.
 *
 * Distances are expressed in meters unless otherwise stated.
 * Gravitational parameter is expressed in m³/s².
 */

export const EARTH = Object.freeze({
  NAME: "Earth",
  MODEL: "WGS-84",

  SEMI_MAJOR_AXIS_M: 6378137.0,

  FLATTENING: 1 / 298.257223563,

  ECCENTRICITY_SQUARED:
    6.6943799901413165e-3,

  SEMI_MINOR_AXIS_M:
    6356752.314245179,

  MEAN_RADIUS_M: 6371008.8,

  EQUATORIAL_RADIUS_KM: 6378.137,

  POLAR_RADIUS_KM: 6356.752314245,

  GRAVITATIONAL_PARAMETER_M3_S2:
    3.986004418e14,

  GRAVITATIONAL_PARAMETER_KM3_S2:
    398600.4418,

  ROTATION_RATE_RAD_S:
    7.29211514670698e-5,

  J2: 1.08262668e-3,

  J3: -2.5324105e-6,

  J4: -1.6198976e-6,

  ATMOSPHERE_REFERENCE_ALTITUDE_M: 0,

  /**
   * Approximate atmospheric boundary.
   * This is a simulation classification, not a hard
   * physical boundary.
   */
  KARMAN_LINE_M: 100000,

  GEO_ALTITUDE_M: 35786000,

  GEO_RADIUS_M: 42164137
});

// ============================================================
// 4. SOLAR SYSTEM CONSTANTS
// ============================================================

export const CELESTIAL = Object.freeze({
  SUN: Object.freeze({
    NAME: "Sun",
    GRAVITATIONAL_PARAMETER_KM3_S2: 132712440018,
    MEAN_RADIUS_KM: 695700
  }),

  MOON: Object.freeze({
    NAME: "Moon",
    GRAVITATIONAL_PARAMETER_KM3_S2: 4902.800066,
    MEAN_RADIUS_KM: 1737.4
  })
});

// ============================================================
// 5. UNIT CONVERSIONS
// ============================================================

export const UNITS = Object.freeze({
  METERS_PER_KILOMETER: 1000,
  KILOMETERS_PER_METER: 0.001,

  METERS_PER_SECOND_TO_KM_PER_SECOND: 0.001,
  KM_PER_SECOND_TO_METERS_PER_SECOND: 1000,

  METERS_PER_SECOND_TO_KM_PER_HOUR: 3.6,
  KM_PER_HOUR_TO_METERS_PER_SECOND: 1 / 3.6,

  METERS_PER_SECOND_TO_MPH: 2.2369362920544,

  KILOMETERS_PER_HOUR_TO_MPH: 0.62137119223733,

  METERS_PER_METER: 1,

  RADIANS_TO_DEGREES: 180 / Math.PI,
  DEGREES_TO_RADIANS: Math.PI / 180,

  KILOGRAMS_PER_METRIC_TON: 1000
});

// ============================================================
// 6. COORDINATE FRAME DEFINITIONS
// ============================================================

export const FRAMES = Object.freeze({
  ECI: Object.freeze({
    ID: "ECI",
    NAME: "Earth-Centered Inertial",
    DESCRIPTION: "Earth-centered inertial reference frame",
    UNIT: "km",
    TYPE: "INERTIAL"
  }),

  ECEF: Object.freeze({
    ID: "ECEF",
    NAME: "Earth-Centered Earth-Fixed",
    DESCRIPTION: "Earth-fixed rotating reference frame",
    UNIT: "km",
    TYPE: "ROTATING"
  }),

  GEODETIC: Object.freeze({
    ID: "GEODETIC",
    NAME: "Geodetic Coordinates",
    DESCRIPTION: "Latitude, longitude and altitude",
    ANGULAR_UNIT: "degrees",
    DISTANCE_UNIT: "km"
  }),

  THREE_SCENE: Object.freeze({
    ID: "THREE_SCENE",
    NAME: "Three.js Visualization Frame",
    DESCRIPTION: "Rendering coordinate system",
    UNIT: "scene-units"
  })
});

// ============================================================
// 7. ORBITAL REGIONS
// ============================================================

export const ORBITAL_REGIONS = Object.freeze({
  LEO: Object.freeze({
    ID: "LEO",
    NAME: "Low Earth Orbit",
    MIN_ALTITUDE_KM: 160,
    MAX_ALTITUDE_KM: 2000,
    COLOR: "#59B8FF"
  }),

  MEO: Object.freeze({
    ID: "MEO",
    NAME: "Medium Earth Orbit",
    MIN_ALTITUDE_KM: 2000,
    MAX_ALTITUDE_KM: 35786,
    COLOR: "#A78BFA"
  }),

  GEO: Object.freeze({
    ID: "GEO",
    NAME: "Geostationary Orbit",
    MIN_ALTITUDE_KM: 35786,
    MAX_ALTITUDE_KM: 35786,
    COLOR: "#48D9C1"
  }),

  HEO: Object.freeze({
    ID: "HEO",
    NAME: "Highly Elliptical Orbit",
    MIN_ALTITUDE_KM: 2000,
    MAX_ALTITUDE_KM: null,
    COLOR: "#F0B86E"
  }),

  VLEO: Object.freeze({
    ID: "VLEO",
    NAME: "Very Low Earth Orbit",
    MIN_ALTITUDE_KM: 100,
    MAX_ALTITUDE_KM: 450,
    COLOR: "#8DD6FF"
  })
});

// ============================================================
// 8. OBJECT CLASSIFICATION
// ============================================================

export const OBJECT_TYPES = Object.freeze({
  PAYLOAD: Object.freeze({
    ID: "PAYLOAD",
    LABEL: "Operational Payload"
  }),

  ROCKET_BODY: Object.freeze({
    ID: "ROCKET_BODY",
    LABEL: "Rocket Body"
  }),

  DEBRIS: Object.freeze({
    ID: "DEBRIS",
    LABEL: "Orbital Debris"
  }),

  UNKNOWN: Object.freeze({
    ID: "UNKNOWN",
    LABEL: "Unknown Object"
  }),

  FRAGMENTATION: Object.freeze({
    ID: "FRAGMENTATION",
    LABEL: "Fragmentation Object"
  })
});

// ============================================================
// 9. CONJUNCTION RISK CLASSIFICATION
// ============================================================

/**
 * These thresholds are configurable screening bands.
 * They are not operational collision probability thresholds.
 */

export const CONJUNCTION_RISK = Object.freeze({
  CRITICAL: Object.freeze({
    ID: "CRITICAL",
    LABEL: "Critical",
    MAX_DISTANCE_M: 1000,
    COLOR: "#FF4D67"
  }),

  HIGH: Object.freeze({
    ID: "HIGH",
    LABEL: "High",
    MAX_DISTANCE_M: 5000,
    COLOR: "#FF925C"
  }),

  MODERATE: Object.freeze({
    ID: "MODERATE",
    LABEL: "Moderate",
    MAX_DISTANCE_M: 10000,
    COLOR: "#F4C66A"
  }),

  LOW: Object.freeze({
    ID: "LOW",
    LABEL: "Low",
    MAX_DISTANCE_M: 50000,
    COLOR: "#65C9A5"
  }),

  INFORMATIONAL: Object.freeze({
    ID: "INFORMATIONAL",
    LABEL: "Informational",
    MAX_DISTANCE_M: Infinity,
    COLOR: "#79A9D8"
  })
});

// ============================================================
// 10. SIMULATION CONFIGURATION
// ============================================================

export const SIMULATION = Object.freeze({
  DEFAULT_RATE: 1,

  MIN_RATE: 0.1,

  MAX_RATE: 1000,

  DEFAULT_STEP_SECONDS: 1,

  MIN_STEP_SECONDS: 0.01,

  MAX_STEP_SECONDS: 3600,

  DEFAULT_TRAIL_DURATION_SECONDS: 5400,

  MAX_TRAIL_POINTS: 2000,

  MAX_RENDERED_OBJECTS: 10000,

  DEFAULT_ORBIT_SEGMENTS: 180,

  MIN_ORBIT_SEGMENTS: 48,

  MAX_ORBIT_SEGMENTS: 720,

  DEFAULT_CAMERA_DISTANCE: 18,

  MIN_CAMERA_DISTANCE: 1.2,

  MAX_CAMERA_DISTANCE: 100,

  FRAME_RATE_TARGET: 60,

  /**
   * UI update throttling.
   * The simulation engine may calculate at a higher rate
   * than the React interface renders.
   */
  UI_UPDATE_INTERVAL_MS: 100
});

// ============================================================
// 11. ORBITAL SCREENING CONFIGURATION
// ============================================================

export const SCREENING = Object.freeze({
  DEFAULT_LOOKAHEAD_HOURS: 24,

  MAX_LOOKAHEAD_HOURS: 168,

  DEFAULT_TIME_STEP_SECONDS: 60,

  MIN_TIME_STEP_SECONDS: 1,

  MAX_TIME_STEP_SECONDS: 600,

  DEFAULT_SCREENING_DISTANCE_KM: 10,

  MIN_SCREENING_DISTANCE_KM: 0.1,

  MAX_SCREENING_DISTANCE_KM: 100,

  /**
   * Maximum number of object pairs processed in one batch.
   * Large catalogs should use worker-based processing.
   */
  DEFAULT_PAIR_BATCH_SIZE: 5000,

  /**
   * This engine does not calculate Pc (Probability of Collision)
   * from covariance data.
   */
  PROBABILITY_OF_COLLISION_SUPPORTED: false
});

// ============================================================
// 12. TLE VALIDATION CONFIGURATION
// ============================================================

export const TLE = Object.freeze({
  LINE_1_IDENTIFIER: "1",
  LINE_2_IDENTIFIER: "2",

  STANDARD_LINE_LENGTH: 69,

  CHECKSUM_MODULUS: 10,

  MAX_EPOCH_AGE_DAYS_WARNING: 14,

  MAX_EPOCH_AGE_DAYS_CRITICAL: 30,

  SUPPORTED_INPUT_FORMATS: Object.freeze([
    "TLE",
    "3LE"
  ])
});

// ============================================================
// 13. PHYSICS ENGINE CONFIGURATION
// ============================================================

export const PHYSICS = Object.freeze({
  PROPAGATION_MODEL: "SGP4",

  REFERENCE_ELLIPSOID: "WGS-84",

  INTERNAL_DISTANCE_UNIT: "km",

  INTERNAL_VELOCITY_UNIT: "km/s",

  INTERNAL_ANGLE_UNIT: "rad",

  /**
   * SGP4 propagation is provided by satellite.js.
   * Do not replace it with a simplified two-body model
   * while claiming TLE-based SGP4 accuracy.
   */
  SGP4_PROVIDER: "satellite.js",

  ATMOSPHERIC_DRAG_MODEL: "SGP4_BSTAR",

  ENABLE_J2_INDEPENDENT_PROPAGATION: false
});

// ============================================================
// 14. APPLICATION LIMITS
// ============================================================

export const LIMITS = Object.freeze({
  MAX_CATALOG_OBJECTS: 50000,

  MAX_TLE_IMPORT_BYTES: 5 * 1024 * 1024,

  MAX_OBJECT_NAME_LENGTH: 128,

  MAX_DESCRIPTION_LENGTH: 2000,

  MAX_SEARCH_QUERY_LENGTH: 256,

  MAX_CONCURRENT_ANALYSIS_JOBS: 4,

  MAX_HISTORY_RECORDS: 10000,

  MAX_LOG_ENTRIES: 5000
});

// ============================================================
// 15. SYSTEM METADATA
// ============================================================

export const SYSTEM = Object.freeze({
  NAME: "ORBITAL SHIELD",

  ENGINE_NAME: "ORBITAL ENGINE",

  VERSION: "1.0.0",

  BUILD_TYPE: "LOCAL_OFFLINE",

  NETWORK_REQUIRED: false,

  DATA_MODE: "LOCAL",

  DEFAULT_LANGUAGE: "ar",

  SUPPORTED_LANGUAGES: Object.freeze([
    "ar",
    "en"
  ]),

  DEFAULT_THEME: "dark",

  DEFAULT_COORDINATE_FRAME: "ECI",

  DEFAULT_DISTANCE_UNIT: "km",

  DEFAULT_VELOCITY_UNIT: "km/s"
});

// ============================================================
// 16. ENUMERATIONS
// ============================================================

export const ENUMS = Object.freeze({
  SIMULATION_STATUS: Object.freeze({
    STOPPED: "STOPPED",
    RUNNING: "RUNNING",
    PAUSED: "PAUSED",
    ERROR: "ERROR"
  }),

  ANALYSIS_STATUS: Object.freeze({
    IDLE: "IDLE",
    QUEUED: "QUEUED",
    RUNNING: "RUNNING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
    CANCELLED: "CANCELLED"
  }),

  DATA_SOURCE: Object.freeze({
    IMPORTED: "IMPORTED",
    BUILT_IN: "BUILT_IN",
    GENERATED: "GENERATED",
    LOCAL_FILE: "LOCAL_FILE"
  }),

  SEVERITY: Object.freeze({
    INFO: "INFO",
    WARNING: "WARNING",
    ERROR: "ERROR",
    CRITICAL: "CRITICAL"
  })
});

// ============================================================
// 17. VALIDATION HELPERS
// ============================================================

/**
 * Ensures a numeric configuration value is finite
 * and within the specified range.
 */
export function assertRange(
  value,
  min,
  max,
  name = "value"
) {
  if (!Number.isFinite(value)) {
    throw new TypeError(
      `${name} must be a finite number.`
    );
  }

  if (value < min || value > max) {
    throw new RangeError(
      `${name} must be between ${min} and ${max}.`
    );
  }

  return value;
}

/**
 * Converts kilometers to meters.
 */
export function kmToMeters(kilometers) {
  if (!Number.isFinite(kilometers)) {
    throw new TypeError("kilometers must be finite.");
  }

  return kilometers * UNITS.METERS_PER_KILOMETER;
}

/**
 * Converts meters to kilometers.
 */
export function metersToKm(meters) {
  if (!Number.isFinite(meters)) {
    throw new TypeError("meters must be finite.");
  }

  return meters * UNITS.KILOMETERS_PER_METER;
}

/**
 * Converts degrees to radians.
 */
export function degreesToRadians(degrees) {
  if (!Number.isFinite(degrees)) {
    throw new TypeError("degrees must be finite.");
  }

  return degrees * MATH.DEG_TO_RAD;
}

/**
 * Converts radians to degrees.
 */
export function radiansToDegrees(radians) {
  if (!Number.isFinite(radians)) {
    throw new TypeError("radians must be finite.");
  }

  return radians * MATH.RAD_TO_DEG;
}

/**
 * Normalizes an angle to the range [0, 2π).
 */
export function normalizeRadians(angle) {
  if (!Number.isFinite(angle)) {
    throw new TypeError("angle must be finite.");
  }

  return ((angle % MATH.TWO_PI) + MATH.TWO_PI) %
    MATH.TWO_PI;
}

/**
 * Normalizes an angle to the range [0, 360).
 */
export function normalizeDegrees(angle) {
  if (!Number.isFinite(angle)) {
    throw new TypeError("angle must be finite.");
  }

  return ((angle % 360) + 360) % 360;
}

/**
 * Returns an orbital region based on altitude.
 *
 * Classification is approximate. Elliptical orbits can
 * cross multiple altitude bands during one revolution.
 */
export function classifyOrbit(altitudeKm) {
  if (!Number.isFinite(altitudeKm) || altitudeKm < 0) {
    return null;
  }

  if (
    altitudeKm >= ORBITAL_REGIONS.GEO.MIN_ALTITUDE_KM &&
    altitudeKm <= ORBITAL_REGIONS.GEO.MAX_ALTITUDE_KM
  ) {
    return "GEO";
  }

  if (
    altitudeKm >= ORBITAL_REGIONS.VLEO.MIN_ALTITUDE_KM &&
    altitudeKm <= ORBITAL_REGIONS.VLEO.MAX_ALTITUDE_KM
  ) {
    return "VLEO";
  }

  if (
    altitudeKm >= ORBITAL_REGIONS.LEO.MIN_ALTITUDE_KM &&
    altitudeKm < ORBITAL_REGIONS.LEO.MAX_ALTITUDE_KM
  ) {
    return "LEO";
  }

  if (
    altitudeKm >= ORBITAL_REGIONS.MEO.MIN_ALTITUDE_KM &&
    altitudeKm < ORBITAL_REGIONS.MEO.MAX_ALTITUDE_KM
  ) {
    return "MEO";
  }

  if (altitudeKm > ORBITAL_REGIONS.MEO.MAX_ALTITUDE_KM) {
    return "HEO";
  }

  return "SUBORBITAL";
}

/**
 * Returns a configurable distance-based conjunction band.
 *
 * This is a screening label only. It does not represent
 * collision probability or a validated operational alert.
 */
export function classifyConjunctionDistance(distanceMeters) {
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) {
    return null;
  }

  if (distanceMeters <= CONJUNCTION_RISK.CRITICAL.MAX_DISTANCE_M) {
    return "CRITICAL";
  }

  if (distanceMeters <= CONJUNCTION_RISK.HIGH.MAX_DISTANCE_M) {
    return "HIGH";
  }

  if (distanceMeters <= CONJUNCTION_RISK.MODERATE.MAX_DISTANCE_M) {
    return "MODERATE";
  }

  if (distanceMeters <= CONJUNCTION_RISK.LOW.MAX_DISTANCE_M) {
    return "LOW";
  }

  return "INFORMATIONAL";
}