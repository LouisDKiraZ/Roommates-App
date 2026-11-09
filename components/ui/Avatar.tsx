import { StyleSheet, Text, View } from "react-native";

import { FontWeight } from "@/constants/theme";

interface AvatarProps {
  initials: string;
  color: string;
  size?: number;
}

export function Avatar({ initials, color, size = 36 }: AvatarProps) {
  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
      ]}>
      <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials}</Text>
    </View>
  );
}

interface AvatarStackProps {
  avatars: { id: string; initials: string; color: string }[];
  size?: number;
  max?: number;
}

export function AvatarStack({ avatars, size = 28, max = 4 }: AvatarStackProps) {
  const shown = avatars.slice(0, max);
  const extra = avatars.length - shown.length;

  return (
    <View style={styles.stack}>
      {shown.map((a, i) => (
        <View key={a.id} style={{ marginLeft: i === 0 ? 0 : -size * 0.3 }}>
          <Avatar initials={a.initials} color={a.color} size={size} />
        </View>
      ))}
      {extra > 0 && (
        <View style={[styles.more, { width: size, height: size, borderRadius: size / 2, marginLeft: -size * 0.3 }]}>
          <Text style={[styles.moreText, { fontSize: size * 0.34 }]}>+{extra}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  initials: {
    color: "#FFFFFF",
    fontWeight: FontWeight.semibold as any,
  },
  stack: {
    flexDirection: "row",
    alignItems: "center",
  },
  more: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#CFCBDB",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  moreText: {
    color: "#4A4658",
    fontWeight: FontWeight.semibold as any,
  },
});
