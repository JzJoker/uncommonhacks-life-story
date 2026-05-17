import { useEffect, useRef, useState } from "react";

export type PersonBox = {
  bbox: [number, number, number, number]; // x, y, w, h in original image pixels
  score: number;
};

type State = {
  boxes: PersonBox[];
  processedUrl: string | null; // URL that detection last completed on
};

export function usePersonDetection(imageUrl: string | null) {
  const [state, setState] = useState<State>({ boxes: [], processedUrl: null });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const modelRef = useRef<any>(null);

  useEffect(() => {
    if (!imageUrl) {
      setState({ boxes: [], processedUrl: null });
      return;
    }

    let cancelled = false;

    async function run() {
      await import("@tensorflow/tfjs");
      const cocoSsd = await import("@tensorflow-models/coco-ssd");

      if (!modelRef.current) {
        modelRef.current = await cocoSsd.load();
      }
      if (cancelled) return;

      const img = new window.Image();
      img.src = imageUrl!;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = reject;
      });
      if (cancelled) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const preds: any[] = await modelRef.current.detect(img);
      if (cancelled) return;

      const boxes = preds
        .filter((p) => p.class === "person" && p.score > 0.5)
        .map((p) => ({
          bbox: p.bbox as [number, number, number, number],
          score: p.score as number,
        }));

      setState({ boxes, processedUrl: imageUrl });
    }

    run().catch(() => {
      if (!cancelled) setState((s) => ({ ...s, processedUrl: imageUrl }));
    });

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  // isDetecting is true the moment imageUrl changes — no async lag
  const isDetecting = imageUrl !== null && imageUrl !== state.processedUrl;

  return { boxes: state.boxes, isDetecting };
}
