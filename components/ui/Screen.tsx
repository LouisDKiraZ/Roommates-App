import {
  ImageBackground,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

import { useThemeColor } from "@/components/Themed";
import { useWallpaper } from "@/context/WallpaperContext";

interface ScreenProps {
  children: React.ReactNode;
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  applyWallpaper?: boolean;
}

// Thin wrapper so every screen gets the themed background instead of
// relying on React Navigation's default white/black scene background.
// Automatically applies the active custom wallpaper or preset if configured.
export function Screen({
  children,
  edges = ["top", "bottom"],
  style,
  applyWallpaper = true,
}: ScreenProps) {
  const background = useThemeColor({}, "background");
  const { wallpaper, activePreset } = useWallpaper();

  const isCustom = applyWallpaper && wallpaper.type === "custom" && !!wallpaper.customUri;
  const isPreset = applyWallpaper && wallpaper.type === "preset" && !!activePreset;

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {isCustom && (
        <>
          <ImageBackground
            source={{ uri: wallpaper.customUri }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
          <View style={styles.darkOverlay} />
        </>
      )}

      {isPreset && activePreset && (
        <>
          <LinearGradient
            colors={activePreset.colors}
            style={StyleSheet.absoluteFill}
          />
          <View
            style={
              activePreset.isBright
                ? styles.brightPresetOverlay
                : styles.presetOverlay
            }
          />
        </>
      )}

      <SafeAreaView
        style={[
          styles.safe,
          (isCustom || isPreset) && { backgroundColor: "transparent" },
          style,
        ]}
        edges={edges}>
        {children}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
  },
  darkOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 8, 20, 0.65)", // Semi-transparent dark overlay for high contrast
  },
  brightPresetOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 8, 20, 0.12)", // Minimal touch to preserve bright & vivid colors while grounding text
  },
  presetOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
});
