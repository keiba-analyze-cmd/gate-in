"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { ThemeMode, ThemeColors, lightTheme, darkTheme, getTheme } from "@/styles/theme";

// ====================================================
// 型定義
// ====================================================

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  theme: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultMode?: ThemeMode;
}

// ====================================================
// ローカルストレージキー
// ====================================================

const THEME_STORAGE_KEY = "gate-in-theme";

// ====================================================
// コンテキスト
// ====================================================

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// ====================================================
// プロバイダー
// ====================================================

export function ThemeProvider({ children, defaultMode = "light" }: ThemeProviderProps) {
  const [mode, setMode] = useState<ThemeMode>(defaultMode);
  const [mounted, setMounted] = useState(false);

  // 初期化
  useEffect(() => {
    setMounted(true);

    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
      if (saved === "light" || saved === "dark") {
        setMode(saved);
      } else if (saved === "system") {
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        setMode(prefersDark ? "dark" : "light");
      }
    } catch {
      // ローカルストレージアクセス不可
    }
  }, []);

  // システム設定変更を監視
  useEffect(() => {
    if (!mounted) return;

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === "system" || !saved) {
        setMode(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [mounted]);

  // テーマ切り替え
  const toggleTheme = useCallback(() => {
    setMode((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {}
      return next;
    });
  }, []);

  // テーマ設定
  const setThemeMode = useCallback((newMode: ThemeMode) => {
    if (newMode === "system") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      setMode(prefersDark ? "dark" : "light");
    } else {
      setMode(newMode);
    }
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch {}
  }, []);

  const isDark = mode === "dark";
  const theme = useMemo(() => getTheme(isDark), [isDark]);

  // HTML要素にクラスを適用
  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    if (isDark) {
      html.classList.add("dark");
      html.classList.remove("light");
      html.style.colorScheme = "dark";
    } else {
      html.classList.add("light");
      html.classList.remove("dark");
      html.style.colorScheme = "light";
    }
  }, [isDark, mounted]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark,
      theme,
      toggleTheme,
      setTheme: setThemeMode,
    }),
    [mode, isDark, theme, toggleTheme, setThemeMode]
  );

  // SSR対策: マウント前はデフォルトテーマ
  if (!mounted) {
    return (
      <ThemeContext.Provider
        value={{
          mode: defaultMode,
          isDark: defaultMode === "dark",
          theme: defaultMode === "dark" ? darkTheme : lightTheme,
          toggleTheme: () => {},
          setTheme: () => {},
        }}
      >
        {children}
      </ThemeContext.Provider>
    );
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// ====================================================
// フック
// ====================================================

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}

export function useIsDark(): boolean {
  const { isDark } = useTheme();
  return isDark;
}

export function useThemeColors(): ThemeColors {
  const { theme } = useTheme();
  return theme;
}

// ====================================================
// ユーティリティ
// ====================================================

/**
 * ダークモードに応じたクラスを返す
 */
export function cn(isDark: boolean, lightClass: string, darkClass: string): string {
  return isDark ? darkClass : lightClass;
}
