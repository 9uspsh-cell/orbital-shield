/**
 * ORBITAL SHIELD
 * Global Application State
 *
 * State management powered by Zustand.
 *
 * Domains:
 * - Application lifecycle
 * - Satellite catalog
 * - Simulation clock
 * - Visualization settings
 * - Conjunction analysis
 * - Notifications
 * - Persistent preferences
 */

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

import { orbitalData } from "../data/index.js";

/* -------------------------------------------------------
   Configuration
------------------------------------------------------- */

export const STORE_CONFIG = Object.freeze({
  MAX_NOTIFICATIONS: 100,
  MAX_RECENT_OBJECTS: 20,
  DEFAULT_TIME_STEP: 1,
  MIN_TIME_STEP: 0.1,
  MAX_TIME_STEP: 1000,
  DEFAULT_REFRESH_RATE: 30
});

export const SIMULATION_STATUS = Object.freeze({
  STOPPED: "stopped",
  RUNNING: "running",
  PAUSED: "paused"
});

export const NOTIFICATION_LEVEL = Object.freeze({
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "error",
  CRITICAL: "critical"
});

export const VIEW_MODES = Object.freeze({
  DASHBOARD: "dashboard",
  ANALYTICS: "analytics",
  CONJUNCTIONS: "conjunctions",
  CATALOG: "catalog",
  IMPORTER: "importer",
  SETTINGS: "settings"
});

/* -------------------------------------------------------
   Utilities
------------------------------------------------------- */

function createId() {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function clamp(value, minimum, maximum) {
  return Math.min(
    maximum,
    Math.max(minimum, value)
  );
}

function isValidDate(value) {
  return value instanceof Date &&
    !Number.isNaN(value.getTime());
}

function normalizeDate(value) {
  const date = value instanceof Date
    ? new Date(value.getTime())
    : new Date(value);

  if (!isValidDate(date)) {
    throw new Error("Invalid simulation date.");
  }

  return date;
}

function createNotification(
  message,
  level = NOTIFICATION_LEVEL.INFO,
  details = {}
) {
  return {
    id: createId(),
    message: String(message),
    level,
    details,
    timestamp: new Date().toISOString(),
    read: false
  };
}

function createInitialSimulationState() {
  return {
    status: SIMULATION_STATUS.STOPPED,

    currentDate: new Date(),

    startDate: new Date(),

    endDate: null,

    timeStep: STORE_CONFIG.DEFAULT_TIME_STEP,

    elapsedSimulationSeconds: 0,

    totalFrames: 0,

    lastFrameAt: null,

    simulationRate: 1
  };
}

/* -------------------------------------------------------
   Initial State
------------------------------------------------------- */

const initialState = {
  application: {
    initialized: false,

    initializing: false,

    version: "1.0.0",

    mode: "offline",

    lastError: null,

    lastInitializedAt: null
  },

  interface: {
    activeView: VIEW_MODES.DASHBOARD,

    sidebarCollapsed: false,

    theme: "dark",

    language: "ar",

    showTelemetry: true,

    showGrid: true,

    showAtmosphere: true,

    showLabels: true,

    compactMode: false
  },

  catalog: {
    objects: [],

    selectedObjectId: null,

    selectedObjectIds: [],

    loading: false,

    lastUpdated: null,

    totalCount: 0,

    searchQuery: "",

    filters: {},

    sortBy: "name",

    sortDirection: "asc",

    page: 1,

    pageSize: 50
  },

  simulation: createInitialSimulationState(),

  visualization: {
    cameraMode: "perspective",

    showOrbits: true,

    showEarth: true,

    showStars: true,

    showEquatorialGrid: true,

    showSatelliteLabels: true,

    showGroundTracks: false,

    showVelocityVectors: false,

    showPositionVectors: false,

    selectedLayer: "all",

    cameraTarget: [0, 0, 0],

    zoom: 1
  },

  analysis: {
    running: false,

    lastRunAt: null,

    results: [],

    statistics: null,

    selectedResultId: null,

    settings: {
      screeningHours: 24,

      screeningStepSeconds: 60,

      warningDistanceKm: 10,

      criticalDistanceKm: 1
    }
  },

  notifications: [],

  recentObjects: [],

  preferences: {
    autoSave: true,

    confirmBeforeDelete: true,

    showSystemNotifications: true,

    refreshRate: STORE_CONFIG.DEFAULT_REFRESH_RATE,

    dateFormat: "YYYY-MM-DD HH:mm:ss",

    distanceUnit: "km",

    velocityUnit: "km/s"
  }
};

/* -------------------------------------------------------
   Store
------------------------------------------------------- */

export const useOrbitalStore = create(
  subscribeWithSelector((set, get) => ({

    ...initialState,

    /* -----------------------------------------------
       Application Lifecycle
    ----------------------------------------------- */

    setInitializing(value) {
      set((state) => ({
        application: {
          ...state.application,
          initializing: Boolean(value)
        }
      }));
    },

    setInitialized(value) {
      set((state) => ({
        application: {
          ...state.application,
          initialized: Boolean(value),
          initializing: false,
          lastInitializedAt: value
            ? new Date().toISOString()
            : state.application.lastInitializedAt,
          lastError: null
        }
      }));
    },

    setApplicationError(error) {
      const message = error instanceof Error
        ? error.message
        : String(error);

      set((state) => ({
        application: {
          ...state.application,
          lastError: message,
          initializing: false
        }
      }));

      get().addNotification(
        `Application error: ${message}`,
        NOTIFICATION_LEVEL.ERROR
      );
    },

    async initializeApplication() {
      if (get().application.initialized) {
        return true;
      }

      if (get().application.initializing) {
        return false;
      }

      get().setInitializing(true);

      try {
        await orbitalData.initialize();

        const records = orbitalData.getAll();

        set((state) => ({
          catalog: {
            ...state.catalog,
            objects: records,
            totalCount: records.length,
            lastUpdated: new Date().toISOString(),
            loading: false
          },

          application: {
            ...state.application,
            initialized: true,
            initializing: false,
            lastInitializedAt: new Date().toISOString(),
            lastError: null
          }
        }));

        get().addNotification(
          "تم تهيئة النظام وتحميل البيانات المحلية.",
          NOTIFICATION_LEVEL.SUCCESS
        );

        return true;
      } catch (error) {
        get().setApplicationError(error);

        return false;
      }
    },

    /* -----------------------------------------------
       Interface
    ----------------------------------------------- */

    setActiveView(view) {
      if (!Object.values(VIEW_MODES).includes(view)) {
        return;
      }

      set((state) => ({
        interface: {
          ...state.interface,
          activeView: view
        }
      }));
    },

    toggleSidebar() {
      set((state) => ({
        interface: {
          ...state.interface,
          sidebarCollapsed: !state.interface.sidebarCollapsed
        }
      }));
    },

    setSidebarCollapsed(value) {
      set((state) => ({
        interface: {
          ...state.interface,
          sidebarCollapsed: Boolean(value)
        }
      }));
    },

    updateInterfaceSettings(settings) {
      set((state) => ({
        interface: {
          ...state.interface,
          ...settings
        }
      }));
    },

    /* -----------------------------------------------
       Catalog
    ----------------------------------------------- */

    setCatalogLoading(value) {
      set((state) => ({
        catalog: {
          ...state.catalog,
          loading: Boolean(value)
        }
      }));
    },

    refreshCatalog() {
      const records = orbitalData.getAll();

      set((state) => ({
        catalog: {
          ...state.catalog,
          objects: records,
          totalCount: records.length,
          lastUpdated: new Date().toISOString(),
          loading: false
        }
      }));

      return records;
    },

    async addObject(record) {
      try {
        const created = await orbitalData.add(record);

        get().refreshCatalog();

        get().addNotification(
          `تمت إضافة الجسم ${created.name}.`,
          NOTIFICATION_LEVEL.SUCCESS,
          {
            objectId: created.id
          }
        );

        return created;
      } catch (error) {
        get().addNotification(
          error.message || "تعذرت إضافة الجسم.",
          NOTIFICATION_LEVEL.ERROR
        );

        throw error;
      }
    },

    async updateObject(id, updates) {
      try {
        const updated = await orbitalData.update(
          id,
          updates
        );

        get().refreshCatalog();

        get().addNotification(
          "تم تحديث بيانات الجسم المداري.",
          NOTIFICATION_LEVEL.SUCCESS,
          {
            objectId: id
          }
        );

        return updated;
      } catch (error) {
        get().addNotification(
          error.message || "تعذر تحديث الجسم.",
          NOTIFICATION_LEVEL.ERROR
        );

        throw error;
      }
    },

    async removeObject(id) {
      try {
        const result = await orbitalData.remove(id);

        if (!result.removed) {
          return false;
        }

        set((state) => ({
          catalog: {
            ...state.catalog,
            selectedObjectId:
              state.catalog.selectedObjectId === id
                ? null
                : state.catalog.selectedObjectId,

            selectedObjectIds:
              state.catalog.selectedObjectIds.filter(
                (itemId) => itemId !== id
              )
          }
        }));

        get().refreshCatalog();

        get().addNotification(
          "تم حذف الجسم من الكتالوج.",
          NOTIFICATION_LEVEL.SUCCESS
        );

        return true;
      } catch (error) {
        get().addNotification(
          error.message || "تعذر حذف الجسم.",
          NOTIFICATION_LEVEL.ERROR
        );

        throw error;
      }
    },

    async importObjects(snapshot, options = {}) {
      try {
        const result = await orbitalData.importCatalog(
          snapshot,
          options
        );

        get().refreshCatalog();

        get().addNotification(
          `اكتمل الاستيراد: ${result.count} جسم مداري.`,
          NOTIFICATION_LEVEL.SUCCESS
        );

        return result;
      } catch (error) {
        get().addNotification(
          error.message || "فشل استيراد البيانات.",
          NOTIFICATION_LEVEL.ERROR
        );

        throw error;
      }
    },

    selectObject(id) {
      const exists = get().catalog.objects.some(
        (object) => object.id === id
      );

      if (!exists && id !== null) {
        return;
      }

      set((state) => ({
        catalog: {
          ...state.catalog,
          selectedObjectId: id
        }
      }));

      if (id) {
        get().addRecentObject(id);
      }
    },

    toggleObjectSelection(id) {
      set((state) => {
        const selected = state.catalog.selectedObjectIds;

        const exists = selected.includes(id);

        return {
          catalog: {
            ...state.catalog,

            selectedObjectIds: exists
              ? selected.filter((item) => item !== id)
              : [...selected, id]
          }
        };
      });
    },

    selectAllObjects() {
      const ids = get().catalog.objects.map(
        (object) => object.id
      );

      set((state) => ({
        catalog: {
          ...state.catalog,
          selectedObjectIds: ids
        }
      }));
    },

    clearObjectSelection() {
      set((state) => ({
        catalog: {
          ...state.catalog,
          selectedObjectId: null,
          selectedObjectIds: []
        }
      }));
    },

    setCatalogSearch(query) {
      set((state) => ({
        catalog: {
          ...state.catalog,
          searchQuery: String(query),
          page: 1
        }
      }));
    },

    setCatalogFilters(filters) {
      set((state) => ({
        catalog: {
          ...state.catalog,
          filters: { ...filters },
          page: 1
        }
      }));
    },

    setCatalogSorting(sortBy, direction = "asc") {
      set((state) => ({
        catalog: {
          ...state.catalog,
          sortBy,
          sortDirection: direction
        }
      }));
    },

    setCatalogPage(page) {
      set((state) => ({
        catalog: {
          ...state.catalog,
          page: Math.max(1, Math.floor(page))
        }
      }));
    },

    setCatalogPageSize(pageSize) {
      set((state) => ({
        catalog: {
          ...state.catalog,
          pageSize: clamp(
            Math.floor(pageSize),
            1,
            500
          ),
          page: 1
        }
      }));
    },

    /* -----------------------------------------------
       Recent Objects
    ----------------------------------------------- */

    addRecentObject(id) {
      set((state) => {
        const recent = [
          id,
          ...state.recentObjects.filter(
            (item) => item !== id
          )
        ];

        return {
          recentObjects: recent.slice(
            0,
            STORE_CONFIG.MAX_RECENT_OBJECTS
          )
        };
      });
    },

    clearRecentObjects() {
      set({
        recentObjects: []
      });
    },

    /* -----------------------------------------------
       Simulation Clock
    ----------------------------------------------- */

    startSimulation() {
      set((state) => ({
        simulation: {
          ...state.simulation,
          status: SIMULATION_STATUS.RUNNING,
          lastFrameAt: null
        }
      }));

      get().addNotification(
        "بدأت المحاكاة المدارية.",
        NOTIFICATION_LEVEL.INFO
      );
    },

    pauseSimulation() {
      set((state) => ({
        simulation: {
          ...state.simulation,
          status: SIMULATION_STATUS.PAUSED,
          lastFrameAt: null
        }
      }));
    },

    stopSimulation() {
      set((state) => ({
        simulation: {
          ...state.simulation,
          status: SIMULATION_STATUS.STOPPED,
          elapsedSimulationSeconds: 0,
          totalFrames: 0,
          lastFrameAt: null
        }
      }));
    },

    resetSimulation() {
      set({
        simulation: createInitialSimulationState()
      });
    },

    setSimulationDate(value) {
      const date = normalizeDate(value);

      set((state) => ({
        simulation: {
          ...state.simulation,
          currentDate: date
        }
      }));
    },

    setSimulationRange(startDate, endDate = null) {
      const start = normalizeDate(startDate);

      const end = endDate
        ? normalizeDate(endDate)
        : null;

      if (end && end.getTime() <= start.getTime()) {
        throw new Error(
          "Simulation end date must be after start date."
        );
      }

      set((state) => ({
        simulation: {
          ...state.simulation,
          startDate: start,
          endDate: end,
          currentDate: start
        }
      }));
    },

    setTimeStep(value) {
      const timeStep = clamp(
        Number(value),
        STORE_CONFIG.MIN_TIME_STEP,
        STORE_CONFIG.MAX_TIME_STEP
      );

      set((state) => ({
        simulation: {
          ...state.simulation,
          timeStep
        }
      }));
    },

    setSimulationRate(value) {
      const rate = clamp(
        Number(value),
        0.01,
        10000
      );

      set((state) => ({
        simulation: {
          ...state.simulation,
          simulationRate: rate
        }
      }));
    },

    advanceSimulation(realDeltaSeconds) {
      const simulation = get().simulation;

      if (
        simulation.status !== SIMULATION_STATUS.RUNNING
      ) {
        return simulation.currentDate;
      }

      if (
        !Number.isFinite(realDeltaSeconds) ||
        realDeltaSeconds < 0
      ) {
        return simulation.currentDate;
      }

      const elapsed = Math.min(
        realDeltaSeconds,
        1
      );

      const simulatedSeconds =
        elapsed *
        simulation.timeStep *
        simulation.simulationRate;

      const nextDate = new Date(
        simulation.currentDate.getTime() +
        simulatedSeconds * 1000
      );

      if (
        simulation.endDate &&
        nextDate.getTime() >= simulation.endDate.getTime()
      ) {
        set((state) => ({
          simulation: {
            ...state.simulation,
            currentDate: state.simulation.endDate,
            status: SIMULATION_STATUS.PAUSED,
            elapsedSimulationSeconds:
              state.simulation.elapsedSimulationSeconds +
              simulatedSeconds,
            totalFrames: state.simulation.totalFrames + 1
          }
        }));

        get().addNotification(
          "وصلت المحاكاة إلى نهاية الفترة المحددة.",
          NOTIFICATION_LEVEL.INFO
        );

        return nextDate;
      }

      set((state) => ({
        simulation: {
          ...state.simulation,
          currentDate: nextDate,
          elapsedSimulationSeconds:
            state.simulation.elapsedSimulationSeconds +
            simulatedSeconds,
          totalFrames: state.simulation.totalFrames + 1,
          lastFrameAt: new Date().toISOString()
        }
      }));

      return nextDate;
    },

    /* -----------------------------------------------
       Visualization
    ----------------------------------------------- */

    updateVisualization(settings) {
      set((state) => ({
        visualization: {
          ...state.visualization,
          ...settings
        }
      }));
    },

    toggleVisualizationLayer(layer) {
      const supportedLayers = [
        "showOrbits",
        "showEarth",
        "showStars",
        "showEquatorialGrid",
        "showSatelliteLabels",
        "showGroundTracks",
        "showVelocityVectors",
        "showPositionVectors"
      ];

      if (!supportedLayers.includes(layer)) {
        return;
      }

      set((state) => ({
        visualization: {
          ...state.visualization,
          [layer]: !state.visualization[layer]
        }
      }));
    },

    setCameraMode(mode) {
      if (!["perspective", "orthographic"].includes(mode)) {
        return;
      }

      set((state) => ({
        visualization: {
          ...state.visualization,
          cameraMode: mode
        }
      }));
    },

    setCameraTarget(target) {
      if (
        !Array.isArray(target) ||
        target.length !== 3 ||
        !target.every(Number.isFinite)
      ) {
        return;
      }

      set((state) => ({
        visualization: {
          ...state.visualization,
          cameraTarget: [...target]
        }
      }));
    },

    setZoom(value) {
      set((state) => ({
        visualization: {
          ...state.visualization,
          zoom: clamp(Number(value), 0.1, 10)
        }
      }));
    },

    /* -----------------------------------------------
       Conjunction Analysis
    ----------------------------------------------- */

    setAnalysisRunning(value) {
      set((state) => ({
        analysis: {
          ...state.analysis,
          running: Boolean(value)
        }
      }));
    },

    setAnalysisResults(results) {
      if (!Array.isArray(results)) {
        return;
      }

      set((state) => ({
        analysis: {
          ...state.analysis,
          results,
          lastRunAt: new Date().toISOString(),
          running: false
        }
      }));
    },

    setAnalysisStatistics(statistics) {
      set((state) => ({
        analysis: {
          ...state.analysis,
          statistics
        }
      }));
    },

    setAnalysisSettings(settings) {
      set((state) => ({
        analysis: {
          ...state.analysis,
          settings: {
            ...state.analysis.settings,
            ...settings
          }
        }
      }));
    },

    selectAnalysisResult(id) {
      set((state) => ({
        analysis: {
          ...state.analysis,
          selectedResultId: id
        }
      }));
    },

    clearAnalysis() {
      set((state) => ({
        analysis: {
          ...state.analysis,
          results: [],
          statistics: null,
          selectedResultId: null,
          lastRunAt: null,
          running: false
        }
      }));
    },

    /* -----------------------------------------------
       Notifications
    ----------------------------------------------- */

    addNotification(message, level, details = {}) {
      const notification = createNotification(
        message,
        level,
        details
      );

      set((state) => ({
        notifications: [
          notification,
          ...state.notifications
        ].slice(
          0,
          STORE_CONFIG.MAX_NOTIFICATIONS
        )
      }));

      return notification.id;
    },

    markNotificationRead(id) {
      set((state) => ({
        notifications: state.notifications.map(
          (notification) =>
            notification.id === id
              ? { ...notification, read: true }
              : notification
        )
      }));
    },

    markAllNotificationsRead() {
      set((state) => ({
        notifications: state.notifications.map(
          (notification) => ({
            ...notification,
            read: true
          })
        )
      }));
    },

    removeNotification(id) {
      set((state) => ({
        notifications: state.notifications.filter(
          (notification) => notification.id !== id
        )
      }));
    },

    clearNotifications() {
      set({
        notifications: []
      });
    },

    /* -----------------------------------------------
       Preferences
    ----------------------------------------------- */

    updatePreferences(preferences) {
      set((state) => ({
        preferences: {
          ...state.preferences,
          ...preferences
        }
      }));
    },

    resetPreferences() {
      set({
        preferences: initialState.preferences
      });
    },

    /* -----------------------------------------------
       Data Synchronization
    ----------------------------------------------- */

    async saveApplicationState() {
      try {
        await orbitalData.flush();

        get().addNotification(
          "تم حفظ بيانات الكتالوج محليًا.",
          NOTIFICATION_LEVEL.SUCCESS
        );

        return true;
      } catch (error) {
        get().addNotification(
          "تعذر حفظ بيانات التطبيق.",
          NOTIFICATION_LEVEL.ERROR
        );

        return false;
      }
    }

  }))
);

/* -------------------------------------------------------
   Selectors
------------------------------------------------------- */

export const orbitalSelectors = Object.freeze({

  application: (state) => state.application,

  activeView: (state) => state.interface.activeView,

  catalog: (state) => state.catalog.objects,

  selectedObject: (state) => {
    const id = state.catalog.selectedObjectId;

    return state.catalog.objects.find(
      (object) => object.id === id
    ) || null;
  },

  selectedObjects: (state) => {
    const selected = new Set(
      state.catalog.selectedObjectIds
    );

    return state.catalog.objects.filter(
      (object) => selected.has(object.id)
    );
  },

  simulation: (state) => state.simulation,

  simulationRunning: (state) =>
    state.simulation.status === SIMULATION_STATUS.RUNNING,

  visualization: (state) => state.visualization,

  conjunctions: (state) => state.analysis.results,

  unreadNotifications: (state) =>
    state.notifications.filter(
      (notification) => !notification.read
    ),

  notificationCount: (state) =>
    state.notifications.filter(
      (notification) => !notification.read
    ).length

});

/* -------------------------------------------------------
   Store Subscription Helpers
------------------------------------------------------- */

export function subscribeToSimulation(callback) {
  return useOrbitalStore.subscribe(
    (state) => state.simulation,
    callback
  );
}

export function subscribeToCatalog(callback) {
  return useOrbitalStore.subscribe(
    (state) => state.catalog.objects,
    callback
  );
}

export function subscribeToActiveView(callback) {
  return useOrbitalStore.subscribe(
    (state) => state.interface.activeView,
    callback
  );
}

export default useOrbitalStore;