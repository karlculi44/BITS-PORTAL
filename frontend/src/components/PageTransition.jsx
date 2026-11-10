import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { matchRoutes, useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { PageTransitionContext } from "./pageTransitionContext";

function PageTransition({ children, publicRoutes }) {
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const reduceMotion = useReducedMotion();
  const [transition, setTransition] = useState({ phase: "idle", kind: null });
  const [pageKey, setPageKey] = useState(0);
  const pending = useRef(null);
  const revealedLocation = useRef(null);
  const nextPageKey = useRef(0);
  const phase =
    transition.phase === "navigating" && location.key !== transition.fromKey
      ? "revealing"
      : transition.phase;

  useEffect(() => {
    if (pending.current && pending.current.locationKey !== location.key) {
      pending.current = null;
      setTransition({ phase: "idle", kind: null });
    } else if (phase === "revealing" && revealedLocation.current) {
      if (
        revealedLocation.current.key &&
        revealedLocation.current.key !== location.key &&
        navigationType === "POP"
      ) {
        setTransition({ phase: "idle", kind: null });
      } else if (location.key !== revealedLocation.current.fromKey) {
        revealedLocation.current.key = location.key;
      }
    }
  }, [location.key, navigationType, phase]);

  const startTransition = (destination, allowDuringReveal = false, adminHome = false) => {
    if (
      destination.origin !== window.location.origin ||
      destination.pathname === location.pathname
    ) {
      return false;
    }

    if (pending.current || transition.phase !== "idle") {
      if (!allowDuringReveal || phase !== "revealing") return true;
    }

    const isPublicSource = !!matchRoutes(publicRoutes, location.pathname);
    const isWipe =
      (isPublicSource && destination.pathname === "/dashboard") ||
      ((adminHome || location.pathname === "/dashboard") && destination.pathname === "/");
    const isPublicNavigation =
      isPublicSource &&
      matchRoutes(publicRoutes, destination.pathname);

    if ((!isWipe && !isPublicNavigation) || reduceMotion) return false;

    pending.current = {
      to: `${destination.pathname}${destination.search}${destination.hash}`,
      locationKey: location.key,
    };
    revealedLocation.current = null;
    setTransition({
      phase: "covering",
      kind: isWipe ? "wipe" : "fade",
      pageKey: ++nextPageKey.current,
    });
    return true;
  };

  const navigateWithTransition = (to) => {
    const destination = new URL(to, window.location.origin);
    if (!startTransition(destination, true)) navigate(to);
  };

  const handleClick = (event) => {
    const link = event.target.closest("a[href]");
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      (link.target && link.target !== "_self") ||
      link.hasAttribute("download")
    ) {
      return;
    }

    if (startTransition(new URL(link.href, window.location.href), false, link.hasAttribute("data-admin-home"))) {
      event.preventDefault();
    }
  };

  const handleAnimationComplete = (definition) => {
    if (transition.phase === "covering" && pending.current) {
      if (
        (transition.kind === "fade" && definition.opacity !== 0) ||
        (transition.kind === "wipe" && definition.opacity !== 1)
      ) return;
      const { to, locationKey } = pending.current;
      pending.current = null;
      revealedLocation.current = { fromKey: locationKey, key: null };
      setTransition({ ...transition, phase: "navigating", fromKey: locationKey });
      navigate(to);
    } else if (phase === "revealing") {
      if (
        (transition.kind === "fade" && definition.opacity !== 1) ||
        (transition.kind === "wipe" && definition.opacity !== 0)
      ) return;
      revealedLocation.current = null;
      if (transition.kind === "fade") setPageKey(transition.pageKey);
      setTransition({ phase: "idle", kind: null });
    }
  };

  return (
    <div onClickCapture={handleClick}>
      <PageTransitionContext.Provider value={{
        kind: transition.kind,
        phase,
        pageKey,
        nextPageKey: transition.pageKey,
        onAnimationComplete: handleAnimationComplete,
        navigateWithTransition,
      }}>
        {children}
      </PageTransitionContext.Provider>
      {transition.kind === "wipe" && (
        <motion.div
          aria-hidden="true"
          className="page-transition"
          initial={{ x: "-100%", opacity: 1 }}
          animate={
            phase !== "revealing"
              ? { x: "0%", opacity: 1 }
              : { x: "0%", opacity: 0 }
          }
          transition={{
            duration: transition.phase === "covering" ? 0.38 : 0.3,
            ease: [0.65, 0, 0.35, 1],
          }}
          onAnimationComplete={handleAnimationComplete}
        />
      )}
    </div>
  );
}

export default PageTransition;
