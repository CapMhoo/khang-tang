import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import bcrypt from "bcryptjs";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function OfficerAuth() {
  const router = useRouter();
  const [email, setEmail] = useState("officer@bma.go.th"); // ค่าสมมติ
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "โปรดกรอกอีเมลและรหัสผ่านให้ครบถ้วน");
      return;
    }

    setLoading(true);
    try {
      const emailInput = email.trim();
      const { data: officer, error } = await supabase
        .from("officers")
        .select("id, password, first_name, last_name")
        .ilike("email", emailInput)
        .single();

      if (error) {
        console.error("Officer login query error:", error);
        throw new Error(error.message);
      }

      if (!officer) {
        throw new Error("ไม่พบบัญชีเจ้าหน้าที่นี้");
      }

      if (!officer.password) {
        throw new Error("บัญชีนี้ยังไม่ได้ตั้งรหัสผ่านในระบบ");
      }

      const isPasswordValid = await bcrypt.compare(password, officer.password);
      if (!isPasswordValid) {
        throw new Error("รหัสผ่านไม่ถูกต้อง");
      }

      Alert.alert(
        "สำเร็จ",
        officer.first_name
          ? `ยินดีต้อนรับคุณ ${officer.first_name}`
          : "ยินดีต้อนรับ",
      );
      setPassword("");
      router.replace({
        pathname: "/(officer)",
        params: { officerId: officer.id, officerName: officer.first_name },
      });
    } catch (err: any) {
      Alert.alert(
        "Error",
        err?.message ?? "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#00A9A4" />

      {/* Header Area with Teal Background */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>

        <View style={styles.titleArea}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons
              name="shield-outline"
              size={30}
              color="white"
            />
          </View>
          <View>
            <Text style={styles.brandText}>เข้าสู่ระบบ</Text>
            <Text style={styles.subBrandText}>สำหรับเจ้าหน้าที่ กทม.</Text>
          </View>
        </View>
      </View>

      {/* Login Card area with White Background */}
      <View style={styles.content}>
        <View style={styles.loginCard}>
          {/* Email Input */}
          <Text style={styles.inputLabel}>อีเมลราชการ</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={20}
              color="#888"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="example@bma.go.th"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#BBB"
            />
          </View>

          {/* Password Input */}
          <Text style={styles.inputLabel}>รหัสผ่าน</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={20}
              color="#888"
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="รหัสผ่านของคุณ"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              placeholderTextColor="#BBB"
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? "eye-outline" : "eye-off-outline"}
                size={20}
                color="#888"
              />
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity style={styles.forgotContainer}>
            <Text style={styles.forgotText}>ลืมรหัสผ่าน?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.loginButtonText}>เข้าสู่ระบบ</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA", // Light grey for content area
  },
  header: {
    backgroundColor: "#00A9A4", // Teal color from design
    height: "30%",
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  backButton: {
    padding: 5,
    marginTop: 10,
  },
  titleArea: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.2)", // White with low opacity
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  brandText: {
    fontSize: 24,
    fontWeight: "bold",
    color: "white",
  },
  subBrandText: {
    fontSize: 14,
    color: "white",
    opacity: 0.8,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: -50, // To pull the card over the header background
  },
  loginCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginTop: 20,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5", // Light cream/grey background for input
    borderRadius: 10,
    paddingHorizontal: 15,
    height: 50,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    height: "100%",
  },
  forgotContainer: {
    alignSelf: "flex-start",
    marginVertical: 15,
  },
  forgotText: {
    color: "#00A9A4", // Teal link color
    fontSize: 14,
  },
  loginButton: {
    backgroundColor: "#00A9A4", // Teal button color
    borderRadius: 10,
    height: 50,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    shadowColor: "#00A9A4",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  loginButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
