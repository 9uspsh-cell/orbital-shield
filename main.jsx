import React, {
  StrictMode,
  Component,
  Suspense
} from "react";

import ReactDOM from "react-dom/client";

import App from "./App.jsx";
import "./index.css";

/* =========================================================
   ORBITAL SHIELD
   APPLICATION BOOTSTRAP
   Version: 1.0.0
   Runtime: React 18
   Environment: Local / Offline
========================================================= */

const SYSTEM_NAME = "ORBITAL SHIELD";
const SYSTEM_VERSION = "1.0.0";

/* =========================================================
   SYSTEM LOGGER
========================================================= */

class SystemLogger {
  static timestamp() {
    return new Date().toISOString();
  }

  static info(message, data = null) {
    console.info(
      `%c[${SYSTEM_NAME}]`,
      "color:#62C8FF;font-weight:bold",
      message,
      data ?? ""
    );
  }

  static warning(message, data = null) {
    console.warn(
      `[${SYSTEM_NAME}] ${message}`,
      data ?? ""
    );
  }

  static error(message, error = null) {
    console.error(
      `[${SYSTEM_NAME}] ${message}`,
      error ?? ""
    );
  }

  static initialize() {
    this.info("Runtime initialization started.");
    this.info(`Version: ${SYSTEM_VERSION}`);
    this.info(`Environment: ${import.meta.env.MODE}`);
    this.info(`Timestamp: ${this.timestamp()}`);
  }
}

/* =========================================================
   RUNTIME ENVIRONMENT
========================================================= */

function initializeRuntime() {
  const runtime = {
    initialized: false,
    startedAt: Date.now(),
    environment: import.meta.env.MODE,
    language: document.documentElement.lang || "ar",
    direction: document.documentElement.dir || "rtl",
    online: navigator.onLine,
    webglAvailable: false
  };

  try {
    const canvas = document.createElement("canvas");

    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");

    runtime.webglAvailable = Boolean(gl);

    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");

      runtime.graphics = {
        vendor: debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
          : "Unknown",
        renderer: debugInfo
          ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
          : "Unknown"
      };

      const loseContext = gl.getExtension("WEBGL_lose_context");
      loseContext?.loseContext();
    }
  } catch (error) {
    SystemLogger.warning(
      "WebGL capability detection failed.",
      error
    );
  }

  runtime.initialized = true;

  window.__ORBITAL_SHIELD_RUNTIME__ = runtime;

  return runtime;
}

/* =========================================================
   ERROR BOUNDARY
========================================================= */

class SystemErrorBoundary extends Component {
  constructor(props) {
    super(props);

    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error,
      errorInfo
    });

    SystemLogger.error(
      "Critical interface rendering error.",
      {
        error,
        componentStack: errorInfo.componentStack
      }
    );
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <main className="system-error-screen">
          <div className="system-error-card">
            <div className="system-error-icon">
              !
            </div>

            <div className="system-error-brand">
              ORBITAL SHIELD
            </div>

            <h1>
              System Rendering Error
            </h1>

            <p>
              حدث خطأ أثناء تحميل إحدى وحدات النظام.
            </p>

            <pre>
              {String(
                this.state.error?.message ||
                "Unknown application error"
              )}
            </pre>

            <button
              type="button"
              onClick={this.handleReload}
            >
              إعادة تشغيل النظام
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}

/* =========================================================
   APPLICATION LOADING SCREEN
========================================================= */

function ApplicationLoader() {
  return (
    <div className="application-loader">
      <div className="application-loader-orbit">
        <div className="application-loader-core" />
      </div>

      <div className="application-loader-title">
        ORBITAL SHIELD
      </div>

      <div className="application-loader-description">
        INITIALIZING ORBITAL ENVIRONMENT
      </div>

      <div className="application-loader-progress">
        <span />
      </div>

      <div className="application-loader-status">
        PREPARING SIMULATION ENGINE
      </div>
    </div>
  );
}

/* =========================================================
   GLOBAL ERROR HANDLING
========================================================= */

function initializeGlobalErrorHandlers() {
  window.addEventListener("error", (event) => {
    SystemLogger.error(
      "Uncaught browser error.",
      {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        column: event.colno
      }
    );
  });

  window.addEventListener(
    "unhandledrejection",
    (event) => {
      SystemLogger.error(
        "Unhandled asynchronous rejection.",
        event.reason
      );
    }
  );
}

/* =========================================================
   GLOBAL APPLICATION METADATA
========================================================= */

function initializeApplicationMetadata() {
  document.title =
    `${SYSTEM_NAME} | Space Domain Awareness`;

  document.documentElement.lang = "ar";
  document.documentElement.dir = "rtl";

  document.body.dataset.application =
    "orbital-shield";

  document.body.dataset.version =
    SYSTEM_VERSION;
}

/* =========================================================
   APPLICATION ROOT
========================================================= */

function ApplicationRoot() {
  return (
    <StrictMode>
      <SystemErrorBoundary>
        <Suspense fallback={<ApplicationLoader />}>
          <App />
        </Suspense>
      </SystemErrorBoundary>
    </StrictMode>
  );
}

/* =========================================================
   BOOT SEQUENCE
========================================================= */

function bootstrap() {
  SystemLogger.initialize();

  initializeGlobalErrorHandlers();

  initializeApplicationMetadata();

  const runtime = initializeRuntime();

  if (!runtime.webglAvailable) {
    SystemLogger.warning(
      "WebGL is unavailable. 3D visualization may not work."
    );
  }

  const rootElement =
    document.getElementById("root");

  if (!rootElement) {
    throw new Error(
      "Application root element was not found."
    );
  }

  const root = ReactDOM.createRoot(rootElement);

  root.render(
    <ApplicationRoot />
  );

  SystemLogger.info(
    "Application mounted successfully.",
    runtime
  );

  window.__ORBITAL_SHIELD__ = {
    name: SYSTEM_NAME,
    version: SYSTEM_VERSION,
    runtime,
    reload: () => window.location.reload()
  };
}

/* =========================================================
   START APPLICATION
========================================================= */

try {
  bootstrap();
} catch (error) {
  SystemLogger.error(
    "Fatal application bootstrap failure.",
    error
  );

  const root = document.getElementById("root");

  if (root) {
    root.innerHTML = `
      <div style="
        min-height:100vh;
        display:flex;
        align-items:center;
        justify-content:center;
        background:#050b16;
        color:#e6edf7;
        font-family:Arial,sans-serif;
        text-align:center;
        padding:30px;
        direction:rtl;
      ">
        <div>
          <h1 style="color:#63c7ff">
            ORBITAL SHIELD
          </h1>

          <h2>تعذر تشغيل النظام</h2>

          <p style="color:#8da6c2">
            تحقق من ملفات المشروع ورسائل الخطأ.
          </p>

          <button
            onclick="window.location.reload()"
            style="
              padding:12px 22px;
              border:1px solid #398cc4;
              background:#102b46;
              color:white;
              border-radius:8px;
              cursor:pointer;
            "
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    `;
  }
}