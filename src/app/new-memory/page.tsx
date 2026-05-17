"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkle } from "lucide-react";
import { AgentPanel } from "@/components/AgentPanel";
import { Button } from "@/components/Button";
import { ImageUpload } from "@/components/ImageUpload";
import { Input } from "@/components/Input";
import { usePersonDetection, type PersonBox } from "@/hooks/usePersonDetection";

type FlowState =
  | "empty"
  | "analyzing"
  | "identifying" // naming a person (auto-detected or manual)
  | "confirm"     // "did I miss anyone?"
  | "drawing"     // user is drag-drawing a bounding box
  | "narrating"
  | "modifying"
  | "done";

function sortByX(boxes: PersonBox[]): PersonBox[] {
  return [...boxes].sort(
    (a, b) => a.bbox[0] + a.bbox[2] / 2 - (b.bbox[0] + b.bbox[2] / 2)
  );
}

function getMessage(state: FlowState, idx: number, total: number): string {
  switch (state) {
    case "empty":     return "Please upload an image for this memory.";
    case "analyzing": return "Analyzing your image. Looking for familiar figures…";
    case "identifying":
      if (total === 0) return "Who is this person?";
      if (total === 1) return "I found 1 person in this photo. Who is this?";
      return `Person ${idx + 1} of ${total} — who is this?`;
    case "confirm":   return "Did I miss anyone?";
    case "drawing":   return "Draw a box around the person I missed.";
    case "narrating":
      return "This is Justin, your grandson. In this photo you are standing next to him at the boardwalk. You used to take him to go rollerblading and he remembers laughing whenever he sped past you!";
    case "modifying": return "Edit the story for this memory.";
    case "done":      return "Saved. The narrator will tell this story whenever you open the memory.";
  }
}

export default function NewMemoryPage() {
  const [flowState, setFlowState] = useState<FlowState>("empty");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [sortedBoxes, setSortedBoxes] = useState<PersonBox[]>([]);
  const [personIndex, setPersonIndex] = useState(0);

  const { boxes, isDetecting } = usePersonDetection(imageUrl);

  useEffect(() => {
    if (flowState !== "analyzing" || isDetecting) return;
    setSortedBoxes(sortByX(boxes));
    setPersonIndex(0);
    setFlowState("identifying");
  }, [isDetecting, flowState, boxes]);

  const handleImageChange = () => {
    setFlowState("analyzing");
    setSortedBoxes([]);
    setPersonIndex(0);
  };

  // Advance to next person, or to "confirm" when all are named
  const advance = () => {
    if (personIndex < sortedBoxes.length - 1) {
      setPersonIndex((i) => i + 1);
    } else {
      setFlowState("confirm");
    }
  };

  // User drew a manual bounding box — append it and name it
  const handleBoxDrawn = useCallback(
    (bbox: [number, number, number, number]) => {
      const newIndex = sortedBoxes.length;
      setSortedBoxes((prev) => [...prev, { bbox, score: 1 }]);
      setPersonIndex(newIndex);
      setFlowState("identifying");
    },
    [sortedBoxes.length]
  );

  const currentBox =
    (flowState === "identifying" || flowState === "confirm") &&
    sortedBoxes.length > 0
      ? sortedBoxes[personIndex]
      : null;

  return (
    <div className="min-h-svh bg-cream-50 flex flex-col items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-[354px] flex flex-col gap-8 items-stretch">
        <h1 className="font-hand text-[32px] leading-normal text-ink">
          New Memory
        </h1>
        <ImageUpload
          name="photo"
          label="Add a Photo"
          frameClassName="aspect-[4/3] h-auto"
          overlay={
            <PhotoOverlay
              analyzing={flowState === "analyzing"}
              box={currentBox}
              naturalSize={naturalSize}
              drawing={flowState === "drawing"}
              onBoxDrawn={handleBoxDrawn}
            />
          }
          onChange={handleImageChange}
          onPreviewChange={setImageUrl}
          onImageLoad={(w, h) => setNaturalSize({ w, h })}
        />

        <AgentPanel
          message={getMessage(flowState, personIndex, sortedBoxes.length)}
          actions={
            <Actions
              state={flowState}
              onNameSave={advance}
              onSkip={advance}
              setFlowState={setFlowState}
              narratingMessage={getMessage("narrating", 0, 0)}
            />
          }
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Overlay dispatcher                                                          */
/* -------------------------------------------------------------------------- */

function PhotoOverlay({
  analyzing,
  box,
  naturalSize,
  drawing,
  onBoxDrawn,
}: {
  analyzing: boolean;
  box: PersonBox | null;
  naturalSize: { w: number; h: number } | null;
  drawing: boolean;
  onBoxDrawn: (bbox: [number, number, number, number]) => void;
}) {
  return (
    <>
      {!drawing && box && naturalSize && (
        <PersonBoxOverlay bbox={box.bbox} naturalSize={naturalSize} />
      )}
      {drawing && naturalSize && (
        <DrawingOverlay naturalSize={naturalSize} onBoxDrawn={onBoxDrawn} />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Spotlight bounding box with full-perimeter gradient glow                   */
/* -------------------------------------------------------------------------- */

type Rect = { x: number; y: number; w: number; h: number };

/** Map t ∈ [0,1) to a point on the rectangle perimeter (clockwise from top-left). */
function perimeterPoint(t: number, r: Rect): [number, number] {
  const { x, y, w, h } = r;
  const p = 2 * (w + h);
  const d = (((t % 1) + 1) % 1) * p;
  if (d < w)         return [x + d, y];
  if (d < w + h)     return [x + w, y + (d - w)];
  if (d < 2 * w + h) return [x + w - (d - w - h), y + h];
  return [x, y + h - (d - 2 * w - h)];
}

function PersonBoxOverlay({
  bbox,
  naturalSize,
}: {
  bbox: [number, number, number, number];
  naturalSize: { w: number; h: number };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // stateRef lets the rAF loop read the latest rect without re-subscribing
  const stateRef = useRef<{ rect: Rect; cW: number; cH: number } | null>(null);

  // Recompute display rect whenever the container resizes or bbox/naturalSize changes
  useEffect(() => {
    const el = containerRef.current;
    const canvas = canvasRef.current;
    if (!el || !canvas) return;

    const ro = new ResizeObserver(([entry]) => {
      const { width: cW, height: cH } = entry.contentRect;
      canvas.width = cW;
      canvas.height = cH;

      const { w: iW, h: iH } = naturalSize;
      const scale = Math.min(cW / iW, cH / iH);
      const ox = (cW - iW * scale) / 2;
      const oy = (cH - iH * scale) / 2;
      const [bx, by, bw, bh] = bbox;
      stateRef.current = {
        rect: { x: bx * scale + ox, y: by * scale + oy, w: bw * scale, h: bh * scale },
        cW,
        cH,
      };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [bbox, naturalSize]);

  // Animation loop — draws directly to canvas, never triggers React re-renders
  useEffect(() => {
    // Persistent offscreen canvas for the gradient border pass
    const off = document.createElement("canvas");
    let raf: number;
    const DURATION = 3000; // ms per revolution
    const origin = performance.now();
    const N = 200; // segments around the perimeter

    const tick = (now: number) => {
      const s = stateRef.current;
      const canvas = canvasRef.current;
      if (!s || !canvas) { raf = requestAnimationFrame(tick); return; }

      const { rect, cW, cH } = s;
      const { x, y, w, h } = rect;

      // Keep offscreen canvas in sync with main canvas size
      if (off.width !== cW || off.height !== cH) { off.width = cW; off.height = cH; }

      const offCtx = off.getContext("2d")!;
      const ctx = canvas.getContext("2d")!;
      const headT = ((now - origin) % DURATION) / DURATION;

      // --- Pass 1: draw gradient border to offscreen ---
      offCtx.clearRect(0, 0, cW, cH);
      offCtx.strokeStyle = "white";
      offCtx.lineWidth = 3;
      offCtx.lineCap = "butt";

      for (let i = 0; i < N; i++) {
        const t = i / N;
        // Arc distance from head: 0 at head, 0.5 at the opposite side
        let dist = Math.abs(t - headT);
        if (dist > 0.5) dist = 1 - dist;
        // Quadratic falloff — bright at head, dim (but never zero) at the far side
        offCtx.globalAlpha = 0.12 + 0.88 * Math.pow(1 - dist * 2, 2);
        const [x1, y1] = perimeterPoint(t, rect);
        const [x2, y2] = perimeterPoint((i + 1) / N, rect);
        offCtx.beginPath();
        offCtx.moveTo(x1, y1);
        offCtx.lineTo(x2, y2);
        offCtx.stroke();
      }
      // Hot-spot pass — extra segments drawn over the head to saturate it
      const HOT = 0.08;
      offCtx.lineWidth = 5;
      for (let i = 0; i < N; i++) {
        const t = i / N;
        let dist = Math.abs(t - headT);
        if (dist > 0.5) dist = 1 - dist;
        if (dist > HOT) continue;
        offCtx.globalAlpha = Math.pow(1 - dist / HOT, 2);
        const [x1, y1] = perimeterPoint(t, rect);
        const [x2, y2] = perimeterPoint((i + 1) / N, rect);
        offCtx.beginPath();
        offCtx.moveTo(x1, y1);
        offCtx.lineTo(x2, y2);
        offCtx.stroke();
      }
      offCtx.globalAlpha = 1;
      offCtx.lineWidth = 4;

      // --- Pass 2: compose main canvas ---
      ctx.clearRect(0, 0, cW, cH);

      // Dark overlay punched out at the bounding box
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, cW, cH);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "black";
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 3);
      ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      // Wide diffuse halo
      ctx.filter = "blur(32px)";
      ctx.globalAlpha = 0.5;
      ctx.drawImage(off, 0, 0);
      // Inner glow
      ctx.filter = "blur(12px)";
      ctx.globalAlpha = 0.75;
      ctx.drawImage(off, 0, 0);

      // Sharp layer (crisp copy of gradient border)
      ctx.filter = "none";
      ctx.globalAlpha = 1;
      ctx.drawImage(off, 0, 0);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Interactive drawing overlay                                                 */
/* -------------------------------------------------------------------------- */

function DrawingOverlay({
  naturalSize,
  onBoxDrawn,
}: {
  naturalSize: { w: number; h: number };
  onBoxDrawn: (bbox: [number, number, number, number]) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);
  const [drag, setDrag] = useState<{
    start: { x: number; y: number };
    current: { x: number; y: number };
  } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const getPos = (e: React.MouseEvent | React.Touch) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const finalize = useCallback(
    (end: { x: number; y: number }, start: { x: number; y: number }) => {
      if (!containerSize) return;
      const { w: cW, h: cH } = containerSize;
      const { w: iW, h: iH } = naturalSize;
      const scale = Math.min(cW / iW, cH / iH);
      const ox = (cW - iW * scale) / 2;
      const oy = (cH - iH * scale) / 2;

      const dispX = Math.min(start.x, end.x);
      const dispY = Math.min(start.y, end.y);
      const dispW = Math.abs(end.x - start.x);
      const dispH = Math.abs(end.y - start.y);

      if (dispW < 10 || dispH < 10) return; // too small, ignore

      const imgX = Math.max(0, (dispX - ox) / scale);
      const imgY = Math.max(0, (dispY - oy) / scale);
      const imgW = Math.min(iW - imgX, dispW / scale);
      const imgH = Math.min(iH - imgY, dispH / scale);

      onBoxDrawn([imgX, imgY, imgW, imgH]);
    },
    [containerSize, naturalSize, onBoxDrawn]
  );

  // Mouse handlers
  const onMouseDown = (e: React.MouseEvent) => {
    const pos = getPos(e);
    setDrag({ start: pos, current: pos });
  };
  const onMouseMove = (e: React.MouseEvent) => {
    if (!drag) return;
    setDrag((d) => d && { ...d, current: getPos(e) });
  };
  const onMouseUp = (e: React.MouseEvent) => {
    if (!drag) return;
    finalize(getPos(e), drag.start);
    setDrag(null);
  };

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    const pos = getPos(e.touches[0]);
    setDrag({ start: pos, current: pos });
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (!drag) return;
    setDrag((d) => d && { ...d, current: getPos(e.touches[0]) });
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (!drag) return;
    finalize(getPos(e.changedTouches[0]), drag.start);
    setDrag(null);
  };

  // Preview rect in display coords
  const previewStyle = drag
    ? {
        left:   Math.min(drag.start.x, drag.current.x),
        top:    Math.min(drag.start.y, drag.current.y),
        width:  Math.abs(drag.current.x - drag.start.x),
        height: Math.abs(drag.current.y - drag.start.y),
      }
    : null;

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 pointer-events-auto cursor-crosshair select-none"
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={() => setDrag(null)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Dim overlay — user draws on top of this */}
      <div className="absolute inset-0 bg-black/40" />

      {previewStyle && (
        <div
          style={previewStyle}
          className="absolute border-2 border-white bg-white/10"
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Per-state actions                                                           */
/* -------------------------------------------------------------------------- */

function Actions({
  state,
  onNameSave,
  onSkip,
  setFlowState,
  narratingMessage,
}: {
  state: FlowState;
  onNameSave: () => void;
  onSkip: () => void;
  setFlowState: (s: FlowState) => void;
  narratingMessage: string;
}) {
  switch (state) {
    case "empty":
    case "analyzing":
    case "done":
      return null;

    case "identifying":
      return <NameForm onSave={onNameSave} onSkip={onSkip} />;

    case "confirm":
      return (
        <>
          <Button
            variant="primary"
            size="sm"
            className="uppercase tracking-[0.18em]"
            onClick={() => setFlowState("drawing")}
          >
            Yes
          </Button>
          <Button
            variant="default"
            size="sm"
            className="uppercase tracking-[0.18em]"
            onClick={() => setFlowState("narrating")}
          >
            No, we&apos;re good
          </Button>
        </>
      );

    case "drawing":
      return (
        <Button
          variant="default"
          size="sm"
          className="uppercase tracking-[0.18em]"
          onClick={() => setFlowState("confirm")}
        >
          Cancel
        </Button>
      );

    case "narrating":
      return (
        <>
          <Button variant="primary" size="sm" className="uppercase tracking-[0.18em]"
            onClick={() => setFlowState("done")}>
            Correct!
          </Button>
          <Button variant="default" size="sm" className="uppercase tracking-[0.18em]"
            onClick={() => setFlowState("modifying")}>
            Modify
          </Button>
        </>
      );

    case "modifying":
      return (
        <ModifyForm initial={narratingMessage} onSave={() => setFlowState("done")} />
      );
  }
}

function NameForm({ onSave, onSkip }: { onSave: () => void; onSkip: () => void }) {
  return (
    <form className="flex gap-2 w-full max-w-sm" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <Input placeholder="Enter their name" />
      <Button variant="primary" size="sm" type="submit">Save</Button>
      <Button variant="default" size="sm" type="button" onClick={onSkip}>Skip</Button>
    </form>
  );
}

function ModifyForm({ initial, onSave }: { initial: string; onSave: () => void }) {
  return (
    <form className="flex flex-col gap-2 w-full" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <textarea
        defaultValue={initial}
        rows={4}
        className="w-full rounded-[4px] border border-cream-50 bg-paper px-4 py-3 text-base font-light text-ink placeholder:text-cream-150 focus:outline-none focus:border-ink/40 transition-colors resize-none"
      />
      <div className="flex gap-2">
        <Button variant="primary" type="submit">Save</Button>
      </div>
    </form>
  );
}
