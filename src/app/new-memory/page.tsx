"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
    case "empty":     return "Ready for memory upload. Please upload an image for cataloging.";
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
      <div className="w-full max-w-[640px] flex flex-col gap-8 items-stretch">
        <ImageUpload
          name="photo"
          label="Upload Memory"
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
      <Sparkle
        size={18}
        fill="currentColor"
        className={[
          "absolute bottom-3 right-3 text-ink/80 pointer-events-none z-10",
          analyzing ? "animate-pulse" : "",
        ].join(" ")}
        aria-hidden
      />
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
/* Spotlight bounding box                                                      */
/* -------------------------------------------------------------------------- */

function PersonBoxOverlay({
  bbox,
  naturalSize,
}: {
  bbox: [number, number, number, number];
  naturalSize: { w: number; h: number };
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const style = useMemo(() => {
    if (!containerSize) return null;
    const { w: cW, h: cH } = containerSize;
    const { w: iW, h: iH } = naturalSize;
    const scale = Math.min(cW / iW, cH / iH);
    const ox = (cW - iW * scale) / 2;
    const oy = (cH - iH * scale) / 2;
    const [bx, by, bw, bh] = bbox;
    return {
      left:   `${((bx * scale + ox) / cW) * 100}%`,
      top:    `${((by * scale + oy) / cH) * 100}%`,
      width:  `${(bw * scale / cW) * 100}%`,
      height: `${(bh * scale / cH) * 100}%`,
    };
  }, [bbox, naturalSize, containerSize]);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      {style && (
        <div
          style={{
            ...style,
            boxShadow: [
              "0 0 0 9999px rgba(0,0,0,0.55)",
              "0 0 0 1px rgba(255,255,255,0.15)",
              "0 0 16px 6px rgba(255,255,255,0.55)",
            ].join(", "),
          }}
          className="absolute rounded-sm border-2 border-white/75"
        />
      )}
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
