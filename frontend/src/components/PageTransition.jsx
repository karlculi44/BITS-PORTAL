import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useLocation, useNavigate } from "react-router-dom";

function PageTransition({ children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  const [phase, setPhase] = useState("idle");
  const pending = useRef(null);

  useEffect(() => {
    if (pending.current && pending.current.locationKey !== location.key) {
      pending.current = null;
      setPhase("idle");
    }
  }, [location.key]);

  const handleClick = (event) => {
    const link = event.target.closest("a[data-page-transition]");
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

    if (pending.current) {
      event.preventDefault();
      return;
    }
    if (reduceMotion) return;

    event.preventDefault();
    pending.current = {
      to: link.getAttribute("href"),
      locationKey: location.key,
    };
    setPhase("covering");
  };

  const handleAnimationComplete = () => {
    if (phase === "covering" && pending.current) {
      const { to } = pending.current;
      pending.current = null;
      navigate(to);
      setPhase("revealing");
    } else if (phase === "revealing") {
      setPhase("idle");
    }
  };

  return (
    <div onClickCapture={handleClick}>
      {children}
      {phase !== "idle" && (
        <motion.div
          aria-hidden="true"
          className="page-transition"
          initial={{ x: "-100%", opacity: 1 }}
          animate={
            phase === "covering"
              ? { x: "0%", opacity: 1 }
              : { x: "0%", opacity: 0 }
          }
          transition={{
            duration: phase === "covering" ? 0.38 : 0.3,
            ease: [0.65, 0, 0.35, 1],
          }}
          onAnimationComplete={handleAnimationComplete}
        />
      )}
    </div>
  );
}

export default PageTransition;
