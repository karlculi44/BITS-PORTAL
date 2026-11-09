import { useEffect, useRef } from "react";

const MAX_PARTICLES = 54;
const MIN_PARTICLES = 18;
const CONNECTION_DISTANCE = 120;

function NetworkBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof window.CanvasRenderingContext2D === "undefined") {
      return undefined;
    }
    const context = canvas?.getContext("2d");
    if (!context) return undefined;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let particles = [];
    let frameId = 0;
    let width = 0;
    let height = 0;

    const getColors = () => {
      const styles = getComputedStyle(document.documentElement);
      return {
        node: styles.getPropertyValue("--network-node").trim(),
        line: styles.getPropertyValue("--network-line").trim(),
      };
    };

    const resize = () => {
      window.cancelAnimationFrame(frameId);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const count = Math.min(
        MAX_PARTICLES,
        Math.max(MIN_PARTICLES, Math.round((width * height) / 26000)),
      );
      particles = Array.from({ length: count }, () => {
        const angle = Math.random() * Math.PI * 2;
        const speed = reducedMotion.matches ? 0 : 0.12 + Math.random() * 0.12;
        return {
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
        };
      });
      draw();
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const colors = getColors();

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];
        if (!reducedMotion.matches) {
          particle.x += particle.vx;
          particle.y += particle.vy;
          if (particle.x < 0 || particle.x > width) particle.vx *= -1;
          if (particle.y < 0 || particle.y > height) particle.vy *= -1;
        }

        context.beginPath();
        context.arc(particle.x, particle.y, 1.6, 0, Math.PI * 2);
        context.fillStyle = colors.node;
        context.fill();

        for (let j = i + 1; j < particles.length; j += 1) {
          const other = particles[j];
          const distance = Math.hypot(particle.x - other.x, particle.y - other.y);
          if (distance > CONNECTION_DISTANCE) continue;

          context.beginPath();
          context.moveTo(particle.x, particle.y);
          context.lineTo(other.x, other.y);
          context.strokeStyle = colors.line;
          context.lineWidth = 1 - distance / CONNECTION_DISTANCE;
          context.stroke();
        }
      }

      if (!reducedMotion.matches) frameId = window.requestAnimationFrame(draw);
    };

    const refreshMotion = () => {
      window.cancelAnimationFrame(frameId);
      if (reducedMotion.matches) {
        particles.forEach((particle) => {
          particle.vx = 0;
          particle.vy = 0;
        });
      } else {
        particles.forEach((particle) => {
          if (particle.vx !== 0 || particle.vy !== 0) return;
          const angle = Math.random() * Math.PI * 2;
          const speed = 0.12 + Math.random() * 0.12;
          particle.vx = Math.cos(angle) * speed;
          particle.vy = Math.sin(angle) * speed;
        });
      }
      if (particles.length) draw();
    };
    const themeObserver = new MutationObserver(() => {
      window.cancelAnimationFrame(frameId);
      draw();
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    window.addEventListener("resize", resize);
    reducedMotion.addEventListener("change", refreshMotion);
    resize();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      reducedMotion.removeEventListener("change", refreshMotion);
      themeObserver.disconnect();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="network-background pointer-events-none fixed inset-0 z-0"
    />
  );
}

export default NetworkBackground;
