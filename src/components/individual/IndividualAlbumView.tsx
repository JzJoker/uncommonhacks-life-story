"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import { Sparkle } from "lucide-react";
import Button from "@/components/dashboard/Button";
import PhotoCard from "@/components/individual/PhotoCard";
import TypewriterText from "@/components/TypewriterText";
import { speak, stopSpeaking } from "@/lib/speak";
import type { Highlight } from "@/app/api/ask/route";

export type PhotoCardData = {
  id: string;
  src: string;
  quote: string;
  attribution: string;
  memoryId: string;
  imageWidth: number | null;
  imageHeight: number | null;
  messageAudioUrl?: string | null;
};

const FLIP_DURATION = 0.85;
const FLIP_MS = FLIP_DURATION * 1000;
const GRID_SIZE = 3;

const gridVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.05 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.45,
      ease: [0.34, 1.4, 0.64, 1],
    },
  },
};

function getNextIndices(fromIndex: number, total: number, count = GRID_SIZE) {
  return Array.from({ length: count }, (_, i) => (fromIndex + i + 1) % total);
}

function tiltForIndex(index: number) {
  return ((index * 17) % 5) - 2;
}

/* -------------------------------------------------------------------------- */
/* Main view                                                                   */
/* -------------------------------------------------------------------------- */

type FlipTarget = "grid" | "single";
type AskMode = "bio" | "listening" | "thinking" | "answer";

type IndividualAlbumViewProps = {
  photoCards: PhotoCardData[];
  personName?: string;
  personNarration?: string | null;
  personId: string;
  patientId: string;
};

export default function IndividualAlbumView({
  photoCards,
  personName = "Andy Lin",
  personNarration = null,
  personId,
  patientId,
}: IndividualAlbumViewProps) {
  const total = photoCards.length;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [gridIndices, setGridIndices] = useState<number[]>([]);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showGrid, setShowGrid] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [coverTurningPage, setCoverTurningPage] = useState(false);
  const [flipTarget, setFlipTarget] = useState<FlipTarget>("single");
  const flipTargetRef = useRef<FlipTarget>("single");
  const [narration, setNarration] = useState<string | null>(personNarration);
  const [highlight, setHighlight] = useState<Highlight | null>(null);

  // Ask Q&A state
  const [askMode, setAskMode] = useState<AskMode>("bio");
  const [askAnswer, setAskAnswer] = useState("");
  const [askQuestion, setAskQuestion] = useState("");
  const askHistoryRef = useRef<{ role: string; content: string }[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef("");

  const featured = photoCards[currentIndex];
  const currentMemoryId = featured?.memoryId ?? null;

  const isPageTurning = isAnimating && isFlipped && !showGrid;
  const hideTurningPage = (showGrid && !isAnimating) || coverTurningPage;
  const hideLeftPhoto =
    coverTurningPage || (isPageTurning && flipTarget === "single");
  const showLeftSingle = !showGrid && !hideLeftPhoto;
  const showBioOnPage =
    flipTarget === "grid" || (!isAnimating && !showGrid && !isFlipped);

  // Reset Q&A and highlight when photo changes
  useEffect(() => {
    setHighlight(null);
    setAskMode("bio");
    setAskQuestion("");
    askHistoryRef.current = [];
    transcriptRef.current = "";
    recognitionRef.current?.abort?.();
    recognitionRef.current = null;
  }, [currentIndex]);

  // Generate narration on first open if not cached
  useEffect(() => {
    if (narration !== null) return;
    fetch("/api/person-narration", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, patientId }),
    })
      .then((r) => r.json())
      .then((d: { narration?: string }) => setNarration(d.narration ?? ""))
      .catch(() => setNarration(""));
  }, [narration, personId, patientId]);

  // Narrate on entry once narration is available
  useEffect(() => {
    if (!narration) return;
    const line = `${personName}. ${narration}`;
    speak(line).catch((err) => console.error("[Album] TTS failed", err));
    return () => stopSpeaking();
  }, [personName, narration]);

  const completeFlip = useCallback(() => {
    if (flipTargetRef.current === "grid") {
      setShowGrid(true);
      setIsAnimating(false);
    } else {
      setIsAnimating(false);
      setIsFlipped(false);
    }
  }, []);

  const handleSeeMore = useCallback(() => {
    if (isAnimating || isFlipped || showGrid || total <= 1) return;
    flipTargetRef.current = "grid";
    setFlipTarget("grid");
    setGridIndices(getNextIndices(currentIndex, total));
    setShowGrid(false);
    setIsAnimating(true);
    setIsFlipped(true);
  }, [currentIndex, isAnimating, isFlipped, showGrid, total]);

  const handleCardSelect = useCallback(
    (index: number) => {
      if (isAnimating || !showGrid) return;
      flipTargetRef.current = "single";
      setFlipTarget("single");
      setCurrentIndex(index);
      setCoverTurningPage(true);
      setShowGrid(false);
      setIsAnimating(false);
      setIsFlipped(false);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsAnimating(true);
          setIsFlipped(true);
          setCoverTurningPage(false);
        });
      });
    },
    [isAnimating, showGrid],
  );

  useEffect(() => {
    if (!isAnimating) return;
    const timer = setTimeout(completeFlip, FLIP_MS);
    return () => clearTimeout(timer);
  }, [isAnimating, completeFlip]);

  function enterListening() {
    setAskMode("listening");
    setAskQuestion("");
    transcriptRef.current = "";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) return;

    const recognition = new SR();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const transcript = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join("");
      transcriptRef.current = transcript;
      setAskQuestion(transcript);
    };
    recognition.onend = () => {
      const q = transcriptRef.current;
      if (q.trim()) void submitQuestion(q);
    };
    recognitionRef.current = recognition;
    try { recognition.start(); } catch { /* mic permission denied or already running */ }
  }

  async function submitQuestion(question: string) {
    if (!question.trim()) return;
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setAskMode("thinking");
    const history = askHistoryRef.current;
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, personId, patientId, currentMemoryId, history }),
      });
      const data: { answer: string; highlight: Highlight | null } = await res.json();
      const answer = data.answer || "Sorry, I couldn't find that.";
      askHistoryRef.current = [
        ...history,
        { role: "user", content: question },
        { role: "assistant", content: answer },
      ];
      setAskAnswer(answer);
      setHighlight(data.highlight ?? null);
      setAskMode("answer");
    } catch {
      setAskAnswer("Something went wrong. Please try again.");
      setAskMode("answer");
    }
  }

  if (!featured) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white/40 p-12">
      <motion.div
        className="relative flex min-h-[520px] flex-1 rounded-xl bg-paper"
        style={{ perspective: "1600px" }}
      >
        {/* Left page */}
        <div
          className={`relative flex h-full w-1/2 items-center justify-center overflow-hidden border-r border-cream-150/40 bg-paper p-6 ${
            showGrid ? "z-10" : "z-0"
          }`}
        >
          {showLeftSingle && (
            <motion.div
              key={`single-${currentIndex}`}
              className="absolute inset-0 z-0 flex items-center justify-center"
              initial={
                flipTarget === "single" && !isAnimating ? { opacity: 0 } : false
              }
              animate={{ opacity: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
            >
              <div className="relative">
                <PhotoCard
                  src={featured.src}
                  quote={featured.quote}
                  attribution={featured.attribution}
                  messageAudioUrl={featured.messageAudioUrl}
                  highlight={
                    highlight && featured.imageWidth && featured.imageHeight
                      ? {
                          bbox: [highlight.bbox_x, highlight.bbox_y, highlight.bbox_w, highlight.bbox_h],
                          imageWidth: highlight.imageWidth,
                          imageHeight: highlight.imageHeight,
                        }
                      : null
                  }
                />
              </div>
            </motion.div>
          )}

          {hideLeftPhoto && (
            <div className="absolute inset-0 z-[1] bg-paper" aria-hidden />
          )}
        </div>

        {showGrid && (
          <motion.div
            key={`grid-${gridIndices.join("-")}`}
            className="absolute inset-0 z-10 flex items-center justify-center gap-12 p-24"
            variants={gridVariants}
            initial="hidden"
            animate="visible"
          >
            {gridIndices.map((cardIndex) => {
              const card = photoCards[cardIndex];
              if (!card) return null;
              return (
                <motion.button
                  key={`grid-${cardIndex}`}
                  type="button"
                  variants={cardVariants}
                  style={{ rotate: `${tiltForIndex(cardIndex)}deg` }}
                  whileHover={{ rotate: 0, scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handleCardSelect(cardIndex)}
                  className="w-full cursor-pointer border-0 bg-transparent p-0 text-left"
                >
                  <PhotoCard
                    className="w-full transition-transform duration-300"
                    src={card.src}
                    quote={card.quote}
                    attribution={card.attribution}
                    messageAudioUrl={card.messageAudioUrl}
                  />
                </motion.button>
              );
            })}
          </motion.div>
        )}

        {/* Right page */}
        <div className="relative flex h-full w-1/2 flex-col bg-paper">
          <div
            className="h-full w-full border-l border-cream-150/30"
            aria-hidden={!isFlipped}
          />
        </div>

        {/* Turning page */}
        <motion.div
          className="absolute top-0 right-0 h-full w-1/2 "
          style={{
            transformStyle: "preserve-3d",
            transformOrigin: "left center",
            transformPerspective: 1600,
            zIndex: hideTurningPage ? 0 : 20,
            visibility: hideTurningPage ? "hidden" : "visible",
            pointerEvents: hideTurningPage || isFlipped ? "none" : "auto",
          }}
          initial={false}
          animate={{ rotateY: isFlipped ? -180 : 0 }}
          transition={{
            duration: isAnimating ? FLIP_DURATION : 0,
            ease: [0.45, 0.05, 0.55, 0.95],
          }}
        >
          <div
            className="absolute inset-0 grid place-items-center bg-paper p-8"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
            }}
          >
            {showBioOnPage ? (
              askMode === "bio" ? (
                <motion.section
                  key="bio"
                  className="flex max-w-[360px] flex-col items-start justify-center gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <h2 className="font-hand text-[28px] leading-normal text-ink">
                    {personName}
                  </h2>
                  <p className="text-base font-light leading-normal text-ink">
                    {narration === null ? (
                      <em className="text-muted">Generating…</em>
                    ) : (
                      narration
                    )}
                  </p>
                  <p className="text-sm text-muted">{featured.attribution}</p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      text={`See more of ${personName}`}
                      variant="primary"
                      onClick={handleSeeMore}
                      disabled={isAnimating || isFlipped}
                    />
                    <Button text="Ask a question" onClick={enterListening} />
                  </div>
                </motion.section>
              ) : askMode === "listening" ? (
                <motion.div
                  key="listening"
                  className="flex max-w-[360px] flex-col items-center gap-6 w-full"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Sparkle size={40} fill="currentColor" className="text-ink/70" />
                  </motion.div>
                  <p className="text-base font-light text-muted">Listening…</p>
                  <input
                    type="text"
                    value={askQuestion}
                    onChange={(e) => setAskQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void submitQuestion(askQuestion);
                      }
                    }}
                    placeholder="Or type your question…"
                    className="w-full rounded-full border border-cream-100 bg-cream-50 px-4 py-2 text-sm font-light text-ink placeholder:text-cream-150 focus:outline-none focus:border-ink/30 transition-colors"
                    autoFocus
                  />
                  <div className="flex gap-3">
                    <Button
                      text="Ask"
                      variant="primary"
                      onClick={() => void submitQuestion(askQuestion)}
                      disabled={!askQuestion.trim()}
                    />
                    <Button text="Cancel" onClick={() => setAskMode("bio")} />
                  </div>
                </motion.div>
              ) : askMode === "thinking" ? (
                <motion.div
                  key="thinking"
                  className="flex max-w-[360px] flex-col items-center gap-4"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                >
                  <motion.div
                    animate={{ scale: [1, 1.15, 1] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Sparkle size={40} fill="currentColor" className="text-ink/70" />
                  </motion.div>
                  <p className="text-sm font-light text-muted">Thinking…</p>
                </motion.div>
              ) : (
                <motion.div
                  key={`answer-${askAnswer}`}
                  className="flex max-w-[360px] flex-col items-start gap-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.7, ease: "easeOut" }}
                >
                  <TypewriterText speed={28} className="text-base font-light leading-relaxed text-ink">
                    {askAnswer}
                  </TypewriterText>
                  <div className="flex flex-wrap gap-3">
                    <Button text="Ask another" variant="primary" onClick={enterListening} />
                    <Button text="Go back" onClick={() => setAskMode("bio")} />
                  </div>
                </motion.div>
              )
            ) : null}
            <div className="pointer-events-none absolute inset-y-0 left-0 w-px bg-cream-150" />
          </div>

          <div
            className="absolute inset-0 bg-paper"
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
