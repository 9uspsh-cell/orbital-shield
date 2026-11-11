/**
 * ORBITAL SHIELD
 * ORBITAL ENGINE — COORDINATE FRAME TRANSFORMATIONS
 *
 * File: src/engine/coordinates/frames.js
 *
 * Responsibilities:
 * - ECI to ECEF transformations.
 * - ECEF to ECI transformations.
 * - ECEF to geodetic transformations.
 * - Geodetic to ECEF transformations.
 * - Coordinate validation and vector utilities.
 * - Three.js visualization coordinate conversion.
 *
 * Internal convention:
 * - Position: kilometers.
 * - Velocity: kilometers per second.
 * - Angles: radians internally.
 * - Geodetic output: degrees and kilometers.
 *
 * ECI convention:
 * - Earth-centered inertial frame.
 * - Earth equatorial plane.
 *
 * ECEF convention:
 * - Earth-centered Earth-fixed frame.
 * - WGS-84 reference ellipsoid.
 *
 * Important:
 * Position transformations use Earth rotation angle.
 * Velocity transformations also account for the rotational
 * velocity of the Earth.
 */

import {
  EARTH,
  MATH,
  UNITS
} from "../constants.js";

import {
  calculateGMST,
  normalizeRadians
} from "../time/julianDate.js";

// ============================================================
// 1. INTERNAL CONSTANTS
// ============================================================

const EARTH_RADIUS_KM =
  EARTH.EQUATORIAL_RADIUS_KM;

const EARTH_ROTATION_RATE_RAD_S =
  EARTH.ROTATION_RATE_RAD_S;

const WGS84_A =
  EARTH.SEMI_MAJOR_AXIS_M / 1000;

const WGS84_F =
  EARTH.FLATTENING;

const WGS84_E2 =
  EARTH.ECCENTRICITY_SQUARED;

const WGS84_B =
  EARTH.SEMI_MINOR_AXIS_M / 1000;

const VECTOR_EPSILON = 1e-12;

const MAX_GEODETIC_ITERATIONS = 20;

const GEODETIC_CONVERGENCE_TOLERANCE = 1e-12;

// ============================================================
// 2. VALIDATION HELPERS
// ============================================================

function assertFiniteNumber(value, name) {
  if (!Number.isFinite(value)) {
    throw new TypeError(
      `${name} must be a finite number.`
    );
  }

  return value;
}

function assertVector3(vector, name = "vector") {
  if (
    !vector ||
    typeof vector !== "object" ||
    !Number.isFinite(vector.x) ||
    !Number.isFinite(vector.y) ||
    !Number.isFinite(vector.z)
  ) {
    throw new TypeError(
      `${name} must contain finite x, y and z values.`
    );
  }

  return vector;
}

function assertJulianDate(jd) {
  assertFiniteNumber(jd, "Julian Date");

  if (jd < 0 || jd > 10000000) {
    throw new RangeError(
      "Julian Date is outside the supported range."
    );
  }

  return jd;
}

function assertGeodeticCoordinates({
  latitudeRad,
  longitudeRad,
  altitudeKm
}) {
  assertFiniteNumber(latitudeRad, "latitudeRad");
  assertFiniteNumber(longitudeRad, "longitudeRad");
  assertFiniteNumber(altitudeKm, "altitudeKm");

  if (
    latitudeRad < -MATH.HALF_PI ||
    latitudeRad > MATH.HALF_PI
  ) {
    throw new RangeError(
      "Latitude must be between -90 and 90 degrees."
    );
  }

  return true;
}

// ============================================================
// 3. VECTOR OPERATIONS
// ============================================================

export function createVector3(x = 0, y = 0, z = 0) {
  assertFiniteNumber(x, "x");
  assertFiniteNumber(y, "y");
  assertFiniteNumber(z, "z");

  return {
    x,
    y,
    z
  };
}

export function cloneVector3(vector) {
  assertVector3(vector);

  return createVector3(
    vector.x,
    vector.y,
    vector.z
  );
}

export function addVectors(a, b) {
  assertVector3(a, "a");
  assertVector3(b, "b");

  return createVector3(
    a.x + b.x,
    a.y + b.y,
    a.z + b.z
  );
}

export function subtractVectors(a, b) {
  assertVector3(a, "a");
  assertVector3(b, "b");

  return createVector3(
    a.x - b.x,
    a.y - b.y,
    a.z - b.z
  );
}

export function scaleVector(vector, scalar) {
  assertVector3(vector);

  assertFiniteNumber(
    scalar,
    "scalar"
  );

  return createVector3(
    vector.x * scalar,
    vector.y * scalar,
    vector.z * scalar
  );
}

export function dotProduct(a, b) {
  assertVector3(a, "a");
  assertVector3(b, "b");

  return (
    a.x * b.x +
    a.y * b.y +
    a.z * b.z
  );
}

export function crossProduct(a, b) {
  assertVector3(a, "a");
  assertVector3(b, "b");

  return createVector3(
    a.y * b.z - a.z * b.y,
    a.z * b.x - a.x * b.z,
    a.x * b.y - a.y * b.x
  );
}

export function vectorMagnitude(vector) {
  assertVector3(vector);

  return Math.sqrt(
    vector.x * vector.x +
    vector.y * vector.y +
    vector.z * vector.z
  );
}

export function normalizeVector(vector) {
  assertVector3(vector);

  const magnitude =
    vectorMagnitude(vector);

  if (magnitude <= VECTOR_EPSILON) {
    throw new RangeError(
      "Cannot normalize a zero-length vector."
    );
  }

  return scaleVector(
    vector,
    1 / magnitude
  );
}

export function distanceBetweenVectors(a, b) {
  return vectorMagnitude(
    subtractVectors(a, b)
  );
}

// ============================================================
// 4. ROTATION MATRICES
// ============================================================

/**
 * Rotation around the Z axis.
 *
 * Matrix:
 *
 * | cosθ  -sinθ  0 |
 * | sinθ   cosθ  0 |
 * |  0      0    1 |
 */

export function rotateAroundZ(vector, angleRad) {
  assertVector3(vector);
  assertFiniteNumber(angleRad, "angleRad");

  const cosine = Math.cos(angleRad);
  const sine = Math.sin(angleRad);

  return createVector3(
    cosine * vector.x - sine * vector.y,
    sine * vector.x + cosine * vector.y,
    vector.z
  );
}

/**
 * Rotation around the X axis.
 */

export function rotateAroundX(vector, angleRad) {
  assertVector3(vector);
  assertFiniteNumber(angleRad, "angleRad");

  const cosine = Math.cos(angleRad);
  const sine = Math.sin(angleRad);

  return createVector3(
    vector.x,
    cosine * vector.y - sine * vector.z,
    sine * vector.y + cosine * vector.z
  );
}

/**
 * Rotation around the Y axis.
 */

export function rotateAroundY(vector, angleRad) {
  assertVector3(vector);
  assertFiniteNumber(angleRad, "angleRad");

  const cosine = Math.cos(angleRad);
  const sine = Math.sin(angleRad);

  return createVector3(
    cosine * vector.x + sine * vector.z,
    vector.y,
    -sine * vector.x + cosine * vector.z
  );
}

// ============================================================
// 5. ECI AND ECEF TRANSFORMATIONS
// ============================================================

/**
 * ECI to ECEF position transformation.
 *
 * The Earth-fixed frame rotates by GMST relative to
 * the inertial frame.
 *
 * ECEF = Rz(-GMST) × ECI
 *
 * Position unit: km.
 */
export function eciToEcef(positionEci, jd) {
  assertVector3(positionEci, "positionEci");
  assertJulianDate(jd);

  const gmst = calculateGMST(jd);

  return rotateAroundZ(
    positionEci,
    -gmst
  );
}

/**
 * ECEF to ECI position transformation.
 *
 * ECI = Rz(+GMST) × ECEF
 *
 * Position unit: km.
 */
export function ecefToEci(positionEcef, jd) {
  assertVector3(positionEcef, "positionEcef");
  assertJulianDate(jd);

  const gmst = calculateGMST(jd);

  return rotateAroundZ(
    positionEcef,
    gmst
  );
}

// ============================================================
// 6. VELOCITY FRAME TRANSFORMATIONS
// ============================================================

/**
 * Convert ECI velocity into ECEF velocity.
 *
 * The velocity transformation must include Earth's
 * angular velocity:
 *
 * v_ECEF = R × v_ECI - ω × r_ECEF
 *
 * This is not equivalent to rotating velocity alone.
 *
 * Units:
 * - Position: km.
 * - Velocity: km/s.
 */

export function eciToEcefState({
  position,
  velocity,
  jd
}) {
  assertVector3(position, "position");
  assertVector3(velocity, "velocity");
  assertJulianDate(jd);

  const positionEcef =
    eciToEcef(position, jd);

  const velocityRotated =
    eciToEcef(velocity, jd);

  const omegaCrossR = createVector3(
    -EARTH_ROTATION_RATE_RAD_S *
      positionEcef.y,

    EARTH_ROTATION_RATE_RAD_S *
      positionEcef.x,

    0
  );

  const velocityEcef =
    subtractVectors(
      velocityRotated,
      omegaCrossR
    );

  return {
    position: positionEcef,
    velocity: velocityEcef,
    frame: "ECEF",
    unit: "km",
    velocityUnit: "km/s"
  };
}

/**
 * Convert ECEF state into ECI state.
 *
 * v_ECI = R⁻¹ × (v_ECEF + ω × r_ECEF)
 */

export function ecefToEciState({
  position,
  velocity,
  jd
}) {
  assertVector3(position, "position");
  assertVector3(velocity, "velocity");
  assertJulianDate(jd);

  const omegaCrossR = createVector3(
    -EARTH_ROTATION_RATE_RAD_S *
      position.y,

    EARTH_ROTATION_RATE_RAD_S *
      position.x,

    0
  );

  const inertialVelocity =
    addVectors(
      velocity,
      omegaCrossR
    );

  return {
    position: ecefToEci(position, jd),

    velocity: ecefToEci(
      inertialVelocity,
      jd
    ),

    frame: "ECI",
    unit: "km",
    velocityUnit: "km/s"
  };
}

// ============================================================
// 7. GEODETIC TO ECEF
// ============================================================

/**
 * Converts geodetic coordinates to ECEF.
 *
 * Input:
 * {
 *   latitudeRad,
 *   longitudeRad,
 *   altitudeKm
 * }
 *
 * Output:
 * {
 *   x, y, z
 * }
 *
 * Uses WGS-84 ellipsoid.
 */

export function geodeticToEcef({
  latitudeRad,
  longitudeRad,
  altitudeKm = 0
}) {
  assertGeodeticCoordinates({
    latitudeRad,
    longitudeRad,
    altitudeKm
  });

  const sinLatitude =
    Math.sin(latitudeRad);

  const cosLatitude =
    Math.cos(latitudeRad);

  const sinLongitude =
    Math.sin(longitudeRad);

  const cosLongitude =
    Math.cos(longitudeRad);

  const primeVerticalRadius =
    WGS84_A /
    Math.sqrt(
      1 -
      WGS84_E2 *
      sinLatitude *
      sinLatitude
    );

  const x =
    (
      primeVerticalRadius +
      altitudeKm
    ) *
    cosLatitude *
    cosLongitude;

  const y =
    (
      primeVerticalRadius +
      altitudeKm
    ) *
    cosLatitude *
    sinLongitude;

  const z =
    (
      primeVerticalRadius *
      (1 - WGS84_E2) +
      altitudeKm
    ) *
    sinLatitude;

  return createVector3(
    x,
    y,
    z
  );
}

/**
 * Convenience wrapper accepting degrees.
 */
export function geodeticDegreesToEcef({
  latitudeDeg,
  longitudeDeg,
  altitudeKm = 0
}) {
  assertFiniteNumber(latitudeDeg, "latitudeDeg");
  assertFiniteNumber(longitudeDeg, "longitudeDeg");

  if (
    latitudeDeg < -90 ||
    latitudeDeg > 90
  ) {
    throw new RangeError(
      "Latitude must be between -90 and 90 degrees."
    );
  }

  return geodeticToEcef({
    latitudeRad:
      latitudeDeg * MATH.DEG_TO_RAD,

    longitudeRad:
      longitudeDeg * MATH.DEG_TO_RAD,

    altitudeKm
  });
}

// ============================================================
// 8. ECEF TO GEODETIC
// ============================================================

/**
 * Converts ECEF coordinates to geodetic coordinates.
 *
 * Uses iterative WGS-84 conversion.
 *
 * Input:
 * {
 *   x, y, z
 * }
 *
 * Position unit: km.
 *
 * Output:
 * {
 *   latitudeRad,
 *   longitudeRad,
 *   altitudeKm
 * }
 */

export function ecefToGeodetic(positionEcef) {
  assertVector3(
    positionEcef,
    "positionEcef"
  );

  const {
    x,
    y,
    z
  } = positionEcef;

  const p = Math.sqrt(
    x * x + y * y
  );

  const radius = Math.sqrt(
    x * x +
    y * y +
    z * z
  );

  if (radius <= VECTOR_EPSILON) {
    throw new RangeError(
      "Geodetic coordinates are undefined at Earth's center."
    );
  }

  const longitudeRad =
    Math.atan2(y, x);

  // Special handling at the poles.
  if (p <= VECTOR_EPSILON) {
    return {
      latitudeRad:
        z >= 0
          ? MATH.HALF_PI
          : -MATH.HALF_PI,

      longitudeRad: 0,

      altitudeKm:
        Math.abs(z) - WGS84_B,

      latitudeDeg:
        z >= 0 ? 90 : -90,

      longitudeDeg: 0,

      altitudeM:
        (
          Math.abs(z) - WGS84_B
        ) * 1000
    };
  }

  let latitudeRad =
    Math.atan2(
      z,
      p * (1 - WGS84_E2)
    );

  let altitudeKm = 0;

  for (
    let iteration = 0;
    iteration < MAX_GEODETIC_ITERATIONS;
    iteration += 1
  ) {
    const sinLatitude =
      Math.sin(latitudeRad);

    const cosLatitude =
      Math.cos(latitudeRad);

    const primeVerticalRadius =
      WGS84_A /
      Math.sqrt(
        1 -
        WGS84_E2 *
        sinLatitude *
        sinLatitude
      );

    if (Math.abs(cosLatitude) > VECTOR_EPSILON) {
      altitudeKm =
        p / cosLatitude -
        primeVerticalRadius;
    } else {
      altitudeKm =
        Math.abs(z) -
        WGS84_B;
    }

    const nextLatitude =
      Math.atan2(
        z,
        p *
        (
          1 -
          WGS84_E2 *
          (
            primeVerticalRadius /
            (primeVerticalRadius + altitudeKm)
          )
        )
      );

    if (
      Math.abs(
        nextLatitude - latitudeRad
      ) <= GEODETIC_CONVERGENCE_TOLERANCE
    ) {
      latitudeRad = nextLatitude;
      break;
    }

    latitudeRad = nextLatitude;
  }

  const sinLatitude =
    Math.sin(latitudeRad);

  const cosLatitude =
    Math.cos(latitudeRad);

  const primeVerticalRadius =
    WGS84_A /
    Math.sqrt(
      1 -
      WGS84_E2 *
      sinLatitude *
      sinLatitude
    );

  if (Math.abs(cosLatitude) > VECTOR_EPSILON) {
    altitudeKm =
      p / cosLatitude -
      primeVerticalRadius;
  } else {
    altitudeKm =
      Math.abs(z) -
      WGS84_B;
  }

  const normalizedLongitude =
    normalizeRadians(
      longitudeRad
    );

  const signedLongitude =
    normalizedLongitude > Math.PI
      ? normalizedLongitude - MATH.TWO_PI
      : normalizedLongitude;

  return {
    latitudeRad,
    longitudeRad: signedLongitude,
    altitudeKm,

    latitudeDeg:
      latitudeRad * MATH.RAD_TO_DEG,

    longitudeDeg:
      signedLongitude * MATH.RAD_TO_DEG,

    altitudeM:
      altitudeKm * 1000
  };
}

// ============================================================
// 9. GEODETIC CONVENIENCE HELPERS
// ============================================================

export function ecefToGeodeticDegrees(positionEcef) {
  return ecefToGeodetic(
    positionEcef
  );
}

export function geodeticToEcefFromObject({
  latitudeDeg,
  longitudeDeg,
  altitudeM = 0
}) {
  assertFiniteNumber(
    altitudeM,
    "altitudeM"
  );

  return geodeticDegreesToEcef({
    latitudeDeg,
    longitudeDeg,
    altitudeKm: altitudeM / 1000
  });
}

// ============================================================
// 10. THREE.JS COORDINATE CONVERSION
// ============================================================

/**
 * Converts ECI coordinates to a Three.js scene vector.
 *
 * Visualization mapping:
 *
 * Three X = ECI X
 * Three Y = ECI Z
 * Three Z = -ECI Y
 *
 * This mapping makes the Three.js Y axis the visual
 * north direction.
 *
 * scale controls scene units per kilometer.
 */

export function eciToThreePosition(
  positionEci,
  scale = 1 / EARTH_RADIUS_KM
) {
  assertVector3(positionEci);

  assertFiniteNumber(
    scale,
    "scale"
  );

  return {
    x: positionEci.x * scale,
    y: positionEci.z * scale,
    z: -positionEci.y * scale
  };
}

/**
 * Converts ECEF coordinates to Three.js scene coordinates.
 */
export function ecefToThreePosition(
  positionEcef,
  scale = 1 / EARTH_RADIUS_KM
) {
  assertVector3(positionEcef);

  assertFiniteNumber(
    scale,
    "scale"
  );

  return {
    x: positionEcef.x * scale,
    y: positionEcef.z * scale,
    z: -positionEcef.y * scale
  };
}

/**
 * Converts a Three.js scene vector back to ECI.
 */
export function threePositionToEci(
  position,
  scale = 1 / EARTH_RADIUS_KM
) {
  assertVector3(position);

  assertFiniteNumber(
    scale,
    "scale"
  );

  if (Math.abs(scale) <= VECTOR_EPSILON) {
    throw new RangeError(
      "Scale must not be zero."
    );
  }

  return createVector3(
    position.x / scale,
    -position.z / scale,
    position.y / scale
  );
}

// ============================================================
// 11. DISTANCE HELPERS
// ============================================================

/**
 * Computes altitude above the WGS-84 ellipsoid.
 */
export function calculateAltitude(positionEcef) {
  return ecefToGeodetic(
    positionEcef
  ).altitudeKm;
}

/**
 * Calculates Euclidean distance in kilometers.
 */
export function distanceKm(positionA, positionB) {
  return distanceBetweenVectors(
    positionA,
    positionB
  );
}

/**
 * Calculates distance in meters.
 */
export function distanceMeters(positionA, positionB) {
  return (
    distanceKm(positionA, positionB) *
    UNITS.METERS_PER_KILOMETER
  );
}

/**
 * Calculates the central angle between two geocentric
 * position vectors.
 *
 * This is a geocentric angular separation, not a
 * surface geodesic distance.
 */
export function centralAngleRad(positionA, positionB) {
  const a = normalizeVector(positionA);
  const b = normalizeVector(positionB);

  const cosine = Math.max(
    -1,
    Math.min(
      1,
      dotProduct(a, b)
    )
  );

  return Math.acos(cosine);
}

// ============================================================
// 12. LOCAL ENU COORDINATE SYSTEM
// ============================================================

/**
 * Converts an ECEF displacement vector into local ENU.
 *
 * ENU:
 * - East
 * - North
 * - Up
 *
 * Input:
 * - displacementEcef in km.
 * - reference geodetic coordinates in radians.
 */

export function ecefDisplacementToEnu(
  displacementEcef,
  reference
) {
  assertVector3(
    displacementEcef,
    "displacementEcef"
  );

  const {
    latitudeRad,
    longitudeRad
  } = reference ?? {};

  assertFiniteNumber(
    latitudeRad,
    "latitudeRad"
  );

  assertFiniteNumber(
    longitudeRad,
    "longitudeRad"
  );

  const sinLat = Math.sin(latitudeRad);
  const cosLat = Math.cos(latitudeRad);

  const sinLon = Math.sin(longitudeRad);
  const cosLon = Math.cos(longitudeRad);

  const east =
    -sinLon * displacementEcef.x +
    cosLon * displacementEcef.y;

  const north =
    -sinLat * cosLon * displacementEcef.x -
    sinLat * sinLon * displacementEcef.y +
    cosLat * displacementEcef.z;

  const up =
    cosLat * cosLon * displacementEcef.x +
    cosLat * sinLon * displacementEcef.y +
    sinLat * displacementEcef.z;

  return {
    east,
    north,
    up,
    unit: "km"
  };
}

// ============================================================
// 13. STATE TRANSFORMATION HELPERS
// ============================================================

export function transformEciStateToEcef(
  state,
  jd
) {
  if (!state || !state.position || !state.velocity) {
    throw new TypeError(
      "State must contain position and velocity."
    );
  }

  return eciToEcefState({
    position: state.position,
    velocity: state.velocity,
    jd
  });
}

export function transformEcefStateToEci(
  state,
  jd
) {
  if (!state || !state.position || !state.velocity) {
    throw new TypeError(
      "State must contain position and velocity."
    );
  }

  return ecefToEciState({
    position: state.position,
    velocity: state.velocity,
    jd
  });
}

// ============================================================
// 14. COORDINATE SNAPSHOT
// ============================================================

export function createCoordinateSnapshot(
  positionEci,
  jd
) {
  assertVector3(
    positionEci,
    "positionEci"
  );

  assertJulianDate(jd);

  const positionEcef =
    eciToEcef(positionEci, jd);

  const geodetic =
    ecefToGeodetic(positionEcef);

  const threePosition =
    eciToThreePosition(positionEci);

  return Object.freeze({
    eci: Object.freeze(
      cloneVector3(positionEci)
    ),

    ecef: Object.freeze(
      cloneVector3(positionEcef)
    ),

    geodetic: Object.freeze({
      ...geodetic
    }),

    visualization: Object.freeze({
      ...threePosition
    }),

    julianDate: jd
  });
}

// ============================================================
// 15. MODULE EXPORT
// ============================================================

export const CoordinateFrames = Object.freeze({
  createVector3,
  cloneVector3,

  addVectors,
  subtractVectors,
  scaleVector,

  dotProduct,
  crossProduct,

  vectorMagnitude,
  normalizeVector,
  distanceBetweenVectors,

  rotateAroundX,
  rotateAroundY,
  rotateAroundZ,

  eciToEcef,
  ecefToEci,

  eciToEcefState,
  ecefToEciState,

  geodeticToEcef,
  geodeticDegreesToEcef,

  ecefToGeodetic,
  ecefToGeodeticDegrees,

  geodeticToEcefFromObject,

  eciToThreePosition,
  ecefToThreePosition,
  threePositionToEci,

  calculateAltitude,
  distanceKm,
  distanceMeters,
  centralAngleRad,

  ecefDisplacementToEnu,

  transformEciStateToEcef,
  transformEcefStateToEci,

  createCoordinateSnapshot
});