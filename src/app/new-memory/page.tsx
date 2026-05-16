"use client";

import { Sparkle } from "lucide-react";
import { AgentPanel } from "@/components/AgentPanel";
import { Button } from "@/components/Button";
import { ImageUpload } from "@/components/ImageUpload";
import { Input } from "@/components/Input";

/**
 * Frontend-only scaffold for the agent-led "new memory" flow.
 *
 * The agent / figure-detection backend is not wired up — each visual state
 * below is a static placeholder. To integrate:
 *   1. Replace `PREVIEW_STATE` with state driven by your agent.
 *   2. Replace the `MESSAGES` strings with messages from the agent.
 *   3. Wire each button's onClick to your flow's transitions.
 *   4. Use ImageUpload's `overlay` prop to render detected-figure glow boxes
 *      at the coords your backend returns.
 *   5. Use ImageUpload's `onChange(file)` to kick off figure detection.
 */

type FlowState =
  | "empty"        // no image yet
  | "analyzing"    // image uploaded, agent thinking
  | "identifying"  // agent asks "name this figure?"
  | "naming"       // input for the figure's name
  | "narrating"    // agent presents draft narration
  | "modifying"    // user editing narration
  | "done";        // memory saved

/** Swap this to preview a different state of the flow. */
const PREVIEW_STATE: FlowState = "empty";

const MESSAGES: Record<FlowState, string> = {
  empty: "Ready for memory upload. Please upload an image for cataloging.",
  analyzing: "Analyzing your image. Looking for familiar figures…",
  identifying:
    "I've found someone here. Would you like to name this person for your records?",
  naming: "Who is this? Type their name and I'll add them to the right album.",
  narrating:
    "This is Justin, your grandson. In this photo you are standing next to him at the boardwalk. You used to take him to go rollerblading and he remembers laughing whenever he sped past you!",
  modifying: "Edit the story for this memory.",
  done: "Saved. The narrator will tell this story whenever you open the memory.",
};

export default function NewMemoryPage() {
  return (
    <div className="min-h-svh bg-cream-50 flex flex-col items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-[640px] flex flex-col gap-8 items-stretch">
        <ImageUpload
          name="photo"
          label="Upload Memory"
          frameClassName="aspect-[4/3] h-auto"
          overlay={<PhotoOverlay analyzing={PREVIEW_STATE === "analyzing"} />}
          onChange={() => {
            /* TODO(agent): trigger figure detection / state transition here. */
          }}
        />

        <AgentPanel
          message={MESSAGES[PREVIEW_STATE]}
          actions={<Actions state={PREVIEW_STATE} />}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Overlay rendered on top of the uploaded image                              */
/* TODO(agent): map detected figures → absolute-positioned glow boxes here.   */
/* -------------------------------------------------------------------------- */

function PhotoOverlay({ analyzing }: { analyzing: boolean }) {
  return (
    <>
      <Sparkle
        size={18}
        fill="currentColor"
        className={[
          "absolute bottom-3 right-3 text-ink/80",
          analyzing ? "animate-pulse" : "",
        ].join(" ")}
        aria-hidden
      />
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Per-state action slot                                                      */
/* All handlers are no-ops — backend engineer wires real flow transitions.    */
/* -------------------------------------------------------------------------- */

function Actions({ state }: { state: FlowState }) {
  switch (state) {
    case "empty":
    case "analyzing":
    case "done":
      return null;

    case "identifying":
      return (
        <>
          <Button
            variant="primary"
            size="sm"
            className="uppercase tracking-[0.18em]"
          /* TODO(agent): start naming flow for this figure */
          >
            Index Subject
          </Button>
          <Button
            variant="default"
            size="sm"
            className="uppercase tracking-[0.18em]"
          /* TODO(agent): skip this figure */
          >
            Exclude
          </Button>
        </>
      );

    case "naming":
      return <NameFormPlaceholder />;

    case "narrating":
      return (
        <>
          <Button variant="primary" /* TODO(agent): accept narration */>
            Correct!
          </Button>
          <Button variant="default" /* TODO(agent): switch to "modifying" */>
            Modify
          </Button>
        </>
      );

    case "modifying":
      return <ModifyFormPlaceholder initial={MESSAGES.narrating} />;
  }
}

function NameFormPlaceholder() {
  return (
    <form
      className="flex gap-2 w-full max-w-sm"
      onSubmit={(e) => {
        e.preventDefault();
        /* TODO(agent): submit the typed name to your flow */
      }}
    >
      <Input placeholder="e.g. Justin" />
      <Button variant="primary" size="sm" type="submit">
        Save
      </Button>
    </form>
  );
}

function ModifyFormPlaceholder({ initial }: { initial: string }) {
  return (
    <form
      className="flex flex-col gap-2 w-full"
      onSubmit={(e) => {
        e.preventDefault();
        /* TODO(agent): persist edited narration */
      }}
    >
      <textarea
        defaultValue={initial}
        rows={4}
        className="w-full rounded-[4px] border border-cream-50 bg-paper px-4 py-3 text-base font-light text-ink placeholder:text-cream-150 focus:outline-none focus:border-ink/40 transition-colors resize-none"
      />
      <div className="flex gap-2">
        <Button variant="primary" type="submit">
          Save
        </Button>
      </div>
    </form>
  );
}
