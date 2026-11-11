/**
 * ORBITAL SHIELD
 * Simulation Controller
 *
 * Central simulation runtime:
 * - Fixed-step simulation clock
 * - Real-time and accelerated time
 * - SGP4 propagation
 * - Frame scheduling
 * - Playback controls
 * - Simulation boundaries
 * - Runtime diagnostics
 * - Event subscriptions
 *
 * Scientific note:
 * SGP4 propagation accuracy depends on TLE quality,
 * epoch age, and the validity of the underlying model.
 */

import {
  propagateBatch,
  propagateFullState
} from "../propagation/sgp4.js";

import {
  SIMULATION
} from "../constants.js";

const DEFAULT_CONFIG = Object.freeze({
  targetFrameRate: 30,

  maxRealDeltaSeconds: 0.25,

  defaultTimeScale: 1,

  minTimeScale: 0.01,

  maxTimeScale: 100000,

  defaultStepSeconds: 1,

  maxObjectsPerFrame: 50000,

  pauseOnError: true,

  emitEveryFrame: true,

  interpolationEnabled: false
});

export const SIMULATION_EVENTS = Object.freeze({
  READY: "ready",
  STARTED: "started",
  PAUSED: "paused",
  RESUMED: "resumed",
  STOPPED: "stopped",
  RESET: "reset",
  FRAME: "frame",
  OBJECTS_UPDATED: "objects-updated",
  TIME_CHANGED: "time-changed",
  COMPLETED: "completed",
  ERROR: "error"
});

export const SIMULATION_STATES = Object.freeze({
  IDLE: "idle",
  READY: "ready",
  RUNNING: "running",
  PAUSED: "paused",
  COMPLETED: "completed",
  ERROR: "error",
  DISPOSED: "disposed"
});

export class SimulationError extends Error {
  constructor(message, code = "SIMULATION_ERROR", cause = null) {
    super(message);

    this.name = "SimulationError";
    this.code = code;

    if (cause) {
      this.cause = cause;
    }
  }
}

function now() {
  if (
    typeof performance !== "undefined" &&
    typeof performance.now === "function"
  ) {
    return performance.now();
  }

  return Date.now();
}

function normalizeDate(value) {
  const date = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new SimulationError(
      "تاريخ المحاكاة غير صالح.",
      "INVALID_SIMULATION_DATE"
    );
  }

  return date;
}

function normalizeTimeScale(value, config) {
  const scale = Number(value);

  if (!Number.isFinite(scale)) {
    throw new SimulationError(
      "معدل الزمن يجب أن يكون رقمًا صالحًا.",
      "INVALID_TIME_SCALE"
    );
  }

  return Math.min(
    config.maxTimeScale,
    Math.max(config.minTimeScale, scale)
  );
}

function createFrameId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `frame-${Date.now()}-${Math.random()}`;
}

function cloneDate(date) {
  return new Date(date.getTime());
}

function normalizeObjectCollection(objects) {
  if (!Array.isArray(objects)) {
    throw new SimulationError(
      "قائمة الأجسام المدارية غير صالحة.",
      "INVALID_OBJECT_COLLECTION"
    );
  }

  if (objects.length > DEFAULT_CONFIG.maxObjectsPerFrame) {
    throw new SimulationError(
      "عدد الأجسام يتجاوز الحد المسموح للمحاكاة.",
      "OBJECT_LIMIT_EXCEEDED"
    );
  }

  return objects;
}

function createRuntimeStatistics() {
  return {
    frameCount: 0,

    successfulPropagations: 0,

    failedPropagations: 0,

    lastFrameDurationMs: 0,

    averageFrameDurationMs: 0,

    maxFrameDurationMs: 0,

    actualFrameRate: 0,

    simulatedSeconds: 0,

    realElapsedSeconds: 0,

    startedAt: null,

    lastFrameAt: null
  };
}

/* -------------------------------------------------------
   Simulation Controller
------------------------------------------------------- */

export class SimulationController {
  constructor(options = {}) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...options
    };

    this.validateConfiguration();

    this.state = SIMULATION_STATES.IDLE;

    this.currentDate = new Date();

    this.startDate = null;

    this.endDate = null;

    this.timeScale = this.config.defaultTimeScale;

    this.stepSeconds = this.config.defaultStepSeconds;

    this.objects = [];

    this.objectStates = new Map();

    this.frame = null;

    this.listeners = new Map();

    this.animationHandle = null;

    this.lastRealTimestamp = null;

    this.lastFrameTimestamp = null;

    this.accumulatedRealSeconds = 0;

    this.accumulatedSimulationSeconds = 0;

    this.statistics = createRuntimeStatistics();

    this.lastError = null;

    this.disposed = false;

    this.frameIntervalMs =
      1000 / this.config.targetFrameRate;

    this.loopBound = this.loop.bind(this);
  }

  /* -----------------------------------------------------
     Configuration
  ----------------------------------------------------- */

  validateConfiguration() {
    const config = this.config;

    if (
      !Number.isFinite(config.targetFrameRate) ||
      config.targetFrameRate < 1 ||
      config.targetFrameRate > 240
    ) {
      throw new SimulationError(
        "معدل الإطارات غير صالح.",
        "INVALID_FRAME_RATE"
      );
    }

    if (
      !Number.isFinite(config.maxRealDeltaSeconds) ||
      config.maxRealDeltaSeconds <= 0
    ) {
      throw new SimulationError(
        "الحد الأقصى لفاصل الزمن الحقيقي غير صالح.",
        "INVALID_DELTA_LIMIT"
      );
    }

    if (
      config.minTimeScale <= 0 ||
      config.maxTimeScale < config.minTimeScale
    ) {
      throw new SimulationError(
        "نطاق تسريع الزمن غير صالح.",
        "INVALID_TIME_SCALE_RANGE"
      );
    }
  }

  assertNotDisposed() {
    if (this.disposed || this.state === SIMULATION_STATES.DISPOSED) {
      throw new SimulationError(
        "تم إغلاق محرك المحاكاة.",
        "SIMULATION_DISPOSED"
      );
    }
  }

  /* -----------------------------------------------------
     Event System
  ----------------------------------------------------- */

  on(eventName, callback) {
    this.assertNotDisposed();

    if (typeof callback !== "function") {
      throw new SimulationError(
        "مستمع الحدث يجب أن يكون دالة.",
        "INVALID_EVENT_LISTENER"
      );
    }

    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, new Set());
    }

    const handlers = this.listeners.get(eventName);

    handlers.add(callback);

    return () => {
      handlers.delete(callback);

      if (handlers.size === 0) {
        this.listeners.delete(eventName);
      }
    };
  }

  once(eventName, callback) {
    const unsubscribe = this.on(
      eventName,
      (payload) => {
        unsubscribe();

        callback(payload);
      }
    );

    return unsubscribe;
  }

  emit(eventName, payload = {}) {
    const handlers = this.listeners.get(eventName);

    if (!handlers || handlers.size === 0) {
      return;
    }

    for (const callback of [...handlers]) {
      try {
        callback(payload);
      } catch (error) {
        console.error(
          "[ORBITAL SHIELD] Simulation event listener error:",
          error
        );
      }
    }
  }

  removeAllListeners(eventName = null) {
    if (eventName) {
      this.listeners.delete(eventName);
      return;
    }

    this.listeners.clear();
  }

  /* -----------------------------------------------------
     Initialization
  ----------------------------------------------------- */

  initialize(options = {}) {
    this.assertNotDisposed();

    if (
      this.state === SIMULATION_STATES.RUNNING
    ) {
      throw new SimulationError(
        "لا يمكن إعادة تهيئة المحاكاة أثناء التشغيل.",
        "SIMULATION_ALREADY_RUNNING"
      );
    }

    const date = normalizeDate(
      options.startDate || new Date()
    );

    const endDate = options.endDate
      ? normalizeDate(options.endDate)
      : null;

    if (
      endDate &&
      endDate.getTime() <= date.getTime()
    ) {
      throw new SimulationError(
        "تاريخ نهاية المحاكاة يجب أن يكون بعد تاريخ البداية.",
        "INVALID_SIMULATION_RANGE"
      );
    }

    this.stopAnimationLoop();

    this.startDate = cloneDate(date);

    this.currentDate = cloneDate(date);

    this.endDate = endDate;

    this.timeScale = normalizeTimeScale(
      options.timeScale ?? this.config.defaultTimeScale,
      this.config
    );

    this.stepSeconds = Number(
      options.stepSeconds ?? this.config.defaultStepSeconds
    );

    if (
      !Number.isFinite(this.stepSeconds) ||
      this.stepSeconds <= 0
    ) {
      throw new SimulationError(
        "الخطوة الزمنية يجب أن تكون أكبر من صفر.",
        "INVALID_STEP_SIZE"
      );
    }

    if (options.objects !== undefined) {
      this.setObjects(options.objects);
    }

    this.objectStates.clear();

    this.accumulatedRealSeconds = 0;

    this.accumulatedSimulationSeconds = 0;

    this.lastRealTimestamp = null;

    this.lastFrameTimestamp = null;

    this.lastError = null;

    this.statistics = createRuntimeStatistics();

    this.state = SIMULATION_STATES.READY;

    this.emit(SIMULATION_EVENTS.READY, {
      currentDate: cloneDate(this.currentDate),

      objectCount: this.objects.length
    });

    return this.getSnapshot();
  }

  /* -----------------------------------------------------
     Object Management
  ----------------------------------------------------- */

  setObjects(objects) {
    this.assertNotDisposed();

    const collection = normalizeObjectCollection(objects);

    const ids = new Set();

    for (const object of collection) {
      if (!object || typeof object !== "object") {
        throw new SimulationError(
          "تحتوي قائمة الأجسام على سجل غير صالح.",
          "INVALID_OBJECT_RECORD"
        );
      }

      const id = object.id ?? object.noradId;

      if (id === undefined || id === null) {
        throw new SimulationError(
          "أحد الأجسام لا يحتوي على معرف.",
          "OBJECT_ID_MISSING"
        );
      }

      const normalizedId = String(id);

      if (ids.has(normalizedId)) {
        throw new SimulationError(
          `معرف الجسم مكرر: ${normalizedId}`,
          "DUPLICATE_OBJECT_ID"
        );
      }

      ids.add(normalizedId);
    }

    this.objects = [...collection];

    const validIds = new Set(
      this.objects.map((object) =>
        String(object.id ?? object.noradId)
      )
    );

    for (const id of this.objectStates.keys()) {
      if (!validIds.has(id)) {
        this.objectStates.delete(id);
      }
    }

    return this.objects.length;
  }

  addObject(object) {
    this.assertNotDisposed();

    const id = String(object?.id ?? object?.noradId ?? "");

    if (!id) {
      throw new SimulationError(
        "معرف الجسم غير صالح.",
        "OBJECT_ID_MISSING"
      );
    }

    const exists = this.objects.some(
      (item) =>
        String(item.id ?? item.noradId) === id
    );

    if (exists) {
      throw new SimulationError(
        "الجسم موجود مسبقًا في المحاكاة.",
        "OBJECT_ALREADY_EXISTS"
      );
    }

    this.setObjects([
      ...this.objects,
      object
    ]);

    return object;
  }

  removeObject(id) {
    this.assertNotDisposed();

    const normalizedId = String(id);

    const previousCount = this.objects.length;

    this.objects = this.objects.filter(
      (object) =>
        String(object.id ?? object.noradId) !== normalizedId
    );

    this.objectStates.delete(normalizedId);

    return this.objects.length !== previousCount;
  }

  /* -----------------------------------------------------
     Playback Controls
  ----------------------------------------------------- */

  start() {
    this.assertNotDisposed();

    if (this.state === SIMULATION_STATES.RUNNING) {
      return false;
    }

    if (this.state === SIMULATION_STATES.IDLE) {
      this.initialize({
        startDate: new Date(),
        objects: this.objects
      });
    }

    if (this.state === SIMULATION_STATES.COMPLETED) {
      this.reset();
    }

    this.state = SIMULATION_STATES.RUNNING;

    this.lastRealTimestamp = null;

    this.statistics.startedAt ??= new Date().toISOString();

    this.startAnimationLoop();

    this.emit(SIMULATION_EVENTS.STARTED, {
      currentDate: cloneDate(this.currentDate),

      timeScale: this.timeScale
    });

    return true;
  }

  pause() {
    this.assertNotDisposed();

    if (this.state !== SIMULATION_STATES.RUNNING) {
      return false;
    }

    this.state = SIMULATION_STATES.PAUSED;

    this.stopAnimationLoop();

    this.emit(SIMULATION_EVENTS.PAUSED, {
      currentDate: cloneDate(this.currentDate)
    });

    return true;
  }

  resume() {
    this.assertNotDisposed();

    if (this.state !== SIMULATION_STATES.PAUSED) {
      return false;
    }

    this.state = SIMULATION_STATES.RUNNING;

    this.lastRealTimestamp = null;

    this.startAnimationLoop();

    this.emit(SIMULATION_EVENTS.RESUMED, {
      currentDate: cloneDate(this.currentDate)
    });

    return true;
  }

  stop() {
    this.assertNotDisposed();

    this.stopAnimationLoop();

    this.state = SIMULATION_STATES.READY;

    this.lastRealTimestamp = null;

    this.lastFrameTimestamp = null;

    this.emit(SIMULATION_EVENTS.STOPPED, {
      currentDate: cloneDate(this.currentDate)
    });

    return true;
  }

  reset() {
    this.assertNotDisposed();

    this.stopAnimationLoop();

    if (this.startDate) {
      this.currentDate = cloneDate(this.startDate);
    }

    this.accumulatedRealSeconds = 0;

    this.accumulatedSimulationSeconds = 0;

    this.lastRealTimestamp = null;

    this.lastFrameTimestamp = null;

    this.objectStates.clear();

    this.statistics = createRuntimeStatistics();

    this.state = SIMULATION_STATES.READY;

    this.emit(SIMULATION_EVENTS.RESET, {
      currentDate: cloneDate(this.currentDate)
    });

    return this.getSnapshot();
  }

  /* -----------------------------------------------------
     Time Controls
  ----------------------------------------------------- */

  setTimeScale(value) {
    this.assertNotDisposed();

    this.timeScale = normalizeTimeScale(
      value,
      this.config
    );

    this.emit(SIMULATION_EVENTS.TIME_CHANGED, {
      currentDate: cloneDate(this.currentDate),

      timeScale: this.timeScale
    });

    return this.timeScale;
  }

  setStepSeconds(value) {
    this.assertNotDisposed();

    const step = Number(value);

    if (!Number.isFinite(step) || step <= 0) {
      throw new SimulationError(
        "الخطوة الزمنية غير صالحة.",
        "INVALID_STEP_SIZE"
      );
    }

    this.stepSeconds = step;

    return this.stepSeconds;
  }

  seek(date) {
    this.assertNotDisposed();

    if (this.state === SIMULATION_STATES.RUNNING) {
      throw new SimulationError(
        "أوقف المحاكاة مؤقتًا قبل الانتقال إلى تاريخ آخر.",
        "SEEK_WHILE_RUNNING"
      );
    }

    const target = normalizeDate(date);

    if (
      this.startDate &&
      target.getTime() < this.startDate.getTime()
    ) {
      throw new SimulationError(
        "التاريخ المطلوب يسبق بداية المحاكاة.",
        "SEEK_BEFORE_START"
      );
    }

    if (
      this.endDate &&
      target.getTime() > this.endDate.getTime()
    ) {
      throw new SimulationError(
        "التاريخ المطلوب يتجاوز نهاية المحاكاة.",
        "SEEK_AFTER_END"
      );
    }

    this.currentDate = target;

    this.objectStates.clear();

    this.emit(SIMULATION_EVENTS.TIME_CHANGED, {
      currentDate: cloneDate(this.currentDate)
    });

    return this.currentDate;
  }

  advanceBy(seconds) {
    this.assertNotDisposed();

    if (this.state === SIMULATION_STATES.RUNNING) {
      throw new SimulationError(
        "لا يمكن تقديم الزمن يدويًا أثناء التشغيل.",
        "MANUAL_ADVANCE_WHILE_RUNNING"
      );
    }

    const duration = Number(seconds);

    if (!Number.isFinite(duration)) {
      throw new SimulationError(
        "المدة الزمنية غير صالحة.",
        "INVALID_ADVANCE_DURATION"
      );
    }

    let nextDate = new Date(
      this.currentDate.getTime() +
      duration * 1000
    );

    if (this.startDate && nextDate < this.startDate) {
      nextDate = cloneDate(this.startDate);
    }

    if (this.endDate && nextDate > this.endDate) {
      nextDate = cloneDate(this.endDate);
    }

    this.currentDate = nextDate;

    this.objectStates.clear();

    this.emit(SIMULATION_EVENTS.TIME_CHANGED, {
      currentDate: cloneDate(this.currentDate)
    });

    return this.currentDate;
  }

  /* -----------------------------------------------------
     Animation Loop
  ----------------------------------------------------- */

  startAnimationLoop() {
    if (this.animationHandle !== null) {
      return;
    }

    if (
      typeof requestAnimationFrame !== "function"
    ) {
      throw new SimulationError(
        "واجهة requestAnimationFrame غير متاحة.",
        "ANIMATION_FRAME_UNAVAILABLE"
      );
    }

    this.animationHandle = requestAnimationFrame(
      this.loopBound
    );
  }

  stopAnimationLoop() {
    if (this.animationHandle !== null) {
      if (
        typeof cancelAnimationFrame === "function"
      ) {
        cancelAnimationFrame(this.animationHandle);
      }

      this.animationHandle = null;
    }
  }

  loop(timestamp) {
    this.animationHandle = null;

    if (
      this.disposed ||
      this.state !== SIMULATION_STATES.RUNNING
    ) {
      return;
    }

    if (this.lastRealTimestamp === null) {
      this.lastRealTimestamp = timestamp;
    }

    const realDeltaSeconds = Math.min(
      Math.max(
        0,
        (timestamp - this.lastRealTimestamp) / 1000
      ),
      this.config.maxRealDeltaSeconds
    );

    this.lastRealTimestamp = timestamp;

    this.accumulatedRealSeconds += realDeltaSeconds;

    this.accumulatedSimulationSeconds +=
      realDeltaSeconds * this.timeScale;

    try {
      this.updateSimulation(
        realDeltaSeconds,
        timestamp
      );
    } catch (error) {
      this.handleError(error);

      if (this.config.pauseOnError) {
        this.pause();
        return;
      }
    }

    if (
      this.state === SIMULATION_STATES.RUNNING
    ) {
      const elapsedSinceFrame =
        timestamp - (this.lastFrameTimestamp ?? 0);

      if (
        this.lastFrameTimestamp === null ||
        elapsedSinceFrame >= this.frameIntervalMs
      ) {
        this.lastFrameTimestamp = timestamp;
      }

      this.animationHandle = requestAnimationFrame(
        this.loopBound
      );
    }
  }

  /* -----------------------------------------------------
     Simulation Update
  ----------------------------------------------------- */

  updateSimulation(realDeltaSeconds, timestamp = now()) {
    this.assertNotDisposed();

    if (
      this.state !== SIMULATION_STATES.RUNNING
    ) {
      return null;
    }

    const simulationDelta =
      realDeltaSeconds * this.timeScale;

    if (simulationDelta <= 0) {
      return null;
    }

    const frameStartedAt = now();

    let nextDate = new Date(
      this.currentDate.getTime() +
      simulationDelta * 1000
    );

    let completed = false;

    if (
      this.endDate &&
      nextDate.getTime() >= this.endDate.getTime()
    ) {
      nextDate = cloneDate(this.endDate);

      completed = true;
    }

    this.currentDate = nextDate;

    const propagation = this.propagateObjects(
      this.currentDate
    );

    const frameDuration = now() - frameStartedAt;

    this.updateStatistics(
      frameDuration,
      realDeltaSeconds,
      simulationDelta,
      propagation
    );

    const frame = {
      id: createFrameId(),

      timestamp: timestamp,

      currentDate: cloneDate(this.currentDate),

      simulationDeltaSeconds: simulationDelta,

      realDeltaSeconds,

      timeScale: this.timeScale,

      objectCount: this.objects.length,

      successfulCount: propagation.successfulCount,

      failedCount: propagation.failedCount,

      states: propagation.states,

      durationMs: frameDuration
    };

    this.frame = frame;

    if (this.config.emitEveryFrame) {
      this.emit(SIMULATION_EVENTS.FRAME, frame);
    }

    this.emit(SIMULATION_EVENTS.OBJECTS_UPDATED, {
      states: propagation.states,

      successfulCount: propagation.successfulCount,

      failedCount: propagation.failedCount
    });

    if (completed) {
      this.state = SIMULATION_STATES.COMPLETED;

      this.stopAnimationLoop();

      this.emit(SIMULATION_EVENTS.COMPLETED, {
        currentDate: cloneDate(this.currentDate),

        statistics: this.getStatistics()
      });
    }

    return frame;
  }

  /* -----------------------------------------------------
     SGP4 Propagation
  ----------------------------------------------------- */

  propagateObjects(date) {
    const validObjects = [];

    for (const object of this.objects) {
      if (
        object.line1 &&
        object.line2
      ) {
        validObjects.push(object);
      } else if (
        object.tle?.line1 &&
        object.tle?.line2
      ) {
        validObjects.push({
          ...object,
          line1: object.tle.line1,
          line2: object.tle.line2
        });
      }
    }

    if (validObjects.length === 0) {
      return {
        states: [],
        successfulCount: 0,
        failedCount: this.objects.length
      };
    }

    const batch = propagateBatch(
      validObjects,
      date
    );

    const states = [];

    let successfulCount = 0;

    let failedCount = 0;

    for (const result of batch) {
      if (!result || result.error || !result.position) {
        failedCount += 1;
        continue;
      }

      const id = String(
        result.id ??
        result.objectId ??
        result.noradId ??
        ""
      );

      const normalized = {
        ...result,

        id,

        simulationDate: cloneDate(date),

        valid: true
      };

      states.push(normalized);

      this.objectStates.set(id, normalized);

      successfulCount += 1;
    }

    failedCount += Math.max(
      0,
      this.objects.length - validObjects.length
    );

    return {
      states,

      successfulCount,

      failedCount
    };
  }

  propagateSingle(object, date = this.currentDate) {
    this.assertNotDisposed();

    try {
      const result = propagateFullState(
        object,
        normalizeDate(date)
      );

      return {
        ...result,

        valid: true
      };
    } catch (error) {
      return {
        valid: false,

        error: error.message,

        objectId: object?.id ?? null
      };
    }
  }

  getObjectState(id) {
    return this.objectStates.get(String(id)) ?? null;
  }

  getObjectStates() {
    return [...this.objectStates.values()];
  }

  /* -----------------------------------------------------
     Statistics
  ----------------------------------------------------- */

  updateStatistics(
    frameDuration,
    realDeltaSeconds,
    simulationDeltaSeconds,
    propagation
  ) {
    const stats = this.statistics;

    stats.frameCount += 1;

    stats.successfulPropagations +=
      propagation.successfulCount;

    stats.failedPropagations +=
      propagation.failedCount;

    stats.lastFrameDurationMs = frameDuration;

    stats.maxFrameDurationMs = Math.max(
      stats.maxFrameDurationMs,
      frameDuration
    );

    stats.averageFrameDurationMs +=
      (frameDuration - stats.averageFrameDurationMs) /
      stats.frameCount;

    stats.realElapsedSeconds += realDeltaSeconds;

    stats.simulatedSeconds += simulationDeltaSeconds;

    stats.lastFrameAt = new Date().toISOString();

    stats.actualFrameRate =
      realDeltaSeconds > 0
        ? 1 / realDeltaSeconds
        : 0;
  }

  getStatistics() {
    return {
      ...this.statistics
    };
  }

  getSnapshot() {
    return {
      state: this.state,

      currentDate: cloneDate(this.currentDate),

      startDate: this.startDate
        ? cloneDate(this.startDate)
        : null,

      endDate: this.endDate
        ? cloneDate(this.endDate)
        : null,

      timeScale: this.timeScale,

      stepSeconds: this.stepSeconds,

      objectCount: this.objects.length,

      propagatedObjectCount: this.objectStates.size,

      statistics: this.getStatistics(),

      lastError: this.lastError
        ? {
            message: this.lastError.message,

            code: this.lastError.code
          }
        : null
    };
  }

  /* -----------------------------------------------------
     Error Handling
  ----------------------------------------------------- */

  handleError(error) {
    this.lastError = error instanceof SimulationError
      ? error
      : new SimulationError(
          error?.message || "حدث خطأ غير معروف في المحاكاة.",
          "SIMULATION_RUNTIME_FAILURE",
          error
        );

    this.state = SIMULATION_STATES.ERROR;

    this.stopAnimationLoop();

    this.emit(SIMULATION_EVENTS.ERROR, {
      message: this.lastError.message,

      code: this.lastError.code,

      timestamp: new Date().toISOString()
    });
  }

  /* -----------------------------------------------------
     Disposal
  ----------------------------------------------------- */

  dispose() {
    if (this.disposed) {
      return;
    }

    this.stopAnimationLoop();

    this.objects = [];

    this.objectStates.clear();

    this.frame = null;

    this.removeAllListeners();

    this.state = SIMULATION_STATES.DISPOSED;

    this.disposed = true;
  }
}

/* -------------------------------------------------------
   Factory
------------------------------------------------------- */

export function createSimulationController(options = {}) {
  return new SimulationController(options);
}

/* -------------------------------------------------------
   Default Export
------------------------------------------------------- */

export default SimulationController;