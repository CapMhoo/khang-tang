import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

export default function OwnerInfoStep({ data, onUpdate }: any) {
  // ฟังก์ชันเลือกคำนำหน้าชื่อ
  const handleSelectTitle = () => {
    Alert.alert(
      "เลือกคำนำหน้าชื่อ",
      "กรุณาเลือกอย่างใดอย่างหนึ่ง",
      [
        // แก้จาก title เป็น prefix
        { text: "นาย", onPress: () => onUpdate({ prefix: "นาย" }) },
        { text: "นาง", onPress: () => onUpdate({ prefix: "นาง" }) },
        { text: "นางสาว", onPress: () => onUpdate({ prefix: "นางสาว" }) },
        { text: "ยกเลิก", style: "cancel" },
      ],
      { cancelable: true },
    );
  };

  const formatIDCard = (text: string) => {
    // 1. ลบทุกอย่างที่ไม่ใช่ตัวเลขออกก่อน
    const cleaned = text.replace(/\D/g, "");

    // 2. ตัดให้เหลือแค่ 13 หลัก
    const limited = cleaned.slice(0, 13);

    // 3. ใส่ขีดตามตำแหน่ง X-XXXX-XXXXX-XX-X
    const parts = [];
    if (limited.length > 0) parts.push(limited.slice(0, 1));
    if (limited.length > 1) parts.push(limited.slice(1, 5));
    if (limited.length > 5) parts.push(limited.slice(5, 10));
    if (limited.length > 10) parts.push(limited.slice(10, 12));
    if (limited.length > 12) parts.push(limited.slice(12, 13));

    return parts.join("-");
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.screen}
      // ปรับ offset ให้พอดีกับ Header ของ ContractFormScreen
      keyboardVerticalOffset={Platform.OS === "ios" ? 120 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        {/* สำคัญ: ใช้ ScrollView แค่ตัวเดียวที่นี่ และจัดการ Padding ด้านล่างให้พ้น Footer */}
        <ScrollView
          style={styles.container}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            {/* คำนำหน้าชื่อ */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>คำนำหน้าชื่อ</Text>
              <TouchableOpacity
                style={styles.dropdown}
                activeOpacity={0.7}
                onPress={handleSelectTitle} // กดแล้วขึ้นตัวเลือก
              >
                <Text
                  style={[styles.inputText, !data.prefix && styles.placeholder]}
                >
                  {data.prefix || "เลือกคำนำหน้าชื่อ"}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#4A5568" />
              </TouchableOpacity>
            </View>

            {/* ชื่อ */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>ชื่อ</Text>
              <TextInput
                style={styles.input}
                placeholder="กรอกชื่อ"
                placeholderTextColor="#A0AEC0"
                value={data.firstName}
                onChangeText={(text) => onUpdate({ firstName: text })}
              />
            </View>

            {/* นามสกุล */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>นามสกุล</Text>
              <TextInput
                style={styles.input}
                placeholder="กรอกนามสกุล"
                placeholderTextColor="#A0AEC0"
                value={data.lastName}
                onChangeText={(text) => onUpdate({ lastName: text })}
              />
            </View>

            {/* หมายเลขโทรศัพท์ */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>หมายเลขโทรศัพท์</Text>
              <TextInput
                style={styles.input}
                placeholder="กรอกเบอร์โทรศัพท์"
                placeholderTextColor="#A0AEC0"
                keyboardType="phone-pad"
                maxLength={10}
                value={data.phone}
                onChangeText={(text) => onUpdate({ phone: text })}
              />
            </View>

            {/* อีเมล */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>อีเมล</Text>
              <TextInput
                style={styles.input}
                placeholder="กรอกอีเมล"
                placeholderTextColor="#A0AEC0"
                keyboardType="email-address"
                autoCapitalize="none"
                value={data.email}
                onChangeText={(text) => onUpdate({ email: text })}
              />
            </View>

            {/* เลขบัตรประชาชน 13 หลัก */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>เลขบัตรประชาชน 13 หลัก</Text>
              <TextInput
                style={styles.input}
                placeholder="X-XXXX-XXXXX-XX-X"
                placeholderTextColor="#A0AEC0"
                keyboardType="number-pad"
                // ขยายเป็น 17 เพื่อรองรับขีด 4 ตัว
                maxLength={17}
                value={data.idCard}
                onChangeText={(text) => {
                  const formatted = formatIDCard(text);
                  onUpdate({ idCard: text });
                }}
              />
            </View>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    // เพิ่ม paddingBottom เยอะหน่อยเพื่อให้เลื่อนพ้นปุ่ม Footer ด้านล่างสุด
    paddingBottom: 150,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: "#1A202C",
    marginBottom: 8,
    fontFamily: "Anuphan-Bold",
    fontWeight: "700",
  },
  input: {
    height: 52,
    borderWidth: 1,
    borderColor: "#EDF2F7",
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
    fontFamily: "Anuphan",
    color: "#1A202C",
  },
  dropdown: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#EDF2F7",
    borderRadius: 8,
    paddingHorizontal: 16,
    backgroundColor: "#FFFFFF",
  },
  inputText: {
    fontSize: 16,
    color: "#1A202C",
    fontFamily: "Anuphan",
  },
  placeholder: {
    color: "#A0AEC0",
  },
});
