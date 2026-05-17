"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, type Variants } from "framer-motion";
import Button from "@/components/dashboard/Button";
import PhotoCard from "@/components/individual/PhotoCard";

export type PhotoCardData = {
  id: string;
  src: string;
  quote: string;
  attribution: string;
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

type FlipTarget = "grid" | "single";

type IndividualAlbumViewProps = {
  photoCards: PhotoCardData[];
  personName?: string;
  personBio?: string;
};

export default function IndividualAlbumView({
  photoCards,
  personName = "Andy Lin",
  personBio = "Family members can create a private digital space full of photos, stories, and voices that celebrate Andy\u2019s life and bring him closer to people he loves.",
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

  const featured = photoCards[currentIndex];
  const isPageTurning = isAnimating && isFlipped && !showGrid;
  const hideTurningPage = (showGrid && !isAnimating) || coverTurningPage;
  // Only hide left photo during 3→1; for 1→3 it stays under the turning page
  const hideLeftPhoto =
    coverTurningPage || (isPageTurning && flipTarget === "single");
  const showLeftSingle = !showGrid && !hideLeftPhoto;
  // Bio on the turning page only when resting (1) or flipping toward grid (1→3)
  const showBioOnPage =
    flipTarget === "grid" || (!isAnimating && !showGrid && !isFlipped);

  const completeFlip = useCallback(() => {
    if (flipTargetRef.current === "grid") {
      setShowGrid(true);
      setIsAnimating(false);
    } else {
      // Forward flip done — snap page closed so bio shows on the right
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
      // Reset to 0° while covered, then forward turn (same as 1→3)
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

  if (!featured) return null;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-white/40 p-12">
      <motion.div
        className="relative flex min-h-[520px] flex-1 rounded-xl bg-paper"
        style={{ perspective: "1600px" }}
      >
        {/* Left page — single stays visible under the page during 1→3 */}
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
              <PhotoCard
                src={featured.src}
                quote={featured.quote}
                attribution={featured.attribution}
              />
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
                  />
                </motion.button>
              );
            })}
          </motion.div>
        )}
        {/* Right page — blank white spread */}
        <div className="relative flex h-full w-1/2 flex-col bg-paper">
          <div
            className="h-full w-full border-l border-cream-150/30"
            aria-hidden={!isFlipped}
          />
        </div>

        {/* Turning page — forward 0°→-180° for both 1→3 and 3→1 */}
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
              <motion.section
                className="flex max-w-[360px] flex-col items-start justify-center gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <h2 className="font-hand text-[28px] leading-normal text-ink">
                  {personName}
                </h2>
                <p className="text-base font-light leading-normal text-ink">
                  {personBio}
                </p>
                <p className="text-sm text-muted">{featured.attribution}</p>
                <div className="flex flex-wrap gap-3">
                  <Button
                    text={`See more of ${personName}`}
                    variant="primary"
                    onClick={handleSeeMore}
                    disabled={isAnimating || isFlipped}
                  />
                  <Button text="Ask a question" />
                </div>
              </motion.section>
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
