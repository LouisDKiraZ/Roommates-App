/**
 * Roomly color palette — light & dark.
 * https://docs.expo.dev/guides/color-schemes/
 */

const tintColorLight = "#6C5CE7";
const tintColorDark = "#A79BFF";

export default {
  light: {
    text: "#1C1B1F",
    textMuted: "#6B6B76",
    background: "#F7F6FB",
    card: "#FFFFFF",
    border: "#E7E5F0",
    tint: tintColorLight,
    primary: "#6C5CE7",
    primaryMuted: "#EDE9FE",
    tabIconDefault: "#B3AFC2",
    tabIconSelected: tintColorLight,
    danger: "#C23B4B",
  },
  dark: {
    text: "#F2F1F7",
    textMuted: "#A6A3B3",
    background: "#15131F",
    card: "#201D2E",
    border: "#322D45",
    tint: tintColorDark,
    primary: "#A79BFF",
    primaryMuted: "#2C2745",
    tabIconDefault: "#6E6A80",
    tabIconSelected: tintColorDark,
    danger: "#E0566C",
  },
};
