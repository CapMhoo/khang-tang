// app/index.tsx
import {
  FontAwesome5,
  Ionicons,
  MaterialCommunityIcons,
} from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

type UserRole = "public" | "vendor" | "officer" | null;

export default function IndexPage() {
  const [selectedRole, setSelectedRole] = useState<UserRole>(null);
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 1. Header Section - Fixed at top */}
      <View style={styles.headerBackground}>
        <View style={styles.logoContainer}>
          <View style={styles.logoIconCircle}>
            <Ionicons name="location-sharp" size={24} color="#F59E0B" />
          </View>
          <View>
            <Text style={styles.logoTextThai}>ข้างทาง</Text>
            <Text style={styles.logoTextEnglish}>KhangTang</Text>
          </View>
        </View>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitleThai}>ระบบจัดการพื้นที่</Text>
          <Text style={styles.headerTitleThai}>ค้าขายริมทาง กรุงเทพฯ</Text>
          <Text style={styles.headerSubtitle}>
            ค้นหาพื้นที่ค้าขาย จองสถานที่ และติดตามสถานะได้ง่ายๆ
          </Text>
        </View>
      </View>

      {/* 2. Scrollable Content Area */}
      <View style={styles.contentCard}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Text style={styles.selectionLabel}>เลือกประเภทผู้ใช้งาน</Text>

          <View style={styles.roleList}>
            <RoleOption
              icon={
                <Ionicons name="people-outline" size={28} color="#F59E0B" />
              }
              title="ประชาชนทั่วไป"
              description="ดูแผนที่โซนค้าขาย ตรวจสอบข้อมูลผู้ค้า และแจ้งปัญหา"
              color="#FFFBEB"
              isSelected={selectedRole === "public"}
              onPress={() => setSelectedRole("public")}
            />

            <RoleOption
              icon={<FontAwesome5 name="store" size={22} color="white" />}
              title="ผู้ค้า"
              description="ลงทะเบียน เช็คอิน-เช็คเอาท์รายวัน"
              color="#F59E0B"
              isDark
              isSelected={selectedRole === "vendor"}
              onPress={() => {
                setSelectedRole("vendor");
                // Use a slight delay or navigate immediately
                router.push("/(auth)/vendor-auth");
              }}
            />

            <RoleOption
              icon={
                <MaterialCommunityIcons
                  name="shield-check-outline"
                  size={28}
                  color="white"
                />
              }
              title="เจ้าหน้าที่ กทม."
              description="ตรวจการผู้ค้าและจัดการกฏเกณฑ์ในแต่ละโซน"
              color="#0D9488"
              isDark
              isSelected={selectedRole === "officer"}
              onPress={() => {
                setSelectedRole("officer");
                router.push("/(auth)/officer-auth");
              }}
            />
          </View>

          {/* This empty view ensures the bottom margin is respected even when scrolling */}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// --- Sub-component for Role Options ---
interface RoleProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  isDark?: boolean;
  isSelected: boolean;
  onPress: () => void;
}

const RoleOption = ({
  icon,
  title,
  description,
  color,
  isDark,
  isSelected,
  onPress,
}: RoleProps) => (
  <Pressable
    onPress={onPress}
    style={[
      styles.roleBox,
      { backgroundColor: color },
      isSelected && styles.roleSelected,
    ]}
  >
    <View
      style={[
        styles.iconBox,
        { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "white" },
      ]}
    >
      {icon}
    </View>
    <View style={styles.roleTextGroup}>
      <Text style={[styles.roleTitle, { color: isDark ? "white" : "#1F2937" }]}>
        {title}
      </Text>
      <Text
        style={[
          styles.roleDesc,
          { color: isDark ? "rgba(255,255,255,0.9)" : "#6B7280" },
        ]}
      >
        {description}
      </Text>
    </View>
  </Pressable>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F59E0B",
  },
  headerBackground: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  logoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
  },
  logoIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  logoTextThai: {
    fontSize: 22,
    fontWeight: "bold",
    color: "white",
  },
  logoTextEnglish: {
    fontSize: 14,
    color: "white",
    opacity: 0.9,
  },
  headerContent: {
    marginTop: 10,
  },
  headerTitleThai: {
    fontSize: 26,
    fontWeight: "bold",
    color: "white",
    lineHeight: 34,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "white",
    marginTop: 12,
    opacity: 0.9,
    lineHeight: 22,
  },
  contentCard: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    // Note: Padding is now handled inside the ScrollView for better UX
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  selectionLabel: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1F2937",
    marginBottom: 20,
  },
  roleList: {
    gap: 16,
  },
  bottomSpacer: {
    height: 60, // This creates the large margin at the very bottom
  },
  roleBox: {
    flexDirection: "row",
    padding: 20,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 3,
    borderColor: "transparent",
  },
  roleSelected: {
    borderColor: "#333", // Subtle indicator for selection
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  roleTextGroup: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
});
