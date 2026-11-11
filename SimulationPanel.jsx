
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import * as THREE from "three";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  CircleDot,
  Crosshair,
  Gauge,
  Globe2,
  Layers3,
  Maximize2,
  Pause,
  Play,
  Radio,
  Radar,
  RefreshCw,
  RotateCcw,
  Satellite,
  Shield,
  ShieldCheck,
  Siren,
  Target,
  Timer,
  Zap
} from "lucide-react";

/* ============================================================
   ORBITAL SHIELD
   SIMULATION & DEFENSE COMMAND CENTER
   Local synthetic visualization
   ============================================================ */

const COLORS = {
  background: 0x050b16,
  earth: 0x123d63,
  atmosphere: 0x43aaff,
  blue: "#69bdff",
  cyan: "#56e1f2",
  purple: "#a78bfa",
  red: "#ff657c",
  amber: "#ffc66e",
  green: "#4fe0ae"
};

const clamp = (value, min, max) =>
  Math.min(max, Math.max(min, value));

const lerp = (a, b, t) =>
  a + (b - a) * t;

const formatTime = (value) => {
  const total = Math.max(0, Math.floor(value));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;

  return [
    String(hours).padStart(2, "0"),
    String(minutes).padStart(2, "0"),
    String(seconds).padStart(2, "0")
  ].join(":");
};

const TEXT = {
  ar: {
    title: "مركز المحاكاة والقيادة الدفاعية",
    subtitle: "بيئة محاكاة فضائية ثلاثية الأبعاد",
    local: "تشغيل محلي",
    synthetic: "سيناريو اصطناعي",
    surveillance: "المراقبة المدارية",
    defense: "مركز الدفاع والاعتراض",
    orbitalTitle: "المشهد المداري ثلاثي الأبعاد",
    defenseTitle: "مركز عمليات الدفاع الافتراضي",
    launch: "بدء سيناريو جديد",
    replay: "إعادة السيناريو",
    pause: "إيقاف مؤقت",
    resume: "استئناف",
    reset: "إعادة ضبط",
    mode: "نمط الاعتراض",
    atmospheric: "داخل الغلاف الجوي",
    exo: "خارج الغلاف الجوي",
    phase: "مرحلة العملية",
    detection: "اكتشاف الإشارة",
    tracking: "التتبع الافتراضي",
    alert: "تقييم الحدث",
    response: "استجابة المحاكاة",
    intercept: "لحظة الاعتراض",
    assessment: "تقييم النتيجة",
    waiting: "بانتظار بدء السيناريو",
    detected: "تم رصد جسم افتراضي",
    trackingStatus: "تتبع بصري نشط",
    responseStatus: "المشهد قيد المحاكاة",
    success: "اكتمل سيناريو الاعتراض",
    noResult: "لم يبدأ السيناريو بعد",
    threat: "الجسم الافتراضي",
    interceptor: "جسم الاعتراض الافتراضي",
    radar: "نظام رصد افتراضي",
    eventLog: "السجل الزمني للأحداث",
    telemetry: "بيانات المحاكاة",
    altitude: "الارتفاع التمثيلي",
    velocity: "السرعة التمثيلية",
    distance: "المسافة البصرية",
    elapsed: "الزمن المنقضي",
    objectCount: "الأجسام في المشهد",
    status: "الحالة",
    active: "نشط",
    standby: "استعداد",
    completed: "مكتمل",
    noExternal: "لا توجد بيانات خارجية",
    warningTitle: "تنبيه هندسي",
    warning:
      "جميع الأجسام والمسارات والتوقيتات اصطناعية لأغراض العرض والتدريب البصري، ولا تمثل نظام رصد أو اعتراض حقيقيًا.",
    orbitObjects: "الأجسام المدارية",
    earth: "الأرض",
    orbit: "المدارات",
    camera: "الكاميرا",
    resetCamera: "إعادة الكاميرا",
    zoomIn: "تقريب",
    zoomOut: "إبعاد",
    scene: "المشهد",
    timeline: "التسلسل الزمني",
    start: "بدء",
    detectedAt: "اكتشاف",
    locked: "تتبع",
    responseAt: "استجابة",
    impact: "اعتراض",
    result: "النتيجة",
    mission: "العملية",
    phaseAtmosphere: "اعتراض داخل الغلاف الجوي",
    phaseExo: "اعتراض خارج الغلاف الجوي",
    systemReady: "النظام جاهز",
    simulationOnly: "محاكاة بصرية فقط",
    missileLabel: "جسم طائر افتراضي",
    interceptorLabel: "جسم استجابة افتراضي",
    range: "مؤشر المسافة",
    confidence: "مؤشر الرصد",
    trackingQuality: "جودة التتبع",
    eventDetected: "ظهرت إشارة افتراضية في نطاق المشهد",
    eventTracking: "بدأت مرحلة التتبع البصري",
    eventResponse: "ظهر جسم الاستجابة في المشهد",
    eventIntercept: "تم تمثيل لحظة الالتقاء بصريًا",
    eventComplete: "انتهى السيناريو الافتراضي",
    eventStart: "تم تشغيل السيناريو",
    orbitDescription: "مشهد تعليمي للأرض والأجسام المدارية الافتراضية.",
    switchToDefense: "فتح مركز الدفاع",
    switchToOrbit: "العودة للمراقبة",
    selectMode: "اختر نمط المحاكاة",
    noGuidance: "لا يتضمن هذا النموذج توجيهًا أو حسابات تشغيلية."
  },
  en: {
    title: "SIMULATION & DEFENSE COMMAND CENTER",
    subtitle: "THREE-DIMENSIONAL SPACE SIMULATION",
    local: "LOCAL EXECUTION",
    synthetic: "SYNTHETIC SCENARIO",
    surveillance: "ORBITAL SURVEILLANCE",
    defense: "DEFENSE COMMAND CENTER",
    orbitalTitle: "3D ORBITAL ENVIRONMENT",
    defenseTitle: "SYNTHETIC DEFENSE OPERATIONS",
    launch: "START NEW SCENARIO",
    replay: "REPLAY SCENARIO",
    pause: "PAUSE",
    resume: "RESUME",
    reset: "RESET",
    mode: "INTERCEPT MODE",
    atmospheric: "ATMOSPHERIC",
    exo: "EXO-ATMOSPHERIC",
    phase: "OPERATION PHASE",
    detection: "SIGNAL DETECTION",
    tracking: "SYNTHETIC TRACKING",
    alert: "EVENT ASSESSMENT",
    response: "SIMULATED RESPONSE",
    intercept: "INTERCEPT EVENT",
    assessment: "RESULT ASSESSMENT",
    waiting: "AWAITING SCENARIO",
    detected: "SYNTHETIC OBJECT DETECTED",
    trackingStatus: "VISUAL TRACKING ACTIVE",
    responseStatus: "SIMULATION IN PROGRESS",
    success: "INTERCEPT SCENARIO COMPLETED",
    noResult: "SCENARIO NOT STARTED",
    threat: "SYNTHETIC OBJECT",
    interceptor: "SYNTHETIC RESPONSE OBJECT",
    radar: "SYNTHETIC RADAR",
    eventLog: "EVENT TIMELINE",
    telemetry: "SIMULATION TELEMETRY",
    altitude: "ILLUSTRATIVE ALTITUDE",
    velocity: "ILLUSTRATIVE VELOCITY",
    distance: "VISUAL SEPARATION",
    elapsed: "ELAPSED TIME",
    objectCount: "SCENE OBJECTS",
    status: "STATUS",
    active: "ACTIVE",
    standby: "STANDBY",
    completed: "COMPLETED",
    noExternal: "NO EXTERNAL DATA",
    warningTitle: "ENGINEERING NOTICE",
    warning:
      "All objects, paths and timings are synthetic for visual training only. They do not represent a real detection or interception system.",
    orbitObjects: "ORBITAL OBJECTS",
    earth: "EARTH",
    orbit: "ORBITS",
    camera: "CAMERA",
    resetCamera: "RESET CAMERA",
    zoomIn: "ZOOM IN",
    zoomOut: "ZOOM OUT",
    scene: "SCENE",
    timeline: "EVENT SEQUENCE",
    start: "START",
    detectedAt: "DETECTION",
    locked: "TRACKING",
    responseAt: "RESPONSE",
    impact: "INTERCEPT",
    result: "RESULT",
    mission: "OPERATION",
    phaseAtmosphere: "ATMOSPHERIC INTERCEPT",
    phaseExo: "EXO-ATMOSPHERIC INTERCEPT",
    systemReady: "SYSTEM READY",
    simulationOnly: "VISUAL SIMULATION ONLY",
    missileLabel: "SYNTHETIC FLYING OBJECT",
    interceptorLabel: "SYNTHETIC RESPONSE OBJECT",
    range: "RANGE INDICATOR",
    confidence: "DETECTION INDICATOR",
    trackingQuality: "TRACKING QUALITY",
    eventDetected: "A synthetic signal appeared in the scene",
    eventTracking: "Visual tracking phase started",
    eventResponse: "A response object appeared in the scene",
    eventIntercept: "Visual rendezvous event represented",
    eventComplete: "Synthetic scenario completed",
    eventStart: "Scenario started",
    orbitDescription: "Educational scene of Earth and synthetic orbital objects.",
    switchToDefense: "OPEN DEFENSE CENTER",
    switchToOrbit: "RETURN TO SURVEILLANCE",
    selectMode: "SELECT SIMULATION MODE",
    noGuidance: "This model contains no operational guidance or calculations."
  }
};

/* ============================================================
   SYNTHETIC SCENARIO MODEL
   The timeline is intentionally illustrative and non-operational.
   ============================================================ */

const PHASES = [
  { id: "launch", at: 0, duration: 5 },
  { id: "detection", at: 5, duration: 7 },
  { id: "tracking", at: 12, duration: 8 },
  { id: "response", at: 20, duration: 12 },
  { id: "intercept", at: 32, duration: 5 },
  { id: "complete", at: 37, duration: 0 }
];

function phaseForTime(time) {
  if (time < 5) return "launch";
  if (time < 12) return "detection";
  if (time < 20) return "tracking";
  if (time < 32) return "response";
  if (time < 37) return "intercept";
  return "complete";
}

function phaseProgress(time, phase) {
  const index = PHASES.findIndex(item => item.id === phase);
  if (index < 0) return 0;

  const current = PHASES[index];
  const next = PHASES[index + 1];

  if (!next) return 1;
  return clamp((time - current.at) / (next.at - current.at), 0, 1);
}

function getScenarioPosition(time, mode) {
  const normalized = clamp(time / 37, 0, 1);
  const atmospheric = mode === "atmospheric";

  const start = atmospheric
    ? { x: 0.13, y: 0.72 }
    : { x: 0.16, y: 0.22 };

  const target = atmospheric
    ? { x: 0.79, y: 0.33 }
    : { x: 0.80, y: 0.68 };

  const curve = atmospheric ? -0.23 : 0.20;

  const x = lerp(start.x, target.x, normalized);
  const y = lerp(start.y, target.y, normalized) +
    Math.sin(normalized * Math.PI) * curve;

  return { x, y };
}

function getInterceptorPosition(time, mode) {
  const normalized = clamp((time - 20) / 17, 0, 1);
  const atmospheric = mode === "atmospheric";

  const start = atmospheric
    ? { x: 0.84, y: 0.78 }
    : { x: 0.84, y: 0.18 };

  const target = getScenarioPosition(37, mode);

  const x = lerp(start.x, target.x, normalized);
  const y = lerp(start.y, target.y, normalized) +
    Math.sin(normalized * Math.PI) * (atmospheric ? -0.13 : 0.14);

  return { x, y };
}

function getPhaseLabel(phase, t) {
  const labels = {
    launch: t.start,
    detection: t.detection,
    tracking: t.tracking,
    response: t.response,
    intercept: t.intercept,
    complete: t.assessment
  };

  return labels[phase] || t.waiting;
}

/* ============================================================
   THREE.JS SCENE
   ============================================================ */

function createEarthTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;

  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const gradient = ctx.createLinearGradient(0, 0, 0, 512);
  gradient.addColorStop(0, "#12385c");
  gradient.addColorStop(0.5, "#1d5c83");
  gradient.addColorStop(1, "#081b34");

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 1024, 512);

  const land = [
    [[120,120],[180,82],[245,110],[270,165],[230,220],[190,255],[150,220],[110,170]],
    [[230,270],[280,280],[300,340],[270,410],[240,390],[215,325]],
    [[450,120],[510,90],[570,115],[600,170],[560,225],[510,205],[475,165]],
    [[500,250],[560,240],[590,300],[565,390],[525,420],[490,340]],
    [[690,125],[770,95],[850,135],[870,195],[815,230],[745,215],[700,180]],
    [[780,280],[840,260],[885,315],[850,380],[800,370],[770,320]]
  ];

  land.forEach((polygon, index) => {
    ctx.beginPath();
    polygon.forEach(([x, y], i) => {
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.closePath();

    const shade = index % 2 ? "#397b75" : "#4a8b7a";
    ctx.fillStyle = shade;
    ctx.fill();
    ctx.strokeStyle = "rgba(130,205,183,.18)";
    ctx.stroke();
  });

  for (let i = 0; i < 100; i += 1) {
    const x = (i * 83) % 1024;
    const y = (i * 47) % 512;
    ctx.fillStyle = "rgba(160,210,230,.035)";
    ctx.beginPath();
    ctx.arc(x, y, 10 + (i % 15), 0, Math.PI * 2);
    ctx.fill();
  }

  return new THREE.CanvasTexture(canvas);
}

function createOrbitLine(radius, color, inclination = 0.3) {
  const points = [];
  for (let i = 0; i <= 240; i += 1) {
    const a = (i / 240) * Math.PI * 2;
    points.push(new THREE.Vector3(
      radius * Math.cos(a),
      Math.sin(a) * radius * Math.sin(inclination),
      radius * Math.sin(a)
    ));
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity: 0.38
  });

  return new THREE.LineLoop(geometry, material);
}

function createSatellite(color = 0x7dcfff) {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.16, 0.22),
    new THREE.MeshStandardMaterial({
      color: 0xc8e7ff,
      metalness: 0.7,
      roughness: 0.35
    })
  );
  group.add(body);

  const panelMaterial = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.35,
    roughness: 0.45,
    emissive: color,
    emissiveIntensity: 0.08
  });

  [-1, 1].forEach(side => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.035, 0.2),
      panelMaterial
    );
    panel.position.x = side * 0.34;
    group.add(panel);
  });

  return group;
}

function makeStarfield() {
  const count = 2200;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const radius = 12 + Math.random() * 28;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = radius * Math.cos(phi);
    positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(positions, 3)
  );

  const material = new THREE.PointsMaterial({
    color: 0x9fcfff,
    size: 0.035,
    transparent: true,
    opacity: 0.7,
    sizeAttenuation: true
  });

  return new THREE.Points(geometry, material);
}

function disposeTree(object) {
  if (!object) return;

  object.traverse(child => {
    child.geometry?.dispose();

    if (child.material) {
      const materials = Array.isArray(child.material)
        ? child.material
        : [child.material];

      materials.forEach(material => {
        material.map?.dispose();
        material.dispose();
      });
    }
  });
}

function OrbitalScene({ mode, onReady }) {
  const hostRef = useRef(null);
  const runtimeRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;

    let renderer;
    let frame = 0;
    let observer;

    try {
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(COLORS.background);
      scene.fog = new THREE.Fog(COLORS.background, 18, 45);

      const camera = new THREE.PerspectiveCamera(
        42,
        1,
        0.1,
        120
      );

      camera.position.set(8.5, 5.2, 10);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        powerPreference: "high-performance"
      });

      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      renderer.setSize(host.clientWidth || 1, host.clientHeight || 1);
      renderer.domElement.className = "os-three-canvas";
      host.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0x8bb9df, 1.15));

      const keyLight = new THREE.DirectionalLight(0x8bcaff, 2.5);
      keyLight.position.set(8, 5, 8);
      scene.add(keyLight);

      const rimLight = new THREE.PointLight(0x287dff, 18, 30);
      rimLight.position.set(-7, 2, -5);
      scene.add(rimLight);

      const earthGroup = new THREE.Group();
      scene.add(earthGroup);

      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(3, 96, 96),
        new THREE.MeshStandardMaterial({
          map: createEarthTexture(),
          roughness: 0.88,
          metalness: 0.05
        })
      );
      earthGroup.add(earth);

      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(3.13, 64, 64),
        new THREE.MeshBasicMaterial({
          color: COLORS.atmosphere,
          transparent: true,
          opacity: 0.09,
          side: THREE.BackSide
        })
      );
      earthGroup.add(atmosphere);

      const grid = new THREE.Group();
      const gridMaterial = new THREE.LineBasicMaterial({
        color: 0x6cbaff,
        transparent: true,
        opacity: 0.19
      });

      for (let latitude = -60; latitude <= 60; latitude += 30) {
        const points = [];
        const lat = THREE.MathUtils.degToRad(latitude);

        for (let i = 0; i <= 180; i += 1) {
          const lon = (i / 180) * Math.PI * 2;
          const radius = 3.012;
          points.push(new THREE.Vector3(
            radius * Math.cos(lat) * Math.cos(lon),
            radius * Math.sin(lat),
            radius * Math.cos(lat) * Math.sin(lon)
          ));
        }

        grid.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          gridMaterial
        ));
      }

      for (let longitude = 0; longitude < 180; longitude += 30) {
        const points = [];
        const lon = THREE.MathUtils.degToRad(longitude);

        for (let i = 0; i <= 100; i += 1) {
          const lat = -Math.PI / 2 + (i / 100) * Math.PI;
          const radius = 3.012;
          points.push(new THREE.Vector3(
            radius * Math.cos(lat) * Math.cos(lon),
            radius * Math.sin(lat),
            radius * Math.cos(lat) * Math.sin(lon)
          ));
        }

        grid.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          gridMaterial
        ));
      }

      earthGroup.add(grid);

      const orbitObjects = new THREE.Group();
      scene.add(orbitObjects);

      const orbitalRadii = [3.85, 4.15, 4.55, 5.1, 6.4];
      const orbitalColors = [
        0x62d8f4,
        0x85bfff,
        0xa78bfa,
        0x55d9ad,
        0xf3c878
      ];

      const satellites = [];

      orbitalRadii.forEach((radius, index) => {
        orbitObjects.add(createOrbitLine(
          radius,
          orbitalColors[index],
          0.18 + index * 0.13
        ));

        const satellite = createSatellite(orbitalColors[index]);
        orbitObjects.add(satellite);
        satellites.push({
          model: satellite,
          radius,
          phase: index * 1.25,
          speed: 0.12 + index * 0.018,
          inclination: 0.18 + index * 0.13
        });
      });

      const stars = makeStarfield();
      scene.add(stars);

      const moon = new THREE.Mesh(
        new THREE.SphereGeometry(0.34, 32, 32),
        new THREE.MeshStandardMaterial({
          color: 0x899bb4,
          roughness: 0.95
        })
      );
      moon.position.set(-8, 2.5, -5);
      scene.add(moon);

      const runtime = {
        scene,
        camera,
        renderer,
        earthGroup,
        earth,
        atmosphere,
        grid,
        orbitObjects,
        satellites,
        stars,
        moon,
        last: performance.now(),
        pointer: null
      };

      runtimeRef.current = runtime;

      const resize = () => {
        const width = Math.max(1, host.clientWidth);
        const height = Math.max(1, host.clientHeight);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
      };

      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(resize);
        observer.observe(host);
      }

      window.addEventListener("resize", resize);
      resize();

      let dragging = false;
      let previousX = 0;
      let previousY = 0;
      let spherical = new THREE.Spherical();
      spherical.setFromVector3(camera.position);

      const onPointerDown = event => {
        dragging = true;
        previousX = event.clientX;
        previousY = event.clientY;
        renderer.domElement.setPointerCapture?.(event.pointerId);
      };

      const onPointerMove = event => {
        if (!dragging) return;

        const dx = event.clientX - previousX;
        const dy = event.clientY - previousY;

        previousX = event.clientX;
        previousY = event.clientY;

        spherical.theta -= dx * 0.004;
        spherical.phi = clamp(
          spherical.phi + dy * 0.004,
          0.18,
          Math.PI - 0.18
        );

        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, 0, 0);
      };

      const onPointerUp = () => {
        dragging = false;
      };

      const onWheel = event => {
        event.preventDefault();
        spherical.radius = clamp(
          spherical.radius + event.deltaY * 0.006,
          4.5,
          24
        );
        camera.position.setFromSpherical(spherical);
        camera.lookAt(0, 0, 0);
      };

      renderer.domElement.addEventListener("pointerdown", onPointerDown);
      renderer.domElement.addEventListener("pointermove", onPointerMove);
      renderer.domElement.addEventListener("pointerup", onPointerUp);
      renderer.domElement.addEventListener("pointercancel", onPointerUp);
      renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

      const animate = now => {
        frame = requestAnimationFrame(animate);

        const delta = Math.min((now - runtime.last) / 1000, 0.08);
        runtime.last = now;

        earth.rotation.y += delta * 0.025;
        stars.rotation.y += delta * 0.0005;

        satellites.forEach(item => {
          const angle = item.phase + now * 0.00008 * item.speed * 60;
          const x = item.radius * Math.cos(angle);
          const z = item.radius * Math.sin(angle);
          const y = Math.sin(angle) *
            item.radius *
            Math.sin(item.inclination);

          item.model.position.set(x, y, z);
          item.model.rotation.y = -angle;
        });

        renderer.render(scene, camera);
      };

      frame = requestAnimationFrame(animate);
      onReady?.(true);

      return () => {
        cancelAnimationFrame(frame);
        observer?.disconnect();
        window.removeEventListener("resize", resize);

        renderer.domElement.removeEventListener("pointerdown", onPointerDown);
        renderer.domElement.removeEventListener("pointermove", onPointerMove);
        renderer.domElement.removeEventListener("pointerup", onPointerUp);
        renderer.domElement.removeEventListener("pointercancel", onPointerUp);
        renderer.domElement.removeEventListener("wheel", onWheel);

        disposeTree(earthGroup);
        disposeTree(orbitObjects);
        disposeTree(stars);
        disposeTree(moon);

        renderer.dispose();
        renderer.domElement.remove();

        runtimeRef.current = null;
      };
    } catch (error) {
      console.error("[ORBITAL SHIELD] 3D scene error:", error);
      onReady?.(false);
      return undefined;
    }
  }, [onReady]);

  useEffect(() => {
    const runtime = runtimeRef.current;
    if (!runtime) return;

    runtime.orbitObjects.visible = mode === "surveillance";
    runtime.grid.visible = mode === "surveillance";
    runtime.moon.visible = mode === "surveillance";
  }, [mode]);

  return <div className="os-three-host" ref={hostRef} />;
}

/* ============================================================
   DEFENSE SCENE OVERLAY
   ============================================================ */

function RadarSweep({ active }) {
  return (
    <div className={`os-radar-sweep ${active ? "active" : ""}`}>
      <div className="os-radar-ring ring-a" />
      <div className="os-radar-ring ring-b" />
      <div className="os-radar-ring ring-c" />
      <div className="os-radar-cross horizontal" />
      <div className="os-radar-cross vertical" />
      <div className="os-radar-beam" />
      <div className="os-radar-center">
        <Radar size={18} />
      </div>
      {active && <span className="os-radar-contact" />}
    </div>
  );
}

function MissileGlyph({ x, y, visible, label, className = "" }) {
  if (!visible) return null;

  return (
    <div
      className={`os-object-glyph ${className}`}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`
      }}
    >
      <div className="os-glyph-glow" />
      <div className="os-missile-shape">
        <span className="nose" />
        <span className="body" />
        <span className="fin fin-a" />
        <span className="fin fin-b" />
        <span className="flame" />
      </div>
      <span className="os-glyph-label">{label}</span>
    </div>
  );
}

function InterceptBurst({ visible }) {
  if (!visible) return null;

  return (
    <div className="os-intercept-burst">
      <div className="os-burst-core" />
      <div className="os-burst-ring" />
      <div className="os-burst-ring ring-two" />
      {Array.from({ length: 12 }).map((_, index) => (
        <i
          key={index}
          style={{
            "--particle-angle": `${index * 30}deg`,
            "--particle-delay": `${(index % 4) * 0.04}s`
          }}
        />
      ))}
    </div>
  );
}

function DefenseOverlay({ time, mode, phase, t }) {
  const missile = getScenarioPosition(time, mode);
  const interceptor = getInterceptorPosition(time, mode);

  const showMissile = time >= 0.3 && time < 37.5;
  const showInterceptor = time >= 20;
  const showBurst = phase === "intercept" || phase === "complete";
  const burstPoint = getScenarioPosition(37, mode);

  const detectionActive = time >= 5;
  const trackingActive = time >= 12;

  return (
    <div className="os-defense-overlay">
      <div className="os-defense-map-grid" />

      <div className="os-earth-horizon">
        <div className="os-horizon-glow" />
        <div className="os-horizon-line" />
      </div>

      <RadarSweep active={detectionActive} />

      <svg
        className="os-trajectory-svg"
        viewBox="0 0 1000 600"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="os-threat-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ffb46f" stopOpacity=".08" />
            <stop offset="100%" stopColor="#ff657c" stopOpacity=".95" />
          </linearGradient>
          <linearGradient id="os-response-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#6bcaff" stopOpacity=".1" />
            <stop offset="100%" stopColor="#62e4f3" stopOpacity=".95" />
          </linearGradient>
        </defs>

        <path
          d={mode === "atmospheric"
            ? "M 130 432 Q 440 100 790 198"
            : "M 160 132 Q 470 530 800 408"}
          fill="none"
          stroke="url(#os-threat-gradient)"
          strokeWidth="2"
          strokeDasharray="7 8"
          opacity=".8"
        />

        {trackingActive && (
          <path
            d={mode === "atmospheric"
              ? "M 840 468 Q 630 80 790 198"
              : "M 840 108 Q 610 520 800 408"}
            fill="none"
            stroke="url(#os-response-gradient)"
            strokeWidth="2"
            strokeDasharray="5 8"
            opacity=".9"
          />
        )}

        {detectionActive && (
          <circle
            cx="500"
            cy={mode === "atmospheric" ? "250" : "340"}
            r="38"
            fill="none"
            stroke="#ffc66e"
            strokeWidth="1.2"
            strokeDasharray="4 5"
            opacity=".75"
          />
        )}
      </svg>

      <MissileGlyph
        x={missile.x}
        y={missile.y}
        visible={showMissile}
        label={t.missileLabel}
        className="threat"
      />

      <MissileGlyph
        x={interceptor.x}
        y={interceptor.y}
        visible={showInterceptor && phase !== "complete"}
        label={t.interceptorLabel}
        className="interceptor"
      />

      <InterceptBurst
        visible={showBurst}
      />

      {detectionActive && (
        <div
          className="os-detection-box"
          style={{
            left: `${missile.x * 100}%`,
            top: `${missile.y * 100}%`
          }}
        >
          <span />
          <small>{t.detected}</small>
        </div>
      )}

      <div className="os-overlay-corner top-left">
        <span className="os-live-indicator" />
        SYNTHETIC TRACK FEED
      </div>

      <div className="os-overlay-corner top-right">
        {mode === "atmospheric" ? "ATMOSPHERIC" : "EXO-ATMOSPHERIC"}
      </div>

      <div className="os-overlay-corner bottom-left">
        <span>LOCAL SIMULATION</span>
        <span>VISUAL TELEMETRY ONLY</span>
      </div>

      <div className="os-overlay-corner bottom-right">
        {phase.toUpperCase()}
      </div>
    </div>
  );
}

/* ============================================================
   UI COMPONENTS
   ============================================================ */

function Metric({ icon: Icon, label, value, unit, accent }) {
  return (
    <div className="os-metric">
      <div
        className="os-metric-icon"
        style={{ color: accent || COLORS.blue }}
      >
        <Icon size={16} />
      </div>
      <div className="os-metric-copy">
        <span>{label}</span>
        <strong>
          {value}
          {unit && <small>{unit}</small>}
        </strong>
      </div>
    </div>
  );
}

function PhaseCard({ active, complete, number, title, detail }) {
  return (
    <div className={[
      "os-phase-card",
      active ? "active" : "",
      complete ? "complete" : ""
    ].join(" ")}>
      <div className="os-phase-number">
        {complete ? <CheckCircle2 size={14} /> : number}
      </div>
      <div>
        <strong>{title}</strong>
        <small>{detail}</small>
      </div>
      <span className="os-phase-state">
        {complete ? "DONE" : active ? "LIVE" : "WAIT"}
      </span>
    </div>
  );
}

function EventTimeline({ time, t }) {
  const events = [
    { id: "launch", at: 0, label: t.start },
    { id: "detection", at: 5, label: t.detectedAt },
    { id: "tracking", at: 12, label: t.locked },
    { id: "response", at: 20, label: t.responseAt },
    { id: "intercept", at: 32, label: t.impact },
    { id: "complete", at: 37, label: t.result }
  ];

  return (
    <div className="os-timeline">
      <div className="os-timeline-track">
        <div
          className="os-timeline-progress"
          style={{ width: `${clamp(time / 37, 0, 1) * 100}%` }}
        />
        {events.map((event, index) => {
          const complete = time >= event.at;
          const current = phaseForTime(time) === event.id;

          return (
            <div
              key={event.id}
              className={[
                "os-timeline-node",
                complete ? "complete" : "",
                current ? "current" : ""
              ].join(" ")}
              style={{ left: `${(event.at / 37) * 100}%` }}
            >
              <span />
              <small>{event.label}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EventLog({ time, t }) {
  const records = [
    { at: 0, label: t.eventStart, icon: Play, color: COLORS.blue },
    { at: 5, label: t.eventDetected, icon: Radar, color: COLORS.amber },
    { at: 12, label: t.eventTracking, icon: Crosshair, color: COLORS.cyan },
    { at: 20, label: t.eventResponse, icon: Shield, color: COLORS.purple },
    { at: 32, label: t.eventIntercept, icon: Zap, color: COLORS.red },
    { at: 37, label: t.eventComplete, icon: CheckCircle2, color: COLORS.green }
  ];

  const visible = records.filter(item => time >= item.at);

  return (
    <div className="os-event-log">
      {visible.length === 0 ? (
        <div className="os-empty-log">
          <CircleDot size={16} />
          {t.waiting}
        </div>
      ) : visible.slice().reverse().map((item, index) => {
        const Icon = item.icon;

        return (
          <div className="os-event-row" key={item.at}>
            <div
              className="os-event-icon"
              style={{ color: item.color }}
            >
              <Icon size={14} />
            </div>
            <div className="os-event-copy">
              <strong>{item.label}</strong>
              <small>T+ {String(item.at).padStart(2, "0")} SEC</small>
            </div>
            <span className="os-event-check">
              <CheckCircle2 size={13} />
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================
   MAIN COMPONENT
   ============================================================ */

export default function SimulationPanel({ language = "ar" }) {
  const t = TEXT[language] || TEXT.ar;

  const [view, setView] = useState("surveillance");
  const [defenseMode, setDefenseMode] = useState("atmospheric");
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [simulationTime, setSimulationTime] = useState(0);
  const [rate, setRate] = useState(1);
  const [sceneReady, setSceneReady] = useState(false);

  const rootRef = useRef(null);
  const lastFrameRef = useRef(0);
  const animationRef = useRef(0);
  const timeRef = useRef(0);

  const phase = useMemo(
    () => phaseForTime(simulationTime),
    [simulationTime]
  );

  const progress = useMemo(
    () => clamp(simulationTime / 37, 0, 1) * 100,
    [simulationTime]
  );

  const isComplete = phase === "complete";
  const isDetected = simulationTime >= 5;
  const isTracking = simulationTime >= 12;
  const isResponding = simulationTime >= 20;

  const startScenario = useCallback(() => {
    timeRef.current = 0;
    setSimulationTime(0);
    setStarted(true);
    setRunning(true);
  }, []);

  const pauseScenario = useCallback(() => {
    setRunning(false);
  }, []);

  const resetScenario = useCallback(() => {
    setRunning(false);
    setStarted(false);
    timeRef.current = 0;
    setSimulationTime(0);
  }, []);

  const replayScenario = useCallback(() => {
    timeRef.current = 0;
    setSimulationTime(0);
    setStarted(true);
    setRunning(true);
  }, []);

  useEffect(() => {
    if (!running) {
      cancelAnimationFrame(animationRef.current);
      return undefined;
    }

    lastFrameRef.current = performance.now();

    const tick = now => {
      const delta = Math.min(
        (now - lastFrameRef.current) / 1000,
        0.08
      );

      lastFrameRef.current = now;

      const next = Math.min(
        37,
        timeRef.current + delta * rate
      );

      timeRef.current = next;
      setSimulationTime(next);

      if (next >= 37) {
        setRunning(false);
        return;
      }

      animationRef.current = requestAnimationFrame(tick);
    };

    animationRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(animationRef.current);
  }, [running, rate]);

  const changeView = useCallback(next => {
    setView(next);
    if (next === "defense" && !started) {
      setRunning(false);
    }
  }, [started]);

  const phaseCards = [
    {
      id: "detection",
      title: t.detection,
      detail: t.confidence,
      at: 5
    },
    {
      id: "tracking",
      title: t.tracking,
      detail: t.trackingQuality,
      at: 12
    },
    {
      id: "response",
      title: t.response,
      detail: t.responseStatus,
      at: 20
    },
    {
      id: "intercept",
      title: t.intercept,
      detail: t.assessment,
      at: 32
    }
  ];

  const currentStatus = !started
    ? t.standby
    : isComplete
      ? t.completed
      : running
        ? t.active
        : t.paused;

  const currentPhaseLabel = started
    ? getPhaseLabel(phase, t)
    : t.waiting;

  const openFullscreen = () => {
    const element = rootRef.current;
    if (!element) return;

    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      element.requestFullscreen?.();
    }
  };

  return (
    <div
      className="os-simulation"
      ref={rootRef}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <style>{`
        .os-simulation {
          --bg: #07111f;
          --panel: #0c1a2b;
          --panel2: #10243a;
          --line: rgba(135,180,220,.15);
          --muted: #7892ad;
          --text: #e5f0fc;
          --blue: #69bdff;
          width: 100%;
          min-width: 0;
          color: var(--text);
          font-family: "Segoe UI", Tahoma, Arial, sans-serif;
        }

        .os-simulation * { box-sizing: border-box; }

        .os-sim-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          margin-bottom: 15px;
        }

        .os-sim-brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .os-sim-brand-icon {
          display: grid;
          place-items: center;
          width: 43px;
          height: 43px;
          border: 1px solid rgba(105,189,255,.28);
          border-radius: 9px;
          background: rgba(65,145,220,.09);
          color: var(--blue);
          box-shadow: 0 0 25px rgba(45,139,220,.08);
        }

        .os-sim-brand h1 {
          margin: 0;
          color: #e4f2ff;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: .02em;
        }

        .os-sim-brand p {
          margin: 5px 0 0;
          color: #718ba7;
          font-size: 8px;
          letter-spacing: .13em;
        }

        .os-sim-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .os-local-pill,
        .os-synthetic-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 8px 10px;
          border: 1px solid var(--line);
          border-radius: 5px;
          background: rgba(255,255,255,.025);
          color: #9bb5cf;
          font-size: 8px;
          white-space: nowrap;
        }

        .os-local-pill i,
        .os-synthetic-pill i {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #4fe0ae;
          box-shadow: 0 0 8px #4fe0ae;
        }

        .os-synthetic-pill i {
          background: #ffc66e;
          box-shadow: 0 0 8px #ffc66e;
        }

        .os-notice-bar {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 15px;
          padding: 11px 13px;
          border: 1px solid rgba(255,198,110,.17);
          border-radius: 7px;
          background: rgba(255,180,80,.045);
          color: #d8b77d;
        }

        .os-notice-bar > svg { flex: 0 0 auto; margin-top: 1px; }

        .os-notice-bar strong {
          display: block;
          font-size: 9px;
        }

        .os-notice-bar p {
          margin: 4px 0 0;
          color: #9c8c70;
          font-size: 8px;
          line-height: 1.7;
        }

        .os-mode-tabs {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-bottom: 13px;
          padding: 5px;
          border: 1px solid var(--line);
          border-radius: 7px;
          background: rgba(9,22,37,.9);
        }

        .os-mode-tab {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          min-height: 37px;
          padding: 0 15px;
          border: 1px solid transparent;
          border-radius: 5px;
          background: transparent;
          color: #819bb6;
          font-size: 9px;
          font-weight: 650;
          cursor: pointer;
          transition: .18s ease;
        }

        .os-mode-tab:hover {
          color: #d7eaff;
          background: rgba(255,255,255,.035);
        }

        .os-mode-tab.active {
          border-color: rgba(105,189,255,.22);
          background: linear-gradient(110deg,rgba(54,135,200,.2),rgba(54,135,200,.06));
          color: #b9e1ff;
          box-shadow: inset 0 0 18px rgba(80,160,230,.04);
        }

        .os-mode-tab.defense.active {
          border-color: rgba(255,101,124,.24);
          background: linear-gradient(110deg,rgba(220,76,100,.15),rgba(220,76,100,.035));
          color: #ffb4c0;
        }

        .os-sim-main-grid {
          display: grid;
          grid-template-columns: minmax(0,1fr) 285px;
          gap: 12px;
          align-items: start;
        }

        .os-sim-primary { min-width: 0; }

        .os-visual-panel {
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 9px;
          background: #050c17;
        }

        .os-visual-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 48px;
          padding: 0 14px;
          border-bottom: 1px solid var(--line);
          background: rgba(12,27,45,.92);
        }

        .os-visual-heading strong {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #d4e6f8;
          font-size: 9px;
        }

        .os-visual-heading strong svg { color: var(--blue); }

        .os-visual-tag {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 8px;
          border: 1px solid rgba(105,189,255,.17);
          border-radius: 4px;
          color: #8bcaff;
          background: rgba(105,189,255,.055);
          font-size: 7px;
          letter-spacing: .08em;
        }

        .os-visual-tag span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #4fe0ae;
        }

        .os-visual-stage {
          position: relative;
          height: 570px;
          overflow: hidden;
          isolation: isolate;
          background:
            radial-gradient(ellipse at 48% 48%,rgba(25,73,112,.15),transparent 48%),
            linear-gradient(180deg,#050c18,#071426 60%,#06101d);
        }

        .os-three-host {
          position: absolute;
          inset: 0;
          z-index: 0;
        }

        .os-three-canvas {
          display: block;
          width: 100%;
          height: 100%;
          outline: none;
        }

        .os-defense-overlay {
          position: absolute;
          z-index: 2;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          background:
            radial-gradient(ellipse at 50% 50%,rgba(23,61,95,.14),transparent 58%),
            linear-gradient(180deg,rgba(3,10,20,.12),rgba(3,10,20,.28));
        }

        .os-defense-map-grid {
          position: absolute;
          inset: 0;
          opacity: .22;
          background-image:
            linear-gradient(rgba(89,154,211,.15) 1px,transparent 1px),
            linear-gradient(90deg,rgba(89,154,211,.15) 1px,transparent 1px);
          background-size: 42px 42px;
          mask-image: linear-gradient(90deg,transparent,#000 20%,#000 80%,transparent);
        }

        .os-earth-horizon {
          position: absolute;
          left: -10%;
          right: -10%;
          bottom: -48%;
          height: 67%;
          border-radius: 50% 50% 0 0;
          background:
            radial-gradient(ellipse at 50% 0%,rgba(38,128,201,.48),transparent 8%),
            linear-gradient(180deg,#103b64 0%,#0a2543 20%,#06172d 75%);
          box-shadow: 0 -10px 55px rgba(54,153,229,.22);
          opacity: .93;
        }

        .os-horizon-glow {
          position: absolute;
          top: 0;
          left: 7%;
          right: 7%;
          height: 3px;
          border-radius: 50%;
          background: #5bbdff;
          box-shadow: 0 0 18px #4aaaff,0 0 55px rgba(65,165,255,.65);
        }

        .os-horizon-line {
          position: absolute;
          top: 12%;
          left: 10%;
          right: 10%;
          height: 1px;
          background: rgba(109,191,255,.2);
        }

        .os-trajectory-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: visible;
        }

        .os-object-glyph {
          position: absolute;
          z-index: 5;
          width: 30px;
          height: 30px;
          transform: translate(-50%,-50%);
          transition: left .11s linear,top .11s linear;
          filter: drop-shadow(0 0 8px rgba(255,120,100,.55));
        }

        .os-object-glyph.interceptor {
          filter: drop-shadow(0 0 9px rgba(75,210,255,.7));
        }

        .os-glyph-glow {
          position: absolute;
          inset: -12px;
          border-radius: 50%;
          background: radial-gradient(circle,rgba(255,113,105,.26),transparent 70%);
        }

        .interceptor .os-glyph-glow {
          background: radial-gradient(circle,rgba(76,210,255,.3),transparent 70%);
        }

        .os-missile-shape {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 28px;
          height: 10px;
          transform: translate(-50%,-50%) rotate(-32deg);
        }

        .os-missile-shape .body {
          position: absolute;
          left: 5px;
          top: 2px;
          width: 18px;
          height: 6px;
          border-radius: 2px;
          background: linear-gradient(90deg,#d9e5ef,#ff987c);
          box-shadow: 0 0 7px rgba(255,135,105,.55);
        }

        .os-missile-shape .nose {
          position: absolute;
          left: 22px;
          top: 1px;
          width: 0;
          height: 0;
          border-top: 4px solid transparent;
          border-bottom: 4px solid transparent;
          border-left: 7px solid #ff6f78;
        }

        .os-missile-shape .fin {
          position: absolute;
          top: 0;
          width: 5px;
          height: 4px;
          background: #d78b83;
        }

        .os-missile-shape .fin-a { left: 5px; transform: skewY(-25deg); }
        .os-missile-shape .fin-b { left: 5px; top: 6px; transform: skewY(25deg); }

        .os-missile-shape .flame {
          position: absolute;
          left: -5px;
          top: 3px;
          width: 10px;
          height: 4px;
          border-radius: 50%;
          background: linear-gradient(90deg,transparent,#ff7b56,#ffd17b);
          animation: os-flame 0.16s infinite alternate;
        }

        .interceptor .os-missile-shape .body {
          background: linear-gradient(90deg,#c5f4ff,#63caff);
        }

        .interceptor .os-missile-shape .nose { border-left-color: #67e4ff; }
        .interceptor .os-missile-shape .fin { background: #78cfff; }
        .interceptor .os-missile-shape .flame {
          background: linear-gradient(90deg,transparent,#59dfff,#d8fbff);
        }

        @keyframes os-flame {
          from { transform: scaleX(.7); opacity: .65; }
          to { transform: scaleX(1.25); opacity: 1; }
        }

        .os-glyph-label {
          position: absolute;
          left: 50%;
          top: 25px;
          width: max-content;
          max-width: 160px;
          transform: translateX(-50%);
          padding: 4px 6px;
          border: 1px solid rgba(255,120,110,.25);
          border-radius: 3px;
          background: rgba(7,15,28,.85);
          color: #ffb4a8;
          font-size: 7px;
          white-space: nowrap;
        }

        .interceptor .os-glyph-label {
          border-color: rgba(86,225,242,.25);
          color: #9defff;
        }

        .os-detection-box {
          position: absolute;
          z-index: 4;
          width: 68px;
          height: 68px;
          transform: translate(-50%,-50%);
          border: 1px solid rgba(255,198,110,.75);
          box-shadow: 0 0 20px rgba(255,198,110,.14);
          animation: os-detection-pulse 1.6s infinite;
        }

        .os-detection-box::before,
        .os-detection-box::after {
          position: absolute;
          content: "";
          width: 9px;
          height: 9px;
          border-color: #ffc66e;
          border-style: solid;
        }

        .os-detection-box::before {
          top: -2px;
          left: -2px;
          border-width: 2px 0 0 2px;
        }

        .os-detection-box::after {
          bottom: -2px;
          right: -2px;
          border-width: 0 2px 2px 0;
        }

        .os-detection-box span {
          position: absolute;
          inset: 50%;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: #ffc66e;
          box-shadow: 0 0 9px #ffc66e;
        }

        .os-detection-box small {
          position: absolute;
          left: 50%;
          top: -18px;
          transform: translateX(-50%);
          color: #ffd58e;
          font-size: 7px;
          white-space: nowrap;
        }

        @keyframes os-detection-pulse {
          0%,100% { opacity: .55; transform: translate(-50%,-50%) scale(.94); }
          50% { opacity: 1; transform: translate(-50%,-50%) scale(1.04); }
        }

        .os-radar-sweep {
          position: absolute;
          z-index: 3;
          left: 50%;
          top: 49%;
          width: 180px;
          height: 180px;
          transform: translate(-50%,-50%);
          opacity: .4;
        }

        .os-radar-sweep.active { opacity: .78; }

        .os-radar-ring {
          position: absolute;
          inset: 0;
          border: 1px solid rgba(91,191,255,.22);
          border-radius: 50%;
        }

        .os-radar-ring.ring-b { inset: 25%; }
        .os-radar-ring.ring-c { inset: 42%; }

        .os-radar-cross {
          position: absolute;
          background: rgba(91,191,255,.16);
        }

        .os-radar-cross.horizontal {
          left: 0; right: 0; top: 50%; height: 1px;
        }

        .os-radar-cross.vertical {
          top: 0; bottom: 0; left: 50%; width: 1px;
        }

        .os-radar-beam {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: conic-gradient(from 0deg,transparent 0deg,rgba(68,195,255,.18) 40deg,transparent 78deg);
          animation: os-radar-rotate 4s linear infinite;
        }

        .os-radar-center {
          position: absolute;
          inset: 43%;
          display: grid;
          place-items: center;
          color: #79cfff;
          border: 1px solid rgba(105,189,255,.28);
          border-radius: 50%;
          background: rgba(5,20,36,.75);
        }

        .os-radar-contact {
          position: absolute;
          left: 68%;
          top: 28%;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ffc66e;
          box-shadow: 0 0 12px #ffc66e;
          animation: os-contact-blink .8s infinite alternate;
        }

        @keyframes os-radar-rotate { to { transform: rotate(360deg); } }
        @keyframes os-contact-blink { to { opacity: .2; } }

        .os-intercept-burst {
          position: absolute;
          z-index: 8;
          left: 79%;
          top: 33%;
          width: 100px;
          height: 100px;
          transform: translate(-50%,-50%);
          animation: os-burst-appear .65s ease-out both;
        }

        .os-burst-core {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 24px;
          height: 24px;
          transform: translate(-50%,-50%);
          border-radius: 50%;
          background: #fff8d9;
          box-shadow: 0 0 18px 8px #ffbd74,0 0 48px 22px rgba(255,105,100,.4);
        }

        .os-burst-ring {
          position: absolute;
          inset: 5px;
          border: 2px solid rgba(255,196,120,.85);
          border-radius: 50%;
          animation: os-ring-expand .85s ease-out infinite;
        }

        .os-burst-ring.ring-two {
          animation-delay: .28s;
          border-color: rgba(111,207,255,.75);
        }

        .os-intercept-burst i {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: #ffd48c;
          transform: rotate(var(--particle-angle)) translateY(-42px);
          animation: os-particle .8s ease-out var(--particle-delay) infinite;
        }

        @keyframes os-burst-appear {
          from { opacity: 0; transform: translate(-50%,-50%) scale(.15); }
          to { opacity: 1; transform: translate(-50%,-50%) scale(1); }
        }

        @keyframes os-ring-expand {
          from { transform: scale(.25); opacity: 1; }
          to { transform: scale(1.45); opacity: 0; }
        }

        @keyframes os-particle {
          from { opacity: 1; }
          to { opacity: 0; transform: rotate(var(--particle-angle)) translateY(-65px) scale(.3); }
        }

        .os-overlay-corner {
          position: absolute;
          z-index: 10;
          display: flex;
          align-items: center;
          gap: 7px;
          color: #7896b4;
          font-size: 7px;
          letter-spacing: .11em;
        }

        .os-overlay-corner.top-left { top: 14px; left: 15px; }
        .os-overlay-corner.top-right { top: 14px; right: 15px; }
        .os-overlay-corner.bottom-left { bottom: 14px; left: 15px; }
        .os-overlay-corner.bottom-right { bottom: 14px; right: 15px; }

        .os-overlay-corner.bottom-left span + span {
          padding-left: 8px;
          border-left: 1px solid rgba(120,150,180,.25);
        }

        .os-live-indicator {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #ff687d;
          box-shadow: 0 0 9px #ff687d;
        }

        .os-visual-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          min-height: 43px;
          padding: 8px 12px;
          border-top: 1px solid var(--line);
          background: #0a1828;
        }

        .os-visual-footer span {
          color: #7792ad;
          font-size: 8px;
        }

        .os-visual-footer button {
          display: flex;
          align-items: center;
          gap: 7px;
          height: 29px;
          padding: 0 9px;
          border: 1px solid var(--line);
          border-radius: 4px;
          background: rgba(255,255,255,.025);
          color: #9ebbd6;
          font-size: 8px;
          cursor: pointer;
        }

        .os-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
          padding: 10px;
          border: 1px solid var(--line);
          border-radius: 7px;
          background: #0b1929;
        }

        .os-toolbar-actions {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .os-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 34px;
          padding: 0 12px;
          border: 1px solid var(--line);
          border-radius: 5px;
          background: rgba(255,255,255,.025);
          color: #a9c2db;
          font-size: 8px;
          font-weight: 650;
          cursor: pointer;
          transition: .16s ease;
        }

        .os-button:hover {
          border-color: rgba(105,189,255,.35);
          color: #e3f3ff;
          background: rgba(105,189,255,.08);
        }

        .os-button.primary {
          border-color: rgba(105,189,255,.35);
          background: linear-gradient(135deg,#328bd0,#23669f);
          color: white;
          box-shadow: 0 4px 15px rgba(30,110,180,.15);
        }

        .os-button.danger {
          border-color: rgba(255,101,124,.25);
          background: rgba(255,101,124,.07);
          color: #ff9cab;
        }

        .os-button:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        .os-toolbar-rate {
          display: flex;
          align-items: center;
          gap: 7px;
          color: #829bb5;
          font-size: 8px;
        }

        .os-toolbar-rate select {
          height: 32px;
          padding: 0 8px;
          border: 1px solid var(--line);
          border-radius: 4px;
          outline: none;
          background: #10243a;
          color: #d0e3f5;
          font-size: 9px;
        }

        .os-metrics {
          display: grid;
          grid-template-columns: repeat(3,minmax(0,1fr));
          gap: 9px;
          margin-top: 10px;
        }

        .os-metric {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          min-height: 66px;
          padding: 11px;
          border: 1px solid var(--line);
          border-radius: 7px;
          background: rgba(12,27,45,.86);
        }

        .os-metric-icon {
          display: grid;
          place-items: center;
          width: 31px;
          height: 31px;
          flex: 0 0 31px;
          border: 1px solid rgba(105,189,255,.12);
          border-radius: 6px;
          background: rgba(105,189,255,.07);
        }

        .os-metric-copy { min-width: 0; }

        .os-metric-copy span {
          display: block;
          color: #7c96b0;
          font-size: 7px;
        }

        .os-metric-copy strong {
          display: block;
          margin-top: 5px;
          color: #e0effd;
          font-size: 13px;
          font-weight: 650;
          font-variant-numeric: tabular-nums;
        }

        .os-metric-copy small {
          margin-inline-start: 4px;
          color: #7893ae;
          font-size: 7px;
          font-weight: 400;
        }

        .os-panel {
          overflow: hidden;
          border: 1px solid var(--line);
          border-radius: 8px;
          background: rgba(11,25,42,.95);
        }

        .os-panel + .os-panel { margin-top: 11px; }

        .os-panel-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-height: 45px;
          padding: 0 12px;
          border-bottom: 1px solid var(--line);
        }

        .os-panel-heading strong {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #d4e6f8;
          font-size: 9px;
        }

        .os-panel-heading strong svg { color: var(--blue); }

        .os-panel-heading small {
          color: #7089a4;
          font-size: 7px;
        }

        .os-panel-body { padding: 11px; }

        .os-side-column { min-width: 0; }

        .os-status-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 12px;
          border: 1px solid rgba(105,189,255,.16);
          border-radius: 7px;
          background: rgba(55,139,207,.06);
        }

        .os-status-icon {
          display: grid;
          place-items: center;
          width: 34px;
          height: 34px;
          flex: 0 0 34px;
          border-radius: 7px;
          background: rgba(105,189,255,.1);
          color: #8bceff;
        }

        .os-status-copy { min-width: 0; flex: 1; }

        .os-status-copy span {
          display: block;
          color: #7894af;
          font-size: 7px;
        }

        .os-status-copy strong {
          display: block;
          margin-top: 5px;
          color: #cfe7fc;
          font-size: 10px;
        }

        .os-status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #4fe0ae;
          box-shadow: 0 0 9px #4fe0ae;
        }

        .os-mode-selector {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 7px;
        }

        .os-mode-choice {
          min-height: 62px;
          padding: 9px;
          border: 1px solid var(--line);
          border-radius: 6px;
          background: rgba(255,255,255,.02);
          color: #829bb5;
          text-align: start;
          cursor: pointer;
        }

        .os-mode-choice strong {
          display: block;
          font-size: 8px;
        }

        .os-mode-choice small {
          display: block;
          margin-top: 6px;
          color: #657f9b;
          font-size: 7px;
        }

        .os-mode-choice.selected {
          border-color: rgba(105,189,255,.35);
          background: rgba(64,147,214,.1);
          color: #bfe4ff;
        }

        .os-phase-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .os-phase-card {
          display: flex;
          align-items: center;
          gap: 9px;
          min-height: 48px;
          padding: 8px;
          border: 1px solid rgba(130,177,220,.09);
          border-radius: 5px;
          background: rgba(255,255,255,.014);
          opacity: .58;
        }

        .os-phase-card.active {
          border-color: rgba(105,189,255,.28);
          background: rgba(65,145,210,.08);
          opacity: 1;
        }

        .os-phase-card.complete {
          border-color: rgba(79,224,174,.18);
          opacity: .88;
        }

        .os-phase-number {
          display: grid;
          place-items: center;
          width: 23px;
          height: 23px;
          flex: 0 0 23px;
          border: 1px solid rgba(130,177,220,.18);
          border-radius: 5px;
          color: #91aac3;
          font-size: 8px;
        }

        .os-phase-card.active .os-phase-number {
          border-color: rgba(105,189,255,.4);
          color: #9ed8ff;
        }

        .os-phase-card.complete .os-phase-number {
          border-color: rgba(79,224,174,.35);
          color: #63ddb0;
        }

        .os-phase-card > div:nth-child(2) {
          min-width: 0;
          flex: 1;
        }

        .os-phase-card strong {
          display: block;
          color: #c6d9eb;
          font-size: 8px;
        }

        .os-phase-card small {
          display: block;
          margin-top: 4px;
          color: #718ba6;
          font-size: 7px;
        }

        .os-phase-state {
          color: #607993;
          font-size: 6px;
          letter-spacing: .08em;
        }

        .os-phase-card.active .os-phase-state { color: #83caff; }
        .os-phase-card.complete .os-phase-state { color: #58d6a8; }

        .os-event-log {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .os-event-row {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 42px;
          padding: 6px 2px;
          border-bottom: 1px solid rgba(130,177,220,.07);
        }

        .os-event-icon {
          display: grid;
          place-items: center;
          width: 25px;
          height: 25px;
          flex: 0 0 25px;
          border-radius: 5px;
          background: rgba(255,255,255,.035);
        }

        .os-event-copy { flex: 1; min-width: 0; }

        .os-event-copy strong {
          display: block;
          color: #b9cde1;
          font-size: 8px;
          line-height: 1.4;
        }

        .os-event-copy small {
          display: block;
          margin-top: 3px;
          color: #627e9a;
          font-size: 6px;
          letter-spacing: .08em;
        }

        .os-event-check { color: #58d6a8; }

        .os-empty-log {
          display: flex;
          align-items: center;
          gap: 8px;
          min-height: 50px;
          color: #738da8;
          font-size: 8px;
        }

        .os-timeline {
          padding: 27px 16px 17px;
          border: 1px solid var(--line);
          border-radius: 7px;
          background: rgba(12,27,45,.82);
          margin-top: 11px;
        }

        .os-timeline-track {
          position: relative;
          height: 3px;
          border-radius: 4px;
          background: rgba(130,177,220,.13);
        }

        .os-timeline-progress {
          position: absolute;
          inset-block: 0;
          inset-inline-start: 0;
          border-radius: 4px;
          background: linear-gradient(90deg,#4b9ee0,#55d9e7,#4fe0ae);
          transition: width .1s linear;
        }

        .os-timeline-node {
          position: absolute;
          top: 50%;
          width: 8px;
          height: 8px;
          transform: translate(-50%,-50%);
        }

        .os-timeline-node > span {
          display: block;
          width: 8px;
          height: 8px;
          border: 1px solid #607e9d;
          border-radius: 50%;
          background: #0b1a2c;
        }

        .os-timeline-node.complete > span {
          border-color: #53d9b0;
          background: #53d9b0;
          box-shadow: 0 0 8px rgba(83,217,176,.4);
        }

        .os-timeline-node.current > span {
          border-color: #8ed4ff;
          background: #8ed4ff;
          box-shadow: 0 0 10px #8ed4ff;
        }

        .os-timeline-node small {
          position: absolute;
          top: 14px;
          left: 50%;
          transform: translateX(-50%);
          color: #748ea8;
          font-size: 6px;
          white-space: nowrap;
        }

        .os-bottom-note {
          display: flex;
          align-items: center;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 12px;
          padding: 11px 13px;
          border: 1px solid var(--line);
          border-radius: 6px;
          background: rgba(10,24,40,.75);
          color: #6f89a4;
          font-size: 7px;
        }

        .os-bottom-note span {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .os-bottom-note svg { color: #76bfff; }

        .os-surveillance-placeholder {
          position: absolute;
          z-index: 2;
          left: 50%;
          top: 50%;
          width: min(360px,80%);
          transform: translate(-50%,-50%);
          padding: 17px;
          border: 1px solid rgba(105,189,255,.18);
          border-radius: 8px;
          background: rgba(5,15,28,.72);
          backdrop-filter: blur(9px);
          text-align: center;
          pointer-events: none;
        }

        .os-surveillance-placeholder strong {
          display: block;
          color: #d8eafa;
          font-size: 10px;
        }

        .os-surveillance-placeholder p {
          margin: 8px 0 0;
          color: #819bb5;
          font-size: 8px;
          line-height: 1.7;
        }

        @media(max-width:1120px) {
          .os-sim-main-grid { grid-template-columns: minmax(0,1fr) 255px; }
          .os-visual-stage { height: 510px; }
        }

        @media(max-width:850px) {
          .os-sim-main-grid { grid-template-columns: 1fr; }
          .os-side-column {
            display: grid;
            grid-template-columns: repeat(2,minmax(0,1fr));
            gap: 10px;
          }
          .os-side-column > .os-panel { margin: 0; }
          .os-side-column > .os-panel:first-child { grid-column: 1 / -1; }
        }

        @media(max-width:620px) {
          .os-sim-header { align-items: flex-start; flex-direction: column; }
          .os-sim-header-right { flex-wrap: wrap; }
          .os-mode-tabs { overflow-x: auto; }
          .os-mode-tab { white-space: nowrap; padding: 0 10px; }
          .os-visual-stage { height: 390px; }
          .os-metrics { grid-template-columns: 1fr 1fr; }
          .os-toolbar { align-items: flex-start; }
          .os-toolbar-actions { flex-wrap: wrap; }
          .os-toolbar-rate { margin-inline-start: auto; }
          .os-side-column { grid-template-columns: 1fr; }
          .os-side-column > .os-panel:first-child { grid-column: auto; }
          .os-timeline { padding-inline: 9px; }
          .os-timeline-node small { font-size: 5px; }
          .os-bottom-note { align-items: flex-start; flex-direction: column; }
        }

        @media(prefers-reduced-motion:reduce) {
          .os-simulation *,
          .os-simulation *::before,
          .os-simulation *::after {
            animation-duration: .01ms !important;
            transition-duration: .01ms !important;
          }
        }
      `}</style>

      <header className="os-sim-header">
        <div className="os-sim-brand">
          <div className="os-sim-brand-icon">
            <OrbitIcon />
          </div>
          <div>
            <h1>{t.title}</h1>
            <p>{t.subtitle}</p>
          </div>
        </div>

        <div className="os-sim-header-right">
          <span className="os-local-pill">
            <i />
            {t.local}
          </span>
          <span className="os-synthetic-pill">
            <i />
            {t.synthetic}
          </span>
        </div>
      </header>

      <div className="os-notice-bar">
        <AlertTriangle size={15} />
        <div>
          <strong>{t.warningTitle}</strong>
          <p>{t.warning}</p>
        </div>
      </div>

      <nav className="os-mode-tabs">
        <button
          type="button"
          className={`os-mode-tab ${view === "surveillance" ? "active" : ""}`}
          onClick={() => changeView("surveillance")}
        >
          <Globe2 size={15} />
          {t.surveillance}
        </button>

        <button
          type="button"
          className={`os-mode-tab defense ${view === "defense" ? "active" : ""}`}
          onClick={() => changeView("defense")}
        >
          <ShieldCheck size={15} />
          {t.defense}
        </button>
      </nav>

      <div className="os-sim-main-grid">
        <main className="os-sim-primary">
          <section className="os-visual-panel">
            <div className="os-visual-heading">
              <strong>
                {view === "defense" ? <Shield size={15} /> : <Globe2 size={15} />}
                {view === "defense" ? t.defenseTitle : t.orbitalTitle}
              </strong>
              <span className="os-visual-tag">
                <span />
                {view === "defense" ? "DEFENSE VIEW" : "3D ORBITAL VIEW"}
              </span>
            </div>

            <div className="os-visual-stage">
              <OrbitalScene
                mode={view}
                onReady={setSceneReady}
              />

              {view === "defense" ? (
                <DefenseOverlay
                  time={simulationTime}
                  mode={defenseMode}
                  phase={phase}
                  t={t}
                />
              ) : (
                <div className="os-surveillance-placeholder">
                  <strong>{t.orbitObjects}</strong>
                  <p>{t.orbitDescription}</p>
                </div>
              )}
            </div>

            <div className="os-visual-footer">
              <span>
                {view === "defense"
                  ? `${t.phase}: ${currentPhaseLabel}`
                  : t.orbitDescription}
              </span>
              <button type="button" onClick={openFullscreen}>
                <Maximize2 size={13} />
                {t.camera}
              </button>
            </div>
          </section>

          {view === "defense" ? (
            <>
              <div className="os-toolbar">
                <div className="os-toolbar-actions">
                  {!started || isComplete ? (
                    <button
                      type="button"
                      className="os-button primary"
                      onClick={started ? replayScenario : startScenario}
                    >
                      <Play size={14} />
                      {started ? t.replay : t.launch}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="os-button primary"
                      onClick={() => setRunning(value => !value)}
                    >
                      {running ? <Pause size={14} /> : <Play size={14} />}
                      {running ? t.pause : t.resume}
                    </button>
                  )}

                  <button
                    type="button"
                    className="os-button"
                    onClick={resetScenario}
                  >
                    <RefreshCw size={13} />
                    {t.reset}
                  </button>
                </div>

                <label className="os-toolbar-rate">
                  <Gauge size={13} />
                  {t.speed}
                  <select
                    value={rate}
                    onChange={event => setRate(Number(event.target.value))}
                  >
                    <option value={0.5}>0.5×</option>
                    <option value={1}>1×</option>
                    <option value={2}>2×</option>
                    <option value={4}>4×</option>
                  </select>
                </label>
              </div>

              <div className="os-metrics">
                <Metric
                  icon={Timer}
                  label={t.elapsed}
                  value={formatTime(simulationTime)}
                  accent={COLORS.blue}
                />
                <Metric
                  icon={Crosshair}
                  label={t.confidence}
                  value={isDetected ? "ACTIVE" : "—"}
                  accent={COLORS.amber}
                />
                <Metric
                  icon={Activity}
                  label={t.trackingQuality}
                  value={isTracking ? "VISUAL" : "—"}
                  accent={COLORS.cyan}
                />
              </div>

              <EventTimeline time={simulationTime} t={t} />

              <div className="os-bottom-note">
                <span><Shield size={12} /> ORBITAL SHIELD · LOCAL SIMULATION</span>
                <span><Radio size={12} /> {t.noExternal}</span>
                <span><Activity size={12} /> {t.simulationOnly}</span>
              </div>
            </>
          ) : (
            <div className="os-toolbar">
              <div className="os-toolbar-actions">
                <button
                  type="button"
                  className="os-button primary"
                  onClick={() => changeView("defense")}
                >
                  <ShieldCheck size={14} />
                  {t.switchToDefense}
                </button>
              </div>
              <span className="os-toolbar-rate">
                <Satellite size={13} />
                {t.systemReady}
              </span>
            </div>
          )}
        </main>

        <aside className="os-side-column">
          <section className="os-panel">
            <div className="os-panel-heading">
              <strong><Activity size={14} /> {t.status}</strong>
              <small>{t.mission} · OS-SYN-01</small>
            </div>
            <div className="os-panel-body">
              <div className="os-status-card">
                <div className="os-status-icon">
                  {view === "defense" ? <Siren size={18} /> : <Globe2 size={18} />}
                </div>
                <div className="os-status-copy">
                  <span>{t.phase}</span>
                  <strong>
                    {view === "defense" ? currentPhaseLabel : t.orbitDescription}
                  </strong>
                </div>
                <span className="os-status-dot" />
              </div>

              {view === "defense" && (
                <>
                  <div style={{ height: 12 }} />
                  <div className="os-mode-selector">
                    <button
                      type="button"
                      className={`os-mode-choice ${defenseMode === "atmospheric" ? "selected" : ""}`}
                      onClick={() => {
                        setDefenseMode("atmospheric");
                        resetScenario();
                      }}
                    >
                      <strong>{t.atmospheric}</strong>
                      <small>{t.phaseAtmosphere}</small>
                    </button>
                    <button
                      type="button"
                      className={`os-mode-choice ${defenseMode === "exo" ? "selected" : ""}`}
                      onClick={() => {
                        setDefenseMode("exo");
                        resetScenario();
                      }}
                    >
                      <strong>{t.exo}</strong>
                      <small>{t.phaseExo}</small>
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>

          {view === "defense" && (
            <>
              <section className="os-panel">
                <div className="os-panel-heading">
                  <strong><Layers3 size={14} /> {t.phase}</strong>
                  <small>{Math.round(progress)}%</small>
                </div>
                <div className="os-panel-body">
                  <div className="os-phase-list">
                    {phaseCards.map((item, index) => (
                      <PhaseCard
                        key={item.id}
                        number={index + 1}
                        title={item.title}
                        detail={item.detail}
                        active={phase === item.id}
                        complete={simulationTime >= item.at + (
                          item.id === "intercept" ? 5 : 1
                        )}
                      />
                    ))}
                  </div>
                </div>
              </section>

              <section className="os-panel">
                <div className="os-panel-heading">
                  <strong><Radio size={14} /> {t.eventLog}</strong>
                  <small>T+ {formatTime(simulationTime)}</small>
                </div>
                <div className="os-panel-body">
                  <EventLog time={simulationTime} t={t} />
                </div>
              </section>
            </>
          )}

          {view === "surveillance" && (
            <section className="os-panel">
              <div className="os-panel-heading">
                <strong><Satellite size={14} /> {t.orbitObjects}</strong>
                <small>LOCAL DATA</small>
              </div>
              <div className="os-panel-body">
                {[
                  ["ORBITER-01", "LEO", "#56e1f2"],
                  ["ORBITER-02", "LEO", "#69bdff"],
                  ["RELAY-04", "RELAY", "#a78bfa"],
                  ["GEO-ALPHA", "GEO", "#4fe0ae"],
                  ["TRACKER-01", "GROUND", "#ffc66e"]
                ].map(([name, type, color]) => (
                  <div className="os-event-row" key={name}>
                    <div
                      className="os-event-icon"
                      style={{ color }}
                    >
                      <Satellite size={14} />
                    </div>
                    <div className="os-event-copy">
                      <strong>{name}</strong>
                      <small>{type} · SYNTHETIC OBJECT</small>
                    </div>
                    <span className="os-status-dot" />
                  </div>
                ))}
              </div>
            </section>
          )}

          {view === "defense" && (
            <section className="os-panel">
              <div className="os-panel-heading">
                <strong><Target size={14} /> {t.telemetry}</strong>
                <small>LOCAL</small>
              </div>
              <div className="os-panel-body">
                <div className="os-event-row">
                  <div className="os-event-icon" style={{ color: COLORS.red }}>
                    <Crosshair size={14} />
                  </div>
                  <div className="os-event-copy">
                    <strong>{t.threat}</strong>
                    <small>OS-SYN-THREAT-01</small>
                  </div>
                </div>
                <div className="os-event-row">
                  <div className="os-event-icon" style={{ color: COLORS.cyan }}>
                    <Shield size={14} />
                  </div>
                  <div className="os-event-copy">
                    <strong>{t.interceptor}</strong>
                    <small>OS-SYN-RESPONSE-01</small>
                  </div>
                </div>
                <div className="os-event-row">
                  <div className="os-event-icon" style={{ color: COLORS.amber }}>
                    <Gauge size={14} />
                  </div>
                  <div className="os-event-copy">
                    <strong>{t.range}</strong>
                    <small>{started ? `${Math.max(0, Math.round(100 - progress))}%` : "—"}</small>
                  </div>
                </div>
                <div className="os-event-row">
                  <div className="os-event-icon" style={{ color: COLORS.green }}>
                    <CheckCircle2 size={14} />
                  </div>
                  <div className="os-event-copy">
                    <strong>{t.result}</strong>
                    <small>{isComplete ? t.success : t.noResult}</small>
                  </div>
                </div>
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

/* Small inline brand icon */
function OrbitIcon() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="3"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <ellipse
        cx="12"
        cy="12"
        rx="10"
        ry="4.3"
        stroke="currentColor"
        strokeWidth="1.2"
        transform="rotate(-38 12 12)"
      />
      <circle cx="19.4" cy="6" r="1.5" fill="#8bd6ff" />
    </svg>
  );
}
