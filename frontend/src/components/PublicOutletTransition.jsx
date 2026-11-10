import { useContext } from "react";
import { motion } from "motion/react";
import { PageTransitionContext } from "./pageTransitionContext";

function PublicOutletTransition({ children }) {
  const transition = useContext(PageTransitionContext);
  const fading = transition?.kind === "fade";
  const revealing = fading && transition.phase === "revealing";

  return (
    <motion.div
      className="public-outlet-transition"
      key={revealing ? transition.nextPageKey : transition?.pageKey}
      initial={revealing ? { opacity: 0, y: 12 } : false}
      animate={fading && !revealing ? { opacity: 0 } : { opacity: 1, y: 0 }}
      transition={{
        duration: transition?.phase === "covering" ? 0.12 : 0.15,
        ease: [0.22, 1, 0.36, 1],
      }}
      onAnimationComplete={fading ? transition.onAnimationComplete : undefined}
    >
      {children}
    </motion.div>
  );
}

export default PublicOutletTransition;
