import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from "expo-image-picker";
import * as Print from 'expo-print';
import { useRouter } from "expo-router";
import * as Sharing from 'expo-sharing';
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
  View
} from "react-native";
import { supabase } from "../../lib/supabase";

// --- MOCK DATA (You will replace this with real database data later) ---
const DISTRICT_OPTIONS = ["เขตปทุมวัน", "เขตราชเทวี", "เขตบางรัก", "เขตพระนคร", "เขตจตุจักร"];
const ZONE_OPTIONS = ["โซนสยามสแควร์", "โซนอนุสาวรีย์ชัยฯ", "โซนสีลม", "โซนข้าวสาร"];
const VENDOR_OPTIONS = ["V001 - ร้านข้าวมันไก่เฮียชัย", "V002 - ร้านน้ำปั่นเจ๊สม", "V003 - ร้านผลไม้สด"];

export default function OfficerInspectScreen() {
  const router = useRouter();

  // 1. ALL STATES
  const [isReviewing, setIsReviewing] = useState(false);
  const [district, setDistrict] = useState("เลือกเขต");
  const [zone, setZone] = useState("เลือกพื้นที่ทำการค้า");
  const [vendor, setVendor] = useState("เลือกร้าน");
  const [cleanliness, setCleanliness] = useState(null);
  const [orderliness, setOrderliness] = useState(null);
  const [violations, setViolations] = useState([]);
  const [imageUri, setImageUri] = useState(null);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [notes, setNotes] = useState("");

  const [districtOptions, setDistrictOptions] = useState([]);
  const [zoneOptions, setZoneOptions] = useState([]);
  const [vendorOptions, setVendorOptions] = useState([]);

  // 2. THE FETCH LOGIC
  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: dData } = await supabase.from("zones").select("district");
        if (dData) {
          const unique = [...new Set(dData.map(item => item.district))].filter(Boolean);
          setDistrictOptions(unique);
        }
        const { data: zData } = await supabase.from("zones").select("district_name");
        if (zData) {
          const unique = [...new Set(zData.map(item => item.district_name))].filter(Boolean);
          setZoneOptions(unique);
        }
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

  const violationOptions = [
    "ตั้งวางสิ่งของเกินเขตหรือนอกจุดที่กำหนด",
    "ทิ้งขยะ/เทน้ำเสีย ลงบนถนนหรือท่อระบายน้ำ",
    "ขายสินค้านอกเวลาที่กำหนด",
    "กีดขวางทางเท้าหรือผิวจราจร",
    "ไม่สวมผ้ากันเปื้อน/หมวกคลุมผม (กรณีอาหาร)",
  ];

  const toggleViolation = (item) => {
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

  const renderDropdownModal = (type, options, currentValue, setValue) => (
    <Modal visible={activeDropdown === type} transparent={true} animationType="fade">
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setActiveDropdown(null)}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>เลือกข้อมูล</Text>
          <FlatList
            data={options}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[styles.modalOption, currentValue === item && styles.modalOptionSelected]}
                onPress={() => { setValue(item); setActiveDropdown(null); }}
              >
                <Text style={[styles.modalOptionText, currentValue === item && styles.modalOptionTextSelected]}>{item}</Text>
                {currentValue === item && <Ionicons name="checkmark" size={20} color="#10B981" />}
              </TouchableOpacity>
            )}
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const generatePDF = async () => {
    let base64Image = "";

    if (imageUri) {
      try {
        // Use the legacy FileSystem to read the file
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64, // Or "base64"
        });
        base64Image = `data:image/jpeg;base64,${base64}`;
      } catch (e) {
        console.error("Error reading image for PDF:", e);
      }
    }

    const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica'; padding: 20px; color: #333; }
            h1 { text-align: center; color: #10B981; }
            .card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 15px; margin-bottom: 10px; }
            .label { font-size: 10px; color: #6B7280; font-weight: bold; text-transform: uppercase; }
            .value { font-size: 16px; margin-top: 4px; }
            .img-container { text-align: center; margin-top: 20px; }
            .evidence-img { width: 100%; max-height: 400px; border-radius: 12px; }
          </style>
        </head>
        <body>
          <h1>Inspection Report</h1>
          <div class="card">
            <p class="label">Location</p>
            <p class="value">${district} - ${zone}</p>
          </div>
          <div class="card">
            <p class="label">Vendor</p>
            <p class="value">${vendor}</p>
          </div>
          <div class="card">
            <p class="label">Scores</p>
            <p class="value">Cleanliness: ${cleanliness}/5 | Order: ${orderliness}/5</p>
          </div>
          <div class="card">
            <p class="label">Notes</p>
            <p class="value">${notes || "No additional notes"}</p>
          </div>
          ${base64Image ? `
            <div class="img-container">
              <p class="label">Evidence Photo</p>
              <img src="${base64Image}" class="evidence-img" />
            </div>
          ` : ''}
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      alert("PDF Error: " + error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* HEADER */}
      <View style={styles.header}>
        <Pressable onPress={() => isReviewing ? setIsReviewing(false) : router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>{isReviewing ? "ตรวจสอบข้อมูลก่อนบันทึก" : "บันทึกการตรวจสอบ"}</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
  {!isReviewing ? (
    <View>
      {/* 1. DROPDOWNS (District, Zone, Vendor) */}
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

      {/* 2. RATINGS */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>ความสะอาด</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((num) => (
            <TouchableOpacity key={`c-${num}`} style={[styles.ratingBox, cleanliness === num && styles.ratingBoxSelected]} onPress={() => setCleanliness(num)}>
              <Text style={[styles.ratingText, cleanliness === num && styles.ratingTextSelected]}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>ความเป็นระเบียบเรียบร้อย</Text>
        <View style={styles.ratingContainer}>
          {[1, 2, 3, 4, 5].map((num) => (
            <TouchableOpacity key={`o-${num}`} style={[styles.ratingBox, orderliness === num && styles.ratingBoxSelected]} onPress={() => setOrderliness(num)}>
              <Text style={[styles.ratingText, orderliness === num && styles.ratingTextSelected]}>{num}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* 3. VIOLATIONS */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>การฝ่าฝืน (ถ้ามี)</Text>
        {violationOptions.map((item, index) => (
          <TouchableOpacity key={index} style={styles.checkboxContainer} onPress={() => toggleViolation(item)}>
            <Ionicons name={violations.includes(item) ? "checkbox" : "square-outline"} size={24} color={violations.includes(item) ? "#10B981" : "#D1D5DB"} />
            <Text style={styles.checkboxText}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 4. CAMERA */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>หลักฐาน</Text>
        <TouchableOpacity style={styles.uploadBox} onPress={openCamera}>
          {imageUri ? <Image source={{ uri: imageUri }} style={styles.previewImage} /> : (
            <>
              <Ionicons name="camera-outline" size={32} color="#6B7280" />
              <Text style={styles.uploadText}>แตะเพื่อถ่ายรูปหลักฐาน</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* 5. NOTES INPUT (Interactive here!) */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>บันทึกเพิ่มเติม</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="ระบุรายละเอียดเพิ่มเติม..."
          placeholderTextColor="#9CA3AF"
          multiline={true}
          numberOfLines={4}
          textAlignVertical="top"
          value={notes}
          onChangeText={(text) => setNotes(text)}
        />
      </View>

      <TouchableOpacity style={styles.submitButton} onPress={() => setIsReviewing(true)}>
        <Text style={styles.submitButtonText}>ถัดไป</Text>
      </TouchableOpacity>
    </View>
  ) : (
    /* --- REVIEW MODE (Read-only cards) --- */
    <View>
      <Text style={styles.reviewTitle}>สรุปข้อมูลการตรวจสอบ</Text>
      
      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>เขต / พื้นที่ทำการค้า</Text>
        <Text style={styles.reviewValue}>{district} — {zone}</Text>
      </View>
      
      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>ร้านค้าที่ตรวจสอบ</Text>
        <Text style={styles.reviewValue}>{vendor}</Text>
      </View>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>คะแนนการประเมิน</Text>
        <Text style={styles.reviewValue}>ความสะอาด: {cleanliness || 0}/5</Text>
        <Text style={styles.reviewValue}>ความเป็นระเบียบ: {orderliness || 0}/5</Text>
      </View>

      {violations.length > 0 && (
        <View style={styles.reviewCard}>
          <Text style={styles.reviewLabel}>รายการฝ่าฝืน</Text>
          {violations.map((v, i) => (
            <Text key={i} style={[styles.reviewValue, { color: '#EF4444', fontSize: 14 }]}>• {v}</Text>
          ))}
        </View>
      )}

      {/* REVIEW NOTES (Displaying the text typed earlier) */}
      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>บันทึกเพิ่มเติม</Text>
        <Text style={styles.reviewValue}>{notes || "ไม่มีบันทึกเพิ่มเติม"}</Text>
      </View>

      {imageUri && (
        <View style={styles.reviewCard}>
          <Text style={styles.reviewLabel}>หลักฐานภาพถ่าย</Text>
          <Image source={{ uri: imageUri }} style={{ width: '100%', height: 220, borderRadius: 12, marginTop: 8 }} resizeMode="cover" />
        </View>
      )}

      {/* PDF EXPORT BUTTON */}
      <TouchableOpacity 
        style={[styles.submitButton, { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#10B981", marginTop: 20, flexDirection: 'row' }]} 
        onPress={generatePDF}
      >
        <Ionicons name="document-text-outline" size={20} color="#10B981" style={{ marginRight: 8 }} />
        <Text style={[styles.submitButtonText, { color: "#10B981" }]}>ตัวอย่างแบบฟอร์มคำขอ</Text>
      </TouchableOpacity>

      {/* FINAL SAVE BUTTON */}
      <TouchableOpacity 
        style={[styles.submitButton, { backgroundColor: "#1E293B", marginTop: 10 }]} 
        onPress={() => alert("บันทึกสำเร็จ!")}
      >
        <Text style={styles.submitButtonText}>ยืนยันและบันทึกข้อมูล</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => setIsReviewing(false)} style={styles.backLink}>
        <Text style={{ textAlign: 'center', color: '#6B7280', fontWeight: '600' }}>ย้อนกลับไปแก้ไข</Text>
      </TouchableOpacity>
    </View>
  )}
</ScrollView>

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

  // --- Review Mode Styles ---
  reviewTitle: { 
    fontSize: 20, 
    fontWeight: "800", 
    color: "#111827", 
    marginBottom: 20,
    marginTop: 5 
  },
  reviewCard: { 
    backgroundColor: "#FFFFFF", 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    // Add a slight shadow for that Figma look
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewLabel: { 
    fontSize: 12, 
    fontWeight: "600", 
    color: "#6B7280", 
    textTransform: "uppercase", 
    letterSpacing: 0.5,
    marginBottom: 4 
  },
  reviewValue: { 
    fontSize: 16, 
    color: "#111827", 
    fontWeight: "500" 
  },
  backLink: {
    paddingVertical: 15,
    marginTop: 5,
  },
});