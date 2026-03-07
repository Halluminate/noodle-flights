"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface LoadingIndicatorProps {
  isLoading: boolean;
}

export function LoadingIndicator({ isLoading }: LoadingIndicatorProps) {
  const [showBar, setShowBar] = useState(false);
  const [completeAnimation, setCompleteAnimation] = useState(false);

  useEffect(() => {
    if (isLoading) {
      setShowBar(true);
      setCompleteAnimation(false);
    } else if (showBar && !isLoading) {
      // Loading finished, trigger fast completion
      setCompleteAnimation(true);
    }
  }, [isLoading, showBar]);

  const handleAnimationComplete = () => {
    if (completeAnimation) {
      // Hide the bar after completion animation
      setTimeout(() => {
        setShowBar(false);
        setCompleteAnimation(false);
      }, 100);
    }
  };

  return (
    <AnimatePresence>
      {showBar && (
        <div className="fixed top-16 left-0 right-0 h-[2px] bg-gray-800 z-50">
          <motion.div
            className="h-full bg-blue-500"
            initial={{ width: "0%" }}
            animate={{ width: completeAnimation ? "100%" : "70%" }}
            exit={{ opacity: 0 }}
            transition={{
              width: {
                duration: completeAnimation ? 0.2 : 2,
                ease: completeAnimation ? "easeOut" : "easeInOut",
              },
              opacity: {
                duration: 0.2,
              },
            }}
            onAnimationComplete={handleAnimationComplete}
          />
        </div>
      )}
    </AnimatePresence>
  );
}