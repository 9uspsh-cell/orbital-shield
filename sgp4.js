/**
 * ORBITAL SHIELD
 * ORBITAL ENGINE — SGP4 ORBITAL PROPAGATION
 *
 * File: src/engine/propagation/sgp4.js
 *
 * Responsibilities:
 * - Initialize satellite records from TLE data.
 * - Propagate satellite position using SGP4.
 * - Calculate inertial position and velocity.
 * - Convert propagated state into Earth-fixed coordinates.
 * - Calculate geodetic position and orbital metrics.
 * - Provide structured propagation errors and diagnostics.
 *
 * Scientific model:
 * - SGP4 / SDP4 implementation provided by satellite.js.
 * - TLE-compatible propagation.
 *
 * Internal units:
 * - Position: km.
 * - Velocity: km/s.
 * - Angles: radians internally.
 * - Geodetic latitude/longitude: degrees.
 * - Altitude: km.
 *
 * Important:
 * TLE data is a mean-element representation.
 * SGP4 is designed to propagate these elements.
 * It is not a precision orbit determination system.
 */

import * as satellite from "satellite.js";

import {
  EARTH,
  MATH,
  TIME
} from "../constants.js";

import {
  validateTle
} from "../validation/tleValidator.js";

import {
  dateToJulianDate,
  dateToUnixSeconds
} from "../time/julianDate.js";

import {
  eciToEcefState,
  ecefToGeodetic,
  vectorMagnitude,
  createVector3
} from "../coordinates/frames.js";

// ============================================================
// 1. ENGINE CONFIGURATION
// ============================================================

const SGP4_CONFIG = Object.freeze({
  MODEL: "SGP4",

  POSITION_UNIT: "km",

  VELOCITY_UNIT: "km/s",

  ANGLE_UNIT: "rad",

  DEFAULT_GRAVITY_MODEL: "wgs84",

  MAX_PROPAGATION_AGE_DAYS: 365,

  MIN_POSITION_MAGNITUDE_KM: 1000,

  MAX_POSITION_MAGNITUDE_KM: 1000000,

  MIN_VELOCITY_KM_S: 0,

  MAX_VELOCITY_KM_S: 20,

  MIN_ALTITUDE_KM: -1000,

  MAX_ALTITUDE_KM: 100000
});

// ============================================================
// 2. ERROR TYPES
// ============================================================

export class SGP4Error extends Error {
  constructor(
    message,
    code = "SGP4_ERROR",
    details = null
  ) {
    super(message);

    this.name = "SGP4Error";
    this.code = code;
    this.details = details;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(
        this,
        SGP4Error
      );
    }
  }
}

// ============================================================
// 3. VALIDATION HELPERS
// ============================================================

function assertDate(date) {
  if (
    !(date instanceof Date) ||
    !Number.isFinite(date.getTime())
  ) {
    throw new SGP4Error(
      "A valid JavaScript Date is required.",
      "INVALID_DATE"
    );
  }
}

function assertVector(vector, name) {
  if (
    !vector ||
    !Number.isFinite(vector.x) ||
    !Number.isFinite(vector.y) ||
    !Number.isFinite(vector.z)
  ) {
    throw new SGP4Error(
      `${name} is invalid.`,
      "INVALID_VECTOR",
      {
        vector
      }
    );
  }
}

function assertTleStrings(line1, line2) {
  if (
    typeof line1 !== "string" ||
    typeof line2 !== "string"
  ) {
    throw new SGP4Error(
      "TLE lines must be strings.",
      "INVALID_TLE_INPUT"
    );
  }

  if (
    line1.length !== 69 ||
    line2.length !== 69
  ) {
    throw new SGP4Error(
      "TLE lines must contain exactly 69 characters.",
      "INVALID_TLE_LENGTH"
    );
  }
}

function validatePropagationRange(
  position,
  velocity
) {
  assertVector(position, "Position");
  assertVector(velocity, "Velocity");

  const positionMagnitude =
    vectorMagnitude(position);

  const velocityMagnitude =
    vectorMagnitude(velocity);

  if (
    positionMagnitude <
      SGP4_CONFIG.MIN_POSITION_MAGNITUDE_KM ||
    positionMagnitude >
      SGP4_CONFIG.MAX_POSITION_MAGNITUDE_KM
  ) {
    throw new SGP4Error(
      "Propagated position is outside the supported range.",
      "POSITION_OUT_OF_RANGE",
      {
        positionMagnitude
      }
    );
  }

  if (
    velocityMagnitude <
      SGP4_CONFIG.MIN_VELOCITY_KM_S ||
    velocityMagnitude >
      SGP4_CONFIG.MAX_VELOCITY_KM_S
  ) {
    throw new SGP4Error(
      "Propagated velocity is outside the supported range.",
      "VELOCITY_OUT_OF_RANGE",
      {
        velocityMagnitude
      }
    );
  }
}

// ============================================================
// 4. TLE SATELLITE INITIALIZATION
// ============================================================

/**
 * Creates an SGP4 satellite record from two TLE lines.
 *
 * The returned record is intended to be reused.
 * Do not reinitialize it for every simulation frame.
 */

export function createSatelliteRecord(
  line1,
  line2,
  options = {}
) {
  assertTleStrings(line1, line2);

  const {
    validate = true,
    checkChecksum = true,
    referenceDate = new Date()
  } = options;

  if (validate) {
    const report = validateTle(
      line1,
      line2,
      {
        checkChecksum,
        checkEpoch: false,
        referenceDate
      }
    );

    if (!report.valid) {
      throw new SGP4Error(
        "TLE validation failed.",
        "TLE_VALIDATION_FAILED",
        report
      );
    }
  }

  let satrec;

  try {
    satrec = satellite.twoline2satrec(
      line1,
      line2,
      satellite.GravityModels.wgs84
    );
  } catch (error) {
    throw new SGP4Error(
      "Failed to initialize the SGP4 satellite record.",
      "SGP4_INITIALIZATION_FAILED",
      {
        originalMessage: error?.message ?? null
      }
    );
  }

  if (!satrec) {
    throw new SGP4Error(
      "satellite.js returned an empty satellite record.",
      "EMPTY_SATELLITE_RECORD"
    );
  }

  if (
    satrec.error &&
    satrec.error !== 0
  ) {
    throw new SGP4Error(
      "SGP4 satellite record contains an initialization error.",
      "SGP4_RECORD_ERROR",
      {
        errorCode: satrec.error
      }
    );
  }

  const epochDate = new Date(
    (
      satrec.jdsatepoch -
      2440587.5
    ) *
    TIME.MILLISECONDS_PER_SECOND *
    TIME.SECONDS_PER_DAY
  );

  return {
    satrec,

    line1,
    line2,

    noradId: Number(
      line1.slice(2, 7)
    ),

    epochDate,

    epochJulianDate:
      satrec.jdsatepoch,

    model: SGP4_CONFIG.MODEL,

    gravityModel:
      SGP4_CONFIG.DEFAULT_GRAVITY_MODEL,

    initializedAt: new Date(),

    valid: true
  };
}

// ============================================================
// 5. SATELLITE RECORD INITIALIZATION FROM OBJECT
// ============================================================

export function createSatelliteRecordFromObject(
  object,
  options = {}
) {
  if (!object || typeof object !== "object") {
    throw new SGP4Error(
      "Satellite object is required.",
      "INVALID_SATELLITE_OBJECT"
    );
  }

  return createSatelliteRecord(
    object.line1,
    object.line2,
    options
  );
}

// ============================================================
// 6. PROPAGATION ERROR MAPPING
// ============================================================

const SGP4_ERROR_MESSAGES = Object.freeze({
  1: "Mean eccentricity is outside the supported range.",
  2: "Mean motion is non-positive.",
  3: "Perturbed eccentricity is outside the supported range.",
  4: "Semi-latus rectum is negative.",
  5: "Satellite has decayed or entered the Earth.",
  6: "Satellite position is below the Earth surface."
});

function getPropagationError(errorCode) {
  if (!errorCode || errorCode === 0) {
    return null;
  }

  return {
    code: errorCode,
    message:
      SGP4_ERROR_MESSAGES[errorCode] ??
      "Unknown SGP4 propagation error."
  };
}

// ============================================================
// 7. RAW SGP4 PROPAGATION
// ============================================================

/**
 * Propagates a satellite record at a specific UTC date.
 *
 * Returns inertial ECI position and velocity.
 *
 * satellite.js returns:
 * - position in km.
 * - velocity in km/s.
 */

export function propagateEci(
  satelliteRecord,
  date
) {
  if (
    !satelliteRecord ||
    !satelliteRecord.satrec
  ) {
    throw new SGP4Error(
      "A valid initialized satellite record is required.",
      "INVALID_SATELLITE_RECORD"
    );
  }

  assertDate(date);

  const satrec =
    satelliteRecord.satrec;

  const unixSeconds =
    dateToUnixSeconds(date);

  let result;

  try {
    result = satellite.propagate(
      satrec,
      date
    );
  } catch (error) {
    throw new SGP4Error(
      "SGP4 propagation execution failed.",
      "PROPAGATION_EXCEPTION",
      {
        originalMessage:
          error?.message ?? null
      }
    );
  }

  if (!result) {
    throw new SGP4Error(
      "SGP4 returned no propagation result.",
      "EMPTY_PROPAGATION_RESULT"
    );
  }

  const errorInfo =
    getPropagationError(
      satrec.error
    );

  if (errorInfo) {
    throw new SGP4Error(
      errorInfo.message,
      "SGP4_PROPAGATION_ERROR",
      errorInfo
    );
  }

  const position = result.position;
  const velocity = result.velocity;

  assertVector(
    position,
    "ECI position"
  );

  assertVector(
    velocity,
    "ECI velocity"
  );

  validatePropagationRange(
    position,
    velocity
  );

  return {
    position: createVector3(
      position.x,
      position.y,
      position.z
    ),

    velocity: createVector3(
      velocity.x,
      velocity.y,
      velocity.z
    ),

    frame: "ECI",

    positionUnit: "km",

    velocityUnit: "km/s",

    unixSeconds,

    date: date.toISOString(),

    julianDate:
      dateToJulianDate(date),

    model: "SGP4"
  };
}

// ============================================================
// 8. EARTH-FIXED PROPAGATION
// ============================================================

/**
 * Propagates satellite state and converts it to ECEF.
 *
 * ECEF velocity includes Earth's rotational correction.
 */

export function propagateEcef(
  satelliteRecord,
  date
) {
  const eciState =
    propagateEci(
      satelliteRecord,
      date
    );

  const ecefState =
    eciToEcefState({
      position: eciState.position,
      velocity: eciState.velocity,
      jd: eciState.julianDate
    });

  return {
    position: ecefState.position,

    velocity: ecefState.velocity,

    frame: "ECEF",

    positionUnit: "km",

    velocityUnit: "km/s",

    date: eciState.date,

    julianDate: eciState.julianDate,

    model: "SGP4"
  };
}

// ============================================================
// 9. GEODETIC PROPAGATION
// ============================================================

/**
 * Returns the satellite's geographic coordinates.
 *
 * The satellite position is first propagated in ECI,
 * transformed into ECEF, then converted to WGS-84
 * geodetic coordinates.
 */

export function propagateGeodetic(
  satelliteRecord,
  date
) {
  const ecefState =
    propagateEcef(
      satelliteRecord,
      date
    );

  const geodetic =
    ecefToGeodetic(
      ecefState.position
    );

  return {
    latitude: geodetic.latitudeDeg,

    longitude: geodetic.longitudeDeg,

    altitude: geodetic.altitudeKm,

    latitudeRad:
      geodetic.latitudeRad,

    longitudeRad:
      geodetic.longitudeRad,

    altitudeMeters:
      geodetic.altitudeM,

    frame: "GEODETIC",

    date: ecefState.date,

    julianDate: ecefState.julianDate
  };
}

// ============================================================
// 10. COMPLETE SATELLITE STATE
// ============================================================

/**
 * Returns a complete state containing:
 *
 * - ECI position and velocity.
 * - ECEF position and velocity.
 * - Geodetic coordinates.
 * - Orbital altitude.
 * - Speed.
 * - Orbital radius.
 * - Basic orbit classification.
 *
 * This is the primary interface for application systems.
 */

export function propagateFullState(
  satelliteRecord,
  date
) {
  const eci =
    propagateEci(
      satelliteRecord,
      date
    );

  const ecef =
    eciToEcefState({
      position: eci.position,
      velocity: eci.velocity,
      jd: eci.julianDate
    });

  const geodetic =
    ecefToGeodetic(
      ecef.position
    );

  const speed =
    vectorMagnitude(
      eci.velocity
    );

  const orbitalRadius =
    vectorMagnitude(
      eci.position
    );

  const altitude =
    geodetic.altitudeKm;

  return {
    object: {
      noradId: satelliteRecord.noradId
    },

    time: {
      utc: eci.date,

      unixSeconds: eci.unixSeconds,

      julianDate: eci.julianDate
    },

    eci: {
      position: eci.position,

      velocity: eci.velocity,

      frame: "ECI"
    },

    ecef: {
      position: ecef.position,

      velocity: ecef.velocity,

      frame: "ECEF"
    },

    geodetic: {
      latitude: geodetic.latitudeDeg,

      longitude: geodetic.longitudeDeg,

      altitudeKm: altitude,

      altitudeMeters:
        geodetic.altitudeM
    },

    orbital: {
      radiusKm: orbitalRadius,

      altitudeKm: altitude,

      speedKmS: speed,

      speedMetersS:
        speed * 1000,

      speedKmH:
        speed * 3600,

      specificAngularMomentum:
        calculateSpecificAngularMomentum(
          eci.position,
          eci.velocity
        )
    },

    metadata: {
      propagationModel: "SGP4",

      gravityModel: "WGS84",

      positionUnit: "km",

      velocityUnit: "km/s",

      angleUnit: "degrees"
    }
  };
}

// ============================================================
// 11. ORBITAL STATE METRICS
// ============================================================

/**
 * Specific angular momentum:
 *
 * h = r × v
 *
 * Unit:
 * km²/s
 */

export function calculateSpecificAngularMomentum(
  position,
  velocity
) {
  assertVector(position, "position");
  assertVector(velocity, "velocity");

  const hx =
    position.y * velocity.z -
    position.z * velocity.y;

  const hy =
    position.z * velocity.x -
    position.x * velocity.z;

  const hz =
    position.x * velocity.y -
    position.y * velocity.x;

  return Math.sqrt(
    hx * hx +
    hy * hy +
    hz * hz
  );
}

/**
 * Specific mechanical energy:
 *
 * ε = v²/2 - μ/r
 *
 * This is an instantaneous two-body diagnostic,
 * not the SGP4 propagation model.
 *
 * Unit:
 * km²/s²
 */

export function calculateSpecificMechanicalEnergy(
  position,
  velocity
) {
  assertVector(position, "position");
  assertVector(velocity, "velocity");

  const radius =
    vectorMagnitude(position);

  if (radius <= 0) {
    throw new SGP4Error(
      "Orbital radius must be positive.",
      "INVALID_ORBITAL_RADIUS"
    );
  }

  const speedSquared =
    velocity.x * velocity.x +
    velocity.y * velocity.y +
    velocity.z * velocity.z;

  return (
    speedSquared / 2 -
    EARTH.GRAVITATIONAL_PARAMETER_KM3_S2 /
      radius
  );
}

/**
 * Calculates instantaneous orbital period from
 * osculating specific energy when the orbit is bound.
 *
 * This is a two-body diagnostic estimate.
 */

export function calculateTwoBodyPeriod(
  position,
  velocity
) {
  const energy =
    calculateSpecificMechanicalEnergy(
      position,
      velocity
    );

  if (energy >= 0) {
    return null;
  }

  const semiMajorAxis =
    -EARTH.GRAVITATIONAL_PARAMETER_KM3_S2 /
    (2 * energy);

  const periodSeconds =
    2 * Math.PI *
    Math.sqrt(
      Math.pow(semiMajorAxis, 3) /
      EARTH.GRAVITATIONAL_PARAMETER_KM3_S2
    );

  return {
    semiMajorAxisKm: semiMajorAxis,

    periodSeconds,

    periodMinutes:
      periodSeconds / 60,

    periodHours:
      periodSeconds / 3600
  };
}

// ============================================================
// 12. PROPAGATION DIAGNOSTICS
// ============================================================

export function getSatelliteDiagnostics(
  satelliteRecord,
  date
) {
  const state =
    propagateFullState(
      satelliteRecord,
      date
    );

  const period =
    calculateTwoBodyPeriod(
      state.eci.position,
      state.eci.velocity
    );

  const energy =
    calculateSpecificMechanicalEnergy(
      state.eci.position,
      state.eci.velocity
    );

  return {
    noradId:
      satelliteRecord.noradId,

    date:
      state.time.utc,

    altitudeKm:
      state.orbital.altitudeKm,

    speedKmS:
      state.orbital.speedKmS,

    orbitalRadiusKm:
      state.orbital.radiusKm,

    angularMomentumKm2S:
      state.orbital.specificAngularMomentum,

    specificEnergyKm2S2:
      energy,

    estimatedPeriod:
      period,

    latitude:
      state.geodetic.latitude,

    longitude:
      state.geodetic.longitude,

    propagationModel: "SGP4"
  };
}

// ============================================================
// 13. BATCH PROPAGATION
// ============================================================

/**
 * Propagates multiple initialized satellite records.
 *
 * Each object is processed independently.
 * An error for one satellite does not stop the batch.
 */

export function propagateBatch(
  satelliteRecords,
  date
) {
  if (!Array.isArray(satelliteRecords)) {
    throw new TypeError(
      "satelliteRecords must be an array."
    );
  }

  assertDate(date);

  const results = [];

  for (const record of satelliteRecords) {
    try {
      results.push({
        success: true,

        noradId: record.noradId,

        state: propagateFullState(
          record,
          date
        ),

        error: null
      });
    } catch (error) {
      results.push({
        success: false,

        noradId:
          record?.noradId ?? null,

        state: null,

        error: {
          name: error.name,
          code: error.code ?? "UNKNOWN",
          message: error.message
        }
      });
    }
  }

  return {
    date: date.toISOString(),

    total: results.length,

    successful:
      results.filter(item => item.success).length,

    failed:
      results.filter(item => !item.success).length,

    results
  };
}

// ============================================================
// 14. PROPAGATION SERIES
// ============================================================

/**
 * Generates a time series for one satellite.
 *
 * Parameters:
 * - startDate: Date.
 * - sampleCount: number of samples.
 * - stepSeconds: interval between samples.
 *
 * Returns an array of successful states and records
 * failed samples separately.
 */

export function generatePropagationSeries(
  satelliteRecord,
  {
    startDate = new Date(),
    sampleCount = 100,
    stepSeconds = 60
  } = {}
) {
  assertDate(startDate);

  if (
    !Number.isInteger(sampleCount) ||
    sampleCount < 1 ||
    sampleCount > 100000
  ) {
    throw new RangeError(
      "sampleCount must be an integer between 1 and 100000."
    );
  }

  if (
    !Number.isFinite(stepSeconds) ||
    stepSeconds <= 0
  ) {
    throw new RangeError(
      "stepSeconds must be positive."
    );
  }

  const samples = [];
  const errors = [];

  for (
    let index = 0;
    index < sampleCount;
    index += 1
  ) {
    const sampleDate = new Date(
      startDate.getTime() +
      index *
      stepSeconds *
      TIME.MILLISECONDS_PER_SECOND
    );

    try {
      samples.push(
        propagateFullState(
          satelliteRecord,
          sampleDate
        )
      );
    } catch (error) {
      errors.push({
        index,

        date: sampleDate.toISOString(),

        code:
          error.code ?? "UNKNOWN",

        message:
          error.message
      });
    }
  }

  return {
    noradId:
      satelliteRecord.noradId,

    startDate:
      startDate.toISOString(),

    sampleCount,

    stepSeconds,

    samples,

    errors,

    statistics: {
      requested: sampleCount,

      successful: samples.length,

      failed: errors.length
    }
  };
}

// ============================================================
// 15. ENGINE INFORMATION
// ============================================================

export function getSgp4EngineInfo() {
  return Object.freeze({
    name: "ORBITAL ENGINE",

    propagationModel: "SGP4",

    implementation: "satellite.js",

    gravityModel: "WGS84",

    positionUnit: "km",

    velocityUnit: "km/s",

    coordinateFrames: [
      "ECI",
      "ECEF",
      "GEODETIC"
    ],

    supportsTle: true,

    supportsBatchPropagation: true,

    supportsTimeSeries: true,

    operationalCollisionProbability: false
  });
}

// ============================================================
// 16. MODULE EXPORT
// ============================================================

export const SGP4 = Object.freeze({
  createSatelliteRecord,
  createSatelliteRecordFromObject,

  propagateEci,
  propagateEcef,
  propagateGeodetic,
  propagateFullState,

  calculateSpecificAngularMomentum,
  calculateSpecificMechanicalEnergy,
  calculateTwoBodyPeriod,

  getSatelliteDiagnostics,

  propagateBatch,
  generatePropagationSeries,

  getSgp4EngineInfo
});