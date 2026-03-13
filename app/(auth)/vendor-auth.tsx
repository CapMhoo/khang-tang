import { FontAwesome5, Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import bcrypt from "bcryptjs";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function AuthScreen() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true); // Toggle state
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios"); // iOS stays open, Android closes
    if (selectedDate) {
      setDate(selectedDate);
      // Format to YYYY-MM-DD for Supabase
      const formattedDate = selectedDate.toISOString().split("T")[0];
      setForm({ ...form, birth_date: formattedDate });
    }
  };

  // Combined form state
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    phone: "",
    first_name: "",
    last_name: "",
    birth_date: "",
  });

  const handleAuth = async () => {
    // Simple validation
    console.log("Current Form State:", form);
    if (!form.username || !form.password || (!isLogin && !form.email)) {
      Alert.alert("Error", "โปรดกรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN LOGIC ---
        const { data: vendor, error } = await supabase
          .from("vendors")
          .select("id, password, first_name, last_name")
          .eq("username", form.username)
          .single();

        if (error || !vendor) {
          throw new Error("ไม่พบชื่อผู้ใช้งานนี้");
        }

        const isPasswordValid = await bcrypt.compare(
          form.password,
          vendor.password,
        );
        console.log("Hashed for comparison:", form.password);
        console.log("Stored hash:", vendor.password);
        if (!isPasswordValid) {
          throw new Error("รหัสผ่านไม่ถูกต้อง");
        }

        Alert.alert("สำเร็จ", `ยินดีต้อนรับคุณ ${vendor.first_name}`);
        router.replace({
          pathname: "/(vendor)",
          params: { vendorId: vendor.id }, // Pass the ID here
        });
      } else {
        // --- REGISTER LOGIC ---
        // const saltRounds = 10;
        // const hashedPassword = await bcrypt.hash(form.password, saltRounds);
        bcrypt.setRandomFallback((len) => {
          const array = Crypto.getRandomValues(new Uint8Array(len));
          return Array.from(array);
        });
        const hashedPassword = bcrypt.hashSync(form.password, 10);

        console.log("Hashed successfully:", hashedPassword);

        const { error } = await supabase.from("vendors").insert({
          username: form.username,
          email: form.email,
          phone: form.phone,
          password: hashedPassword,
          first_name: form.first_name,
          last_name: form.last_name,
          birth_date: form.birth_date,
        });

        if (error) throw error;

        // SUCCESS: Alert the user then switch to Login view
        Alert.alert("Success", "Registration complete! Please log in.");

        // OPTIONAL: Clear the password field for security
        setForm({ ...form, password: "" });

        // Change the UI state to show the login form
        setIsLogin(true);
      }
    } catch (err: any) {
      Alert.alert("Error", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 1. Header Section */}
      <View style={styles.headerBackground}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={28} color="white" />
        </Pressable>
        <View style={styles.logoRow}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="store" size={18} color="#F59E0B" />
          </View>
          <Text style={styles.headerTitle}>
            {isLogin ? "เข้าสู่ระบบ" : "ลงทะเบียนใหม่"}
          </Text>
        </View>
      </View>

      {/* 2. Form Card */}
      <View style={styles.contentCard}>
        {/* Toggle Tabs */}
        <View style={styles.tabContainer}>
          <Pressable
            style={[styles.tab, isLogin && styles.activeTab]}
            onPress={() => setIsLogin(true)}
          >
            <Text style={[styles.tabText, isLogin && styles.activeTabText]}>
              เข้าสู่ระบบ
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tab, !isLogin && styles.activeTab]}
            onPress={() => setIsLogin(false)}
          >
            <Text style={[styles.tabText, !isLogin && styles.activeTabText]}>
              ลงทะเบียน
            </Text>
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollPadding}
        >
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Username"
              value={form.username}
              onChangeText={(t) => setForm({ ...form, username: t })}
              autoCapitalize="none"
            />

            {!isLogin && (
              <>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={form.email}
                  onChangeText={(t) => setForm({ ...form, email: t })}
                  keyboardType="email-address"
                />
              </>
            )}

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry
              value={form.password} // Must match the key in your state
              onChangeText={(t) => setForm({ ...form, password: t })} // "password" must be lowercase
            />

            {!isLogin && (
              <>
                {/* Section Header */}
                <Text style={[styles.sectionTitle, { marginTop: 24 }]}>
                  ข้อมูลส่วนตัว (Personal Info)
                </Text>

                {/* First Name & Last Name Row */}
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={styles.label}>ชื่อจริง</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="สมชาย"
                      value={form.first_name}
                      onChangeText={(t) => setForm({ ...form, first_name: t })}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.label}>นามสกุล</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ใจดี"
                      value={form.last_name}
                      onChangeText={(t) => setForm({ ...form, last_name: t })}
                    />
                  </View>
                </View>

                {/* Phone Number */}
                <Text style={styles.label}>เบอร์โทรศัพท์ (10 หลัก)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="08XXXXXXXX"
                  value={form.phone}
                  onChangeText={(t) => {
                    // Only allow numbers and max length of 10
                    const cleanNumber = t.replace(/[^0-9]/g, "");
                    if (cleanNumber.length <= 10) {
                      setForm({ ...form, phone: cleanNumber });
                    }
                  }}
                  keyboardType="phone-pad"
                  maxLength={10}
                />

                {/* Birth Date */}
                <Text style={styles.label}>วันเกิด</Text>
                <Pressable
                  style={styles.dateSelector}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text
                    style={[
                      styles.dateText,
                      !form.birth_date && { color: "#9CA3AF" },
                    ]}
                  >
                    {form.birth_date ? form.birth_date : "เลือกวันที่"}
                  </Text>
                  <Ionicons name="calendar-outline" size={20} color="#6B7280" />
                </Pressable>

                {showDatePicker && (
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display="default"
                    onChange={onDateChange}
                    maximumDate={new Date()} // Can't be born in the future
                  />
                )}
              </>
            )}
          </View>

          <Pressable
            style={styles.submitBtn}
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.submitText}>
                {isLogin ? "เข้าสู่ระบบ" : "ลงทะเบียน"}
              </Text>
            )}
          </Pressable>

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F59E0B" },
  headerBackground: { paddingHorizontal: 24, paddingVertical: 20 },
  backBtn: { marginBottom: 15 },
  logoRow: { flexDirection: "row", alignItems: "center" },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "white" },
  contentCard: {
    flex: 1,
    backgroundColor: "white",
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    paddingTop: 24,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    marginHorizontal: 24,
    borderRadius: 16,
    padding: 4,
    marginBottom: 20,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center", borderRadius: 12 },
  activeTab: { backgroundColor: "white", elevation: 2, shadowOpacity: 0.1 },
  tabText: { fontSize: 16, fontWeight: "600", color: "#6B7280" },
  activeTabText: { color: "#F59E0B" },
  scrollPadding: { paddingHorizontal: 24 },
  inputGroup: { gap: 12 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#F59E0B", // Orange color to separate sections
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563", // Soft dark grey
    marginBottom: 6,
    marginLeft: 4,
  },
  input: {
    backgroundColor: "#F9FAFB", // Slightly lighter grey for input
    borderWidth: 1,
    borderColor: "#E5E7EB", // Subtle border
    padding: 16,
    borderRadius: 16,
    fontSize: 16,
    color: "#1F2937",
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    marginBottom: 0, // Controlled by individual inputs
  },
  submitBtn: {
    backgroundColor: "#F59E0B",
    padding: 18,
    borderRadius: 18,
    alignItems: "center",
    marginTop: 30,
  },
  submitText: { color: "white", fontSize: 18, fontWeight: "bold" },
  dateSelector: {
    backgroundColor: "#F9FAFB",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dateText: {
    fontSize: 16,
    color: "#1F2937",
  },
});
