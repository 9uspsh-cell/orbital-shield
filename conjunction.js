/**
 * ORBITAL SHIELD
 * ORBITAL ENGINE — CONJUNCTION ANALYSIS
 *
 * File: src/engine/analysis/conjunction.js
 *
 * Responsibilities:
 * - Calculate relative position and velocity.
 * - Estimate time of closest approach (TCA).
 * - Calculate miss distance (MD).
 * - Screen multiple satellite pairs.
 * - Identify potential close approaches.
 * - Calculate encounter geometry.
 * - Generate structured conjunction reports.
 *
 * Scientific conventions:
 * - Position: km.
 * - Velocity: km/s.
 * - Time: UTC.
 * - Relative state: common ECI frame.
 *
 * IMPORTANT:
 * This is a deterministic screening module.
 * It does not calculate Probability of Collision (Pc).
 * It does not replace an operational conjunction assessment
 * system or covariance-based collision risk analysis.
 */

import {
  TIME,
  SCREENING,
  CONJUNCTION_RISK
} from "../constants.js";

import {
  propagateEci
} from "../propagation/sgp4.js";

import {
  createVector3,
  addVectors,
  subtractVectors,
  scaleVector,
  dotProduct,
  crossProduct,
  vectorMagnitude,
  normalizeVector
} from "../coordinates/frames.js";

// ============================================================
// 1. CONFIGURATION
// ============================================================

const CONJUNCTION_CONFIG = Object.freeze({
  DEFAULT_LOOKAHEAD_HOURS:
    SCREENING.DEFAULT_LOOKAHEAD_HOURS,

  DEFAULT_STEP_SECONDS:
    SCREENING.DEFAULT_TIME_STEP_SECONDS,

  DEFAULT_SCREENING_DISTANCE_KM:
    SCREENING.DEFAULT_SCREENING_DISTANCE_KM,

  MIN_DISTANCE_KM: 0,

  MAX_SAMPLES: 100000,

  MAX_OBJECTS_PER_SCAN: 10000,

  REFINEMENT_ITERATIONS: 40,

  REFINEMENT_TOLERANCE_SECONDS: 0.01,

  DEFAULT_CLOSE_APPROACH_THRESHOLD_KM: 10
});

// ============================================================
// 2. VALIDATION
// ============================================================

function assertDate(date, name = "date") {
  if (
    !(date instanceof Date) ||
    !Number.isFinite(date.getTime())
  ) {
    throw new TypeError(
      `${name} must be a valid Date.`
    );
  }
}

function assertFinite(value, name) {
  if (!Number.isFinite(value)) {
    throw new TypeError(
      `${name} must be a finite number.`
    );
  }
}

function assertPositive(value, name) {
  assertFinite(value, name);

  if (value <= 0) {
    throw new RangeError(
      `${name} must be greater than zero.`
    );
  }
}

function assertSatelliteRecord(record, name) {
  if (
    !record ||
    !record.satrec ||
    !Number.isFinite(record.noradId)
  ) {
    throw new TypeError(
      `${name} must be an initialized SGP4 satellite record.`
    );
  }
}

// ============================================================
// 3. RELATIVE STATE
// ============================================================

/**
 * Calculates relative position and velocity.
 *
 * r_rel = r_2 - r_1
 * v_rel = v_2 - v_1
 *
 * Both states must use the same inertial frame and epoch.
 */

export function calculateRelativeState(
  stateA,
  stateB
) {
  if (
    !stateA ||
    !stateB ||
    !stateA.position ||
    !stateB.position ||
    !stateA.velocity ||
    !stateB.velocity
  ) {
    throw new TypeError(
      "Both states must contain position and velocity."
    );
  }

  const relativePosition =
    subtractVectors(
      stateB.position,
      stateA.position
    );

  const relativeVelocity =
    subtractVectors(
      stateB.velocity,
      stateA.velocity
    );

  return {
    position: relativePosition,

    velocity: relativeVelocity,

    distanceKm:
      vectorMagnitude(relativePosition),

    relativeSpeedKmS:
      vectorMagnitude(relativeVelocity),

    frame: "ECI",

    positionUnit: "km",

    velocityUnit: "km/s"
  };
}

// ============================================================
// 4. LINEAR CLOSEST APPROACH
// ============================================================

/**
 * Calculates the closest approach under constant
 * relative velocity.
 *
 * For relative position r and velocity v:
 *
 * tCPA = -(r · v) / |v|²
 *
 * The result is clamped to the requested time interval.
 *
 * This is a local linear approximation, not a complete
 * orbital encounter solution.
 */

export function calculateLinearClosestApproach(
  relativePosition,
  relativeVelocity,
  {
    minimumTimeSeconds = 0,
    maximumTimeSeconds = Infinity
  } = {}
) {
  const r =
    relativePosition;

  const v =
    relativeVelocity;

  if (!r || !v) {
    throw new TypeError(
      "Relative position and velocity are required."
    );
  }

  const relativeSpeedSquared =
    dotProduct(v, v);

  let timeSeconds = 0;

  if (relativeSpeedSquared > 1e-18) {
    timeSeconds =
      -dotProduct(r, v) /
      relativeSpeedSquared;
  }

  timeSeconds = Math.max(
    minimumTimeSeconds,
    Math.min(
      maximumTimeSeconds,
      timeSeconds
    )
  );

  const predictedPosition =
    addVectors(
      r,
      scaleVector(v, timeSeconds)
    );

  return {
    timeSeconds,

    predictedRelativePosition:
      predictedPosition,

    missDistanceKm:
      vectorMagnitude(predictedPosition),

    relativeSpeedKmS:
      Math.sqrt(relativeSpeedSquared),

    method: "CONSTANT_RELATIVE_VELOCITY"
  };
}

// ============================================================
// 5. ENCOUNTER GEOMETRY
// ============================================================

/**
 * Calculates encounter geometry at CPA.
 */

export function calculateEncounterGeometry(
  relativePosition,
  relativeVelocity
) {
  const distance =
    vectorMagnitude(relativePosition);

  const speed =
    vectorMagnitude(relativeVelocity);

  if (
    distance <= 1e-12 ||
    speed <= 1e-12
  ) {
    return {
      radialVelocityKmS: null,

      tangentialVelocityKmS: null,

      closingSpeedKmS: null,

      encounterAngleDeg: null
    };
  }

  const radialUnit =
    normalizeVector(relativePosition);

  const radialVelocity =
    dotProduct(
      relativeVelocity,
      radialUnit
    );

  const tangentialVelocitySquared =
    Math.max(
      0,
      speed * speed -
      radialVelocity * radialVelocity
    );

  const tangentialVelocity =
    Math.sqrt(
      tangentialVelocitySquared
    );

  const cosine = Math.max(
    -1,
    Math.min(
      1,
      -radialVelocity / speed
    )
  );

  return {
    radialVelocityKmS:
      radialVelocity,

    tangentialVelocityKmS:
      tangentialVelocity,

    closingSpeedKmS:
      Math.max(0, -radialVelocity),

    encounterAngleDeg:
      Math.acos(cosine) *
      180 / Math.PI
  };
}

// ============================================================
// 6. PROPAGATION SAMPLING
// ============================================================

function propagatePairAtTime(
  recordA,
  recordB,
  date
) {
  const stateA =
    propagateEci(
      recordA,
      date
    );

  const stateB =
    propagateEci(
      recordB,
      date
    );

  return {
    stateA,
    stateB,

    relative:
      calculateRelativeState(
        stateA,
        stateB
      )
  };
}

// ============================================================
// 7. DISTANCE FUNCTION
// ============================================================

function calculatePairDistance(
  recordA,
  recordB,
  date
) {
  const result =
    propagatePairAtTime(
      recordA,
      recordB,
      date
    );

  return {
    date,

    distanceKm:
      result.relative.distanceKm,

    relativePosition:
      result.relative.position,

    relativeVelocity:
      result.relative.velocity,

    stateA:
      result.stateA,

    stateB:
      result.stateB
  };
}

// ============================================================
// 8. CPA REFINEMENT
// ============================================================

/**
 * Refines a sampled minimum using golden-section search.
 *
 * This is more accurate than selecting only the nearest
 * fixed time sample.
 *
 * The function searches the interval surrounding the
 * minimum sample.
 */

export function refineClosestApproach(
  recordA,
  recordB,
  startDate,
  lowerSeconds,
  upperSeconds,
  options = {}
) {
  assertSatelliteRecord(recordA, "recordA");
  assertSatelliteRecord(recordB, "recordB");
  assertDate(startDate);

  assertFinite(lowerSeconds, "lowerSeconds");
  assertFinite(upperSeconds, "upperSeconds");

  if (upperSeconds < lowerSeconds) {
    throw new RangeError(
      "Upper bound must be greater than lower bound."
    );
  }

  const tolerance =
    options.toleranceSeconds ??
    CONJUNCTION_CONFIG.REFINEMENT_TOLERANCE_SECONDS;

  const maxIterations =
    options.maxIterations ??
    CONJUNCTION_CONFIG.REFINEMENT_ITERATIONS;

  assertPositive(tolerance, "tolerance");

  if (
    !Number.isInteger(maxIterations) ||
    maxIterations < 1
  ) {
    throw new RangeError(
      "maxIterations must be a positive integer."
    );
  }

  const ratio =
    (Math.sqrt(5) - 1) / 2;

  let a = lowerSeconds;
  let b = upperSeconds;

  let c = b - ratio * (b - a);
  let d = a + ratio * (b - a);

  const getDistance = seconds => {
    const date = new Date(
      startDate.getTime() +
      seconds *
      TIME.MILLISECONDS_PER_SECOND
    );

    return calculatePairDistance(
      recordA,
      recordB,
      date
    ).distanceKm;
  };

  let fc = getDistance(c);
  let fd = getDistance(d);

  let iterations = 0;

  while (
    Math.abs(b - a) > tolerance &&
    iterations < maxIterations
  ) {
    if (fc <= fd) {
      b = d;
      d = c;
      fd = fc;

      c = b - ratio * (b - a);
      fc = getDistance(c);
    } else {
      a = c;
      c = d;
      fc = fd;

      d = a + ratio * (b - a);
      fd = getDistance(d);
    }

    iterations += 1;
  }

  const bestSeconds =
    (a + b) / 2;

  const bestDate =
    new Date(
      startDate.getTime() +
      bestSeconds *
      TIME.MILLISECONDS_PER_SECOND
    );

  return {
    ...calculatePairDistance(
      recordA,
      recordB,
      bestDate
    ),

    secondsFromStart:
      bestSeconds,

    iterations,

    convergenceToleranceSeconds:
      tolerance,

    method: "GOLDEN_SECTION_REFINEMENT"
  };
}

// ============================================================
// 9. SINGLE PAIR SCREENING
// ============================================================

/**
 * Screens two satellite records over a future time window.
 *
 * Algorithm:
 * 1. Sample both satellites at fixed intervals.
 * 2. Find the minimum sampled distance.
 * 3. Refine the interval around the minimum.
 * 4. Calculate CPA geometry.
 * 5. Classify the result by miss distance.
 */

export function screenConjunction(
  recordA,
  recordB,
  options = {}
) {
  assertSatelliteRecord(recordA, "recordA");
  assertSatelliteRecord(recordB, "recordB");

  if (recordA.noradId === recordB.noradId) {
    throw new RangeError(
      "Cannot screen a satellite against itself."
    );
  }

  const {
    startDate = new Date(),

    lookaheadHours =
      CONJUNCTION_CONFIG.DEFAULT_LOOKAHEAD_HOURS,

    stepSeconds =
      CONJUNCTION_CONFIG.DEFAULT_STEP_SECONDS,

    thresholdKm =
      CONJUNCTION_CONFIG.DEFAULT_SCREENING_DISTANCE_KM
  } = options;

  assertDate(startDate, "startDate");

  assertPositive(
    lookaheadHours,
    "lookaheadHours"
  );

  assertPositive(
    stepSeconds,
    "stepSeconds"
  );

  assertPositive(
    thresholdKm,
    "thresholdKm"
  );

  const durationSeconds =
    lookaheadHours * 3600;

  const sampleCount =
    Math.ceil(
      durationSeconds / stepSeconds
    ) + 1;

  if (
    sampleCount >
    CONJUNCTION_CONFIG.MAX_SAMPLES
  ) {
    throw new RangeError(
      "Requested screening window produces too many samples."
    );
  }

  let minimumSample = null;
  let previousSample = null;
  let sampleIndex = 0;

  for (
    let seconds = 0;
    seconds <= durationSeconds;
    seconds += stepSeconds
  ) {
    const sampleDate =
      new Date(
        startDate.getTime() +
        seconds *
        TIME.MILLISECONDS_PER_SECOND
      );

    const sample =
      calculatePairDistance(
        recordA,
        recordB,
        sampleDate
      );

    sample.secondsFromStart =
      seconds;

    sample.index =
      sampleIndex;

    if (
      !minimumSample ||
      sample.distanceKm <
        minimumSample.distanceKm
    ) {
      minimumSample =
        sample;
    }

    previousSample = sample;
    sampleIndex += 1;
  }

  if (!minimumSample) {
    throw new Error(
      "No valid conjunction samples were generated."
    );
  }

  const lowerSeconds =
    Math.max(
      0,
      minimumSample.secondsFromStart -
      stepSeconds
    );

  const upperSeconds =
    Math.min(
      durationSeconds,
      minimumSample.secondsFromStart +
      stepSeconds
    );

  let refined;

  if (upperSeconds > lowerSeconds) {
    refined =
      refineClosestApproach(
        recordA,
        recordB,
        startDate,
        lowerSeconds,
        upperSeconds
      );
  } else {
    refined = {
      ...minimumSample,

      secondsFromStart:
        minimumSample.secondsFromStart,

      method: "SAMPLED_BOUNDARY"
    };
  }

  const relative =
    calculateRelativeState(
      refined.stateA,
      refined.stateB
    );

  const geometry =
    calculateEncounterGeometry(
      relative.position,
      relative.velocity
    );

  const missDistanceKm =
    refined.distanceKm;

  const missDistanceMeters =
    missDistanceKm * 1000;

  const risk =
    classifyDistance(
      missDistanceMeters
    );

  const withinThreshold =
    missDistanceKm <= thresholdKm;

  return {
    id: createConjunctionId(
      recordA.noradId,
      recordB.noradId,
      refined.date
    ),

    primaryObject:
      recordA.noradId,

    secondaryObject:
      recordB.noradId,

    tca: refined.date.toISOString(),

    secondsFromStart:
      refined.secondsFromStart,

    missDistanceKm,

    missDistanceMeters,

    relativeSpeedKmS:
      relative.relativeSpeedKmS,

    relativeSpeedMetersS:
      relative.relativeSpeedKmS * 1000,

    relativePosition:
      relative.position,

    relativeVelocity:
      relative.velocity,

    encounterGeometry:
      geometry,

    risk,

    withinThreshold,

    screening: {
      sampleCount,

      stepSeconds,

      lookaheadHours,

      thresholdKm,

      refinementMethod:
        refined.method,

      refinementIterations:
        refined.iterations ?? 0
    },

    limitations: [
      "Deterministic screening only.",
      "No covariance propagation.",
      "No probability of collision calculation.",
      "Results depend on TLE quality and epoch."
    ]
  };
}

// ============================================================
// 10. DISTANCE CLASSIFICATION
// ============================================================

export function classifyDistance(distanceMeters) {
  assertFinite(
    distanceMeters,
    "distanceMeters"
  );

  if (distanceMeters < 0) {
    throw new RangeError(
      "Distance cannot be negative."
    );
  }

  if (
    distanceMeters <=
    CONJUNCTION_RISK.CRITICAL.MAX_DISTANCE_M
  ) {
    return {
      level: "CRITICAL",
      label: "Critical",
      color:
        CONJUNCTION_RISK.CRITICAL.COLOR
    };
  }

  if (
    distanceMeters <=
    CONJUNCTION_RISK.HIGH.MAX_DISTANCE_M
  ) {
    return {
      level: "HIGH",
      label: "High",
      color:
        CONJUNCTION_RISK.HIGH.COLOR
    };
  }

  if (
    distanceMeters <=
    CONJUNCTION_RISK.MODERATE.MAX_DISTANCE_M
  ) {
    return {
      level: "MODERATE",
      label: "Moderate",
      color:
        CONJUNCTION_RISK.MODERATE.COLOR
    };
  }

  if (
    distanceMeters <=
    CONJUNCTION_RISK.LOW.MAX_DISTANCE_M
  ) {
    return {
      level: "LOW",
      label: "Low",
      color:
        CONJUNCTION_RISK.LOW.COLOR
    };
  }

  return {
    level: "INFORMATIONAL",
    label: "Informational",
    color:
      CONJUNCTION_RISK.INFORMATIONAL.COLOR
  };
}

// ============================================================
// 11. CONJUNCTION IDENTIFIER
// ============================================================

function createConjunctionId(
  noradA,
  noradB,
  date
) {
  const orderedIds = [
    noradA,
    noradB
  ].sort((a, b) => a - b);

  return [
    orderedIds[0],
    orderedIds[1],
    date.getTime()
  ].join("-");
}

// ============================================================
// 12. MULTI-OBJECT SCREENING
// ============================================================

/**
 * Screens every unique pair in a catalog.
 *
 * Complexity:
 * O(N² × S)
 *
 * This is computationally expensive for large catalogs.
 * Large-scale screening should be moved to Web Workers
 * and use spatial pre-filtering.
 */

export function screenCatalogConjunctions(
  satelliteRecords,
  options = {}
) {
  if (!Array.isArray(satelliteRecords)) {
    throw new TypeError(
      "satelliteRecords must be an array."
    );
  }

  if (
    satelliteRecords.length >
    CONJUNCTION_CONFIG.MAX_OBJECTS_PER_SCAN
  ) {
    throw new RangeError(
      "Catalog exceeds the configured screening limit."
    );
  }

  const startDate =
    options.startDate ?? new Date();

  assertDate(startDate, "startDate");

  const {
    thresholdKm =
      CONJUNCTION_CONFIG.DEFAULT_SCREENING_DISTANCE_KM
  } = options;

  assertPositive(
    thresholdKm,
    "thresholdKm"
  );

  const events = [];
  const failures = [];

  let pairsEvaluated = 0;

  for (
    let i = 0;
    i < satelliteRecords.length;
    i += 1
  ) {
    for (
      let j = i + 1;
      j < satelliteRecords.length;
      j += 1
    ) {
      const recordA =
        satelliteRecords[i];

      const recordB =
        satelliteRecords[j];

      try {
        const result =
          screenConjunction(
            recordA,
            recordB,
            options
          );

        pairsEvaluated += 1;

        if (result.withinThreshold) {
          events.push(result);
        }
      } catch (error) {
        failures.push({
          primaryObject:
            recordA?.noradId ?? null,

          secondaryObject:
            recordB?.noradId ?? null,

          message:
            error.message,

          code:
            error.code ?? "SCREENING_ERROR"
        });
      }
    }
  }

  events.sort(
    (a, b) =>
      a.missDistanceKm -
      b.missDistanceKm
  );

  return {
    generatedAt:
      new Date().toISOString(),

    startDate:
      startDate.toISOString(),

    totalObjects:
      satelliteRecords.length,

    totalPossiblePairs:
      (
        satelliteRecords.length *
        (satelliteRecords.length - 1)
      ) / 2,

    pairsEvaluated,

    eventCount:
      events.length,

    failureCount:
      failures.length,

    events,

    failures,

    limitations: [
      "Pairwise deterministic screening.",
      "No spatial index or broad-phase filtering.",
      "No covariance propagation.",
      "No collision probability calculation.",
      "Not an operational conjunction assessment product."
    ]
  };
}

// ============================================================
// 13. CONJUNCTION SUMMARY
// ============================================================

export function summarizeConjunction(event) {
  if (!event || typeof event !== "object") {
    throw new TypeError(
      "A conjunction event is required."
    );
  }

  return {
    id: event.id,

    objects: [
      event.primaryObject,
      event.secondaryObject
    ],

    tca: event.tca,

    missDistanceKm:
      event.missDistanceKm,

    missDistanceMeters:
      event.missDistanceMeters,

    relativeSpeedKmS:
      event.relativeSpeedKmS,

    risk:
      event.risk,

    withinThreshold:
      event.withinThreshold
  };
}

// ============================================================
// 14. CONJUNCTION STATISTICS
// ============================================================

export function calculateConjunctionStatistics(
  events
) {
  if (!Array.isArray(events)) {
    throw new TypeError(
      "Events must be an array."
    );
  }

  const counts = {
    CRITICAL: 0,
    HIGH: 0,
    MODERATE: 0,
    LOW: 0,
    INFORMATIONAL: 0
  };

  let minimumDistanceKm =
    Infinity;

  let maximumRelativeSpeedKmS = 0;

  for (const event of events) {
    const level =
      event?.risk?.level;

    if (level in counts) {
      counts[level] += 1;
    }

    if (
      Number.isFinite(event.missDistanceKm)
    ) {
      minimumDistanceKm =
        Math.min(
          minimumDistanceKm,
          event.missDistanceKm
        );
    }

    if (
      Number.isFinite(event.relativeSpeedKmS)
    ) {
      maximumRelativeSpeedKmS =
        Math.max(
          maximumRelativeSpeedKmS,
          event.relativeSpeedKmS
        );
    }
  }

  return {
    totalEvents:
      events.length,

    riskCounts:
      counts,

    minimumDistanceKm:
      events.length
        ? minimumDistanceKm
        : null,

    maximumRelativeSpeedKmS
  };
}

// ============================================================
// 15. ENGINE INFORMATION
// ============================================================

export function getConjunctionEngineInfo() {
  return Object.freeze({
    name: "ORBITAL CONJUNCTION ANALYSIS",

    version: "1.0.0",

    methods: [
      "SGP4 propagation",
      "Pairwise distance screening",
      "Golden-section CPA refinement",
      "Relative velocity analysis"
    ],

    supportedFrames: [
      "ECI"
    ],

    positionUnit: "km",

    velocityUnit: "km/s",

    probabilityOfCollision: false,

    covariancePropagation: false,

    operationalCertification: false
  });
}

// ============================================================
// 16. MODULE EXPORT
// ============================================================

export const ConjunctionEngine = Object.freeze({
  calculateRelativeState,

  calculateLinearClosestApproach,

  calculateEncounterGeometry,

  refineClosestApproach,

  screenConjunction,

  classifyDistance,

  screenCatalogConjunctions,

  summarizeConjunction,

  calculateConjunctionStatistics,

  getConjunctionEngineInfo
});