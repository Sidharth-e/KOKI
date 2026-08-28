"use client";

import { useAppStore } from "@/store/useAppStore";
import { Button } from "@/components/ui/Button";
import { Moon, Sun } from "lucide-react";
import { useEffect } from "react";

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [theme]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
      className="relative text-foreground"
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4 text-warning transition-transform" />
      ) : (
        <Moon className="h-4 w-4 text-primary transition-transform" />
      )}
    </Button>
  );
}
