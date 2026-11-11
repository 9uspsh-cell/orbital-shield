/**
 * ORBITAL SHIELD
 * Ground Track Analysis Engine
 *
 * Capabilities:
 * - Ground track generation
 * - Geographic coordinate conversion
 * - Antimeridian crossing detection
 * - Track segmentation
 * - Ground-track sampling
 * - Orbital pass geometry
 * - Geographic bounds
 * - Track diagnostics
 *
 * Coordinate conventions:
 * Latitude: degrees, -90 to +90
 * Longitude: degrees, -180 to +180
 * Altitude: km
 * Time: UTC
 *
 * Important:
 * Input positions must be ECEF coordinates.
 * ECI coordinates must be transformed to ECEF first.
 */

import {
  EARTH,
  UNITS
} from "../constants.js";

import {
  ecefToGeodetic
} from "../coordinates/frames.js";

const GROUND_TRACK_CONFIG = Object.freeze({
  MAX_POINTS: 100000,

  DEFAULT_MAX_GAP_SECONDS: 900,

  ANTIMERIDIAN_THRESHOLD_DEG: 180,

  POLE_TOLERANCE_DEG: 89.999999,

  EARTH_ROTATION_RATE_RAD_S: 7.29211514670698e-5
});

export class GroundTrackError extends Error {
  constructor(message, code = "GROUND_TRACK_ERROR", cause = null) {
    super(message);

    this.name = "GroundTrackError";

    this.code = code;

    if (cause) {
      this.cause = cause;
    }
  }
}

/* -------------------------------------------------------
   Validation
------------------------------------------------------- */

function assertFinite(value, name) {
  if (!Number.isFinite(value)) {
    throw new GroundTrackError(
      `${name} must be a finite number.`,
      "INVALID_NUMERIC_VALUE"
    );
  }
}

function normalizeTimestamp(value) {
  let timestamp;

  if (value instanceof Date) {
    timestamp = value.getTime();
  } else if (typeof value === "string") {
    timestamp = new Date(value).getTime();
  } else if (typeof value === "number") {
    timestamp = value;
  } else {
    throw new GroundTrackError(
      "Invalid timestamp.",
      "INVALID_TIMESTAMP"
    );
  }

  if (!Number.isFinite(timestamp)) {
    throw new GroundTrackError(
      "Timestamp cannot be interpreted.",
      "INVALID_TIMESTAMP"
    );
  }

  // Numeric timestamps are interpreted as Unix milliseconds.
  return timestamp;
}

function normalizeEcefPosition(position) {
  if (!position || typeof position !== "object") {
    throw new GroundTrackError(
      "ECEF position is required.",
      "INVALID_POSITION"
    );
  }

  const x = Number(position.x);
  const y = Number(position.y);
  const z = Number(position.z);

  assertFinite(x, "position.x");
  assertFinite(y, "position.y");
  assertFinite(z, "position.z");

  const radius = Math.sqrt(
    x * x + y * y + z * z
  );

  if (radius < 1000 || radius > 1000000) {
    throw new GroundTrackError(
      "ECEF position magnitude is outside the supported range in kilometres.",
      "POSITION_OUT_OF_RANGE"
    );
  }

  return {
    x,
    y,
    z
  };
}

function normalizeSample(sample, index) {
  if (!sample || typeof sample !== "object") {
    throw new GroundTrackError(
      `Invalid sample at index ${index}.`,
      "INVALID_SAMPLE"
    );
  }

  const position = normalizeEcefPosition(
    sample.positionECEF ??
    sample.position ??
    sample.ecef
  );

  const timestamp = normalizeTimestamp(
    sample.timestamp ??
    sample.date ??
    sample.time
  );

  return {
    ...sample,
    position,
    timestamp
  };
}

/* -------------------------------------------------------
   Geographic Utilities
------------------------------------------------------- */

export function normalizeLongitude(longitude) {
  assertFinite(longitude, "longitude");

  let normalized = (
    (longitude + 180) % 360 + 360
  ) % 360 - 180;

  if (Object.is(normalized, -0)) {
    normalized = 0;
  }

  return normalized;
}

export function normalizeLatitude(latitude) {
  assertFinite(latitude, "latitude");

  if (latitude < -90 || latitude > 90) {
    throw new GroundTrackError(
      "Latitude must be between -90 and +90 degrees.",
      "INVALID_LATITUDE"
    );
  }

  return latitude;
}

export function degreesToRadians(degrees) {
  assertFinite(degrees, "degrees");

  return degrees * Math.PI / 180;
}

export function radiansToDegrees(radians) {
  assertFinite(radians, "radians");

  return radians * 180 / Math.PI;
}

function calculateLongitudeDifference(start, end) {
  return normalizeLongitude(end - start);
}

/* -------------------------------------------------------
   ECEF to Geographic Conversion
------------------------------------------------------- */

export function ecefPositionToGeographic(position) {
  const ecef = normalizeEcefPosition(position);

  let result;

  try {
    result = ecefToGeodetic(ecef);
  } catch (error) {
    throw new GroundTrackError(
      "Failed to convert ECEF position to geodetic coordinates.",
      "GEODETIC_CONVERSION_FAILED",
      error
    );
  }

  const latitude = radiansToDegrees(
    result.latitude
  );

  const longitude = normalizeLongitude(
    radiansToDegrees(result.longitude)
  );

  const altitudeKm = Number(result.altitudeKm);

  assertFinite(latitude, "latitude");
  assertFinite(longitude, "longitude");
  assertFinite(altitudeKm, "altitude");

  return {
    latitude: normalizeLatitude(latitude),

    longitude,

    altitudeKm,

    altitudeMeters: altitudeKm * 1000
  };
}

/* -------------------------------------------------------
   Ground Track Point
------------------------------------------------------- */

export function createGroundTrackPoint(sample, index = 0) {
  const normalized = normalizeSample(
    sample,
    index
  );

  const geographic = ecefPositionToGeographic(
    normalized.position
  );

  return {
    id: `${normalized.timestamp}-${index}`,

    index,

    timestamp: normalized.timestamp,

    date: new Date(normalized.timestamp),

    latitude: geographic.latitude,

    longitude: geographic.longitude,

    altitudeKm: geographic.altitudeKm,

    altitudeMeters: geographic.altitudeMeters,

    source: "ECEF",

    objectId: normalized.objectId ??
      normalized.id ??
      null
  };
}

/* -------------------------------------------------------
   Antimeridian Detection
------------------------------------------------------- */

export function crossesAntimeridian(
  longitudeA,
  longitudeB
) {
  const difference = Math.abs(
    longitudeB - longitudeA
  );

  return difference >
    GROUND_TRACK_CONFIG.ANTIMERIDIAN_THRESHOLD_DEG;
}

export function detectAntimeridianCrossing(pointA, pointB) {
  if (!pointA || !pointB) {
    throw new GroundTrackError(
      "Two points are required.",
      "MISSING_CROSSING_POINTS"
    );
  }

  const lonA = normalizeLongitude(
    pointA.longitude
  );

  const lonB = normalizeLongitude(
    pointB.longitude
  );

  if (!crossesAntimeridian(lonA, lonB)) {
    return {
      crosses: false,
      direction: null,
      boundaryLongitude: null
    };
  }

  const direction = lonA > 0 && lonB < 0
    ? "eastward"
    : "westward";

  return {
    crosses: true,

    direction,

    boundaryLongitude: direction === "eastward"
      ? 180
      : -180
  };
}

/* -------------------------------------------------------
   Antimeridian Intersection
------------------------------------------------------- */

/**
 * Finds the approximate crossing latitude using linear
 * interpolation in unwrapped longitude space.
 *
 * For high-precision cartography, a geodesic or orbital
 * segment intersection method should be used instead.
 */

export function calculateAntimeridianIntersection(
  pointA,
  pointB
) {
  const crossing = detectAntimeridianCrossing(
    pointA,
    pointB
  );

  if (!crossing.crosses) {
    return null;
  }

  const lonA = normalizeLongitude(
    pointA.longitude
  );

  const lonB = normalizeLongitude(
    pointB.longitude
  );

  const unwrappedLonB = lonA +
    calculateLongitudeDifference(lonA, lonB);

  const boundary = lonA > 0 ? 180 : -180;

  const denominator = unwrappedLonB - lonA;

  if (Math.abs(denominator) < 1e-12) {
    return null;
  }

  const fraction = (
    boundary - lonA
  ) / denominator;

  const latitude =
    pointA.latitude +
    (
      pointB.latitude - pointA.latitude
    ) * fraction;

  const timestamp =
    pointA.timestamp +
    (
      pointB.timestamp - pointA.timestamp
    ) * fraction;

  return {
    latitude: normalizeLatitude(latitude),

    longitude: boundary,

    timestamp,

    date: new Date(timestamp),

    fraction
  };
}

/* -------------------------------------------------------
   Track Segmentation
------------------------------------------------------- */

export function splitTrackAtAntimeridian(points) {
  if (!Array.isArray(points)) {
    throw new GroundTrackError(
      "Track points must be an array.",
      "INVALID_TRACK"
    );
  }

  if (points.length === 0) {
    return [];
  }

  const segments = [];

  let currentSegment = [points[0]];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];

    const current = points[index];

    const crossing = detectAntimeridianCrossing(
      previous,
      current
    );

    if (!crossing.crosses) {
      currentSegment.push(current);
      continue;
    }

    const intersection =
      calculateAntimeridianIntersection(
        previous,
        current
      );

    if (intersection) {
      const firstBoundary = {
        ...intersection,

        longitude: crossing.boundaryLongitude
      };

      const secondBoundary = {
        ...intersection,

        longitude: -crossing.boundaryLongitude
      };

      currentSegment.push(firstBoundary);

      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }

      currentSegment = [
        secondBoundary,
        current
      ];
    } else {
      if (currentSegment.length > 0) {
        segments.push(currentSegment);
      }

      currentSegment = [current];
    }
  }

  if (currentSegment.length > 0) {
    segments.push(currentSegment);
  }

  return segments;
}

/* -------------------------------------------------------
   Ground Track Generation
------------------------------------------------------- */

export function generateGroundTrack(samples, options = {}) {
  if (!Array.isArray(samples)) {
    throw new GroundTrackError(
      "Samples must be an array.",
      "INVALID_SAMPLES"
    );
  }

  if (samples.length > GROUND_TRACK_CONFIG.MAX_POINTS) {
    throw new GroundTrackError(
      "Ground track exceeds the maximum number of points.",
      "POINT_LIMIT_EXCEEDED"
    );
  }

  const maxGapSeconds =
    options.maxGapSeconds ??
    GROUND_TRACK_CONFIG.DEFAULT_MAX_GAP_SECONDS;

  assertFinite(maxGapSeconds, "maxGapSeconds");

  if (maxGapSeconds <= 0) {
    throw new GroundTrackError(
      "Maximum time gap must be positive.",
      "INVALID_MAX_GAP"
    );
  }

  const normalizedSamples = samples
    .map((sample, index) =>
      normalizeSample(sample, index)
    )
    .sort((a, b) => a.timestamp - b.timestamp);

  const points = normalizedSamples.map(
    (sample, index) =>
      createGroundTrackPoint(sample, index)
  );

  const continuousTracks = [];

  let currentTrack = [];

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];

    const previous = points[index - 1];

    if (
      previous &&
      (point.timestamp - previous.timestamp) / 1000 >
        maxGapSeconds
    ) {
      if (currentTrack.length > 0) {
        continuousTracks.push(currentTrack);
      }

      currentTrack = [];
    }

    currentTrack.push(point);
  }

  if (currentTrack.length > 0) {
    continuousTracks.push(currentTrack);
  }

  const segments = continuousTracks.flatMap(
    (track) => splitTrackAtAntimeridian(track)
  );

  return {
    points,

    continuousTracks,

    segments,

    statistics: calculateGroundTrackStatistics(points)
  };
}

/* -------------------------------------------------------
   Ground Track Statistics
------------------------------------------------------- */

export function calculateGroundTrackStatistics(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return {
      pointCount: 0,

      minimumAltitudeKm: null,

      maximumAltitudeKm: null,

      averageAltitudeKm: null,

      minimumLatitude: null,

      maximumLatitude: null,

      startTime: null,

      endTime: null,

      durationSeconds: 0
    };
  }

  const altitudes = points.map(
    (point) => point.altitudeKm
  );

  const latitudes = points.map(
    (point) => point.latitude
  );

  const altitudeSum = altitudes.reduce(
    (sum, value) => sum + value,
    0
  );

  const startTime = points[0].timestamp;

  const endTime = points[points.length - 1].timestamp;

  return {
    pointCount: points.length,

    minimumAltitudeKm: Math.min(...altitudes),

    maximumAltitudeKm: Math.max(...altitudes),

    averageAltitudeKm: altitudeSum / altitudes.length,

    minimumLatitude: Math.min(...latitudes),

    maximumLatitude: Math.max(...latitudes),

    startTime,

    endTime,

    durationSeconds: Math.max(
      0,
      (endTime - startTime) / 1000
    )
  };
}

/* -------------------------------------------------------
   Geographic Bounds
------------------------------------------------------- */

export function calculateGeographicBounds(points) {
  if (!Array.isArray(points) || points.length === 0) {
    return null;
  }

  let minLatitude = Infinity;

  let maxLatitude = -Infinity;

  for (const point of points) {
    const latitude = normalizeLatitude(
      point.latitude
    );

    minLatitude = Math.min(
      minLatitude,
      latitude
    );

    maxLatitude = Math.max(
      maxLatitude,
      latitude
    );
  }

  const longitudeIntervals = [];

  for (const segment of splitTrackAtAntimeridian(points)) {
    if (segment.length === 0) {
      continue;
    }

    const longitudes = segment.map(
      (point) => normalizeLongitude(point.longitude)
    );

    longitudeIntervals.push({
      west: Math.min(...longitudes),

      east: Math.max(...longitudes)
    });
  }

  return {
    south: minLatitude,

    north: maxLatitude,

    longitudeIntervals
  };
}

/* -------------------------------------------------------
   Pass Geometry
------------------------------------------------------- */

export function detectEquatorCrossings(points) {
  if (!Array.isArray(points) || points.length < 2) {
    return [];
  }

  const crossings = [];

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];

    const current = points[index];

    const previousLatitude = previous.latitude;

    const currentLatitude = current.latitude;

    if (
      previousLatitude === 0 ||
      currentLatitude === 0
    ) {
      continue;
    }

    if (
      Math.sign(previousLatitude) ===
      Math.sign(currentLatitude)
    ) {
      continue;
    }

    const fraction = (
      -previousLatitude
    ) / (
      currentLatitude - previousLatitude
    );

    const longitudeDifference =
      calculateLongitudeDifference(
        previous.longitude,
        current.longitude
      );

    const longitude = normalizeLongitude(
      previous.longitude +
      longitudeDifference * fraction
    );

    const timestamp =
      previous.timestamp +
      (
        current.timestamp - previous.timestamp
      ) * fraction;

    crossings.push({
      latitude: 0,

      longitude,

      timestamp,

      date: new Date(timestamp),

      direction: currentLatitude > previousLatitude
        ? "ascending"
        : "descending"
    });
  }

  return crossings;
}

export function calculateLatitudeExtrema(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return [];
  }

  const extrema = [];

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];

    const current = points[index];

    const next = points[index + 1];

    const isMaximum =
      current.latitude > previous.latitude &&
      current.latitude > next.latitude;

    const isMinimum =
      current.latitude < previous.latitude &&
      current.latitude < next.latitude;

    if (isMaximum || isMinimum) {
      extrema.push({
        ...current,

        type: isMaximum
          ? "northern"
          : "southern"
      });
    }
  }

  return extrema;
}

/* -------------------------------------------------------
   Diagnostics
------------------------------------------------------- */

export function validateGroundTrack(points) {
  if (!Array.isArray(points)) {
    throw new GroundTrackError(
      "Track must be an array.",
      "INVALID_TRACK"
    );
  }

  const issues = [];

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];

    if (
      !Number.isFinite(point.latitude) ||
      point.latitude < -90 ||
      point.latitude > 90
    ) {
      issues.push({
        index,

        code: "INVALID_LATITUDE",

        message: "Latitude is outside valid geographic limits."
      });
    }

    if (
      !Number.isFinite(point.longitude) ||
      point.longitude < -180 ||
      point.longitude > 180
    ) {
      issues.push({
        index,

        code: "INVALID_LONGITUDE",

        message: "Longitude is outside valid geographic limits."
      });
    }

    if (!Number.isFinite(point.timestamp)) {
      issues.push({
        index,

        code: "INVALID_TIMESTAMP",

        message: "Timestamp is invalid."
      });
    }

    if (
      index > 0 &&
      point.timestamp < points[index - 1].timestamp
    ) {
      issues.push({
        index,

        code: "NON_MONOTONIC_TIME",

        message: "Track timestamps are not chronological."
      });
    }
  }

  return {
    valid: issues.length === 0,

    pointCount: points.length,

    issueCount: issues.length,

    issues
  };
}

/* -------------------------------------------------------
   Public API
------------------------------------------------------- */

export const GroundTrackEngine = Object.freeze({
  normalizeLongitude,

  normalizeLatitude,

  ecefPositionToGeographic,

  createPoint: createGroundTrackPoint,

  crossesAntimeridian,

  detectAntimeridianCrossing,

  calculateAntimeridianIntersection,

  splitAtAntimeridian: splitTrackAtAntimeridian,

  generate: generateGroundTrack,

  statistics: calculateGroundTrackStatistics,

  bounds: calculateGeographicBounds,

  equatorCrossings: detectEquatorCrossings,

  latitudeExtrema: calculateLatitudeExtrema,

  validate: validateGroundTrack
});

export default GroundTrackEngine;