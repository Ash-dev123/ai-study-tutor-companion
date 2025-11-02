"use client";

import { useState, useEffect } from "react";

interface TypingAnimationProps {
  text: string;
  className?: string;
  speed?: number;
  delay?: number;
  repeat?: boolean;
}

export const TypingAnimation = ({ 
  text, 
  className = "", 
  speed = 50,
  delay = 0,
  repeat = false
}: TypingAnimationProps) => {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!repeat) {
      // Original non-repeating behavior
      const startTimeout = setTimeout(() => {
        if (currentIndex < text.length) {
          const timeout = setTimeout(() => {
            setDisplayedText(text.slice(0, currentIndex + 1));
            setCurrentIndex(currentIndex + 1);
          }, speed);

          return () => clearTimeout(timeout);
        }
      }, delay);

      return () => clearTimeout(startTimeout);
    } else {
      // Repeating behavior
      const startTimeout = setTimeout(() => {
        if (!isDeleting && currentIndex < text.length) {
          // Typing forward
          const timeout = setTimeout(() => {
            setDisplayedText(text.slice(0, currentIndex + 1));
            setCurrentIndex(currentIndex + 1);
          }, speed);
          return () => clearTimeout(timeout);
        } else if (!isDeleting && currentIndex === text.length) {
          // Pause at end before deleting
          const timeout = setTimeout(() => {
            setIsDeleting(true);
          }, 2000);
          return () => clearTimeout(timeout);
        } else if (isDeleting && currentIndex > 0) {
          // Deleting backward
          const timeout = setTimeout(() => {
            setDisplayedText(text.slice(0, currentIndex - 1));
            setCurrentIndex(currentIndex - 1);
          }, speed / 2);
          return () => clearTimeout(timeout);
        } else if (isDeleting && currentIndex === 0) {
          // Pause at start before typing again
          const timeout = setTimeout(() => {
            setIsDeleting(false);
          }, 500);
          return () => clearTimeout(timeout);
        }
      }, delay);

      return () => clearTimeout(startTimeout);
    }
  }, [currentIndex, text, speed, delay, isDeleting, repeat]);

  return (
    <span className={className}>
      {displayedText}
      {((!repeat && currentIndex < text.length) || repeat) && (
        <span className="animate-pulse">|</span>
      )}
    </span>
  );
};