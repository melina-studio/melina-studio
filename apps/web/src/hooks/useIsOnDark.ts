"use client";

import { useState, useEffect } from "react";

export function useIsOnDark(navbarHeight: number = 80) {
  const [isOnDark, setIsOnDark] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const darkSections = document.querySelectorAll('[data-theme="dark"]');

      let onDarkSection = false;

      darkSections.forEach((section) => {
        const rect = section.getBoundingClientRect();
        if (rect.top < navbarHeight && rect.bottom > 0) {
          onDarkSection = true;
        }
      });

      setIsOnDark(onDarkSection);
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();

    return () => window.removeEventListener("scroll", handleScroll);
  }, [navbarHeight]);

  return isOnDark;
}
