import { useEffect, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import {
  BsArrowClockwise,
  BsArrowCounterclockwise,
  BsFullscreen,
  BsFullscreenExit,
  BsGearFill,
} from "react-icons/bs";

import { Alert, Button } from "../../components/ui";
import { useScreenShare } from "./useScreenShare";

const presets: Record<string, string> = {
  white: "#FFFFFF",
  "off-white": "#F9F6F1",
  gray: "#2D2D2D",
  black: "#000000",
};

function load(key: string, fallback: string) {
  try {
    return localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // storage blocked, the choice lasts until reload
  }
}

const resolveBackdrop = (b: string) => presets[b] ?? b;

function isLight(hex: string) {
  const c = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(c.substring(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 > 128;
}

// viewport aspect, minus the room for the controls on the right
function subscribeResize(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}
const viewportAspect = () => (window.innerWidth - 50) / window.innerHeight;

type Position = "right" | "top";

function Waiting({ children }: { children: string }) {
  return (
    <Alert kind="info">
      <span className="inline-flex items-center gap-2">
        <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        {children}
      </span>
    </Alert>
  );
}

export default function ScreenShare() {
  const share = useScreenShare();
  const { status, size, rotation, rotate, canvasRef, cursorRef } = share;
  const [fullscreen, setFullscreen] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  // the options panel keeps its place while open
  const [pinned, setPinned] = useState<Position | null>(null);
  const [backdrop, setBackdrop] = useState(() => load("screenshare-backdrop", "black"));
  const [customColor, setCustomColor] = useState(() => load("screenshare-custom-color", "#808080"));
  const optionsRef = useRef<HTMLDivElement>(null);
  const vpAspect = useSyncExternalStore(subscribeResize, viewportAspect);

  // the screen stays on while streaming, hiding the page releases the lock
  useEffect(() => {
    if (status !== "streaming") return;
    let lock: WakeLockSentinel | undefined;
    const request = () => {
      if (document.visibilityState === "visible") navigator.wakeLock?.request("screen").then((l) => (lock = l), () => {});
    };
    request();
    document.addEventListener("visibilitychange", request);
    return () => {
      document.removeEventListener("visibilitychange", request);
      lock?.release();
    };
  }, [status]);

  useEffect(() => {
    if (!showOptions) return;
    const close = (e: MouseEvent) => {
      if (!optionsRef.current?.contains(e.target as Node)) setShowOptions(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showOptions]);

  const sideways = (((rotation % 360) + 360) % 360) % 180 !== 0;
  const aspect = size.width && size.height ? (sideways ? size.height / size.width : size.width / size.height) : 0;
  // controls next to a tall picture, above a wide one
  const position: Position = aspect && aspect >= vpAspect ? "top" : "right";

  function disconnect() {
    share.disconnect();
    setFullscreen(false);
    setShowOptions(false);
  }

  function chooseBackdrop(b: string) {
    setBackdrop(b);
    save("screenshare-backdrop", b);
  }

  function toggleOptions() {
    if (!showOptions) setPinned(position);
    setShowOptions(!showOptions);
  }

  const canvasStyle: CSSProperties = {
    background: "#000",
    borderRadius: fullscreen ? 0 : 4,
    transform: `rotate(${rotation}deg)`,
    transition: "transform 0.3s ease",
  };
  if (fullscreen) {
    const right = position === "right" ? 56 : 0;
    const top = position === "top" ? 48 : 0;
    canvasStyle.width = "auto";
    canvasStyle.maxWidth = sideways ? `calc(100vh - ${top}px)` : `calc(100vw - ${right}px)`;
    canvasStyle.maxHeight = sideways ? `calc(100vw - ${right}px)` : `calc(100vh - ${top}px)`;
  } else if (sideways) {
    canvasStyle.height = "70vh";
    canvasStyle.width = "auto";
  } else {
    canvasStyle.width = "100%";
    canvasStyle.maxWidth = "min(600px, 100%)";
  }

  const light = isLight(resolveBackdrop(backdrop));
  const overlayButton = `inline-flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded border px-2.5 text-sm whitespace-nowrap ${
    light ? "border-black/40 text-black hover:bg-black/10" : "border-white/40 text-white hover:bg-white/10"
  }`;
  const panel = pinned ?? position;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 font-serif text-3xl">Screen Share</h1>

      {status === "waiting" && <Waiting>Waiting for reMarkable to start screen sharing…</Waiting>}
      {status === "connecting" && <Waiting>Connecting to reMarkable…</Waiting>}
      {(status === "error" || status === "disconnected") && (
        <Alert kind={status === "error" ? "error" : "info"}>
          <span className="flex flex-wrap items-center gap-3">
            {status === "error" ? share.error : "Disconnected. Start a new screenshare session from the tablet to reconnect."}
            <Button size="sm" onClick={share.reconnect}>Reconnect</Button>
          </span>
        </Alert>
      )}

      {/* the canvas stays mounted, the handshake sizes it before streaming starts */}
      <div
        className={`${status === "streaming" ? "flex" : "hidden"} flex-col items-center ${fullscreen ? "fixed inset-0 z-50 justify-center" : ""}`}
        style={
          fullscreen
            ? {
                background: resolveBackdrop(backdrop),
                paddingTop: position === "top" ? 40 : 0,
                paddingRight: position === "right" ? 50 : 0,
              }
            : undefined
        }
      >
        <canvas ref={canvasRef} style={canvasStyle} />
        <div ref={cursorRef} className="pointer-events-none fixed z-[60] hidden size-2 rounded-full bg-red-600" />

        {fullscreen ? (
          <div ref={optionsRef} className={`fixed top-2 right-2 z-[61] flex flex-col gap-1 ${position === "right" ? "items-center" : "items-end"}`}>
            <div className={`flex gap-1 ${position === "right" ? "flex-col" : "flex-row-reverse"}`}>
              <button type="button" className={overlayButton} title="Exit fullscreen" onClick={() => setFullscreen(false)}>
                <BsFullscreenExit />
              </button>
              <button type="button" className={overlayButton} title="Options" onClick={toggleOptions}>
                <BsGearFill />
              </button>
            </div>
            {showOptions && (
              <div
                className="fixed z-[62] flex min-w-40 flex-col gap-1 rounded-md p-2"
                style={{
                  top: panel === "right" ? 90 : 8,
                  right: panel === "right" ? 8 : 90,
                  background: light ? "rgba(255,255,255,0.95)" : "rgba(0,0,0,0.9)",
                }}
              >
                <div className="flex gap-1">
                  <button type="button" className={`${overlayButton} flex-1`} title="Rotate counter-clockwise" onClick={() => rotate(-90)}>
                    <BsArrowCounterclockwise /> Rotate L
                  </button>
                  <button type="button" className={`${overlayButton} flex-1`} title="Rotate clockwise" onClick={() => rotate(90)}>
                    <BsArrowClockwise /> Rotate R
                  </button>
                </div>
                <button type="button" className={overlayButton} title="End screenshare session" onClick={disconnect}>
                  Disconnect
                </button>
                <div className="mt-0.5 flex items-center justify-center gap-1">
                  {Object.entries(presets).map(([name, color]) => (
                    <button
                      key={name}
                      type="button"
                      title={name}
                      aria-label={`Backdrop ${name}`}
                      className={`size-[22px] cursor-pointer rounded-sm ${backdrop === name ? "ring-2 ring-accent" : "border border-neutral-500"}`}
                      style={{ background: color }}
                      onClick={() => chooseBackdrop(name)}
                    />
                  ))}
                  <label title="Custom color" className="relative size-[22px] cursor-pointer">
                    <span
                      className={`block size-full rounded-sm ${backdrop in presets ? "border border-neutral-500" : "ring-2 ring-accent"}`}
                      style={{ background: "conic-gradient(red, yellow, lime, aqua, blue, magenta, red)" }}
                    />
                    <input
                      type="color"
                      value={customColor}
                      className="absolute inset-0 size-full cursor-pointer opacity-0"
                      onClick={() => chooseBackdrop(customColor)}
                      onChange={(e) => {
                        setCustomColor(e.target.value);
                        save("screenshare-custom-color", e.target.value);
                        chooseBackdrop(e.target.value);
                      }}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Button size="sm" title="Rotate left" aria-label="Rotate left" onClick={() => rotate(-90)}>
              <BsArrowCounterclockwise />
            </Button>
            <Button size="sm" title="Rotate right" aria-label="Rotate right" onClick={() => rotate(90)}>
              <BsArrowClockwise />
            </Button>
            <Button size="sm" onClick={() => setFullscreen(true)}><BsFullscreen aria-hidden /> Fullscreen</Button>
            <Button size="sm" variant="danger" onClick={disconnect}>Disconnect</Button>
          </div>
        )}
      </div>
    </div>
  );
}
