import { createContext, useContext, useMemo } from "react";
import { useColorScheme } from "react-native";

type AppTheme = {
  dark: boolean;
  colors: {
    background: string;
    card: string;
    text: string;
    textSecondary: string;
    primary: string;
    success: string;
    premium: string;
    danger: string;
  };
};

const darkTheme: AppTheme = {
  dark: true,
  colors: {
    background: "#0D0D0D",
    card: "#181818",
    text: "#FFFFFF",
    textSecondary: "#BDBDBD",
    primary: "#0066FF",
    success: "#00C853",
    premium: "#FFD700",
    danger: "#FF3B30",
  },
};

const ThemeContext = createContext<AppTheme>(darkTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const value = useMemo(() => {
    if (scheme === "light") {
      return {
        ...darkTheme,
        dark: false,
        colors: { ...darkTheme.colors, background: "#F5F7FA", card: "#FFFFFF", text: "#0D0D0D", textSecondary: "#6B7280" },
      };
    }
    return darkTheme;
  }, [scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
