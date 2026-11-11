import React, {
  useCallback,
  useEffect,
  useMemo,
  useState
} from "react";

import {
  Activity,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Command,
  Database,
  Globe2,
  LayoutDashboard,
  Menu,
  Orbit,
  Radio,
  Satellite,
  Search,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Target,
  X,
  Zap,
  Crosshair,
  Network,
  Gauge,
  Layers3,
  Cpu,
  Clock3,
  CircleHelp
} from "lucide-react";


/* ============================================================
   ORBITAL SHIELD
   APPLICATION SHELL
   Version 2.0.0
   Local / Offline
============================================================ */

const CONFIG = Object.freeze({
  name: "ORBITAL SHIELD",
  version: "2.0.0",
  edition: "ENGINEERING PLATFORM",
  environment: "LOCAL MODE",
  defaultLanguage: "ar",
  defaultPage: "dashboard"
});

const NAVIGATION = [
  {
    section: "COMMAND",
    sectionAr: "القيادة",
    items: [
      {
        id: "dashboard",
        label: "dashboard",
        icon: LayoutDashboard,
        description: "Command overview",
        descriptionAr: "نظرة عامة على النظام",
        status: "ready"
      },
      {
        id: "simulation",
        label: "simulation",
        icon: Orbit,
        description: "Orbital simulation environment",
        descriptionAr: "بيئة المحاكاة المدارية",
        status: "ready",
        featured: true
      },
      {
        id: "surveillance",
        label: "surveillance",
        icon: Radio,
        description: "Space object surveillance",
        descriptionAr: "مراقبة الأجسام الفضائية",
        status: "ready"
      }
    ]
  },
  {
    section: "INTELLIGENCE",
    sectionAr: "التحليل والاستخبارات",
    items: [
      {
        id: "catalog",
        label: "catalog",
        icon: Database,
        description: "Orbital object registry",
        descriptionAr: "سجل الأجسام المدارية",
        status: "ready"
      },
      {
        id: "analysis",
        label: "analysis",
        icon: BarChart3,
        description: "Orbital data analytics",
        descriptionAr: "تحليل البيانات المدارية",
        status: "ready"
      },
      {
        id: "conjunctions",
        label: "conjunctions",
        icon: Target,
        description: "Conjunction assessment",
        descriptionAr: "تقييم الاقترانات المدارية",
        status: "ready"
      },
      {
        id: "groundTrack",
        label: "groundTrack",
        icon: Globe2,
        description: "Ground track analysis",
        descriptionAr: "تحليل المسارات الأرضية",
        status: "ready"
      }
    ]
  },
  {
    section: "SYSTEM",
    sectionAr: "النظام",
    items: [
      {
        id: "dataCenter",
        label: "dataCenter",
        icon: Database,
        description: "Local data management",
        descriptionAr: "إدارة البيانات المحلية",
        status: "ready"
      },
      {
        id: "notifications",
        label: "notifications",
        icon: Bell,
        description: "System notifications",
        descriptionAr: "تنبيهات النظام",
        status: "ready"
      },
      {
        id: "settings",
        label: "settings",
        icon: Settings,
        description: "Application configuration",
        descriptionAr: "إعدادات التطبيق",
        status: "ready"
      },
      {
        id: "documentation",
        label: "documentation",
        icon: BookOpen,
        description: "Technical documentation",
        descriptionAr: "التوثيق التقني",
        status: "development"
      }
    ]
  }
];

const MODULES = {
  dashboard: {
    title: "dashboard",
    tag: "dashboardTag",
    icon: LayoutDashboard,
    accent: "#70B8FF"
  },
  simulation: {
    title: "simulation",
    tag: "simulationTag",
    icon: Orbit,
    accent: "#72BFFF"
  },
  surveillance: {
    title: "surveillance",
    tag: "monitoringTag",
    icon: Radio,
    accent: "#45D6A0"
  },
  catalog: {
    title: "catalog",
    tag: "dataTag",
    icon: Database,
    accent: "#A78BFA"
  },
  analysis: {
    title: "analysis",
    tag: "analysisTag",
    icon: BarChart3,
    accent: "#F4C96B"
  },
  conjunctions: {
    title: "conjunctions",
    tag: "analysisTag",
    icon: Target,
    accent: "#FF9A64"
  },
  groundTrack: {
    title: "groundTrack",
    tag: "analysisTag",
    icon: Globe2,
    accent: "#45D6A0"
  },
  dataCenter: {
    title: "dataCenter",
    tag: "dataTag",
    icon: Database,
    accent: "#70B8FF"
  },
  notifications: {
    title: "notifications",
    tag: "dataTag",
    icon: Bell,
    accent: "#F4C96B"
  },
  settings: {
    title: "settings",
    tag: "dataTag",
    icon: Settings,
    accent: "#A78BFA"
  },
  documentation: {
    title: "documentation",
    tag: "dataTag",
    icon: BookOpen,
    accent: "#70B8FF"
  }
};

/* ============================================================
   LOCALIZATION
============================================================ */

const I18N = {
  ar: {
    brand: "ORBITAL SHIELD",
    brandSubtitle: "منصة الوعي بالمجال الفضائي",

    dashboard: "لوحة القيادة",
    simulation: "المحاكاة",
    surveillance: "المراقبة",
    catalog: "كتالوج الأجسام",
    analysis: "التحليل المداري",
    conjunctions: "الاقترانات المدارية",
    groundTrack: "المسارات الأرضية",
    dataCenter: "مركز البيانات",
    notifications: "التنبيهات",
    settings: "الإعدادات",
    documentation: "التوثيق",

    operationalCenter: "مركز العمليات الفضائية",
    welcome: "مرحبًا بك في مركز العمليات",
    welcomeDescription:
      "منصة هندسية متخصصة لمراقبة الأجسام الفضائية وتحليل البيانات المدارية وتشغيل السيناريوهات الافتراضية.",

    openSimulation: "فتح مركز المحاكاة",
    startMonitoring: "بدء المراقبة",
    systemStatus: "حالة النظام",
    operational: "النظام يعمل",
    localEnvironment: "بيئة تشغيل محلية",
    currentTime: "الوقت الحالي",
    offline: "غير متصل بالإنترنت",
    localOnly: "معالجة محلية",

    overview: "نظرة عامة",
    systemModules: "وحدات النظام",
    systemArchitecture: "بنية النظام",
    recentActivity: "النشاط الأخير",

    satellites: "الأقمار الصناعية",
    trackedObjects: "الأجسام المتعقبة",
    orbitalEvents: "الأحداث المدارية",
    systemModulesCount: "وحدات النظام",

    syntheticNotice: "بيانات المحاكاة افتراضية",
    syntheticDescription:
      "الأجسام والمسارات المستخدمة في السيناريوهات التدريبية افتراضية ولا تمثل تهديدات أو مسارات حقيقية.",

    comingSoon: "الوحدة قيد التطوير",
    comingSoonDescription:
      "هذه الوحدة ضمن خارطة تطوير ORBITAL SHIELD وسيتم ربطها بمحركات البيانات والتحليل في مراحل التطوير التالية.",

    statusNominal: "طبيعي",
    statusDevelopment: "قيد التطوير",
    systemReady: "النظام جاهز",
    noExternalConnection: "لا توجد حاجة لاتصال خارجي",

    search: "بحث في النظام",
    searchPlaceholder: "ابحث عن وحدة أو وظيفة...",
    searchResults: "نتائج البحث",
    noResults: "لا توجد نتائج مطابقة",

    language: "اللغة",
    arabic: "العربية",
    english: "English",
    languageSettings: "إعدادات اللغة",

    preferences: "التفضيلات",
    systemInformation: "معلومات النظام",
    version: "الإصدار",
    environment: "بيئة التشغيل",

    notificationsTitle: "مركز التنبيهات",
    noNotifications: "لا توجد تنبيهات جديدة",

    backToDashboard: "العودة إلى لوحة القيادة",
    close: "إغلاق",
    sidebarCollapse: "طي القائمة",
    sidebarExpand: "توسيع القائمة",

    dashboardTag: "مركز القيادة والتحكم",
    simulationTag: "بيئة المحاكاة الافتراضية",
    monitoringTag: "مراقبة المجال الفضائي",
    analysisTag: "التحليل المداري",
    dataTag: "إدارة البيانات",

    processingEngine: "محرك المعالجة",
    visualizationEngine: "محرك العرض",
    simulationEngine: "محرك المحاكاة",

    localSession: "جلسة محلية",
    platformEdition: "المنصة الهندسية",
    moduleCount: "عدد الوحدات",
    commandOverview: "نظرة عامة على القيادة",
    architecture: "هندسة المنصة",
    localStorage: "التخزين المحلي",
    ready: "جاهز",
    development: "تطوير",

    activityInitialized: "تم تهيئة واجهة النظام",
    activitySimulation: "محرك المحاكاة متاح",
    activityData: "وحدات البيانات قيد الربط",

    noNotificationsDescription:
      "ستظهر هنا الأحداث والتنبيهات التي ينشئها النظام.",

    documentationDescription:
      "سيتم توفير الوثائق التقنية ودليل تشغيل المنصة هنا."
  },

  en: {
    brand: "ORBITAL SHIELD",
    brandSubtitle: "SPACE DOMAIN AWARENESS PLATFORM",

    dashboard: "Dashboard",
    simulation: "Simulation",
    surveillance: "Surveillance",
    catalog: "Object Catalog",
    analysis: "Orbital Analysis",
    conjunctions: "Conjunction Analysis",
    groundTrack: "Ground Tracks",
    dataCenter: "Data Center",
    notifications: "Notifications",
    settings: "Settings",
    documentation: "Documentation",

    operationalCenter: "SPACE OPERATIONS CENTER",
    welcome: "Welcome to Operations Center",
    welcomeDescription:
      "An engineering platform for monitoring space objects, analyzing orbital data, and operating synthetic simulation scenarios.",

    openSimulation: "OPEN SIMULATION CENTER",
    startMonitoring: "START MONITORING",
    systemStatus: "SYSTEM STATUS",
    operational: "SYSTEM OPERATIONAL",
    localEnvironment: "LOCAL ENVIRONMENT",
    currentTime: "CURRENT TIME",
    offline: "OFFLINE",
    localOnly: "LOCAL PROCESSING",

    overview: "Overview",
    systemModules: "System Modules",
    systemArchitecture: "Platform Architecture",
    recentActivity: "Recent Activity",

    satellites: "Satellites",
    trackedObjects: "Tracked Objects",
    orbitalEvents: "Orbital Events",
    systemModulesCount: "System Modules",

    syntheticNotice: "Synthetic simulation data",
    syntheticDescription:
      "Objects and trajectories used in training scenarios are fictional and do not represent real threats or actual trajectories.",

    comingSoon: "MODULE UNDER DEVELOPMENT",
    comingSoonDescription:
      "This module is part of the ORBITAL SHIELD development roadmap and will be connected to the data and analysis engines in subsequent stages.",

    statusNominal: "NOMINAL",
    statusDevelopment: "IN DEVELOPMENT",
    systemReady: "SYSTEM READY",
    noExternalConnection: "No external connection required",

    search: "SYSTEM SEARCH",
    searchPlaceholder: "Search modules and functions...",
    searchResults: "SEARCH RESULTS",
    noResults: "No matching results",

    language: "Language",
    arabic: "العربية",
    english: "English",
    languageSettings: "Language Settings",

    preferences: "Preferences",
    systemInformation: "System Information",
    version: "VERSION",
    environment: "ENVIRONMENT",

    notificationsTitle: "NOTIFICATION CENTER",
    noNotifications: "No new notifications",

    backToDashboard: "BACK TO DASHBOARD",
    close: "Close",
    sidebarCollapse: "Collapse navigation",
    sidebarExpand: "Expand navigation",

    dashboardTag: "COMMAND OVERVIEW",
    simulationTag: "SYNTHETIC ENVIRONMENT",
    monitoringTag: "SPACE SURVEILLANCE",
    analysisTag: "ORBITAL ANALYTICS",
    dataTag: "DATA MANAGEMENT",

    processingEngine: "PROCESSING ENGINE",
    visualizationEngine: "VISUALIZATION ENGINE",
    simulationEngine: "SIMULATION ENGINE",

    localSession: "LOCAL SESSION",
    platformEdition: "ENGINEERING PLATFORM",
    moduleCount: "MODULE COUNT",
    commandOverview: "COMMAND OVERVIEW",
    architecture: "PLATFORM ARCHITECTURE",
    localStorage: "LOCAL STORAGE",
    ready: "READY",
    development: "DEVELOPMENT",

    activityInitialized: "Application interface initialized",
    activitySimulation: "Simulation engine available",
    activityData: "Data modules awaiting integration",

    noNotificationsDescription:
      "System events and notifications will appear here.",

    documentationDescription:
      "Technical documentation and the platform operation guide will be available here."
  }
};

/* ============================================================
   UTILITIES
============================================================ */

function readLanguage() {
  try {
    const stored = localStorage.getItem("orbital-shield-language");

    return stored === "ar" || stored === "en"
      ? stored
      : CONFIG.defaultLanguage;
  } catch {
    return CONFIG.defaultLanguage;
  }
}

function saveLanguage(language) {
  try {
    localStorage.setItem("orbital-shield-language", language);
  } catch (error) {
    console.warn("[ORBITAL SHIELD] Language storage unavailable", error);
  }
}

function getClock(language) {
  return new Date().toLocaleTimeString(
    language === "ar" ? "ar-SA" : "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }
  );
}

function getAllModules() {
  return NAVIGATION.flatMap(group => group.items);
}

/* ============================================================
   BRAND
============================================================ */

function BrandMark({ size = 40 }) {
  return (
    <div
      className="os-brand-mark"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 48 48"
        width="100%"
        height="100%"
        fill="none"
      >
        <path
          d="M24 4 42 14.5V34L24 44 6 34V14.5L24 4Z"
          stroke="currentColor"
          strokeWidth="1.4"
          opacity=".8"
        />
        <path
          d="M24 10 36 17V31L24 38 12 31V17L24 10Z"
          stroke="currentColor"
          strokeWidth="1.1"
          opacity=".55"
        />
        <ellipse
          cx="24"
          cy="24"
          rx="19"
          ry="8"
          stroke="#73C6FF"
          strokeWidth="1.4"
          transform="rotate(-35 24 24)"
        />
        <circle cx="24" cy="24" r="3.2" fill="#8ED5FF" />
        <circle cx="40" cy="13" r="2" fill="#8ED5FF" />
      </svg>
    </div>
  );
}

/* ============================================================
   SIDEBAR
============================================================ */

function Sidebar({
  language,
  t,
  activePage,
  onNavigate,
  collapsed,
  onToggle,
  mobileOpen,
  onMobileClose
}) {
  const isArabic = language === "ar";

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          className="os-mobile-backdrop"
          onClick={onMobileClose}
          aria-label={t.close}
        />
      )}

      <aside
        className={[
          "os-sidebar",
          collapsed ? "collapsed" : "",
          mobileOpen ? "mobile-open" : ""
        ].join(" ")}
      >
        <div className="os-sidebar-brand">
          <BrandMark size={39} />

          {!collapsed && (
            <div className="os-sidebar-brand-text">
              <strong>ORBITAL SHIELD</strong>
              <span>{t.brandSubtitle}</span>
            </div>
          )}

          <button
            type="button"
            className="os-mobile-close"
            onClick={onMobileClose}
            aria-label={t.close}
          >
            <X size={17} />
          </button>
        </div>

        <div className="os-sidebar-environment">
          <span className="os-environment-light" />

          {!collapsed && (
            <>
              <span>{t.localEnvironment}</span>
              <small>LOCAL</small>
            </>
          )}
        </div>

        <nav className="os-navigation" aria-label="Main navigation">
          {NAVIGATION.map(group => (
            <div className="os-nav-group" key={group.section}>
              {!collapsed && (
                <div className="os-nav-section-title">
                  {isArabic ? group.sectionAr : group.section}
                </div>
              )}

              {group.items.map(item => {
                const Icon = item.icon;
                const active = activePage === item.id;

                return (
                  <button
                    type="button"
                    key={item.id}
                    className={[
                      "os-nav-item",
                      active ? "active" : "",
                      item.featured ? "featured" : ""
                    ].join(" ")}
                    onClick={() => {
                      onNavigate(item.id);
                      onMobileClose();
                    }}
                    title={collapsed ? t[item.label] : undefined}
                    aria-current={active ? "page" : undefined}
                  >
                    <span className="os-nav-icon">
                      <Icon size={17} strokeWidth={1.7} />
                    </span>

                    {!collapsed && (
                      <>
                        <span className="os-nav-label">
                          {t[item.label]}
                        </span>

                        {item.featured && (
                          <span className="os-nav-featured">
                            <Sparkles size={11} />
                          </span>
                        )}

                        {item.status === "development" && (
                          <span className="os-nav-development">
                            DEV
                          </span>
                        )}
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="os-sidebar-bottom">
          {!collapsed && (
            <div className="os-sidebar-system-card">
              <div className="os-sidebar-system-icon">
                <Shield size={16} />
              </div>

              <div>
                <strong>{t.systemReady}</strong>
                <small>{t.noExternalConnection}</small>
              </div>

              <span className="os-system-green-dot" />
            </div>
          )}

          <button
            type="button"
            className="os-collapse-button"
            onClick={onToggle}
            title={collapsed ? t.sidebarExpand : t.sidebarCollapse}
          >
            {collapsed
              ? <ChevronRight size={16} />
              : <ChevronLeft size={16} />
            }

            {!collapsed && <span>{t.sidebarCollapse}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

/* ============================================================
   TOPBAR
============================================================ */

function Topbar({
  language,
  t,
  activePage,
  onLanguageChange,
  onMobileMenu,
  onSearch
}) {
  const [searchOpen, setSearchOpen] = useState(false);

  const metadata = MODULES[activePage] || MODULES.dashboard;
  const title = t[metadata.title];

  const toggleSearch = () => {
    setSearchOpen(value => {
      if (value) onSearch("");
      return !value;
    });
  };

  return (
    <header className="os-topbar">
      <div className="os-topbar-left">
        <button
          type="button"
          className="os-topbar-menu"
          onClick={onMobileMenu}
          aria-label="Menu"
        >
          <Menu size={19} />
        </button>

        <div className="os-breadcrumb">
          <span>ORBITAL SHIELD</span>
          <ChevronRight size={13} />
          <strong>{title}</strong>
        </div>
      </div>

      <div className="os-topbar-actions">
        {searchOpen && (
          <div className="os-topbar-search">
            <Search size={15} />

            <input
              autoFocus
              placeholder={t.searchPlaceholder}
              onChange={event => onSearch(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Escape") {
                  setSearchOpen(false);
                  onSearch("");
                }
              }}
            />

            <button
              type="button"
              onClick={() => {
                setSearchOpen(false);
                onSearch("");
              }}
              aria-label={t.close}
            >
              <X size={14} />
            </button>
          </div>
        )}

        <button
          type="button"
          className="os-topbar-icon"
          onClick={toggleSearch}
          title={t.search}
        >
          <Search size={17} />
        </button>

        <div className="os-topbar-divider" />

        <button
          type="button"
          className="os-topbar-language"
          onClick={() => onLanguageChange(language === "ar" ? "en" : "ar")}
        >
          <Globe2 size={15} />
          <span>{language === "ar" ? "EN" : "عربي"}</span>
        </button>

        <div className="os-topbar-user">
          <div className="os-user-avatar">
            <Shield size={15} />
          </div>

          <div className="os-user-info">
            <strong>OPERATOR</strong>
            <small>{t.localSession}</small>
          </div>
        </div>
      </div>
    </header>
  );
}

/* ============================================================
   DASHBOARD METRIC
============================================================ */

function MetricCard({
  icon: Icon,
  title,
  value,
  detail,
  accent
}) {
  return (
    <article className="os-dashboard-metric">
      <div className="os-dashboard-metric-top">
        <div
          className="os-dashboard-metric-icon"
          style={{
            color: accent,
            background: `${accent}12`,
            borderColor: `${accent}30`
          }}
        >
          <Icon size={18} />
        </div>

        <span className="os-metric-live">
          <span />
          LOCAL
        </span>
      </div>

      <div className="os-dashboard-metric-value">{value}</div>
      <div className="os-dashboard-metric-title">{title}</div>
      <div className="os-dashboard-metric-detail">{detail}</div>
    </article>
  );
}

/* ============================================================
   MODULE CARD
============================================================ */

function ModuleCard({
  item,
  language,
  t,
  onClick
}) {
  const Icon = item.icon;
  const isArabic = language === "ar";

  return (
    <button
      type="button"
      className="os-module-card"
      onClick={() => onClick(item.id)}
    >
      <div
        className="os-module-card-icon"
        style={{
          color: item.accent,
          background: `${item.accent}12`,
          borderColor: `${item.accent}30`
        }}
      >
        <Icon size={21} />
      </div>

      <div className="os-module-card-content">
        <strong>{t[item.title]}</strong>
        <p>
          {isArabic
            ? item.descriptionAr
            : item.description}
        </p>
      </div>

      <div className="os-module-card-footer">
        <span className={item.status === "ready" ? "ready" : "development"}>
          <span />
          {item.status === "ready"
            ? t.statusNominal
            : t.statusDevelopment}
        </span>

        {isArabic
          ? <ChevronLeft size={15} />
          : <ChevronRight size={15} />
        }
      </div>
    </button>
  );
}

/* ============================================================
   DASHBOARD
============================================================ */

function DashboardPage({
  language,
  t,
  onNavigate
}) {
  const [clock, setClock] = useState(() => getClock(language));

  const moduleItems = useMemo(() => {
    return getAllModules()
      .filter(item => item.id !== "dashboard")
      .map(item => ({
        ...item,
        ...MODULES[item.id]
      }));
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClock(getClock(language));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [language]);

  return (
    <div className="os-dashboard-page">
      <section className="os-welcome-banner">
        <div className="os-welcome-background">
          <div className="os-welcome-orbit orbit-one" />
          <div className="os-welcome-orbit orbit-two" />
          <div className="os-welcome-orbit orbit-three" />
          <div className="os-welcome-star star-one" />
          <div className="os-welcome-star star-two" />
          <div className="os-welcome-star star-three" />
        </div>

        <div className="os-welcome-content">
          <div className="os-welcome-eyebrow">
            <span />
            {t.operationalCenter}
          </div>

          <h1>{t.welcome}</h1>
          <p>{t.welcomeDescription}</p>

          <div className="os-welcome-actions">
            <button
              type="button"
              className="os-welcome-primary"
              onClick={() => onNavigate("simulation")}
            >
              <Orbit size={16} />
              {t.openSimulation}
            </button>

            <button
              type="button"
              className="os-welcome-secondary"
              onClick={() => onNavigate("surveillance")}
            >
              <Radio size={16} />
              {t.startMonitoring}
            </button>
          </div>
        </div>

        <div className="os-welcome-graphic">
          <BrandMark size={126} />

          <div className="os-welcome-graphic-label">
            <span />
            ORBITAL INTELLIGENCE
          </div>
        </div>
      </section>

      <section className="os-dashboard-status-strip">
        <StatusItem
          color="green"
          label={t.systemStatus}
          value={t.operational}
        />

        <StatusItem
          color="blue"
          label={t.environment}
          value={t.localEnvironment}
        />

        <StatusItem
          color="amber"
          label={t.currentTime}
          value={clock}
        />

        <StatusItem
          color="green"
          label={t.processingEngine}
          value={t.statusNominal}
        />
      </section>

      <section className="os-section">
        <SectionHeading
          eyebrow="SYSTEM OVERVIEW"
          title={t.overview}
          caption={t.localOnly}
        />

        <div className="os-dashboard-metrics">
          <MetricCard
            icon={Satellite}
            title={t.satellites}
            value="06"
            detail={t.trackedObjects}
            accent="#70B8FF"
          />

          <MetricCard
            icon={Target}
            title={t.trackedObjects}
            value="06"
            detail={t.syntheticNotice}
            accent="#45D6A0"
          />

          <MetricCard
            icon={Activity}
            title={t.orbitalEvents}
            value="—"
            detail={t.comingSoon}
            accent="#F4C96B"
          />

          <MetricCard
            icon={Layers3}
            title={t.systemModulesCount}
            value="11"
            detail={t.systemReady}
            accent="#A78BFA"
          />
        </div>
      </section>

      <section className="os-section">
        <SectionHeading
          eyebrow={t.architecture}
          title={t.systemModules}
          caption="ORBITAL SHIELD"
        />

        <div className="os-module-grid">
          {moduleItems.map(item => (
            <ModuleCard
              key={item.id}
              item={item}
              language={language}
              t={t}
              onClick={onNavigate}
            />
          ))}
        </div>
      </section>

      <section className="os-dashboard-bottom-grid">
        <article className="os-dashboard-panel">
          <div className="os-panel-heading">
            <div>
              <Activity size={16} />
              <strong>{t.recentActivity}</strong>
            </div>

            <span className="os-panel-tag">LOCAL</span>
          </div>

          <ActivityItem
            icon={Shield}
            color="blue"
            title={t.activityInitialized}
            detail={t.localEnvironment}
            time="NOW"
          />

          <ActivityItem
            icon={Orbit}
            color="green"
            title={t.activitySimulation}
            detail={t.systemReady}
            time="LOCAL"
          />

          <ActivityItem
            icon={Database}
            color="amber"
            title={t.activityData}
            detail={t.comingSoon}
            time="DEV"
          />
        </article>

        <article className="os-dashboard-panel os-notice-panel">
          <div className="os-panel-heading">
            <div>
              <ShieldAlert size={16} />
              <strong>{t.syntheticNotice}</strong>
            </div>
          </div>

          <div className="os-notice-content">
            <div className="os-notice-large-icon">
              <AlertTriangle size={23} />
            </div>

            <p>{t.syntheticDescription}</p>

            <div className="os-notice-status">
              <span />
              {t.systemReady}
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}

function StatusItem({ color, label, value }) {
  return (
    <div className="os-status-strip-item">
      <span className={`os-status-strip-dot ${color}`} />
      <div>
        <small>{label}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, caption }) {
  return (
    <div className="os-section-heading">
      <div>
        <span className="os-section-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
      </div>

      <span className="os-section-caption">{caption}</span>
    </div>
  );
}

function ActivityItem({
  icon: Icon,
  color,
  title,
  detail,
  time
}) {
  return (
    <div className="os-activity-item">
      <span className={`os-activity-icon ${color}`}>
        <Icon size={14} />
      </span>

      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>

      <time>{time}</time>
    </div>
  );
}

/* ============================================================
   ORBITAL SIMULATION + OPERATIONAL MODULES
============================================================ */

const ORBITAL_OBJECTS = [
  { name: "ISS (ZARYA)", norad: 25544, type: "STATION", altitude: 438, velocity: 7.647, inclination: 51.64, color: "#61D7FF", period: "92.6 min" },
  { name: "HST (HUBBLE)", norad: 20580, type: "SCIENCE", altitude: 544, velocity: 7.591, inclination: 28.47, color: "#B49AFF", period: "95.4 min" },
  { name: "STARLINK-1007", norad: 44713, type: "COMMS", altitude: 561, velocity: 7.580, inclination: 53.00, color: "#45D6A0", period: "95.8 min" },
  { name: "TERRA (EOS AM-1)", norad: 25994, type: "EARTH OBS", altitude: 710, velocity: 7.508, inclination: 98.20, color: "#FFC86B", period: "98.8 min" },
  { name: "GPS BIIR-2", norad: 36585, type: "NAV", altitude: 20238, velocity: 3.866, inclination: 55.00, color: "#FF9B70", period: "11 h 58 m" },
  { name: "GOES-16", norad: 41866, type: "WEATHER", altitude: 35786, velocity: 3.075, inclination: 0.05, color: "#70A9FF", period: "23 h 56 m" }
];

const ORBITAL_PANEL = {
  background: "linear-gradient(145deg,#0e2033,#091525)",
  border: "1px solid #1c3b56",
  borderRadius: 12,
  padding: 16,
  minWidth: 0
};
const ORBITAL_BUTTON = {
  background: "#123b5b",
  border: "1px solid #2877a9",
  color: "#dff4ff",
  borderRadius: 7,
  padding: "9px 13px",
  cursor: "pointer",
  fontSize: 12
};

function OrbitalSimulationPage({ language, onNavigate }) {
  const isAr = language === "ar";
  const [running, setRunning] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState(0);
  const chosen = ORBITAL_OBJECTS[selected];

  return (
    <section style={{ display: "grid", gap: 14, color: "#dceeff", direction: isAr ? "rtl" : "ltr" }}>
      <style>{`
        @keyframes osOrbitTurn { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes osEarthTurn { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        @keyframes osStarPulse { 0%,100%{opacity:.25} 50%{opacity:1} }
        .os-space-star { animation: osStarPulse 3s ease-in-out infinite; }
        .os-earth-spin { transform-origin: 400px 220px; animation: osEarthTurn 55s linear infinite; }
        .os-satellite-orbit { transform-origin: 400px 220px; animation: osOrbitTurn var(--orbit-speed) linear infinite; }
        .os-satellite-orbit.paused { animation-play-state: paused; }
        @media(max-width:900px){.os-orbit-layout{grid-template-columns:1fr!important}}
      `}</style>
      <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap" }}>
        <div>
          <div style={{fontSize:10,letterSpacing:2,color:"#65bfff"}}>ORBITAL SHIELD / LOCAL SPACE ENVIRONMENT</div>
          <h1 style={{fontSize:24,margin:"7px 0"}}>{isAr ? "مركز المحاكاة المدارية" : "ORBITAL SIMULATION CENTER"}</h1>
          <small style={{color:"#7fa6c8"}}>{isAr ? "الأرض والأقمار الصناعية والمدارات" : "Earth · satellites · orbital paths"}</small>
        </div>
        <button style={ORBITAL_BUTTON} onClick={() => onNavigate("dashboard")}>{isAr ? "لوحة القيادة" : "DASHBOARD"}</button>
      </div>

      <div className="os-orbit-layout" style={{display:"grid",gridTemplateColumns:"minmax(0,1.8fr) minmax(260px,.8fr)",gap:14}}>
        <div style={{...ORBITAL_PANEL,padding:0,overflow:"hidden"}}>
          <div style={{padding:"13px 16px",borderBottom:"1px solid #1c3b56",display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}>
            <b>{isAr ? "المشهد المداري ثلاثي الأبعاد" : "ORBITAL VISUALIZATION"}</b>
            <span style={{color:"#39d6a5",fontSize:10}}>● LOCAL VISUALIZATION</span>
          </div>
          <div style={{minHeight:430,position:"relative",overflow:"hidden",background:"radial-gradient(ellipse at 50% 48%,#102e49 0,#071321 60%,#050d18 100%)",display:"grid",placeItems:"center"}}>
            <svg viewBox="0 0 800 440" width="100%" height="430" role="img" aria-label="Earth and satellite orbital visualization" style={{position:"absolute",inset:0}}>
              {Array.from({length:85},(_,i)=><circle key={i} className="os-space-star" cx={(i*137+29)%800} cy={(i*71+13)%440} r={i%7===0?1.5:.8} fill="#9bdcff" style={{animationDelay:`${i%5}s`}} />)}
              <defs>
                <radialGradient id="osEarthGradient" cx="34%" cy="28%"><stop offset="0%" stopColor="#9eeaff"/><stop offset="35%" stopColor="#287eb5"/><stop offset="72%" stopColor="#10416e"/><stop offset="100%" stopColor="#06172a"/></radialGradient>
                <clipPath id="osEarthClip"><circle cx="400" cy="220" r="112"/></clipPath>
                <filter id="osEarthGlow"><feGaussianBlur stdDeviation="13"/></filter>
              </defs>
              <circle cx="400" cy="220" r="137" fill="#2aa9ff" opacity=".12" filter="url(#osEarthGlow)"/>
              {ORBITAL_OBJECTS.map((sat,i)=><ellipse key={sat.norad} cx="400" cy="220" rx={150+i*24} ry={48+i*9} fill="none" stroke={sat.color} strokeOpacity={selected===i?".9":".42"} strokeWidth={selected===i?2:1} strokeDasharray={i%2?"5 5":"none"} transform={`rotate(${[-24,32,68,-55,12,0][i]} 400 220)`}/>)}
              <g className="os-earth-spin">
                <circle cx="400" cy="220" r="112" fill="url(#osEarthGradient)" stroke="#68cfff" strokeWidth="1.5"/>
                <g clipPath="url(#osEarthClip)" fill="#5cb68b" opacity=".8">
                  <path d="M330 143l24-18 30 8 12 19-14 15-4 23-22 12-17-14-22-5-8-21zM420 155l25-12 28 12 9 22-13 19-7 25-18 8-16-18-17-7-8-26zM390 244l22-10 17 13 7 25-15 24-20 13-15-19 4-22zM470 250l22-8 18 17-9 22-22 8-17-16z"/>
                </g>
                <ellipse cx="400" cy="220" rx="112" ry="36" fill="none" stroke="#b4edff" strokeOpacity=".2"/>
              </g>
              {ORBITAL_OBJECTS.map((sat,i)=><g key={sat.norad} className={`os-satellite-orbit ${running?"":"paused"}`} style={{"--orbit-speed":`${Math.max(8,42/speed)}s`}} transform={`rotate(${[-24,32,68,-55,12,0][i]} 400 220)`}><circle cx="400" cy={220-(150+i*24)} r={selected===i?6:4} fill={sat.color} stroke="#e6f8ff" strokeWidth="1"/><path d={`M400 ${220-(150+i*24)} l-8 -5 m8 5 l8 -5 m-8 5 l0 10`} stroke={sat.color} strokeWidth="2" fill="none"/></g>)}
            </svg>
            <div style={{position:"absolute",bottom:12,left:14,fontSize:10,color:"#83bde6"}}>SCHEMATIC ORBIT MODEL</div>
            <div style={{position:"absolute",top:12,right:14,fontSize:10,color:"#58d6b2"}}>06 OBJECTS LOADED</div>
          </div>
          <div style={{padding:13,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
            <button style={ORBITAL_BUTTON} onClick={()=>setRunning(v=>!v)}>{running?(isAr?"إيقاف الحركة":"PAUSE"):(isAr?"تشغيل الحركة":"PLAY")}</button>
            <label style={{fontSize:11,color:"#8eb1ce"}}>{isAr?"سرعة الحركة":"SPEED"} <select value={speed} onChange={e=>setSpeed(Number(e.target.value))} style={{marginInlineStart:8,background:"#081727",color:"#dff4ff",border:"1px solid #284963",padding:7,borderRadius:6}}><option value="0.5">0.5×</option><option value="1">1×</option><option value="2">2×</option><option value="4">4×</option></select></label>
            <span style={{marginInlineStart:"auto",fontSize:10,color:"#d9b875"}}>ILLUSTRATIVE · NOT SGP4</span>
          </div>
        </div>

        <div style={{...ORBITAL_PANEL}}>
          <b>{isAr?"الأجسام المتتبعة":"TRACKED OBJECTS"}</b>
          <small style={{display:"block",color:"#7899b8",marginTop:5,marginBottom:12}}>SELECT OBJECT / NORAD ID</small>
          <div style={{display:"grid",gap:7}}>
            {ORBITAL_OBJECTS.map((sat,i)=><button key={sat.norad} onClick={()=>setSelected(i)} style={{textAlign:"start",display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,padding:10,borderRadius:7,border:`1px solid ${selected===i?"#3b9bd0":"#19364f"}`,background:selected===i?"#12314b":"#091827",color:"#dceeff",cursor:"pointer"}}>
              <span><b style={{display:"block",fontSize:11}}>{sat.name}</b><small style={{color:"#7899b8"}}>NORAD {sat.norad}</small></span><span style={{width:8,height:8,borderRadius:20,background:sat.color,flexShrink:0}}/>
            </button>)}
          </div>
          <div style={{marginTop:13,padding:12,borderRadius:8,background:"#081727",border:"1px solid #1c3b56"}}>
            <b style={{fontSize:12}}>{isAr?"بيانات الجسم المحدد":"SELECTED OBJECT"}</b>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginTop:12}}>
              {[[isAr?"الارتفاع":"ALTITUDE",`${chosen.altitude.toLocaleString()} km`],[isAr?"السرعة":"VELOCITY",`${chosen.velocity} km/s`],[isAr?"الميل":"INCLINATION",`${chosen.inclination}°`],[isAr?"الدورة":"PERIOD",chosen.period]].map(([k,v])=><div key={k}><small style={{display:"block",color:"#7899b8",fontSize:10}}>{k}</small><strong style={{fontSize:12}}>{v}</strong></div>)}
            </div>
          </div>
        </div>
      </div>
      <div style={ORBITAL_PANEL}>
        <b>{isAr?"حالة بيئة المحاكاة":"SIMULATION ENVIRONMENT"}</b>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10,marginTop:12}}>
          {[[isAr?"الأجسام":"OBJECTS","06"],[isAr?"محرك العرض":"VISUAL ENGINE","ACTIVE"],[isAr?"مصدر البيانات":"DATA SOURCE","LOCAL SAMPLE"],[isAr?"نموذج المدار":"ORBIT MODEL","SCHEMATIC"]].map(([k,v])=><div key={k} style={{background:"#081727",padding:12,borderRadius:7,border:"1px solid #19364f"}}><small style={{color:"#7899b8"}}>{k}</small><strong style={{display:"block",marginTop:7}}>{v}</strong></div>)}
        </div>
        <p style={{color:"#d9b875",fontSize:11,lineHeight:1.8,marginBottom:0}}>{isAr?"تنبيه هندسي: مواقع الأقمار وحركتها هنا توضيحية وليست محسوبة من عناصر TLE. يلزم دمج SGP4 وبيانات TLE حديثة للحصول على مواقع ومدارات فعلية.":"Engineering note: object positions and motion are illustrative, not propagated from TLE. SGP4 and current TLE data are required for real orbital states."}</p>
      </div>
    </section>
  );
}

function DevelopmentPage({ page, language, t, onNavigate }) {
  const isAr = language === "ar";
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("ALL");
  const [tleText, setTleText] = useState("ISS (ZARYA)\n1 25544U 98067A   24080.50000000  .00016717  00000+0  30120-3 0  9990\n2 25544  51.6400 120.0000 0005000  80.0000 280.0000 15.50000000440000");
  const objects = ORBITAL_OBJECTS.map(o=>({...o,type:o.type,category:o.type}));
  const visible = objects.filter(o=>(category==="ALL"||o.category===category)&&(o.name.toLowerCase().includes(query.toLowerCase())||String(o.norad).includes(query)));
  const titles = {
    surveillance: ["مركز المراقبة الفضائية","SPACE SURVEILLANCE CENTER"],
    catalog: ["كتالوج الأجسام المدارية","ORBITAL OBJECT CATALOG"],
    analysis: ["التحليلات المدارية","ORBITAL ANALYTICS"],
    conjunctions: ["تحليل الاقترانات المدارية","CONJUNCTION SCREENING"],
    groundTrack: ["المسارات الأرضية","GROUND TRACKS"],
    dataCenter: ["مركز البيانات واستيراد TLE","DATA CENTER / TLE IMPORT"]
  };
  const title=(titles[page]||[t[MODULES[page]?.title]||"وحدة النظام","SYSTEM MODULE"])[isAr?0:1];
  const th={padding:11,textAlign:isAr?"right":"left",fontSize:10,color:"#7fa6c8",borderBottom:"1px solid #1c3b56",whiteSpace:"nowrap"};
  const td={padding:11,fontSize:11,color:"#d7e8f7",borderBottom:"1px solid #142d43"};
  const exportJson=()=>{const blob=new Blob([JSON.stringify(objects,null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="orbital-shield-objects.json";a.click();URL.revokeObjectURL(url);};
  const table=(rows)=><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse"}}><thead><tr>{[isAr?"الجسم":"OBJECT","NORAD",isAr?"النوع":"TYPE",isAr?"الارتفاع":"ALTITUDE",isAr?"السرعة":"VELOCITY",isAr?"الميل":"INCLINATION"].map(x=><th key={x} style={th}>{x}</th>)}</tr></thead><tbody>{rows.map(o=><tr key={o.norad}><td style={td}><b>{o.name}</b></td><td style={td}>{o.norad}</td><td style={td}>{o.type}</td><td style={td}>{o.altitude.toLocaleString()} km</td><td style={td}>{o.velocity.toFixed(3)} km/s</td><td style={td}>{o.inclination.toFixed(2)}°</td></tr>)}</tbody></table></div>;
  return (
    <section style={{display:"grid",gap:15,color:"#dceeff",direction:isAr?"rtl":"ltr"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div><div style={{fontSize:10,letterSpacing:2,color:"#65bfff"}}>ORBITAL SHIELD / LOCAL OPERATIONS</div><h1 style={{fontSize:24,margin:"7px 0"}}>{title}</h1><small style={{color:"#7899b8"}}>{isAr?"أدوات تشغيل محلية وبيانات أقمار نموذجية":"Local operational tools and sample satellite records"}</small></div>
        <button style={ORBITAL_BUTTON} onClick={()=>onNavigate("dashboard")}>{isAr?"العودة للوحة القيادة":"BACK TO DASHBOARD"}</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10}}>
        {[[isAr?"الأجسام المسجلة":"REGISTERED OBJECTS",objects.length],[isAr?"أقمار الاتصالات":"COMMUNICATIONS",1],[isAr?"الرصد والعلوم":"OBSERVATION / SCIENCE",2],[isAr?"الملاحة والطقس":"NAVIGATION / WEATHER",2]].map(([k,v])=><div key={k} style={ORBITAL_PANEL}><small style={{color:"#83a9c9"}}>{k}</small><strong style={{display:"block",fontSize:24,marginTop:8}}>{v}</strong></div>)}
      </div>

      {(page==="surveillance"||page==="catalog")&&<div style={ORBITAL_PANEL}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",marginBottom:13}}><b>{isAr?"سجل الأجسام المدارية":"ORBITAL OBJECT REGISTRY"}</b><button style={ORBITAL_BUTTON} onClick={exportJson}>{isAr?"تصدير JSON":"EXPORT JSON"}</button></div>
        <div style={{display:"flex",gap:9,flexWrap:"wrap",marginBottom:12}}><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={isAr?"ابحث بالاسم أو رقم NORAD...":"Search name or NORAD ID..."} style={{flex:"1 1 220px",background:"#081727",border:"1px solid #23435e",borderRadius:7,padding:10,color:"white"}}/><select value={category} onChange={e=>setCategory(e.target.value)} style={{background:"#081727",border:"1px solid #23435e",borderRadius:7,padding:10,color:"white"}}>{["ALL",...new Set(objects.map(o=>o.category))].map(x=><option key={x} value={x}>{x}</option>)}</select></div>
        {table(visible)}
      </div>}

      {page==="analysis"&&<div style={ORBITAL_PANEL}>
        <b>{isAr?"مقارنة الارتفاعات المدارية":"ORBITAL ALTITUDE COMPARISON"}</b>
        <div style={{height:230,display:"flex",alignItems:"end",gap:12,padding:"18px 8px 8px",marginTop:12,borderBottom:"1px solid #28435b"}}>
          {objects.map(o=><div key={o.norad} title={`${o.name}: ${o.altitude} km`} style={{flex:1,minWidth:16,height:`${Math.max(4,o.altitude/36000*100)}%`,background:"linear-gradient(0deg,#17649a,#67d6ff)",borderRadius:"5px 5px 0 0",position:"relative"}}><small style={{position:"absolute",top:"100%",left:"50%",transform:"translateX(-50%)",fontSize:9,color:"#9bbbd4",whiteSpace:"nowrap"}}>{o.name.split(" ")[0]}</small></div>)}
        </div><div style={{marginTop:30}}>{table(objects)}</div>
      </div>}

      {page==="conjunctions"&&<div style={ORBITAL_PANEL}>
        <div style={{display:"flex",justifyContent:"space-between",gap:10,flexWrap:"wrap"}}><b>{isAr?"فحص فروق الارتفاع بين الأجسام":"OBJECT ALTITUDE DIFFERENCE SCREEN"}</b><span style={{fontSize:10,color:"#e9b85b"}}>PRELIMINARY · NOT COLLISION RISK</span></div>
        <p style={{fontSize:12,color:"#91abc3",lineHeight:1.8}}>{isAr?"يعرض الجدول فروق الارتفاع فقط، ولا يحسب مسافة الاقتراب أو احتمالية التصادم. يتطلب ذلك بيانات مدارية زمنية ومحرك SGP4.":"This view compares altitude bands only. It does not calculate miss distance or collision probability; those require time-propagated states and SGP4."}</p>
        {objects.slice(0,-1).map((o,i)=><div key={o.norad} style={{display:"flex",justifyContent:"space-between",gap:10,padding:12,borderBottom:"1px solid #19344c",fontSize:11,flexWrap:"wrap"}}><span>{o.name} ↔ {objects[i+1].name}</span><b style={{color:"#8ccfff"}}>{Math.abs(o.altitude-objects[i+1].altitude).toLocaleString()} km altitude gap</b></div>)}
      </div>}

      {page==="groundTrack"&&<div style={ORBITAL_PANEL}>
        <b>{isAr?"معاينة المسارات الأرضية التوضيحية":"GROUND TRACK PREVIEW"}</b>
        <div style={{height:290,marginTop:14,borderRadius:10,background:"radial-gradient(ellipse at center,#123653,#071321 72%)",border:"1px solid #21415d",display:"grid",placeItems:"center",overflow:"hidden"}}>
          <svg viewBox="0 0 800 300" width="100%" height="100%"><g fill="none" stroke="#235276" strokeWidth="1"><ellipse cx="400" cy="150" rx="340" ry="105"/><ellipse cx="400" cy="150" rx="340" ry="55"/><path d="M60 150H740M400 45V255"/></g>{objects.slice(0,4).map((o,i)=><path key={o.norad} d={`M ${70+i*12} ${150+i*8} Q 250 ${20+i*30} 400 ${150-i*10} T 730 ${150+i*5}`} fill="none" stroke={o.color} strokeWidth="2"/>)}</svg>
        </div><small style={{display:"block",marginTop:10,color:"#d9b875"}}>{isAr?"المسارات رسم توضيحي وليست مسارات جغرافية محسوبة من TLE.":"Schematic tracks only; not propagated from TLE."}</small>
      </div>}

      {page==="dataCenter"&&<div style={ORBITAL_PANEL}>
        <b>{isAr?"استيراد عناصر TLE":"TLE IMPORT"}</b>
        <p style={{color:"#91abc3",fontSize:12,lineHeight:1.8}}>{isAr?"الصق اسم الجسم ثم سطري TLE. يتم التحقق من تنسيق السطور محليًا في هذه النسخة.":"Paste the object name followed by its two TLE lines. This version validates line structure locally."}</p>
        <textarea value={tleText} onChange={e=>setTleText(e.target.value)} rows={6} style={{width:"100%",boxSizing:"border-box",background:"#081727",color:"#dceeff",border:"1px solid #23435e",borderRadius:8,padding:12,fontFamily:"monospace"}}/>
        <button style={{...ORBITAL_BUTTON,marginTop:10}} onClick={()=>{const lines=tleText.trim().split(/\r?\n/);const valid=lines.length>=3&&lines[1].startsWith("1 ")&&lines[2].startsWith("2 ")&&lines[1].slice(2,7)===lines[2].slice(2,7);alert(valid?(isAr?"تنسيق TLE متوافق مبدئيًا. لم يتم حساب المدار أو حفظ السجل بعد.":"TLE structure looks valid. No orbit has been propagated or record saved yet."):(isAr?"تحقق من الاسم وسطرَي TLE ورقم NORAD.":"Check the object name, both TLE lines, and matching NORAD IDs."));}}>{isAr?"التحقق من TLE":"VALIDATE TLE"}</button>
      </div>}

      <div style={{...ORBITAL_PANEL,fontSize:11,color:"#d9b875",lineHeight:1.8}}>{isAr?"تنبيه: البيانات الحالية نموذجية وثابتة. العرض لا يستخدم SGP4 ولا يحسب مدارات فعلية. يمكن إضافة محرك SGP4 وربط ملفات TLE محلية في مرحلة لاحقة.":"Notice: current records are fixed illustrative samples. This interface does not run SGP4 or compute real orbits. An SGP4 engine and local TLE ingestion can be integrated in a subsequent stage."}</div>
    </section>
  );
}

/* ============================================================
   NOTIFICATIONS
============================================================ */

function NotificationsPage({ language, t }) {
  return (
    <section className="os-simple-page">
      <SectionHeading
        eyebrow="SYSTEM MESSAGES"
        title={t.notificationsTitle}
        caption="LOCAL EVENTS"
      />

      <div className="os-empty-state">
        <div className="os-empty-icon">
          <Bell size={25} />
        </div>

        <h3>{t.noNotifications}</h3>
        <p>{t.noNotificationsDescription}</p>
      </div>
    </section>
  );
}

/* ============================================================
   SETTINGS
============================================================ */

function SettingsPage({
  language,
  t,
  onLanguageChange
}) {
  return (
    <section className="os-simple-page">
      <SectionHeading
        eyebrow="SYSTEM CONFIGURATION"
        title={t.preferences}
        caption={CONFIG.environment}
      />

      <div className="os-settings-card">
        <div className="os-settings-heading">
          <div className="os-settings-icon">
            <Globe2 size={18} />
          </div>

          <div>
            <strong>{t.languageSettings}</strong>
            <small>{t.language}</small>
          </div>
        </div>

        <div className="os-settings-options">
          <button
            type="button"
            className={language === "ar" ? "selected" : ""}
            onClick={() => onLanguageChange("ar")}
          >
            <span>العربية</span>
            <small>AR</small>
          </button>

          <button
            type="button"
            className={language === "en" ? "selected" : ""}
            onClick={() => onLanguageChange("en")}
          >
            <span>English</span>
            <small>EN</small>
          </button>
        </div>
      </div>

      <div className="os-settings-card">
        <div className="os-settings-heading">
          <div className="os-settings-icon">
            <Shield size={18} />
          </div>

          <div>
            <strong>{t.systemInformation}</strong>
            <small>{CONFIG.edition}</small>
          </div>
        </div>

        <div className="os-settings-information">
          <div>
            <span>{t.version}</span>
            <strong>{CONFIG.version}</strong>
          </div>

          <div>
            <span>{t.environment}</span>
            <strong>{CONFIG.environment}</strong>
          </div>

          <div>
            <span>{t.systemStatus}</span>
            <strong className="os-text-green">{t.statusNominal}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   DOCUMENTATION
============================================================ */

function DocumentationPage({ t }) {
  return (
    <section className="os-simple-page">
      <SectionHeading
        eyebrow="ENGINEERING REFERENCE"
        title={t.documentation}
        caption="DOCUMENTATION"
      />

      <div className="os-empty-state">
        <div className="os-empty-icon">
          <BookOpen size={25} />
        </div>

        <h3>{t.documentation}</h3>
        <p>{t.documentationDescription}</p>
      </div>
    </section>
  );
}

/* ============================================================
   SEARCH
============================================================ */

function SearchResults({
  query,
  language,
  t,
  onNavigate,
  onClose
}) {
  const normalized = query.trim().toLocaleLowerCase();

  if (!normalized) return null;

  const results = getAllModules().filter(item => {
    const label = t[item.label] || "";
    const description = language === "ar"
      ? item.descriptionAr
      : item.description;

    return (
      label.toLocaleLowerCase().includes(normalized) ||
      description.toLocaleLowerCase().includes(normalized) ||
      item.id.toLocaleLowerCase().includes(normalized)
    );
  });

  return (
    <div className="os-search-results">
      <div className="os-search-results-heading">
        <span>{t.searchResults}</span>

        <button
          type="button"
          onClick={onClose}
          aria-label={t.close}
        >
          <X size={14} />
        </button>
      </div>

      {results.length === 0 ? (
        <div className="os-search-no-results">
          {t.noResults}
        </div>
      ) : (
        results.map(item => {
          const Icon = item.icon;

          return (
            <button
              type="button"
              key={item.id}
              onClick={() => {
                onNavigate(item.id);
                onClose();
              }}
            >
              <Icon size={16} />
              <span>{t[item.label]}</span>
              <ChevronRight size={13} />
            </button>
          );
        })
      )}
    </div>
  );
}

/* ============================================================
   APPLICATION STYLES
============================================================ */

function ApplicationStyles() {
  return (
    <style>{`
      :root {
        color-scheme: dark;
        font-family: "Segoe UI", Tahoma, Arial, sans-serif;
        background: #070C17;
      }

      * {
        box-sizing: border-box;
      }

      html, body, #root {
        min-height: 100%;
        margin: 0;
      }

      body {
        min-width: 320px;
        background: #070C17;
        color: #E6EEF9;
      }

      button, input, select {
        font: inherit;
      }

      button {
        -webkit-tap-highlight-color: transparent;
      }

      .os-app {
        --os-bg: #070C17;
        --os-panel: #0D1828;
        --os-panel-light: #122239;
        --os-border: rgba(141,180,220,.13);
        --os-text: #E6EEF9;
        --os-muted: #839BB7;
        --os-blue: #69B9FF;

        min-height: 100vh;
        background:
          radial-gradient(
            ellipse at 70% 0%,
            rgba(39,104,166,.08),
            transparent 45%
          ),
          var(--os-bg);
        color: var(--os-text);
      }

      .os-app-shell {
        min-height: 100vh;
      }

      /* SIDEBAR */

      .os-sidebar {
        position: fixed;
        z-index: 50;
        top: 0;
        bottom: 0;
        inset-inline-start: 0;
        display: flex;
        flex-direction: column;
        width: 252px;
        border-inline-end: 1px solid var(--os-border);
        background: #091321;
        transition: width .22s ease, transform .22s ease;
      }

      .os-sidebar.collapsed {
        width: 76px;
      }

      .os-sidebar-brand {
        display: flex;
        align-items: center;
        gap: 11px;
        min-height: 78px;
        padding: 0 17px;
        border-bottom: 1px solid var(--os-border);
      }

      .os-brand-mark {
        display: grid;
        place-items: center;
        flex: 0 0 auto;
        color: #76C7FF;
        filter: drop-shadow(0 0 12px rgba(83,175,255,.2));
      }

      .os-sidebar-brand-text {
        min-width: 0;
      }

      .os-sidebar-brand-text strong {
        display: block;
        color: #EAF5FF;
        font-size: 11px;
        letter-spacing: .12em;
        white-space: nowrap;
      }

      .os-sidebar-brand-text span {
        display: block;
        margin-top: 5px;
        color: #6F8AA9;
        font-size: 8px;
        white-space: nowrap;
      }

      .os-mobile-close {
        display: none;
        margin-inline-start: auto;
        border: 0;
        background: transparent;
        color: #9EB6D0;
        cursor: pointer;
      }

      .os-sidebar.collapsed .os-sidebar-brand {
        justify-content: center;
        padding: 0;
      }

      .os-sidebar-environment {
        display: flex;
        align-items: center;
        gap: 8px;
        min-height: 37px;
        margin: 12px 13px 6px;
        padding: 0 10px;
        border: 1px solid rgba(69,214,160,.12);
        border-radius: 6px;
        background: rgba(69,214,160,.035);
        color: #83BCA7;
        font-size: 9px;
      }

      .os-environment-light {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #45D6A0;
        box-shadow: 0 0 8px #45D6A0;
      }

      .os-sidebar-environment small {
        margin-inline-start: auto;
        color: #668D7E;
        font-size: 7px;
      }

      .os-sidebar.collapsed .os-sidebar-environment {
        justify-content: center;
        margin-inline: 19px;
        padding: 0;
        border-color: transparent;
        background: transparent;
      }

      .os-navigation {
        flex: 1;
        overflow-y: auto;
        padding: 7px 10px 15px;
      }

      .os-nav-group {
        margin-bottom: 17px;
      }

      .os-nav-section-title {
        padding: 12px 10px 8px;
        color: #536C88;
        font-size: 8px;
        font-weight: 700;
        letter-spacing: .14em;
      }

      .os-nav-item {
        position: relative;
        display: flex;
        align-items: center;
        gap: 11px;
        width: 100%;
        min-height: 41px;
        margin: 2px 0;
        padding: 0 11px;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        color: #8DA5C0;
        text-align: start;
        cursor: pointer;
        transition: .16s ease;
      }

      .os-nav-item:hover {
        background: rgba(103,177,242,.055);
        color: #D7E9FB;
      }

      .os-nav-item.active {
        border-color: rgba(101,181,255,.15);
        background: linear-gradient(
          90deg,
          rgba(52,129,194,.17),
          rgba(52,129,194,.045)
        );
        color: #A9D8FF;
      }

      .os-nav-item.active::before {
        position: absolute;
        top: 8px;
        bottom: 8px;
        inset-inline-start: -11px;
        width: 2px;
        border-radius: 2px;
        background: #65B5FF;
        box-shadow: 0 0 9px rgba(101,181,255,.5);
        content: "";
      }

      .os-nav-icon {
        display: grid;
        place-items: center;
        width: 22px;
        flex: 0 0 22px;
      }

      .os-nav-label {
        flex: 1;
        font-size: 10px;
        font-weight: 550;
        white-space: nowrap;
      }

      .os-nav-featured {
        color: #86C9FF;
      }

      .os-nav-development {
        color: #607C9B;
        font-size: 7px;
        letter-spacing: .05em;
      }

      .os-sidebar.collapsed .os-navigation {
        padding-inline: 12px;
      }

      .os-sidebar.collapsed .os-nav-item {
        justify-content: center;
        padding: 0;
      }

      .os-sidebar.collapsed .os-nav-item.active::before {
        inset-inline-start: -12px;
      }

      .os-sidebar-bottom {
        padding: 12px;
        border-top: 1px solid var(--os-border);
      }

      .os-sidebar-system-card {
        display: flex;
        align-items: center;
        gap: 9px;
        padding: 10px 8px;
        border: 1px solid rgba(69,214,160,.12);
        border-radius: 7px;
        background: rgba(69,214,160,.035);
      }

      .os-sidebar-system-icon {
        display: grid;
        place-items: center;
        width: 29px;
        height: 29px;
        border-radius: 6px;
        background: rgba(69,214,160,.1);
        color: #64D9A8;
      }

      .os-sidebar-system-card > div:nth-child(2) {
        flex: 1;
        min-width: 0;
      }

      .os-sidebar-system-card strong {
        display: block;
        color: #8BD8B8;
        font-size: 8px;
      }

      .os-sidebar-system-card small {
        display: block;
        margin-top: 4px;
        color: #688E82;
        font-size: 7px;
      }

      .os-system-green-dot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #45D6A0;
      }

      .os-collapse-button {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        width: 100%;
        min-height: 35px;
        margin-top: 9px;
        border: 1px solid transparent;
        border-radius: 5px;
        background: transparent;
        color: #7891AD;
        font-size: 9px;
        cursor: pointer;
      }

      .os-collapse-button:hover {
        border-color: var(--os-border);
        background: rgba(255,255,255,.025);
        color: #C4D8EC;
      }

      /* MAIN AREA */

      .os-main {
        min-height: 100vh;
        margin-inline-start: 252px;
        transition: margin .22s ease;
      }

      .os-app.os-sidebar-collapsed .os-main {
        margin-inline-start: 76px;
      }

      .os-topbar {
        position: sticky;
        z-index: 35;
        top: 0;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 65px;
        padding: 0 27px;
        border-bottom: 1px solid var(--os-border);
        background: rgba(7,13,24,.91);
        backdrop-filter: blur(16px);
      }

      .os-topbar-left,
      .os-topbar-actions {
        display: flex;
        align-items: center;
        gap: 13px;
      }

      .os-topbar-menu {
        display: none;
        place-items: center;
        width: 34px;
        height: 34px;
        border: 1px solid var(--os-border);
        border-radius: 6px;
        background: transparent;
        color: #B3CBE3;
        cursor: pointer;
      }

      .os-breadcrumb {
        display: flex;
        align-items: center;
        gap: 9px;
        color: #6985A4;
        font-size: 9px;
      }

      .os-breadcrumb strong {
        color: #D9E8F8;
        font-size: 10px;
        font-weight: 600;
      }

      .os-topbar-icon,
      .os-topbar-language {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 7px;
        min-width: 34px;
        height: 34px;
        padding: 0 9px;
        border: 1px solid transparent;
        border-radius: 6px;
        background: transparent;
        color: #9AB1CA;
        cursor: pointer;
      }

      .os-topbar-icon:hover,
      .os-topbar-language:hover {
        border-color: var(--os-border);
        background: rgba(255,255,255,.035);
        color: #E2F1FF;
      }

      .os-topbar-language {
        font-size: 9px;
      }

      .os-topbar-divider {
        width: 1px;
        height: 23px;
        background: var(--os-border);
      }

      .os-topbar-user {
        display: flex;
        align-items: center;
        gap: 8px;
        padding-inline-start: 11px;
        border-inline-start: 1px solid var(--os-border);
      }

      .os-user-avatar {
        display: grid;
        place-items: center;
        width: 31px;
        height: 31px;
        border: 1px solid rgba(101,181,255,.2);
        border-radius: 7px;
        background: rgba(101,181,255,.08);
        color: #83C7FF;
      }

      .os-user-info strong {
        display: block;
        color: #C4D8ED;
        font-size: 8px;
        letter-spacing: .08em;
      }

      .os-user-info small {
        display: block;
        margin-top: 4px;
        color: #617D9C;
        font-size: 7px;
      }

      .os-topbar-search {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 220px;
        padding: 0 8px;
        border: 1px solid rgba(101,181,255,.2);
        border-radius: 6px;
        color: #82BFFF;
      }

      .os-topbar-search input {
        width: 100%;
        height: 32px;
        border: 0;
        outline: 0;
        background: transparent;
        color: #E6F2FF;
        font-size: 10px;
      }

      .os-topbar-search button {
        display: grid;
        place-items: center;
        border: 0;
        background: transparent;
        color: #8CA5C0;
        cursor: pointer;
      }

      .os-page-content {
        width: min(1600px, 100%);
        min-height: calc(100vh - 65px);
        margin: 0 auto;
        padding: 25px 28px 18px;
      }

      .os-page-footer {
        display: flex;
        justify-content: space-between;
        gap: 15px;
        margin-top: 28px;
        padding: 14px 0;
        border-top: 1px solid var(--os-border);
        color: #5E7793;
        font-size: 8px;
        letter-spacing: .1em;
      }

      /* DASHBOARD HERO */

      .os-welcome-banner {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 255px;
        overflow: hidden;
        padding: 32px 36px;
        border: 1px solid rgba(101,181,255,.17);
        border-radius: 11px;
        background: linear-gradient(
          110deg,
          rgba(16,43,70,.96),
          rgba(10,26,46,.94) 55%,
          rgba(10,23,41,.98)
        );
      }

      .os-welcome-background {
        position: absolute;
        inset: 0;
        overflow: hidden;
        pointer-events: none;
      }

      .os-welcome-orbit {
        position: absolute;
        top: 50%;
        inset-inline-end: 7%;
        width: 290px;
        height: 120px;
        border: 1px solid rgba(103,190,255,.16);
        border-radius: 50%;
        transform: translateY(-50%) rotate(-28deg);
      }

      .os-welcome-orbit.orbit-two {
        width: 350px;
        height: 165px;
        transform: translateY(-50%) rotate(35deg);
      }

      .os-welcome-orbit.orbit-three {
        width: 220px;
        height: 220px;
        transform: translateY(-50%);
      }

      .os-welcome-star {
        position: absolute;
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #9EDAFF;
        box-shadow: 0 0 13px #65B5FF;
      }

      .os-welcome-star.star-one {
        top: 23%;
        inset-inline-end: 15%;
      }

      .os-welcome-star.star-two {
        top: 70%;
        inset-inline-end: 28%;
      }

      .os-welcome-star.star-three {
        top: 36%;
        inset-inline-end: 4%;
      }

      .os-welcome-content {
        position: relative;
        z-index: 2;
        max-width: 650px;
      }

      .os-welcome-eyebrow {
        display: flex;
        align-items: center;
        gap: 9px;
        color: #7FC6FF;
        font-size: 9px;
        font-weight: 700;
        letter-spacing: .17em;
      }

      .os-welcome-eyebrow span {
        width: 19px;
        height: 1px;
        background: #75C5FF;
      }

      .os-welcome-content h1 {
        margin: 17px 0 10px;
        color: #F1F7FF;
        font-size: clamp(23px,3vw,34px);
        font-weight: 600;
      }

      .os-welcome-content p {
        max-width: 580px;
        margin: 0;
        color: #9CB5D0;
        font-size: 12px;
        line-height: 1.9;
      }

      .os-welcome-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        margin-top: 24px;
      }

      .os-welcome-primary,
      .os-welcome-secondary {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 9px;
        min-height: 39px;
        padding: 0 15px;
        border: 1px solid transparent;
        border-radius: 6px;
        font-size: 9px;
        font-weight: 650;
        cursor: pointer;
        transition: .17s ease;
      }

      .os-welcome-primary {
        background: linear-gradient(135deg,#3B91D4,#2466A4);
        color: #fff;
        box-shadow: 0 7px 20px rgba(32,111,177,.16);
      }

      .os-welcome-primary:hover {
        filter: brightness(1.14);
        transform: translateY(-1px);
      }

      .os-welcome-secondary {
        border-color: rgba(141,190,230,.2);
        background: rgba(255,255,255,.035);
        color: #B8D5EF;
      }

      .os-welcome-secondary:hover {
        background: rgba(255,255,255,.075);
      }

      .os-welcome-graphic {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        margin-inline-end: 6%;
        color: #80CAFF;
      }

      .os-welcome-graphic-label {
        display: flex;
        align-items: center;
        gap: 7px;
        color: #789BBB;
        font-size: 7px;
        letter-spacing: .16em;
        white-space: nowrap;
      }

      .os-welcome-graphic-label span {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #6ABEFF;
        box-shadow: 0 0 8px #6ABEFF;
      }

      /* STATUS STRIP */

      .os-dashboard-status-strip {
        display: grid;
        grid-template-columns: repeat(4,minmax(0,1fr));
        gap: 0;
        margin-top: 15px;
        border: 1px solid var(--os-border);
        border-radius: 8px;
        background: rgba(12,25,42,.75);
      }

      .os-status-strip-item {
        display: flex;
        align-items: center;
        gap: 10px;
        min-width: 0;
        padding: 14px 16px;
        border-inline-end: 1px solid rgba(141,180,220,.08);
      }

      .os-status-strip-item:last-child {
        border-inline-end: 0;
      }

      .os-status-strip-dot {
        width: 7px;
        height: 7px;
        flex: 0 0 7px;
        border-radius: 50%;
      }

      .os-status-strip-dot.green {
        background: #45D6A0;
        box-shadow: 0 0 8px rgba(69,214,160,.5);
      }

      .os-status-strip-dot.blue {
        background: #70B8FF;
        box-shadow: 0 0 8px rgba(112,184,255,.4);
      }

      .os-status-strip-dot.amber {
        background: #F4C96B;
        box-shadow: 0 0 8px rgba(244,201,107,.35);
      }

      .os-status-strip-item small {
        display: block;
        color: #718AA6;
        font-size: 8px;
      }

      .os-status-strip-item strong {
        display: block;
        margin-top: 4px;
        color: #C9DCEE;
        font-size: 9px;
        font-weight: 600;
      }

      .os-section {
        margin-top: 27px;
      }

      .os-section-heading {
        display: flex;
        align-items: flex-end;
        justify-content: space-between;
        gap: 15px;
        margin-bottom: 13px;
      }

      .os-section-eyebrow {
        color: #6D9CC7;
        font-size: 8px;
        font-weight: 700;
        letter-spacing: .16em;
      }

      .os-section-heading h2 {
        margin: 6px 0 0;
        color: #DCEAF9;
        font-size: 16px;
        font-weight: 600;
      }

      .os-section-caption {
        color: #657F9D;
        font-size: 8px;
      }

      /* METRICS */

      .os-dashboard-metrics {
        display: grid;
        grid-template-columns: repeat(4,minmax(0,1fr));
        gap: 12px;
      }

      .os-dashboard-metric {
        min-height: 139px;
        padding: 16px;
        border: 1px solid var(--os-border);
        border-radius: 9px;
        background: linear-gradient(
          145deg,
          rgba(18,37,61,.82),
          rgba(11,23,40,.9)
        );
      }

      .os-dashboard-metric-top {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .os-dashboard-metric-icon {
        display: grid;
        place-items: center;
        width: 35px;
        height: 35px;
        border: 1px solid;
        border-radius: 8px;
      }

      .os-metric-live {
        display: flex;
        align-items: center;
        gap: 5px;
        color: #607C99;
        font-size: 7px;
        letter-spacing: .1em;
      }

      .os-metric-live span {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #45D6A0;
      }

      .os-dashboard-metric-value {
        margin-top: 14px;
        color: #EDF5FF;
        font-size: 25px;
        font-weight: 650;
      }

      .os-dashboard-metric-title {
        margin-top: 3px;
        color: #B5C9DF;
        font-size: 10px;
        font-weight: 600;
      }

      .os-dashboard-metric-detail {
        margin-top: 5px;
        color: #6F89A6;
        font-size: 8px;
      }

      /* MODULE GRID */

      .os-module-grid {
        display: grid;
        grid-template-columns: repeat(3,minmax(0,1fr));
        gap: 11px;
      }

      .os-module-card {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        min-height: 146px;
        padding: 15px;
        border: 1px solid var(--os-border);
        border-radius: 8px;
        background: rgba(13,26,44,.82);
        color: inherit;
        text-align: start;
        cursor: pointer;
        transition: .18s ease;
      }

      .os-module-card:hover {
        transform: translateY(-2px);
        border-color: rgba(101,181,255,.3);
        background: rgba(18,38,63,.92);
        box-shadow: 0 10px 25px rgba(0,0,0,.12);
      }

      .os-module-card-icon {
        display: grid;
        place-items: center;
        width: 39px;
        height: 39px;
        border: 1px solid;
        border-radius: 8px;
      }

      .os-module-card-content {
        margin-top: 12px;
      }

      .os-module-card-content strong {
        color: #D7E7F7;
        font-size: 10px;
      }

      .os-module-card-content p {
        margin: 5px 0 0;
        color: #758EAA;
        font-size: 8px;
        line-height: 1.6;
      }

      .os-module-card-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        margin-top: auto;
        padding-top: 12px;
        color: #6D8AAA;
      }

      .os-module-card-footer > span {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 7px;
      }

      .os-module-card-footer > span > span {
        width: 5px;
        height: 5px;
        border-radius: 50%;
      }

      .os-module-card-footer .ready {
        color: #63CDA0;
      }

      .os-module-card-footer .ready > span {
        background: #45D6A0;
      }

      .os-module-card-footer .development {
        color: #C4A76D;
      }

      .os-module-card-footer .development > span {
        background: #D8B96D;
      }

      /* LOWER DASHBOARD */

      .os-dashboard-bottom-grid {
        display: grid;
        grid-template-columns: 1.3fr 1fr;
        gap: 13px;
        margin-top: 22px;
      }

      .os-dashboard-panel {
        overflow: hidden;
        border: 1px solid var(--os-border);
        border-radius: 9px;
        background: rgba(12,25,42,.83);
      }

      .os-panel-heading {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 51px;
        padding: 0 15px;
        border-bottom: 1px solid rgba(141,180,220,.08);
      }

      .os-panel-heading > div {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #7EBFFF;
      }

      .os-panel-heading strong {
        color: #C7D9EC;
        font-size: 10px;
      }

      .os-panel-tag {
        color: #6584A4;
        font-size: 7px;
        letter-spacing: .1em;
      }

      .os-activity-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 15px;
        border-bottom: 1px solid rgba(141,180,220,.06);
      }

      .os-activity-item:last-child {
        border-bottom: 0;
      }

      .os-activity-icon {
        display: grid;
        place-items: center;
        width: 30px;
        height: 30px;
        flex: 0 0 30px;
        border-radius: 7px;
      }

      .os-activity-icon.blue {
        color: #70B8FF;
        background: rgba(112,184,255,.1);
      }

      .os-activity-icon.green {
        color: #45D6A0;
        background: rgba(69,214,160,.1);
      }

      .os-activity-icon.amber {
        color: #F4C96B;
        background: rgba(244,201,107,.1);
      }

      .os-activity-item > div {
        flex: 1;
        min-width: 0;
      }

      .os-activity-item strong {
        display: block;
        color: #BFD3E8;
        font-size: 9px;
      }

      .os-activity-item small {
        display: block;
        margin-top: 4px;
        color: #718AA6;
        font-size: 8px;
      }

      .os-activity-item time {
        color: #607C99;
        font-size: 7px;
      }

      .os-notice-content {
        padding: 18px;
      }

      .os-notice-large-icon {
        display: grid;
        place-items: center;
        width: 39px;
        height: 39px;
        border: 1px solid rgba(244,201,107,.2);
        border-radius: 8px;
        background: rgba(244,201,107,.07);
        color: #E8C46F;
      }

      .os-notice-content p {
        color: #A0B2C7;
        font-size: 9px;
        line-height: 1.8;
      }

      .os-notice-status {
        display: flex;
        align-items: center;
        gap: 7px;
        margin-top: 14px;
        color: #67CFA5;
        font-size: 8px;
      }

      .os-notice-status span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #45D6A0;
      }

      /* DEVELOPMENT PAGE */

      .os-development-page {
        position: relative;
        display: grid;
        place-items: center;
        min-height: 620px;
        overflow: hidden;
        border: 1px solid var(--os-border);
        border-radius: 10px;
        background:
          radial-gradient(
            ellipse at 50% 50%,
            rgba(48,113,175,.12),
            transparent 45%
          ),
          #091423;
      }

      .os-development-decoration {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        pointer-events: none;
      }

      .os-development-decoration div {
        position: absolute;
        width: 220px;
        height: 220px;
        border: 1px solid rgba(101,181,255,.1);
        border-radius: 50%;
      }

      .os-development-decoration div:nth-child(2) {
        width: 340px;
        height: 340px;
      }

      .os-development-decoration div:nth-child(3) {
        width: 470px;
        height: 470px;
        border-style: dashed;
      }

      .os-development-card {
        position: relative;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        max-width: 470px;
        padding: 30px;
        text-align: center;
      }

      .os-development-icon {
        display: grid;
        place-items: center;
        width: 76px;
        height: 76px;
        margin-bottom: 22px;
        border: 1px solid;
        border-radius: 18px;
      }

      .os-development-card h1 {
        margin: 11px 0;
        color: #E5F0FC;
        font-size: 25px;
      }

      .os-development-card p {
        color: #829BB8;
        font-size: 11px;
        line-height: 1.9;
      }

      .os-development-status {
        display: flex;
        align-items: center;
        gap: 7px;
        margin: 13px 0 20px;
        color: #D4B46F;
        font-size: 9px;
      }

      .os-development-status span {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: #D4B46F;
      }

      /* SIMPLE PAGES */

      .os-simple-page {
        min-height: 550px;
      }

      .os-empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 350px;
        border: 1px solid var(--os-border);
        border-radius: 9px;
        background: rgba(12,25,42,.7);
        text-align: center;
      }

      .os-empty-icon {
        display: grid;
        place-items: center;
        width: 55px;
        height: 55px;
        border: 1px solid rgba(101,181,255,.2);
        border-radius: 13px;
        background: rgba(101,181,255,.07);
        color: #76BCF6;
      }

      .os-empty-state h3 {
        margin: 18px 0 5px;
        color: #C8DCEE;
        font-size: 13px;
      }

      .os-empty-state p {
        max-width: 480px;
        padding: 0 15px;
        color: #728BA8;
        font-size: 10px;
        line-height: 1.8;
      }

      /* SETTINGS */

      .os-settings-card {
        margin-bottom: 14px;
        padding: 18px;
        border: 1px solid var(--os-border);
        border-radius: 9px;
        background: rgba(12,25,42,.8);
      }

      .os-settings-heading {
        display: flex;
        align-items: center;
        gap: 11px;
        padding-bottom: 14px;
        border-bottom: 1px solid rgba(141,180,220,.08);
      }

      .os-settings-icon {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border: 1px solid rgba(101,181,255,.2);
        border-radius: 8px;
        background: rgba(101,181,255,.07);
        color: #80C4FF;
      }

      .os-settings-heading strong {
        display: block;
        color: #D2E3F4;
        font-size: 10px;
      }

      .os-settings-heading small {
        display: block;
        margin-top: 4px;
        color: #718AA6;
        font-size: 8px;
      }

      .os-settings-options {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
        margin-top: 15px;
      }

      .os-settings-options button {
        display: flex;
        align-items: center;
        gap: 14px;
        padding: 10px 14px;
        border: 1px solid var(--os-border);
        border-radius: 6px;
        background: rgba(255,255,255,.02);
        color: #AFC4DA;
        font-size: 10px;
        cursor: pointer;
      }

      .os-settings-options button.selected {
        border-color: rgba(101,181,255,.35);
        background: rgba(101,181,255,.09);
        color: #BCE0FF;
      }

      .os-settings-options small {
        color: #6885A3;
        font-size: 8px;
      }

      .os-settings-information {
        display: grid;
        grid-template-columns: repeat(3,minmax(0,1fr));
        gap: 15px;
        padding-top: 16px;
      }

      .os-settings-information span,
      .os-settings-information strong {
        display: block;
      }

      .os-settings-information span {
        color: #718AA6;
        font-size: 8px;
      }

      .os-settings-information strong {
        margin-top: 6px;
        color: #C6D9EC;
        font-size: 10px;
      }

      .os-text-green {
        color: #62D3A3 !important;
      }

      /* SEARCH RESULTS */

      .os-search-results {
        position: fixed;
        z-index: 100;
        top: 57px;
        inset-inline-end: 145px;
        width: min(330px,calc(100vw - 30px));
        padding: 9px;
        border: 1px solid rgba(101,181,255,.2);
        border-radius: 8px;
        background: #0D1B2D;
        box-shadow: 0 15px 45px rgba(0,0,0,.4);
      }

      .os-search-results-heading {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px;
        color: #7996B5;
        font-size: 8px;
        letter-spacing: .1em;
      }

      .os-search-results-heading button {
        border: 0;
        background: transparent;
        color: #8CA7C4;
        cursor: pointer;
      }

      .os-search-results > button {
        display: flex;
        align-items: center;
        gap: 10px;
        width: 100%;
        padding: 10px;
        border: 0;
        border-radius: 5px;
        background: transparent;
        color: #B9CDE2;
        text-align: start;
        font-size: 10px;
        cursor: pointer;
      }

      .os-search-results > button:hover {
        background: rgba(101,181,255,.08);
      }

      .os-search-results > button svg:last-child {
        margin-inline-start: auto;
      }

      .os-search-no-results {
        padding: 18px 10px;
        color: #8199B4;
        font-size: 10px;
        text-align: center;
      }

      .os-mobile-backdrop {
        display: none;
      }

      /* RESPONSIVE */

      @media(max-width:1150px) {
        .os-sidebar {
          width: 225px;
        }

        .os-main {
          margin-inline-start: 225px;
        }

        .os-app.os-sidebar-collapsed .os-main {
          margin-inline-start: 76px;
        }

        .os-dashboard-metrics {
          grid-template-columns: repeat(2,minmax(0,1fr));
        }
      }

      @media(max-width:850px) {
        .os-sidebar {
          width: 252px;
          transform: translateX(-105%);
        }

        .os-app[dir="rtl"] .os-sidebar {
          transform: translateX(105%);
        }

        .os-sidebar.mobile-open {
          transform: translateX(0);
        }

        .os-app[dir="rtl"] .os-sidebar.mobile-open {
          transform: translateX(0);
        }

        .os-sidebar.collapsed {
          width: 252px;
        }

        .os-main,
        .os-app.os-sidebar-collapsed .os-main {
          margin-inline-start: 0;
        }

        .os-topbar-menu {
          display: grid;
        }

        .os-mobile-close {
          display: grid;
          place-items: center;
        }

        .os-mobile-backdrop {
          position: fixed;
          z-index: 45;
          inset: 0;
          display: block;
          border: 0;
          background: rgba(0,0,0,.58);
        }

        .os-sidebar.collapsed .os-sidebar-brand {
          justify-content: flex-start;
          padding: 0 17px;
        }

        .os-sidebar.collapsed .os-sidebar-environment {
          justify-content: flex-start;
          margin: 12px 13px 6px;
          padding: 0 10px;
        }

        .os-sidebar.collapsed .os-nav-item {
          justify-content: flex-start;
          padding: 0 11px;
        }

        .os-sidebar.collapsed .os-navigation {
          padding: 7px 10px 15px;
        }

        .os-welcome-graphic {
          margin-inline-end: 0;
        }

        .os-module-grid {
          grid-template-columns: repeat(2,minmax(0,1fr));
        }
      }

      @media(max-width:620px) {
        .os-topbar {
          min-height: 57px;
          padding: 0 12px;
        }

        .os-topbar-user {
          display: none;
        }

        .os-page-content {
          padding: 16px 13px;
        }

        .os-breadcrumb {
          gap: 5px;
          font-size: 8px;
        }

        .os-breadcrumb strong {
          font-size: 9px;
        }

        .os-welcome-banner {
          min-height: 270px;
          padding: 23px 19px;
        }

        .os-welcome-graphic {
          position: absolute;
          inset-inline-end: -40px;
          top: 10px;
          opacity: .17;
        }

        .os-welcome-content {
          max-width: 100%;
        }

        .os-welcome-content h1 {
          font-size: 24px;
        }

        .os-welcome-content p {
          font-size: 10px;
        }

        .os-dashboard-status-strip {
          grid-template-columns: repeat(2,minmax(0,1fr));
        }

        .os-status-strip-item {
          min-height: 57px;
          padding: 10px;
          border-bottom: 1px solid rgba(141,180,220,.07);
        }

        .os-dashboard-metrics {
          gap: 8px;
        }

        .os-dashboard-metric {
          min-height: 126px;
          padding: 12px;
        }

        .os-module-grid {
          grid-template-columns: 1fr;
        }

        .os-module-card {
          min-height: 128px;
        }

        .os-dashboard-bottom-grid {
          grid-template-columns: 1fr;
        }

        .os-page-footer {
          flex-direction: column;
        }

        .os-search-results {
          top: 52px;
          inset-inline-end: 10px;
        }

        .os-settings-information {
          grid-template-columns: 1fr;
        }

        .os-section-heading {
          align-items: flex-start;
          flex-direction: column;
        }
      }

      @media(prefers-reduced-motion:reduce) {
        *,
        *::before,
        *::after {
          scroll-behavior: auto !important;
          animation-duration: .01ms !important;
          transition-duration: .01ms !important;
        }
      }
    `}</style>
  );
}

/* ============================================================
   APPLICATION ROOT
============================================================ */

export default function App() {
  const [language, setLanguage] = useState(readLanguage);
  const [activePage, setActivePage] = useState(CONFIG.defaultPage);

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const t = I18N[language] || I18N.ar;

  const handleLanguageChange = useCallback(nextLanguage => {
    if (!["ar", "en"].includes(nextLanguage)) return;

    setLanguage(nextLanguage);
    saveLanguage(nextLanguage);

    document.documentElement.lang = nextLanguage;
    document.documentElement.dir =
      nextLanguage === "ar" ? "rtl" : "ltr";
  }, []);

  const handleNavigation = useCallback(page => {
    if (!MODULES[page]) return;

    setActivePage(page);
    setSearchQuery("");
    setMobileMenuOpen(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir =
      language === "ar" ? "rtl" : "ltr";

    document.body.dataset.application = "orbital-shield";
    document.body.dataset.version = CONFIG.version;

    document.title = `${CONFIG.name} | ${t[MODULES[activePage]?.title || "dashboard"]}`;

  }, [activePage, language, handleLanguageChange, t]);

  const renderPage = () => {
    if (activePage === "dashboard") {
      return (
        <DashboardPage
          language={language}
          t={t}
          onNavigate={handleNavigation}
        />
      );
    }

    if (activePage === "simulation") {
      return (
        <OrbitalSimulationPage
          language={language}
          onNavigate={handleNavigation}
        />
      );
    }

    if (["surveillance", "catalog", "analysis", "conjunctions", "groundTrack", "dataCenter"].includes(activePage)) {
      return (
        <DevelopmentPage
          page={activePage}
          language={language}
          t={t}
          onNavigate={handleNavigation}
        />
      );
    }

    if (activePage === "notifications") {
      return <NotificationsPage language={language} t={t} />;
    }

    if (activePage === "settings") {
      return (
        <SettingsPage
          language={language}
          t={t}
          onLanguageChange={handleLanguageChange}
        />
      );
    }

    if (activePage === "documentation") {
      return <DocumentationPage t={t} />;
    }

    return (
      <DevelopmentPage
        page={activePage}
        language={language}
        t={t}
        onNavigate={handleNavigation}
      />
    );
  };

  return (
    <div
      className={[
        "os-app",
        sidebarCollapsed ? "os-sidebar-collapsed" : ""
      ].join(" ")}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <ApplicationStyles />

      <Sidebar
        language={language}
        t={t}
        activePage={activePage}
        onNavigate={handleNavigation}
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(value => !value)}
        mobileOpen={mobileMenuOpen}
        onMobileClose={() => setMobileMenuOpen(false)}
      />

      <div className="os-main">
        <Topbar
          language={language}
          t={t}
          activePage={activePage}
          onLanguageChange={handleLanguageChange}
          onMobileMenu={() => setMobileMenuOpen(true)}
          onSearch={setSearchQuery}
        />

        {searchQuery.trim() && (
          <SearchResults
            query={searchQuery}
            language={language}
            t={t}
            onNavigate={handleNavigation}
            onClose={() => setSearchQuery("")}
          />
        )}

        <main className="os-page-content">
          {renderPage()}

          <footer className="os-page-footer">
            <span>
              © {new Date().getFullYear()} ORBITAL SHIELD
            </span>

            <span>
              {CONFIG.edition} · {CONFIG.environment}
            </span>

            <span>v{CONFIG.version}</span>
          </footer>
        </main>
      </div>
    </div>
  );
}