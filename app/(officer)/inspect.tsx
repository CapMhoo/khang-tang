import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function OfficerInspectScreen() {
  const router = useRouter();

  // Form State
  const [district, setDistrict] = useState("เลือกเขต");
  const [zone, setZone] = useState("เลือกพื้นที่ทำการค้า");
  const [vendor, setVendor] = useState("เลือกร้าน");
  const [cleanliness, setCleanliness] = useState<number | null>(null);
  const [orderliness, setOrderliness] = useState<number | null>(null);
  const [violations, setViolations] = useState<string[]>([]);
  const [imageUri, setImageUri] = useState<string | null>(null);

  // List of violations based on Figma
  const violationOptions = [
    "ตั้งวางสิ่งของเกินเขตหรือนอกจุดที่กำหนด",
    "ทิ้งขยะ/เทน้ำเสีย ลงบนถนนหรือท่อระบายน้ำ",
    "ขายสินค้านอกเวลาที่กำหนด",
    "กีดขวางทางเท้าหรือผิวจราจร",
    "ไม่สวมผ้ากันเปื้อน/หมวกคลุมผม (กรณีอาหาร)",
  ];

  // Function to toggle checkboxes
  const toggleViolation = (item: string) => {
    if (violations.includes(item)) {
      setViolations(violations.filter((v) => v !== item));
    } else {
      setViolations([...violations, item]);
    }
  };

  // Function to open the camera
  const openCamera = async () => {
    // Ask for permission first
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (permissionResult.granted === false) {
      alert("You need to allow camera access to take photos.");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (!result.canceled) {
      setImageUri(result.assets[0].uri);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>บันทึกการตรวจสอบ</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* DROPDOWNS */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>เขตที่ทำการค้า</Text>
          <TouchableOpacity style={styles.dropdown}>
            <Text style={styles.dropdownText}>{district}</Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>พื้นที่ทำการค้า</Text>
          <TouchableOpacity style={styles.dropdown}>
            <Text style={styles.dropdownText}>{zone}</Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ร้าน</Text>
          <TouchableOpacity style={styles.dropdown}>
            <Text style={styles.dropdownText}>{vendor}</Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        {/* 1 TO 5 RATING BOXES */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>ความสะอาด</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity
                key={`clean-${num}`}
                style={[styles.ratingBox, cleanliness === num && styles.ratingBoxSelected]}
                onPress={() => setCleanliness(num)}
              >
                <Text style={[styles.ratingText, cleanliness === num && styles.ratingTextSelected]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ความเป็นระเบียบเรียบร้อย</Text>
          <View style={styles.ratingContainer}>
            {[1, 2, 3, 4, 5].map((num) => (
              <TouchableOpacity
                key={`order-${num}`}
                style={[styles.ratingBox, orderliness === num && styles.ratingBoxSelected]}
                onPress={() => setOrderliness(num)}
              >
                <Text style={[styles.ratingText, orderliness === num && styles.ratingTextSelected]}>
                  {num}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* VIOLATION CHECKBOXES */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>การฝ่าฝืน (ถ้ามี)</Text>
          {violationOptions.map((item, index) => (
            <TouchableOpacity key={index} style={styles.checkboxContainer} onPress={() => toggleViolation(item)}>
              <Ionicons
                name={violations.includes(item) ? "checkbox" : "square-outline"}
                size={24}
                color={violations.includes(item) ? "#10B981" : "#D1D5DB"}
              />
              <Text style={styles.checkboxText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* NOTES TEXTBOX */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>บันทึกเพิ่มเติม</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="เพิ่มบันทึก..."
            placeholderTextColor="#9CA3AF"
            multiline={true}
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>

        {/* EVIDENCE CAMERA */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>หลักฐาน</Text>
          <TouchableOpacity style={styles.uploadBox} onPress={openCamera}>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
            ) : (
              <>
                <Ionicons name="camera-outline" size={32} color="#6B7280" />
                <Text style={styles.uploadText}>แตะเพื่อถ่ายรูปหลักฐาน</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* SUBMIT BUTTON */}
        <TouchableOpacity style={styles.submitButton}>
          <Text style={styles.submitButtonText}>บันทึกข้อมูล</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F9FAFB" },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 10, paddingHorizontal: 20, paddingTop: 10,
  },
  backButton: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  headerRight: { width: 42, height: 42 },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40, paddingTop: 10 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  
  // Dropdown Styles
  dropdown: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D1D5DB",
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14,
  },
  dropdownText: { fontSize: 14, color: "#4B5563" },

  // Rating 1-5 Styles
  ratingContainer: { flexDirection: "row", justifyContent: "space-between" },
  ratingBox: {
    width: 55, height: 55, borderWidth: 1, borderColor: "#D1D5DB",
    borderRadius: 8, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center",
  },
  ratingBoxSelected: { backgroundColor: "#10B981", borderColor: "#10B981" },
  ratingText: { fontSize: 18, fontWeight: "600", color: "#374151" },
  ratingTextSelected: { color: "#FFFFFF" },

  // Checkbox Styles
  checkboxContainer: { flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 },
  checkboxText: { fontSize: 14, color: "#374151", flex: 1 },

  // Text Input Styles
  input: {
    backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#D1D5DB",
    borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, color: "#111827",
  },
  textArea: { height: 80, paddingTop: 14 },

  // Camera Styles
  uploadBox: {
    borderWidth: 2, borderColor: "#D1D5DB", borderStyle: "dashed", borderRadius: 8,
    backgroundColor: "#F3F4F6", height: 150, alignItems: "center", justifyContent: "center", gap: 10, overflow: 'hidden'
  },
  uploadText: { fontSize: 14, color: "#6B7280", fontWeight: "500" },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },

  // Button Styles
  submitButton: {
    backgroundColor: "#10B981", borderRadius: 8, paddingVertical: 16,
    alignItems: "center", marginTop: 10,
  },
  submitButtonText: { fontSize: 16, fontWeight: "bold", color: "#FFFFFF" },
});