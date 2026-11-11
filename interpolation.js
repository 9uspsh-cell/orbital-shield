/**
 * ORBITAL SHIELD
 * Orbital State Interpolation
 *
 * Provides:
 * - Linear position interpolation
 * - Cubic Hermite position interpolation
 * - Velocity interpolation
 * - State interpolation
 * - Timeline sampling
 * - Input validation
 *
 * Units:
 * Position: km
 * Velocity: km/s
 * Time: seconds
 *
 * Important:
 * Interpolation is intended for visualization between
 * propagated states. It does not replace SGP4 propagation.
 */

const INTERPOLATION_CONFIG = Object.freeze({
  MIN_INTERVAL_SECONDS: 0.000001,

  MAX_INTERVAL_SECONDS: 86400,

  DEFAULT_METHOD: "hermite",

  POSITION_TOLERANCE_KM: 0.000001,

  VELOCITY_TOLERANCE_KM_S: 0.000000001,

  MAX_EXTRAPOLATION_SECONDS: 0
});

export const INTERPOLATION_METHODS = Object.freeze({
  LINEAR: "linear",

  HERMITE: "hermite"
});

export class InterpolationError extends Error {
  constructor(message, code = "INTERPOLATION_ERROR", cause = null) {
    super(message);

    this.name = "InterpolationError";

    this.code = code;

    if (cause) {
      this.cause = cause;
    }
  }
}

/* -------------------------------------------------------
   Validation
------------------------------------------------------- */

function assertFiniteNumber(value, name) {
  if (!Number.isFinite(value)) {
    throw new InterpolationError(
      `${name} must be a finite number.`,
      "INVALID_NUMERIC_VALUE"
    );
  }
}

function normalizeVector(vector, name) {
  if (
    !vector ||
    typeof vector !== "object" ||
    !Number.isFinite(vector.x) ||
    !Number.isFinite(vector.y) ||
    !Number.isFinite(vector.z)
  ) {
    throw new InterpolationError(
      `${name} must contain finite x, y and z components.`,
      "INVALID_VECTOR"
    );
  }

  return {
    x: vector.x,
    y: vector.y,
    z: vector.z
  };
}

function normalizeState(state, name = "state") {
  if (!state || typeof state !== "object") {
    throw new InterpolationError(
      `${name} is required.`,
      "INVALID_STATE"
    );
  }

  const position = normalizeVector(
    state.position,
    `${name}.position`
  );

  const velocity = state.velocity
    ? normalizeVector(
        state.velocity,
        `${name}.velocity`
      )
    : null;

  const timestamp = normalizeTimestamp(
    state.timestamp ?? state.time ?? state.date
  );

  return {
    ...state,

    position,

    velocity,

    timestamp
  };
}

function normalizeTimestamp(value) {
  if (value instanceof Date) {
    const result = value.getTime();

    assertFiniteNumber(result, "timestamp");

    return result / 1000;
  }

  if (typeof value === "string") {
    const result = new Date(value).getTime();

    if (!Number.isFinite(result)) {
      throw new InterpolationError(
        "Invalid timestamp string.",
        "INVALID_TIMESTAMP"
      );
    }

    return result / 1000;
  }

  assertFiniteNumber(value, "timestamp");

  return value;
}

function normalizeMethod(method) {
  const selected = method ||
    INTERPOLATION_CONFIG.DEFAULT_METHOD;

  if (
    !Object.values(INTERPOLATION_METHODS).includes(selected)
  ) {
    throw new InterpolationError(
      `Unsupported interpolation method: ${selected}`,
      "UNSUPPORTED_METHOD"
    );
  }

  return selected;
}

/* -------------------------------------------------------
   Vector Operations
------------------------------------------------------- */

export const vectorMath = Object.freeze({

  add(a, b) {
    return {
      x: a.x + b.x,
      y: a.y + b.y,
      z: a.z + b.z
    };
  },

  subtract(a, b) {
    return {
      x: a.x - b.x,
      y: a.y - b.y,
      z: a.z - b.z
    };
  },

  scale(vector, scalar) {
    return {
      x: vector.x * scalar,
      y: vector.y * scalar,
      z: vector.z * scalar
    };
  },

  magnitude(vector) {
    return Math.sqrt(
      vector.x * vector.x +
      vector.y * vector.y +
      vector.z * vector.z
    );
  },

  distance(a, b) {
    return this.magnitude(
      this.subtract(a, b)
    );
  },

  dot(a, b) {
    return (
      a.x * b.x +
      a.y * b.y +
      a.z * b.z
    );
  },

  normalize(vector) {
    const magnitude = this.magnitude(vector);

    if (magnitude === 0) {
      return {
        x: 0,
        y: 0,
        z: 0
      };
    }

    return this.scale(
      vector,
      1 / magnitude
    );
  }

});

/* -------------------------------------------------------
   Interval Calculation
------------------------------------------------------- */

function calculateInterpolationParameter(
  startTime,
  endTime,
  targetTime,
  options = {}
) {
  const interval = endTime - startTime;

  if (
    interval < INTERPOLATION_CONFIG.MIN_INTERVAL_SECONDS ||
    interval > INTERPOLATION_CONFIG.MAX_INTERVAL_SECONDS
  ) {
    throw new InterpolationError(
      "Interpolation interval is outside the supported range.",
      "INVALID_INTERPOLATION_INTERVAL"
    );
  }

  const offset = targetTime - startTime;

  const allowExtrapolation =
    options.allowExtrapolation === true;

  if (!allowExtrapolation) {
    const tolerance = 1e-9;

    if (
      offset < -tolerance ||
      offset > interval + tolerance
    ) {
      throw new InterpolationError(
        "Target time is outside the available state interval.",
        "TIME_OUTSIDE_INTERVAL"
      );
    }
  }

  const clampedOffset = Math.min(
    interval,
    Math.max(0, offset)
  );

  return {
    interval,

    offset: clampedOffset,

    t: clampedOffset / interval
  };
}

/* -------------------------------------------------------
   Linear Interpolation
------------------------------------------------------- */

export function interpolateLinear(
  start,
  end,
  t
) {
  assertFiniteNumber(t, "interpolation parameter");

  const a = normalizeVector(start, "start");

  const b = normalizeVector(end, "end");

  return {
    x: a.x + (b.x - a.x) * t,

    y: a.y + (b.y - a.y) * t,

    z: a.z + (b.z - a.z) * t
  };
}

/* -------------------------------------------------------
   Cubic Hermite Interpolation
------------------------------------------------------- */

/**
 * Cubic Hermite interpolation.
 *
 * p0, p1: endpoint positions in km
 * v0, v1: endpoint velocities in km/s
 * duration: interval duration in seconds
 * t: normalized parameter [0, 1]
 */

export function interpolateHermite(
  p0,
  v0,
  p1,
  v1,
  duration,
  t
) {
  const startPosition = normalizeVector(
    p0,
    "start position"
  );

  const startVelocity = normalizeVector(
    v0,
    "start velocity"
  );

  const endPosition = normalizeVector(
    p1,
    "end position"
  );

  const endVelocity = normalizeVector(
    v1,
    "end velocity"
  );

  assertFiniteNumber(duration, "duration");

  assertFiniteNumber(t, "interpolation parameter");

  if (duration <= 0) {
    throw new InterpolationError(
      "Hermite duration must be positive.",
      "INVALID_HERMITE_DURATION"
    );
  }

  const t2 = t * t;

  const t3 = t2 * t;

  const h00 = 2 * t3 - 3 * t2 + 1;

  const h10 = t3 - 2 * t2 + t;

  const h01 = -2 * t3 + 3 * t2;

  const h11 = t3 - t2;

  const startVelocityScaled = vectorMath.scale(
    startVelocity,
    duration
  );

  const endVelocityScaled = vectorMath.scale(
    endVelocity,
    duration
  );

  return {
    x:
      h00 * startPosition.x +
      h10 * startVelocityScaled.x +
      h01 * endPosition.x +
      h11 * endVelocityScaled.x,

    y:
      h00 * startPosition.y +
      h10 * startVelocityScaled.y +
      h01 * endPosition.y +
      h11 * endVelocityScaled.y,

    z:
      h00 * startPosition.z +
      h10 * startVelocityScaled.z +
      h01 * endPosition.z +
      h11 * endVelocityScaled.z
  };
}

/* -------------------------------------------------------
   Hermite Velocity Interpolation
------------------------------------------------------- */

/**
 * Derivative of the cubic Hermite position polynomial.
 *
 * Returns velocity in km/s.
 */

export function interpolateHermiteVelocity(
  p0,
  v0,
  p1,
  v1,
  duration,
  t
) {
  const startPosition = normalizeVector(
    p0,
    "start position"
  );

  const startVelocity = normalizeVector(
    v0,
    "start velocity"
  );

  const endPosition = normalizeVector(
    p1,
    "end position"
  );

  const endVelocity = normalizeVector(
    v1,
    "end velocity"
  );

  assertFiniteNumber(duration, "duration");

  assertFiniteNumber(t, "interpolation parameter");

  if (duration <= 0) {
    throw new InterpolationError(
      "Velocity interpolation duration must be positive.",
      "INVALID_HERMITE_DURATION"
    );
  }

  const t2 = t * t;

  const dh00 = 6 * t2 - 6 * t;

  const dh10 = 3 * t2 - 4 * t + 1;

  const dh01 = -6 * t2 + 6 * t;

  const dh11 = 3 * t2 - 2 * t;

  return {
    x:
      (
        dh00 * startPosition.x +
        dh01 * endPosition.x
      ) / duration +
      dh10 * startVelocity.x +
      dh11 * endVelocity.x,

    y:
      (
        dh00 * startPosition.y +
        dh01 * endPosition.y
      ) / duration +
      dh10 * startVelocity.y +
      dh11 * endVelocity.y,

    z:
      (
        dh00 * startPosition.z +
        dh01 * endPosition.z
      ) / duration +
      dh10 * startVelocity.z +
      dh11 * endVelocity.z
  };
}

/* -------------------------------------------------------
   State Interpolation
------------------------------------------------------- */

export function interpolateState(
  startState,
  endState,
  targetTime,
  options = {}
) {
  const start = normalizeState(
    startState,
    "startState"
  );

  const end = normalizeState(
    endState,
    "endState"
  );

  const target = normalizeTimestamp(targetTime);

  if (end.timestamp <= start.timestamp) {
    throw new InterpolationError(
      "End state must be later than start state.",
      "INVALID_STATE_ORDER"
    );
  }

  const parameter = calculateInterpolationParameter(
    start.timestamp,
    end.timestamp,
    target,
    options
  );

  const method = normalizeMethod(options.method);

  const {
    interval,
    t
  } = parameter;

  let position;

  let velocity;

  if (
    method === INTERPOLATION_METHODS.HERMITE &&
    start.velocity &&
    end.velocity
  ) {
    position = interpolateHermite(
      start.position,
      start.velocity,
      end.position,
      end.velocity,
      interval,
      t
    );

    velocity = interpolateHermiteVelocity(
      start.position,
      start.velocity,
      end.position,
      end.velocity,
      interval,
      t
    );
  } else {
    position = interpolateLinear(
      start.position,
      end.position,
      t
    );

    velocity = start.velocity && end.velocity
      ? interpolateLinear(
          start.velocity,
          end.velocity,
          t
        )
      : null;
  }

  return {
    ...start,

    position,

    velocity,

    timestamp: target,

    date: new Date(target * 1000),

    interpolation: {
      method:
        method === INTERPOLATION_METHODS.HERMITE &&
        start.velocity &&
        end.velocity
          ? INTERPOLATION_METHODS.HERMITE
          : INTERPOLATION_METHODS.LINEAR,

      parameter: t,

      intervalSeconds: interval,

      interpolated: true
    }
  };
}

/* -------------------------------------------------------
   Timeline Interpolation
------------------------------------------------------- */

export function interpolateTimeline(
  states,
  targetTime,
  options = {}
) {
  if (!Array.isArray(states) || states.length < 2) {
    throw new InterpolationError(
      "Timeline requires at least two states.",
      "INSUFFICIENT_TIMELINE_STATES"
    );
  }

  const normalized = states
    .map((state) => normalizeState(state))
    .sort((a, b) => a.timestamp - b.timestamp);

  const target = normalizeTimestamp(targetTime);

  if (
    target < normalized[0].timestamp ||
    target > normalized[normalized.length - 1].timestamp
  ) {
    throw new InterpolationError(
      "Target time is outside the timeline.",
      "TIME_OUTSIDE_TIMELINE"
    );
  }

  let low = 0;

  let high = normalized.length - 1;

  while (low <= high) {
    const middle = Math.floor(
      (low + high) / 2
    );

    const current = normalized[middle];

    if (current.timestamp === target) {
      return {
        ...current,

        date: new Date(target * 1000),

        interpolation: {
          method: "exact",

          interpolated: false,

          parameter: 0
        }
      };
    }

    if (current.timestamp < target) {
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }

  const start = normalized[high];

  const end = normalized[low];

  return interpolateState(
    start,
    end,
    target,
    options
  );
}

/* -------------------------------------------------------
   Multi-Object State Interpolation
------------------------------------------------------- */

export function interpolateObjectStates(
  previousStates,
  nextStates,
  targetTime,
  options = {}
) {
  if (
    !Array.isArray(previousStates) ||
    !Array.isArray(nextStates)
  ) {
    throw new InterpolationError(
      "Object state collections must be arrays.",
      "INVALID_STATE_COLLECTION"
    );
  }

  const previousById = new Map();

  for (const state of previousStates) {
    const id = state?.id ?? state?.noradId;

    if (id === undefined || id === null) {
      continue;
    }

    previousById.set(String(id), state);
  }

  const results = [];

  for (const nextState of nextStates) {
    const id = nextState?.id ?? nextState?.noradId;

    if (id === undefined || id === null) {
      continue;
    }

    const previousState = previousById.get(
      String(id)
    );

    if (!previousState) {
      continue;
    }

    try {
      results.push(
        interpolateState(
          previousState,
          nextState,
          targetTime,
          options
        )
      );
    } catch {
      // A failed object interpolation does not invalidate
      // the remaining independently interpolated objects.
    }
  }

  return results;
}

/* -------------------------------------------------------
   Sampling
------------------------------------------------------- */

export function sampleStateInterval(
  startState,
  endState,
  sampleCount = 10,
  options = {}
) {
  const count = Math.floor(sampleCount);

  if (!Number.isFinite(count) || count < 2 || count > 10000) {
    throw new InterpolationError(
      "Sample count must be between 2 and 10000.",
      "INVALID_SAMPLE_COUNT"
    );
  }

  const start = normalizeState(
    startState,
    "startState"
  );

  const end = normalizeState(
    endState,
    "endState"
  );

  const duration = end.timestamp - start.timestamp;

  if (duration <= 0) {
    throw new InterpolationError(
      "Invalid state interval.",
      "INVALID_STATE_INTERVAL"
    );
  }

  const samples = [];

  for (let index = 0; index < count; index += 1) {
    const fraction = index / (count - 1);

    const timestamp =
      start.timestamp + duration * fraction;

    samples.push(
      interpolateState(
        start,
        end,
        timestamp,
        options
      )
    );
  }

  return samples;
}

/* -------------------------------------------------------
   Quality Diagnostics
------------------------------------------------------- */

export function calculateInterpolationDiagnostics(
  startState,
  endState,
  interpolatedState
) {
  const start = normalizeState(startState);

  const end = normalizeState(endState);

  const result = normalizeState(interpolatedState);

  const duration = end.timestamp - start.timestamp;

  if (duration <= 0) {
    throw new InterpolationError(
      "Invalid diagnostic interval.",
      "INVALID_DIAGNOSTIC_INTERVAL"
    );
  }

  const positionDistance = vectorMath.distance(
    start.position,
    end.position
  );

  const interpolatedFromStart = vectorMath.distance(
    start.position,
    result.position
  );

  const interpolatedFromEnd = vectorMath.distance(
    result.position,
    end.position
  );

  const expectedProgress = (
    result.timestamp - start.timestamp
  ) / duration;

  return {
    intervalSeconds: duration,

    positionDistanceKm: positionDistance,

    distanceFromStartKm: interpolatedFromStart,

    distanceFromEndKm: interpolatedFromEnd,

    normalizedProgress: expectedProgress,

    isWithinInterval:
      result.timestamp >= start.timestamp &&
      result.timestamp <= end.timestamp,

    finitePosition:
      Number.isFinite(result.position.x) &&
      Number.isFinite(result.position.y) &&
      Number.isFinite(result.position.z),

    finiteVelocity:
      result.velocity === null ||
      (
        Number.isFinite(result.velocity.x) &&
        Number.isFinite(result.velocity.y) &&
        Number.isFinite(result.velocity.z)
      )
  };
}

/* -------------------------------------------------------
   Public API
------------------------------------------------------- */

export const OrbitalInterpolation = Object.freeze({

  methods: INTERPOLATION_METHODS,

  linear: interpolateLinear,

  hermite: interpolateHermite,

  hermiteVelocity: interpolateHermiteVelocity,

  state: interpolateState,

  timeline: interpolateTimeline,

  objectStates: interpolateObjectStates,

  sample: sampleStateInterval,

  diagnostics: calculateInterpolationDiagnostics

});

export default OrbitalInterpolation;