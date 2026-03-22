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
      <StatusBar barStyle="dark-content" />

      <View style={styles.innerContainer}>
        <View style={styles.titleContainer}>
          {/* ใช้ Sao Chingcha สำหรับหัวข้อหลัก */}
          <Text style={styles.mainTitle}>เลือกประเภทผู้ใช้งาน</Text>
        </View>

        <View style={styles.listGap}>
          <RoleOption
            title="ผู้ค้า"
            description="ลงทะเบียนร้านค้า จองพื้นที่ขาย เช็คอิน-เช็คเอาท์รายวัน"
            icon={<FontAwesome5 name="store" size={24} color="#64748B" />}
            onPress={() => router.push("/(auth)/vendor-auth")}
          />

          <RoleOption
            title="เจ้าหน้าที่ กทม."
            description="ตรวจสอบความถูกต้องเรียบร้อย"
            icon={
              <MaterialCommunityIcons
                name="shield-check"
                size={30}
                color="#64748B"
              />
            }
            onPress={() => router.push("/officer-auth")}
          />

          <RoleOption
            title="ประชาชนทั่วไป"
            description="ดูแผนที่โซนค้าขาย แจ้งปัญหา"
            icon={<Ionicons name="people" size={30} color="#64748B" />}
            onPress={() => console.log("Public Selected")}
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const RoleOption = ({ title, description, icon, onPress }: any) => (
  <Pressable
    onPress={onPress}
    style={({ pressed }) => [
      styles.card,
      pressed && { backgroundColor: "#F8FAFC", transform: [{ scale: 0.98 }] },
    ]}
  >
    <View style={styles.iconSquare}>{icon}</View>

    <View style={styles.textContainer}>
      <Text style={styles.cardTitle}>{title}</Text>
      <Text style={styles.cardDescription}>{description}</Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F1F5F9",
  },
  innerContainer: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  titleContainer: {
    alignItems: "center",
    marginBottom: 48,
  },
  mainTitle: {
    fontFamily: "SaoChingcha-Bold", // <--- ฟอนต์เสาชิงช้า
    fontSize: 34,
    color: "#0F172A",
    textAlign: "center",
  },
  listGap: {
    gap: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
  },
  iconSquare: {
    width: 72,
    height: 72,
    backgroundColor: "#E2E8F0",
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  cardTitle: {
    fontFamily: "Anuphan-Bold", // <--- ฟอนต์อนุพัณฑ์ (หนา)
    fontSize: 20,
    color: "#1E293B",
    textAlign: "center",
    marginBottom: 4,
  },
  cardDescription: {
    fontFamily: "Anuphan-Regular", // <--- ฟอนต์อนุพัณฑ์ (ปกติ)
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
});
