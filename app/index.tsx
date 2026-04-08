import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import {
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function IndexPage() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      {/* Set status bar to light because background is dark */}
      <StatusBar barStyle="light-content" />

      <View style={styles.innerContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>เลือกประเภทผู้ใช้งาน</Text>
        </View>

        <View style={styles.listGap}>
          <RoleOption
            title="ผู้ค้า"
            description="ลงทะเบียนร้านค้า จองพื้นที่ขาย เช็คอิน-เช็คเอาท์รายวัน"
            icon={<FontAwesome5 name="store" size={32} color="white" />}
            iconBg="#7B39B2" // Purple
            onPress={() => router.push("/(auth)/vendor-auth")}
          />

          <RoleOption
            title="เจ้าหน้าที่ กทม."
            description="ตรวจสอบความถูกต้องเรียบร้อย"
            icon={
              <MaterialCommunityIcons
                name="badge-account-horizontal"
                size={36}
                color="white"
              />
            }
            iconBg="#006D44" // Deep Green
            onPress={() => router.push("/officer-auth")}
          />

          <RoleOption
            title="ประชาชนทั่วไป"
            description="ดูแผนที่โซนค้าขาย แจ้งปัญหา"
            icon={<Ionicons name="location" size={36} color="white" />}
            iconBg="#FFB156" // Orange
            onPress={() => console.log("Public Selected")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const RoleOption = ({ title, description, icon, iconBg, onPress }: any) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.card,
      pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
    ]}
  >
    <View style={[styles.iconSquare, { backgroundColor: iconBg }]}>{icon}</View>

    <View style={styles.textContainer}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0C4B33", // Deep BMA Green from photo
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "white",
    textAlign: "center",
  },
  listGap: {
    gap: 16,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 16, // Smoother corners per photo
  },
  iconSquare: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 4,
    textAlign: "left", // Changed to left to match image
  },
  cardDescription: {
    fontSize: 15,
    color: "#333",
    lineHeight: 22,
    textAlign: "left", // Changed to left to match image
  },
});
