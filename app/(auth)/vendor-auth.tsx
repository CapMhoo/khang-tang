import { Ionicons } from "@expo/vector-icons";
import bcrypt from "bcryptjs";
import * as Crypto from "expo-crypto";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function VendorAuth() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPrefixModal, setShowPrefixModal] = useState(false);
  const prefixes = ["นาย", "นาง", "นางสาว"];

  const [form, setForm] = useState({
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    prefix: "นาย",
    birthDate: "",
  });

  const [formLogin, setFormLogin] = useState({
    emailOrPhone: "",
    password: "",
  });

  const handleAuth = async () => {
    setLoading(true);

    try {
      if (isLogin) {
        // --- LOGIN LOGIC ---
        if (!formLogin.emailOrPhone || !formLogin.password) {
          throw new Error("โปรดกรอกอีเมล/เบอร์โทรศัพท์ และรหัสผ่าน");
        }

        // ปรับ identifier ให้เป็นตัวเล็กทั้งหมด (เฉพาะอีเมล เบอร์โทรศัพท์ไม่มีผล)
        // และตัดช่องว่างทิ้ง
        const identifier = formLogin.emailOrPhone.trim().toLowerCase();

        let vendor = null;

        // 1. ลองหาจาก Email
        const { data: byEmail } = await supabase
          .from("vendors")
          .select("id, password, first_name, last_name")
          .eq("email", identifier)
          .maybeSingle();

        vendor = byEmail;

        // 2. ถ้าหาจาก Email ไม่เจอ และ identifier เป็นตัวเลขล้วน ให้ลองหาจาก Phone
        if (!vendor && /^\d+$/.test(identifier)) {
          const { data: byPhone } = await supabase
            .from("vendors")
            .select("id, password, first_name, last_name")
            .eq("phone", identifier)
            .maybeSingle();
          vendor = byPhone;
        }

        if (!vendor) {
          throw new Error("ไม่พบผู้ใช้งานด้วยอีเมลหรือเบอร์โทรศัพท์นี้");
        }

        const isPasswordValid = await bcrypt.compare(
          formLogin.password,
          vendor.password,
        );

        if (!isPasswordValid) {
          throw new Error("รหัสผ่านไม่ถูกต้อง");
        }

        Alert.alert("สำเร็จ", `ยินดีต้อนรับคุณ ${vendor.first_name}`);
        router.replace({
          pathname: "/(vendor)",
          params: { vendorId: vendor.id },
        });
      } else {
        // --- REGISTER LOGIC ---
        if (
          !form.firstName ||
          !form.lastName ||
          !form.phone ||
          !form.email ||
          !form.password
        ) {
          throw new Error("โปรดกรอกข้อมูลการสมัครสมาชิกให้ครบถ้วน");
        }

        // 1. ตรวจสอบรูปแบบอีเมล (Email Format Validation)
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(form.email)) {
          throw new Error("รูปแบบอีเมลไม่ถูกต้อง");
        }

        // 2. ตรวจสอบชื่อและนามสกุล (Thai and English alphabets only)
        // This regex allows Thai characters, English letters, and spaces
        const nameRegex = /^[a-zA-Zก-๙\s]+$/;
        if (!nameRegex.test(form.firstName)) {
          throw new Error("ชื่อต้องเป็นตัวอักษรเท่านั้น");
        }
        if (!nameRegex.test(form.lastName)) {
          throw new Error("นามสกุลต้องเป็นตัวอักษรเท่านั้น");
        }

        if (form.password.length < 8) {
          throw new Error("รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร");
        }

        // 1. ตรวจสอบอีเมลและเบอร์โทรศัพท์ซ้ำ
        const cleanEmail = form.email.trim().toLowerCase();
        const { data: existingUser, error: checkError } = await supabase
          .from("vendors")
          .select("email, phone, first_name, last_name")
          .or(
            `email.eq.${cleanEmail},phone.eq.${form.phone},and(first_name.eq.${form.firstName},last_name.eq.${form.lastName})`,
          )
          .maybeSingle();

        if (checkError) throw checkError;

        if (existingUser) {
          if (existingUser.email === cleanEmail) {
            throw new Error("อีเมลนี้ถูกใช้งานไปแล้ว");
          }
          if (existingUser.phone === form.phone) {
            throw new Error("เบอร์โทรศัพท์นี้ถูกใช้งานไปแล้ว");
          }
          if (
            existingUser.first_name === form.firstName &&
            existingUser.last_name === form.lastName
          ) {
            throw new Error("ชื่อและนามสกุลนี้มีอยู่ในระบบแล้ว");
          }
        }

        // 2. ถ้าผ่านการตรวจสอบ ให้ทำการ Hash Password และ Insert ตามปกติ
        bcrypt.setRandomFallback((len) => {
          const array = Crypto.getRandomValues(new Uint8Array(len));
          return Array.from(array);
        });

        const hashedPassword = bcrypt.hashSync(form.password, 10);

        const { error: insertError } = await supabase.from("vendors").insert({
          prefix: form.prefix,
          email: cleanEmail,
          phone: form.phone,
          password: hashedPassword,
          first_name: form.firstName,
          last_name: form.lastName,
        });

        if (insertError) throw insertError;

        Alert.alert("สำเร็จ", "ลงทะเบียนสำเร็จ กรุณาเข้าสู่ระบบ");
        setForm({ ...form, password: "" });
        setIsLogin(true);
      }
    } catch (err: any) {
      Alert.alert("ข้อผิดพลาด", err.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    // ล้างรหัสผ่านทั้งสองฟอร์มเมื่อมีการสลับหน้า Login/Register
    setForm((prev) => ({ ...prev, password: "" }));
    setFormLogin((prev) => ({ ...prev, password: "" }));
    setShowPassword(false); // ปิดตาด้วย
  }, [isLogin]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>
            <View style={styles.header}>
              {/* ส่วนซ้าย: ปุ่มย้อนกลับ */}
              <TouchableOpacity
                onPress={() => {
                  if (!isLogin) {
                    // ถ้าอยู่หน้าสมัครสมาชิก ให้สลับกลับไปหน้า Login
                    setIsLogin(true);
                  } else {
                    // ถ้าอยู่หน้า Login อยู่แล้ว ให้ย้อนกลับไปหน้าก่อนหน้า (เช่น หน้า Role Selection)
                    router.replace("/");
                  }
                }}
                style={styles.backButton}
              >
                <Ionicons name="chevron-back" size={24} color="black" />
              </TouchableOpacity>

              {/* ส่วนกลาง: ชื่อหน้า */}
              <Text style={styles.headerTitle}>
                {isLogin ? "เข้าสู่ระบบสำหรับผู้ค้า" : "สร้างบัญชีสำหรับผู้ค้า"}
              </Text>

              {/* ส่วนขวา: View เปล่าเพื่อช่วยดัน Text ให้อยู่กลาง (Invisible spacer) */}
              <View style={styles.headerSpacer} />
            </View>
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled" // ช่วยให้กดปุ่มในฟอร์มได้แม้คีย์บอร์ดเปิดอยู่
            >
              {isLogin ? (
                /* --- LOGIN VIEW --- */
                <View style={styles.loginWrapper}>
                  <Image
                    source={require("../../assets/images/31195589_7776215 1.png")} // ใส่รูปภาพประกอบตามในแบบ
                    style={styles.illustration}
                    resizeMode="contain"
                  />
                  <View style={styles.inputContainer}>
                    <Text style={styles.fieldLabel}>
                      อีเมล หรือ เบอร์โทรศัพท์
                    </Text>
                    <TextInput
                      style={styles.input}
                      placeholderTextColor="#94A3B8"
                      value={formLogin.emailOrPhone}
                      onChangeText={(t) =>
                        setFormLogin({
                          ...formLogin,
                          emailOrPhone: t.toLowerCase(),
                        })
                      }
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.fieldLabel}>รหัสผ่าน</Text>
                    <View style={{ justifyContent: "center" }}>
                      <TextInput
                        style={styles.input}
                        secureTextEntry={!showPassword}
                        value={formLogin.password}
                        onChangeText={(t) =>
                          setFormLogin({ ...formLogin, password: t })
                        }
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={[styles.eyeIcon, { top: undefined }]} // ล้างค่า top เดิม
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-outline" : "eye-off-outline"
                          }
                          size={20}
                          color="#64748B"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity style={styles.forgotBtn}>
                    <Text style={styles.forgotText}>ลืมรหัสผ่าน?</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.mainBtn, loading && { opacity: 0.8 }]} // ลดความเข้มปุ่มลงเล็กน้อยตอนโหลด
                    onPress={handleAuth}
                    disabled={loading} // ป้องกันการกดซ้ำขณะโหลด
                  >
                    {loading ? (
                      <ActivityIndicator color="white" /> // แสดงวงกลมหมุนๆ
                    ) : (
                      <Text style={styles.mainBtnText}>เข้าสู่ระบบ</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setIsLogin(false)}
                    style={styles.toggleBtn}
                  >
                    <Text style={styles.toggleText1}>
                      {"ยังไม่มีบัญชี? "}
                      <Text style={styles.toggleText2}>สร้างบัญชี</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* --- REGISTER VIEW --- */
                <View style={styles.registerWrapper}>
                  <Text style={styles.sectionLabel}>
                    เริ่มสมัครใช้งานข้างทาง
                  </Text>

                  <View style={styles.inputContainer}>
                    <Text style={styles.fieldLabel}>คำนำหน้าชื่อ</Text>
                    <TouchableOpacity
                      style={styles.pickerFake}
                      onPress={() => setShowPrefixModal(true)}
                    >
                      <Text style={styles.inputText}>{form.prefix}</Text>
                      <Ionicons name="chevron-down" size={20} color="#64748B" />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.fieldLabel}>ชื่อ</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ระบุชื่อของคุณ"
                      value={form.firstName}
                      onChangeText={(t) => setForm({ ...form, firstName: t })}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.fieldLabel}>นามสกุล</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="ระบุนามสกุลของคุณ"
                      value={form.lastName}
                      onChangeText={(t) => setForm({ ...form, lastName: t })}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.fieldLabel}>หมายเลขโทรศัพท์</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="0XXXXXXXXX"
                      placeholderTextColor="#94A3B8" // กำหนดสีให้ชัดเจนขึ้น
                      keyboardType="phone-pad"
                      value={form.phone}
                      maxLength={10} // จำกัดจำนวนตัวอักษรไว้ที่ 10 หลัก
                      onChangeText={(t) => {
                        // ป้องกันการพิมพ์ตัวอักษรที่ไม่ใช่ตัวเลข (เผื่อกรณีคีย์บอร์ดบางตัวยอมให้พิมพ์)
                        const cleaned = t.replace(/[^0-9]/g, "");
                        setForm({ ...form, phone: cleaned });
                      }}
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.fieldLabel}>อีเมล</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="example@gmail.com"
                      placeholderTextColor="#94A3B8" // กำหนดสีเทาให้เห็นชัดเจน
                      keyboardType="email-address"
                      autoCapitalize="none" // ปิดการขึ้นต้นตัวใหญ่ให้อัตโนมัติ (เหมาะกับอีเมล)
                      autoCorrect={false} // ปิดการแก้คำผิดอัตโนมัติ
                      value={form.email}
                      onChangeText={(t) =>
                        setForm({ ...form, email: t.trim().toLowerCase() })
                      } // trim() เพื่อลบช่องว่างหัว-ท้ายออกอัตโนมัติ
                    />
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.fieldLabel}>รหัสผ่าน</Text>
                    <View style={{ justifyContent: "center" }}>
                      <TextInput
                        style={styles.input}
                        placeholder="ตั้งรหัสผ่านของคุณ (อย่างน้อย 8 ตัวอักษร)"
                        placeholderTextColor="#94A3B8"
                        secureTextEntry={!showPassword}
                        autoCapitalize="none"
                        value={form.password}
                        onChangeText={(t) => setForm({ ...form, password: t })}
                      />
                      <TouchableOpacity
                        onPress={() => setShowPassword(!showPassword)}
                        style={[styles.eyeIcon, { top: undefined }]} // ปรับให้กึ่งกลางแนวตั้งตาม input
                      >
                        <Ionicons
                          name={
                            showPassword ? "eye-outline" : "eye-off-outline"
                          }
                          size={20}
                          color="#64748B"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.mainBtn, loading && { opacity: 0.8 }]}
                    onPress={handleAuth}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <Text style={styles.mainBtnText}>สร้างบัญชี</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ height: Platform.OS === "ios" ? 100 : 40 }} />
            </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      <Modal
        visible={showPrefixModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPrefixModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowPrefixModal(false)}
        >
          <View style={styles.modalContent}>
            <Text
              style={[styles.fieldLabel, { marginBottom: 15, fontSize: 16 }]}
            >
              เลือกคำนำหน้าชื่อ
            </Text>
            {prefixes.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.prefixOption}
                onPress={() => {
                  setForm({ ...form, prefix: item });
                  setShowPrefixModal(false);
                }}
              >
                <Text
                  style={[
                    styles.inputText,
                    form.prefix === item && {
                      color: "#1E293B",
                      fontFamily: "Anuphan-Bold",
                    },
                  ]}
                >
                  {item}
                </Text>
                {form.prefix === item && (
                  <Ionicons name="checkmark" size={20} color="#1E293B" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 5,
  },
  prefixOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between", // ดัน 3 ส่วนให้แยกออกจากกัน
    paddingHorizontal: 16,
    height: 60,
    backgroundColor: "white", // หรือใสตามดีไซน์
    // borderBottomWidth: 1, // เปิดใช้หากต้องการเส้นขีดแบ่งจางๆ
    // borderBottomColor: "#F1F5F9",
  },
  headerTitle: {
    fontFamily: "Anuphan-Bold", // ใช้ Font ตามที่คุณตั้งค่าไว้
    fontSize: 18,
    color: "#000",
    textAlign: "center",
    flex: 1, // ให้ Text กินพื้นที่ตรงกลางทั้งหมด
  },
  backButton: {
    width: 40, // กำหนดความกว้างคงที่เพื่อให้สมดุลกับ Spacer
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerSpacer: {
    width: 40, // ต้องเท่ากับความกว้างของ backButton เพื่อให้ Title อยู่กลางจริงๆ
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  illustration: {
    width: "100%",
    height: 220,
    marginVertical: 20,
  },
  loginWrapper: {
    alignItems: "center",
  },
  registerWrapper: {
    marginTop: 10,
  },
  sectionLabel: {
    fontFamily: "Anuphan-Bold",
    fontSize: 22,
    color: "#000",
    marginBottom: 20,
  },
  fieldLabel: {
    fontFamily: "Anuphan-Regular",
    fontSize: 14,
    color: "#64748B",
    marginBottom: 4,
  },
  inputContainer: {
    width: "100%",
    marginBottom: 16,
    justifyContent: "center", // จัดให้อยู่ตรงกลางแนวตั้งโดยอัตโนมัติ
    position: "relative",
  },

  eyeIcon: {
    position: "absolute",
    right: 16,
    top: 34,
    // หากมี Label (fieldLabel) ให้ใช้ padding-top ของตาให้ตรงกับช่อง Input
    // หรือปรับตามโครงสร้างด้านล่างครับ
  },
  input: {
    width: "100%",
    height: 56,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: "Anuphan-Regular",
    color: "#1E293B",
  },
  inputText: {
    fontSize: 16,
    fontFamily: "Anuphan-Regular",
    color: "#1E293B",
  },
  pickerFake: {
    width: "100%",
    height: 56,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  forgotBtn: {
    alignSelf: "flex-end",
    marginBottom: 30,
  },
  forgotText: {
    fontFamily: "Anuphan-Regular",
    fontSize: 14,
    color: "#64748B",
  },
  mainBtn: {
    width: "100%",
    height: 56,
    backgroundColor: "#205a41", // สีเทาเข้มตามในแบบ
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  mainBtnText: {
    fontFamily: "Anuphan-Bold",
    fontSize: 18,
    color: "white",
  },
  toggleBtn: {
    marginTop: 20,
  },
  toggleText1: {
    fontFamily: "Anuphan-Regular",
    fontSize: 15,
    color: "#64748B",
  },
  toggleText2: {
    fontFamily: "Anuphan-Bold",
    color: "#1E293B",
  },
});
