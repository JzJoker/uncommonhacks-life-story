"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Sparkle } from "lucide-react";
import { AgentPanel } from "@/components/AgentPanel";
import { Button } from "@/components/Button";
import { ImageUpload } from "@/components/ImageUpload";
import { Input } from "@/components/Input";
import { usePersonDetection, type PersonBox } from "@/hooks/usePersonDetection";
import { saveMemory } from "@/lib/saveMemory";
import { supabase } from "@/lib/supabase";

type FlowState =
  | "empty"
  | "analyzing"
  | "identifying"
  | "confirm"
  | "drawing"
  | "questionnaire"
  | "narrating"
  | "modifying"
  | "done";

function getQuestions(name: string) {
  return [
    `Who's this — and who are they to ${name}?`,
    "What's going on in this photo?",
    `What would ${name} recognize about them — a saying, a laugh, a habit?`,
    `Anything here that might upset ${name}? (just for you and the caregiver — ${name} never sees this)`,
  ] as const;
}

function sortByX(boxes: PersonBox[]): PersonBox[] {
  return [...boxes].sort(
    (a, b) => a.bbox[0] + a.bbox[2] / 2 - (b.bbox[0] + b.bbox[2] / 2)
  );
}

function getMessage(state: FlowState, idx: number, total: number, patientName: string): string {
  const questions = getQuestions(patientName);
  switch (state) {
    case "empty":         return "Ready for memory upload. Please upload an image for cataloging.";
    case "analyzing":     return "Analyzing your image. Looking for familiar figures…";
    case "identifying":
      if (total === 0) return "Who is this person?";
      if (total === 1) return "I found 1 person in this photo. Who is this?";
      return `Person ${idx + 1} of ${total} — who is this?`;
    case "confirm":       return "Did I miss anyone?";
    case "drawing":       return "Draw a box around the person I missed.";
    case "questionnaire": return questions[idx];
    case "narrating":
      return `This is Justin, your grandson. In this photo you are standing next to him at the boardwalk. You used to take him to go rollerblading and he remembers laughing whenever he sped past you!`;
    case "modifying":     return "Edit the story for this memory.";
    case "done":          return "Saved. The narrator will tell this story whenever you open the memory.";
  }
}

export function NewMemoryForm({ patientId, patientName }: { patientId: string; patientName: string }) {
  const router = useRouter();
  const [flowState, setFlowState] = useState<FlowState>("empty");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const [sortedBoxes, setSortedBoxes] = useState<PersonBox[]>([]);
  const [personIndex, setPersonIndex] = useState(0);
  const [personNames, setPersonNames] = useState<string[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [questionAnswers, setQuestionAnswers] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [existingPeople, setExistingPeople] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("friends_family")
      .select("name")
      .eq("patient_id", patientId)
      .order("name")
      .then(({ data }) => {
        if (data) setExistingPeople(data.map((p) => p.name));
      });
  }, [patientId]);

  const questions = getQuestions(patientName);
  const { boxes, isDetecting } = usePersonDetection(imageUrl);

  useEffect(() => {
    if (flowState !== "analyzing" || isDetecting) return;
    setSortedBoxes(sortByX(boxes));
    setPersonIndex(0);
    setFlowState("identifying");
  }, [isDetecting, flowState, boxes]);

  const handleImageChange = (file: File | null) => {
    setImageFile(file);
    setFlowState("analyzing");
    setSortedBoxes([]);
    setPersonIndex(0);
    setPersonNames([]);
    setQuestionIndex(0);
    setQuestionAnswers([]);
  };

  const advance = (name: string) => {
    const trimmed = name.trim();
    if (trimmed && !existingPeople.includes(trimmed)) {
      setExistingPeople((prev) => [...prev, trimmed].sort());
    }
    setPersonNames((prev) => { const next = [...prev]; next[personIndex] = name; return next; });
    if (personIndex < sortedBoxes.length - 1) {
      setPersonIndex((i) => i + 1);
    } else {
      setFlowState("confirm");
    }
  };

  const advanceQuestion = useCallback((answer: string) => {
    setQuestionAnswers((prev) => { const next = [...prev]; next[questionIndex] = answer; return next; });
    if (questionIndex < questions.length - 1) {
      setQuestionIndex((i) => i + 1);
    } else {
      setFlowState("narrating");
    }
  }, [questionIndex, questions.length]);

  const handleReset = useCallback(() => {
    setFlowState("empty");
    setImageFile(null);
    setImageUrl(null);
    setNaturalSize(null);
    setSortedBoxes([]);
    setPersonIndex(0);
    setPersonNames([]);
    setQuestionIndex(0);
    setQuestionAnswers([]);
  }, []);

  const handleSave = useCallback(async () => {
    if (!imageFile || !naturalSize) return;
    setIsSaving(true);
    try {
      const people = sortedBoxes.map((box, i) => ({
        name: personNames[i] ?? "",
        bbox: box.bbox,
        score: box.score,
      }));
      const answers: [string, string, string, string] = [
        questionAnswers[0] ?? "",
        questionAnswers[1] ?? "",
        questionAnswers[2] ?? "",
        questionAnswers[3] ?? "",
      ];
      await saveMemory({ patientId, imageFile, naturalSize, people, answers });
      setFlowState("done");
    } catch (err) {
      console.error(err);
      alert("Failed to save memory. Check the console for details.");
    } finally {
      setIsSaving(false);
    }
  }, [patientId, imageFile, naturalSize, sortedBoxes, personNames, questionAnswers]);

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
    (flowState === "identifying" || flowState === "confirm") && sortedBoxes.length > 0
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
          onChange={(file) => handleImageChange(file)}
          onPreviewChange={setImageUrl}
          onImageLoad={(w, h) => setNaturalSize({ w, h })}
        />

        <AgentPanel
          message={getMessage(
            flowState,
            flowState === "questionnaire" ? questionIndex : personIndex,
            sortedBoxes.length,
            patientName,
          )}
          actions={
            <Actions
              state={flowState}
              onNameSave={advance}
              onSkip={() => advance("")}
              setFlowState={setFlowState}
              narratingMessage={getMessage("narrating", 0, 0, patientName)}
              onAddMore={handleReset}
              onViewLifeStory={() => router.push(`/patient/${patientId}`)}
              onNextQuestion={advanceQuestion}
              isLastQuestion={questionIndex === questions.length - 1}
              onSave={handleSave}
              isSaving={isSaving}
              existingPeople={existingPeople}
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
  analyzing, box, naturalSize, drawing, onBoxDrawn,
}: {
  analyzing: boolean;
  box: PersonBox | null;
  naturalSize: { w: number; h: number } | null;
  drawing: boolean;
  onBoxDrawn: (bbox: [number, number, number, number]) => void;
}) {
  return (
    <>
      <Sparkle size={18} fill="currentColor"
        className={["absolute bottom-3 right-3 text-ink/80 pointer-events-none z-10", analyzing ? "animate-pulse" : ""].join(" ")}
        aria-hidden />
      {!drawing && box && naturalSize && <PersonBoxOverlay bbox={box.bbox} naturalSize={naturalSize} />}
      {drawing && naturalSize && <DrawingOverlay naturalSize={naturalSize} onBoxDrawn={onBoxDrawn} />}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Spotlight bounding box with full-perimeter gradient glow                   */
/* -------------------------------------------------------------------------- */

type Rect = { x: number; y: number; w: number; h: number };

function perimeterPoint(t: number, r: Rect): [number, number] {
  const { x, y, w, h } = r;
  const p = 2 * (w + h);
  const d = (((t % 1) + 1) % 1) * p;
  if (d < w)         return [x + d, y];
  if (d < w + h)     return [x + w, y + (d - w)];
  if (d < 2 * w + h) return [x + w - (d - w - h), y + h];
  return [x, y + h - (d - 2 * w - h)];
}

function PersonBoxOverlay({ bbox, naturalSize }: { bbox: [number, number, number, number]; naturalSize: { w: number; h: number } }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{ rect: Rect; cW: number; cH: number } | null>(null);

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
        cW, cH,
      };
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [bbox, naturalSize]);

  useEffect(() => {
    const off = document.createElement("canvas");
    let raf: number;
    const DURATION = 3000;
    const origin = performance.now();
    const N = 200;

    const tick = (now: number) => {
      const s = stateRef.current;
      const canvas = canvasRef.current;
      if (!s || !canvas) { raf = requestAnimationFrame(tick); return; }

      const { rect, cW, cH } = s;
      const { x, y, w, h } = rect;
      if (off.width !== cW || off.height !== cH) { off.width = cW; off.height = cH; }

      const offCtx = off.getContext("2d")!;
      const ctx = canvas.getContext("2d")!;
      const headT = ((now - origin) % DURATION) / DURATION;

      offCtx.clearRect(0, 0, cW, cH);
      offCtx.strokeStyle = "white";
      offCtx.lineWidth = 3;
      offCtx.lineCap = "butt";

      for (let i = 0; i < N; i++) {
        const t = i / N;
        let dist = Math.abs(t - headT);
        if (dist > 0.5) dist = 1 - dist;
        offCtx.globalAlpha = 0.12 + 0.88 * Math.pow(1 - dist * 2, 2);
        const [x1, y1] = perimeterPoint(t, rect);
        const [x2, y2] = perimeterPoint((i + 1) / N, rect);
        offCtx.beginPath(); offCtx.moveTo(x1, y1); offCtx.lineTo(x2, y2); offCtx.stroke();
      }

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
        offCtx.beginPath(); offCtx.moveTo(x1, y1); offCtx.lineTo(x2, y2); offCtx.stroke();
      }
      offCtx.globalAlpha = 1;
      offCtx.lineWidth = 4;

      ctx.clearRect(0, 0, cW, cH);
      ctx.fillStyle = "rgba(0,0,0,0.55)";
      ctx.fillRect(0, 0, cW, cH);
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "black";
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 3); ctx.fill();
      ctx.globalCompositeOperation = "source-over";

      ctx.filter = "blur(32px)"; ctx.globalAlpha = 0.5; ctx.drawImage(off, 0, 0);
      ctx.filter = "blur(12px)"; ctx.globalAlpha = 0.75; ctx.drawImage(off, 0, 0);
      ctx.filter = "none"; ctx.globalAlpha = 1; ctx.drawImage(off, 0, 0);

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

function DrawingOverlay({ naturalSize, onBoxDrawn }: { naturalSize: { w: number; h: number }; onBoxDrawn: (bbox: [number, number, number, number]) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number } | null>(null);
  const [drag, setDrag] = useState<{ start: { x: number; y: number }; current: { x: number; y: number } } | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setContainerSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const getPos = (e: React.MouseEvent | React.Touch) => {
    const rect = containerRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const finalize = useCallback((end: { x: number; y: number }, start: { x: number; y: number }) => {
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
    if (dispW < 10 || dispH < 10) return;
    const imgX = Math.max(0, (dispX - ox) / scale);
    const imgY = Math.max(0, (dispY - oy) / scale);
    const imgW = Math.min(iW - imgX, dispW / scale);
    const imgH = Math.min(iH - imgY, dispH / scale);
    onBoxDrawn([imgX, imgY, imgW, imgH]);
  }, [containerSize, naturalSize, onBoxDrawn]);

  const previewStyle = drag ? {
    left: Math.min(drag.start.x, drag.current.x),
    top: Math.min(drag.start.y, drag.current.y),
    width: Math.abs(drag.current.x - drag.start.x),
    height: Math.abs(drag.current.y - drag.start.y),
  } : null;

  return (
    <div ref={containerRef}
      className="absolute inset-0 pointer-events-auto cursor-crosshair select-none"
      onMouseDown={(e) => setDrag({ start: getPos(e), current: getPos(e) })}
      onMouseMove={(e) => drag && setDrag((d) => d && { ...d, current: getPos(e) })}
      onMouseUp={(e) => { if (drag) { finalize(getPos(e), drag.start); setDrag(null); } }}
      onMouseLeave={() => setDrag(null)}
      onTouchStart={(e) => setDrag({ start: getPos(e.touches[0]), current: getPos(e.touches[0]) })}
      onTouchMove={(e) => drag && setDrag((d) => d && { ...d, current: getPos(e.touches[0]) })}
      onTouchEnd={(e) => { if (drag) { finalize(getPos(e.changedTouches[0]), drag.start); setDrag(null); } }}
    >
      <div className="absolute inset-0 bg-black/40" />
      {previewStyle && <div style={previewStyle} className="absolute border-2 border-white bg-white/10" />}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Per-state actions                                                           */
/* -------------------------------------------------------------------------- */

function Actions({
  state, onNameSave, onSkip, setFlowState, narratingMessage,
  onAddMore, onViewLifeStory, onNextQuestion, isLastQuestion, onSave, isSaving, existingPeople,
}: {
  state: FlowState;
  onNameSave: (name: string) => void;
  onSkip: () => void;
  setFlowState: (s: FlowState) => void;
  narratingMessage: string;
  onAddMore: () => void;
  onViewLifeStory: () => void;
  onNextQuestion: (answer: string) => void;
  isLastQuestion: boolean;
  onSave: () => void;
  isSaving: boolean;
  existingPeople: string[];
}) {
  switch (state) {
    case "empty":
    case "analyzing":
      return null;

    case "done":
      return (
        <>
          <Button variant="primary" size="sm" className="uppercase tracking-[0.18em]" onClick={onAddMore}>Add More</Button>
          <Button variant="default" size="sm" className="uppercase tracking-[0.18em]" onClick={onViewLifeStory}>View Life Story</Button>
        </>
      );

    case "identifying":
      return <NameForm onSave={onNameSave} onSkip={onSkip} suggestions={existingPeople} />;

    case "confirm":
      return (
        <>
          <Button variant="primary" size="sm" className="uppercase tracking-[0.18em]" onClick={() => setFlowState("drawing")}>Yes</Button>
          <Button variant="default" size="sm" className="uppercase tracking-[0.18em]" onClick={() => setFlowState("questionnaire")}>No, we&apos;re good</Button>
        </>
      );

    case "drawing":
      return (
        <Button variant="default" size="sm" className="uppercase tracking-[0.18em]" onClick={() => setFlowState("confirm")}>Cancel</Button>
      );

    case "questionnaire":
      return <QuestionForm onNext={onNextQuestion} isLast={isLastQuestion} />;

    case "narrating":
      return (
        <>
          <Button variant="primary" size="sm" className="uppercase tracking-[0.18em]" disabled={isSaving} onClick={onSave}>
            {isSaving ? "Saving…" : "Correct!"}
          </Button>
          <Button variant="default" size="sm" className="uppercase tracking-[0.18em]" disabled={isSaving} onClick={() => setFlowState("modifying")}>Modify</Button>
        </>
      );

    case "modifying":
      return <ModifyForm initial={narratingMessage} onSave={() => setFlowState("done")} />;
  }
}

function NameForm({ onSave, onSkip, suggestions }: { onSave: (name: string) => void; onSkip: () => void; suggestions: string[] }) {
  const [name, setName] = useState("");
  const [open, setOpen] = useState(false);

  const filtered = name.trim()
    ? suggestions.filter((s) => s.toLowerCase().includes(name.toLowerCase()))
    : [];

  const commit = (value: string) => { onSave(value); setName(""); setOpen(false); };

  return (
    <form className="flex gap-2 w-full max-w-sm" onSubmit={(e) => { e.preventDefault(); commit(name); }}>
      <div className="relative flex-1">
        <Input
          placeholder="Enter their name"
          value={name}
          onChange={(e) => { setName(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          autoComplete="off"
        />
        {open && filtered.length > 0 && (
          <ul className="absolute bottom-full mb-1 left-0 right-0 bg-paper border border-cream-100 rounded-[4px] shadow-md z-20 max-h-40 overflow-y-auto">
            {filtered.map((s) => (
              <li
                key={s}
                className="px-4 py-2 text-sm font-light text-ink cursor-pointer hover:bg-cream-50"
                onMouseDown={(e) => { e.preventDefault(); commit(s); }}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Button variant="primary" size="sm" type="submit">Save</Button>
      <Button variant="default" size="sm" type="button" onClick={onSkip}>Skip</Button>
    </form>
  );
}

function QuestionForm({ onNext, isLast }: { onNext: (answer: string) => void; isLast: boolean }) {
  const [answer, setAnswer] = useState("");
  return (
    <form className="flex flex-col gap-2 w-full" onSubmit={(e) => { e.preventDefault(); onNext(answer); setAnswer(""); }}>
      <textarea rows={3} placeholder="Your answer…" value={answer} onChange={(e) => setAnswer(e.target.value)}
        className="w-full rounded-[4px] border border-cream-50 bg-paper px-4 py-3 text-base font-light text-ink placeholder:text-cream-150 focus:outline-none focus:border-ink/40 transition-colors resize-none" />
      <div className="flex gap-2">
        <Button variant="primary" size="sm" type="submit" className="uppercase tracking-[0.18em]">{isLast ? "Done" : "Next"}</Button>
        <Button variant="default" size="sm" type="button" className="uppercase tracking-[0.18em]" onClick={() => { onNext(""); setAnswer(""); }}>Skip</Button>
      </div>
    </form>
  );
}

function ModifyForm({ initial, onSave }: { initial: string; onSave: () => void }) {
  return (
    <form className="flex flex-col gap-2 w-full" onSubmit={(e) => { e.preventDefault(); onSave(); }}>
      <textarea defaultValue={initial} rows={4}
        className="w-full rounded-[4px] border border-cream-50 bg-paper px-4 py-3 text-base font-light text-ink placeholder:text-cream-150 focus:outline-none focus:border-ink/40 transition-colors resize-none" />
      <div className="flex gap-2"><Button variant="primary" type="submit">Save</Button></div>
    </form>
  );
}
