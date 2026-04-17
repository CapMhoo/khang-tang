import { Ionicons } from "@expo/vector-icons";
import bcrypt from "bcryptjs";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { setOfficerSession } from "../../lib/officerSession";
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

      setOfficerSession({
        officerId: officer.id,
        officerName: officer.first_name,
      });

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>เข้าสู่ระบบสำหรับเจ้าหน้าที่</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Image
            source={require("../../assets/images/officer_auth_pic.png")}
            style={styles.illustration}
            resizeMode="contain"
          />

          <View style={styles.formCard}>
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
              <TouchableOpacity
                onPress={() => setShowPassword((s) => !s)}
                hitSlop={10}
              >
                <Ionicons
                  name={showPassword ? "eye-outline" : "eye-off-outline"}
                  size={22}
                  color="#64748B"
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.forgotButton} activeOpacity={0.7}>
              <Text style={styles.forgotText}>ลืมรหัสผ่าน?</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.loginButton, loading && { opacity: 0.8 }]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F3F4F6" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 16 : 12,
    paddingBottom: 12,
    backgroundColor: "white",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 20,
    fontFamily: "Anuphan-Bold",
    fontWeight: "900",
    color: "#111827",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerSpacer: { width: 40 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 40,
    alignItems: "center",
  },
  illustration: {
    width: "100%",
    height: 260,
    marginBottom: 18,
  },
  formCard: {
    width: "100%",
    marginTop: 18,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    height: 60,
    paddingHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#FFFFFF",
    marginBottom: 14,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#0F172A",
    fontFamily: "Anuphan-Regular",
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: 24,
  },
  forgotText: {
    fontSize: 15,
    color: "#0F172A",
    fontFamily: "Anuphan-Bold",
    fontWeight: "700",
  },
  loginButton: {
    backgroundColor: "#1F5A3A",
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  loginButtonText: {
    color: "white",
    fontSize: 18,
    fontFamily: "Anuphan-Bold",
    fontWeight: "900",
  },
});
