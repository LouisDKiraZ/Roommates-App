import { Image, ImageSourcePropType, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Text, useThemeColor } from "@/components/Themed";
import { FontSize, FontWeight, Radius, Spacing } from "@/constants/theme";

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  actionIcon?: keyof typeof Ionicons.glyphMap;
  onActionPress?: () => void;
  logo?: ImageSourcePropType;
}

export function ScreenHeader({
  title,
  subtitle,
  actionIcon,
  onActionPress,
  logo,
}: ScreenHeaderProps) {
  const primary = useThemeColor({}, "primary");
  const primaryMuted = useThemeColor({}, "primaryMuted");

  return (
    <View style={styles.row}>
      {logo && (
        <View style={styles.logoWrap}>
          <Image source={logo} style={styles.logoImage} resizeMode="cover" />
        </View>
      )}
      <View style={styles.titles}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {actionIcon && (
        <Pressable
          onPress={onActionPress}
          style={[styles.action, { backgroundColor: primaryMuted }]}>
          <Ionicons name={actionIcon} size={20} color={primary} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  logoWrap: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    overflow: "hidden",
    marginRight: Spacing.md,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
  titles: {
    flex: 1,
  },
  title: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold as any,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  subtitle: {
    fontSize: FontSize.sm,
    opacity: 0.8,
    marginTop: 2,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  action: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: Spacing.sm,
  },
});
