import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
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
import { supabase } from "../../lib/supabase";

// --- MOCK DATA (You will replace this with real database data later) ---
const DISTRICT_OPTIONS = ["เขตปทุมวัน", "เขตราชเทวี", "เขตบางรัก", "เขตพระนคร", "เขตจตุจักร"];
const ZONE_OPTIONS = ["โซนสยามสแควร์", "โซนอนุสาวรีย์ชัยฯ", "โซนสีลม", "โซนข้าวสาร"];
const VENDOR_OPTIONS = ["V001 - ร้านข้าวมันไก่เฮียชัย", "V002 - ร้านน้ำปั่นเจ๊สม", "V003 - ร้านผลไม้สด"];

export default function OfficerInspectScreen() {
  const router = useRouter();

  // 1. ALL STATES
  const [district, setDistrict] = useState("เลือกเขต");
  const [zone, setZone] = useState("เลือกพื้นที่ทำการค้า");
  const [vendor, setVendor] = useState("เลือกร้าน");
  const [cleanliness, setCleanliness] = useState(null); // Removed TypeScript <number> for now to test
  const [orderliness, setOrderliness] = useState(null);
  const [violations, setViolations] = useState([]);
  const [imageUri, setImageUri] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [notes, setNotes] = useState(""); // Add state for your TextInput

  const [districtOptions, setDistrictOptions] = useState([]);
  const [zoneOptions, setZoneOptions] = useState([]);
  const [vendorOptions, setVendorOptions] = useState([]);

  // 2. THE FETCH LOGIC
  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("Fetching from Supabase...");
        
        // Districts
        const { data: dData } = await supabase.from("zones").select("district");
        if (dData) {
          const unique = [...new Set(dData.map(item => item.district))].filter(Boolean);
          setDistrictOptions(unique);
        }

        // Zones
        const { data: zData } = await supabase.from("zones").select("district_name");
        if (zData) {
          const unique = [...new Set(zData.map(item => item.district_name))].filter(Boolean);
          setZoneOptions(unique);
        }

        // Vendors
        const { data: vData } = await supabase.from("vendors").select("first_name, last_name");
        if (vData) {
          setVendorOptions(vData.map(v => `${v.first_name} ${v.last_name}`));
        }
      } catch (err) {
        console.error("Supabase Error:", err.message);
      }
    };

    loadData();
  }, []);

  // ... keep your violationOptions and the rest of the file exactly as it is!

  const violationOptions = [
    "ตั้งวางสิ่งของเกินเขตหรือนอกจุดที่กำหนด",
    "ทิ้งขยะ/เทน้ำเสีย ลงบนถนนหรือท่อระบายน้ำ",
    "ขายสินค้านอกเวลาที่กำหนด",
    "กีดขวางทางเท้าหรือผิวจราจร",
    "ไม่สวมผ้ากันเปื้อน/หมวกคลุมผม (กรณีอาหาร)",
  ];

  const toggleViolation = (item: string) => {
    if (violations.includes(item)) {
      setViolations(violations.filter((v) => v !== item));
    } else {
      setViolations([...violations, item]);
    }
  };

  const openCamera = async () => {
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

  // --- REUSABLE DROPDOWN COMPONENT ---
  const renderDropdownModal = (type: "district" | "zone" | "vendor", options: string[], currentValue: string, setValue: (val: string) => void) => (
    <Modal
      visible={activeDropdown === type}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setActiveDropdown(null)}
    >
      <TouchableOpacity 
        style={styles.modalOverlay} 
        activeOpacity={1} 
        onPress={() => setActiveDropdown(null)}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>เลือกข้อมูล</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalOption, currentValue === item && styles.modalOptionSelected]}
                onPress={() => {
                  setValue(item);
                  setActiveDropdown(null); // Close modal after selection
                }}
              >
                <Text style={[styles.modalOptionText, currentValue === item && styles.modalOptionTextSelected]}>
                  {item}
                </Text>
                {currentValue === item && <Ionicons name="checkmark" size={20} color="#10B981" />}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

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
          <TouchableOpacity style={styles.dropdown} onPress={() => setActiveDropdown("district")}>
            <Text style={[styles.dropdownText, district !== "เลือกเขต" && styles.dropdownTextActive]}>{district}</Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>พื้นที่ทำการค้า</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setActiveDropdown("zone")}>
            <Text style={[styles.dropdownText, zone !== "เลือกพื้นที่ทำการค้า" && styles.dropdownTextActive]}>{zone}</Text>
            <Ionicons name="chevron-down" size={20} color="#6B7280" />
          </TouchableOpacity>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>ร้าน</Text>
          <TouchableOpacity style={styles.dropdown} onPress={() => setActiveDropdown("vendor")}>
            <Text style={[styles.dropdownText, vendor !== "เลือกร้าน" && styles.dropdownTextActive]}>{vendor}</Text>
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
                <Text style={[styles.ratingText, cleanliness === num && styles.ratingTextSelected]}>{num}</Text>
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
                <Text style={[styles.ratingText, orderliness === num && styles.ratingTextSelected]}>{num}</Text>
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

      {/* RENDER MODALS */}
      {renderDropdownModal("district", districtOptions, district, setDistrict)}
      {renderDropdownModal("zone", zoneOptions, zone, setZone)}
      {renderDropdownModal("vendor", vendorOptions, vendor, setVendor)}

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
  dropdownText: { fontSize: 14, color: "#9CA3AF" },
  dropdownTextActive: { color: "#111827" }, // Changes color when a selection is made

  // Modal Styles
  modalOverlay: {
    flex: 1, backgroundColor: "rgba(0, 0, 0, 0.5)", justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF", borderTopLeftRadius: 20, borderTopRightRadius: 20,
    paddingVertical: 20, paddingHorizontal: 20, maxHeight: "50%",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", color: "#111827", marginBottom: 15, textAlign: "center" },
  modalOption: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  modalOptionSelected: { backgroundColor: "#F0FDF4", borderRadius: 8, paddingHorizontal: 10, borderBottomWidth: 0 },
  modalOptionText: { fontSize: 16, color: "#374151" },
  modalOptionTextSelected: { color: "#10B981", fontWeight: "bold" },

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