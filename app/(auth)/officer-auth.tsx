import { Ionicons } from "@expo/vector-icons";
import bcrypt from "bcryptjs";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("แจ้งเตือน", "โปรดกรอกชื่อผู้ใช้งานและรหัสผ่าน");
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

      if (error || !officer)
        throw new Error("ไม่พบบัญชีผู้ใช้งานหรือรหัสผ่านไม่ถูกต้อง");

      const isPasswordValid = await bcrypt.compare(password, officer.password);
      if (!isPasswordValid) throw new Error("รหัสผ่านไม่ถูกต้อง");

      router.replace({
        pathname: "/(officer)",
        params: { officerId: officer.id, officerName: officer.first_name },
      });
    } catch (err: any) {
      Alert.alert("เข้าสู่ระบบไม่สำเร็จ", err?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>เข้าสู่ระบบสำหรับเจ้าหน้าที่</Text>
          <View style={{ width: 28 }} />
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="ชื่อผู้ใช้งาน"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                placeholderTextColor="#94A3B8"
              />
            </View>

            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                placeholder="รหัสผ่าน"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                placeholderTextColor="#94A3B8"
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotButton}>
              <Text style={styles.forgotText}>ลืมรหัสผ่าน?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.8 }]}
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
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  headerSafeArea: { paddingTop: Platform.OS === "ios" ? 10 : 25 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Anuphan-Bold",
    fontWeight: "700",
    color: "black",
  },
  backButton: { padding: 4 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "flex-start",
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  formContainer: { width: "100%", marginTop: "50%" },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    height: 58,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#1E293B",
    fontFamily: "Anuphan-Medium",
  },
  forgotButton: { alignSelf: "flex-end", marginBottom: 35 },
  forgotText: { fontSize: 15, color: "#1E293B", fontFamily: "Anuphan-Medium" },
  loginButton: {
    backgroundColor: "#6D7D92",
    height: 56,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonText: {
    color: "white",
    fontSize: 18,
    fontFamily: "Anuphan-Bold",
    fontWeight: "700",
  },
});
