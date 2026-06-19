import React, { useEffect, useRef, useState } from 'react';

/**
 * ScrollReveal Wrapper Component
 * Handles high-performance intersection observing to trigger standard CSS transitions/animations 
 * with micro vertical slide and fade-in effects on scroll.
 */
export default function ScrollReveal({ children, className = '', style = {}, delay = 0 }) {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if browser supports IntersectionObserver
    if (typeof window === 'undefined' || !window.IntersectionObserver) {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          // Disconnect observer once element is visible to preserve processing power
          if (elementRef.current) {
            observer.unobserve(elementRef.current);
          }
        }
      },
      {
        root: null, // relative to viewport
        threshold: 0.08, // trigger when a sliver of the element enters
        rootMargin: '0px 0px -40px 0px' // slightly trigger before hitting visual bounds
      }
    );

    const currentRef = elementRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, []);

  return (
    <div
      ref={elementRef}
      className={`reveal-on-scroll ${isVisible ? 'is-visible' : ''} ${className}`}
      style={{
        ...style,
        transitionDelay: `${delay}ms`
      }}
    >
      {children}
    </div>
  );
}
