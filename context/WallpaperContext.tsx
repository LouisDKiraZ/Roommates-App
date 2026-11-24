import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

export type WallpaperType = "default" | "preset" | "custom";

export interface WallpaperPreset {
  id: string;
  name: string;
  type: "gradient" | "color";
  colors: [string, string, ...string[]];
  isBright?: boolean;
}

export interface WallpaperState {
  type: WallpaperType;
  presetId?: string;
  customUri?: string;
}

export const VIBRANT_PRESETS: WallpaperPreset[] = [
  {
    id: "pink",
    name: "Pink",
    type: "gradient",
    colors: ["#FF1493", "#FF69B4"],
    isBright: true,
  },
  {
    id: "purple",
    name: "Purple",
    type: "gradient",
    colors: ["#8A2BE2", "#D946EF"],
    isBright: true,
  },
  {
    id: "turquoise",
    name: "Turquoise",
    type: "gradient",
    colors: ["#00BFA5", "#00E5FF"],
    isBright: true,
  },
  {
    id: "cyan",
    name: "Cyan",
    type: "gradient",
    colors: ["#0099FF", "#00F7FF"],
    isBright: true,
  },
];

export const DARK_PRESETS: WallpaperPreset[] = [
  {
    id: "midnight",
    name: "Midnight",
    type: "gradient",
    colors: ["#0B132B", "#1C2541"],
  },
  {
    id: "aurora",
    name: "Aurora",
    type: "gradient",
    colors: ["#0B2B26", "#163832"],
  },
  {
    id: "twilight",
    name: "Twilight",
    type: "gradient",
    colors: ["#1F1135", "#32164D"],
  },
  {
    id: "obsidian",
    name: "Obsidian",
    type: "gradient",
    colors: ["#141414", "#262626"],
  },
  {
    id: "crimson",
    name: "Crimson",
    type: "gradient",
    colors: ["#2B0916", "#441128"],
  },
  {
    id: "espresso",
    name: "Espresso",
    type: "gradient",
    colors: ["#1F1612", "#35261F"],
  },
];

export const WALLPAPER_PRESETS: WallpaperPreset[] = [
  ...VIBRANT_PRESETS,
  ...DARK_PRESETS,
];

const STORAGE_KEY = "@roomly/wallpaper_state";

const DEFAULT_WALLPAPER: WallpaperState = {
  type: "default",
};

interface WallpaperContextValue {
  wallpaper: WallpaperState;
  activePreset: WallpaperPreset | null;
  setPreset: (presetId: string) => Promise<void>;
  setCustomImage: (uri: string) => Promise<void>;
  pickImageFromGallery: () => Promise<void>;
  resetToDefault: () => Promise<void>;
}

const WallpaperContext = createContext<WallpaperContextValue | undefined>(undefined);

export function WallpaperProvider({ children }: { children: ReactNode }) {
  const [wallpaper, setWallpaper] = useState<WallpaperState>(DEFAULT_WALLPAPER);

  // Load persisted wallpaper state on cold start
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as WallpaperState;
          setWallpaper(parsed);
        }
      } catch (err) {
        console.warn("Failed to load persisted wallpaper:", err);
      }
    })();
  }, []);

  const persistState = useCallback(async (newState: WallpaperState) => {
    setWallpaper(newState);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch (err) {
      console.warn("Failed to persist wallpaper state:", err);
    }
  }, []);

  const setPreset = useCallback(
    async (presetId: string) => {
      const preset = WALLPAPER_PRESETS.find((p) => p.id === presetId);
      if (!preset) return;
      await persistState({
        type: "preset",
        presetId,
      });
    },
    [persistState]
  );

  const setCustomImage = useCallback(
    async (uri: string) => {
      await persistState({
        type: "custom",
        customUri: uri,
      });
    },
    [persistState]
  );

  const pickImageFromGallery = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          "Permission required",
          "Please grant gallery access to choose a custom wallpaper photo."
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        await setCustomImage(result.assets[0].uri);
      }
    } catch (err) {
      Alert.alert(
        "Could not pick image",
        err instanceof Error ? err.message : "An error occurred while opening gallery."
      );
    }
  }, [setCustomImage]);

  const resetToDefault = useCallback(async () => {
    await persistState(DEFAULT_WALLPAPER);
  }, [persistState]);

  const activePreset = useMemo(() => {
    if (wallpaper.type !== "preset" || !wallpaper.presetId) return null;
    return WALLPAPER_PRESETS.find((p) => p.id === wallpaper.presetId) ?? null;
  }, [wallpaper]);

  const value = useMemo<WallpaperContextValue>(
    () => ({
      wallpaper,
      activePreset,
      setPreset,
      setCustomImage,
      pickImageFromGallery,
      resetToDefault,
    }),
    [
      wallpaper,
      activePreset,
      setPreset,
      setCustomImage,
      pickImageFromGallery,
      resetToDefault,
    ]
  );

  return (
    <WallpaperContext.Provider value={value}>
      {children}
    </WallpaperContext.Provider>
  );
}

export function useWallpaper() {
  const ctx = useContext(WallpaperContext);
  if (!ctx) throw new Error("useWallpaper must be used within WallpaperProvider");
  return ctx;
}
