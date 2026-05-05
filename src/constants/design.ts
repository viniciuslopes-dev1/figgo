export const design = {
  colors: {
    background: "#050607",
    backgroundSoft: "#08120D",
    surface: "#0D1117",
    surfaceMuted: "#101720",
    surfaceOverlay: "rgba(10,15,24,0.92)",
    border: "#1F2B3A",
    text: "#F7F7F8",
    textMuted: "#9CB0CA",
    green: "#20D25C",
    blue: "#2C6BFF",
    gold: "#F5C542",
    red: "#FF4D4D",
  },
  radius: {
    sm: 10,
    md: 12,
    lg: 18,
    xl: 24,
  },
  spacing: {
    xs: 6,
    sm: 10,
    md: 14,
    lg: 18,
    xl: 24,
  },
} as const;

export type AppColor = keyof typeof design.colors;
