"use client";

import { useEffect, useRef, useState, ReactNode } from "react";

type Props = {
  children: ReactNode;
  animation?: "fadeUp" | "fadeIn" | "slideLeft" | "slideRight" | "bounce" | "scaleIn";
  delay?: number;
  className?: string;
};

export default function ScrollAnimation({ children, animation = "fadeUp", delay = 0, className = "" }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setIsVisible(true); observer.disconnect(); } },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const baseStyle: React.CSSProperties = {
    transitionProperty: "opacity, transform",
    transitionDuration: "0.7s",
    transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
    transitionDelay: delay + "ms",
  };

  const hiddenStyles: Record<string, React.CSSProperties> = {
    fadeUp: { opacity: 0, transform: "translateY(30px)" },
    fadeIn: { opacity: 0 },
    slideLeft: { opacity: 0, transform: "translateX(-30px)" },
    slideRight: { opacity: 0, transform: "translateX(30px)" },
    bounce: { opacity: 0, transform: "scale(0.8)" },
    scaleIn: { opacity: 0, transform: "scale(0.95)" },
  };

  const visibleStyle: React.CSSProperties = { opacity: 1, transform: "translateY(0) translateX(0) scale(1)" };

  return (
    <div
      ref={ref}
      className={className}
      style={{ ...baseStyle, ...(isVisible ? visibleStyle : hiddenStyles[animation]) }}
    >
      {children}
    </div>
  );
}
