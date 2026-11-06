import { useCallback, useEffect, useRef, useState } from "react";

const TRANSITION_DURATION = 180;

export function useModalTransition() {
  const [isClosing, setIsClosing] = useState(false);
  const closeTimer = useRef(null);
  const closingRef = useRef(false);

  const closeWithTransition = useCallback((onComplete) => {
    if (closingRef.current) return;
    closingRef.current = true;
    setIsClosing(true);

    const reducedMotion =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    closeTimer.current = window.setTimeout(
      onComplete,
      reducedMotion ? 0 : TRANSITION_DURATION,
    );
  }, []);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  return { isClosing, closeWithTransition };
}
