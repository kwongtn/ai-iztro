import { Moon, Sun, Monitor } from "lucide-react";
import { useState, useEffect } from "react";

type ThemeMode = "system" | "dark" | "light";

export default function Header() {
  const [themeMode, setThemeMode] = useState<ThemeMode>("system");

  // Initialize theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme-mode") as ThemeMode | null;
    if (savedTheme) {
      setThemeMode(savedTheme);
      applyTheme(savedTheme);
    } else {
      // Default to system
      applyTheme("system");
    }
  }, []);

  const applyTheme = (mode: ThemeMode) => {
    if (mode === "dark") {
      document.documentElement.classList.add("dark");
    } else if (mode === "light") {
      document.documentElement.classList.remove("dark");
    } else {
      // System mode - use media query
      if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    }
  };

  const cycleTheme = () => {
    const modes: ThemeMode[] = ["system", "dark", "light"];
    const currentIndex = modes.indexOf(themeMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];

    setThemeMode(nextMode);
    localStorage.setItem("theme-mode", nextMode);
    applyTheme(nextMode);
  };

  const getThemeIcon = () => {
    switch (themeMode) {
      case "system":
        return <Monitor size={20} />;
      case "dark":
        return <Moon size={20} />;
      case "light":
        return <Sun size={20} />;
    }
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-3 text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
      <div className="text-xl font-bold text-purple-600 dark:text-purple-400">
        紫微斗数 AI解读版
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={cycleTheme}
          className="rounded-full p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          title={`当前: ${themeMode === "system" ? "跟随系统" : themeMode === "dark" ? "深色模式" : "浅色模式"}`}
        >
          {getThemeIcon()}
        </button>
      </div>
    </header>
  );
}
