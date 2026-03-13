import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker"; // Import Picker
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { supabase } from "../../lib/supabase";

export default function ContractForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [zones, setZones] = useState<{ id: any; name: any }[]>([]); // สำหรับเก็บรายชื่อโซนจาก DB
  const [formData, setFormData] = useState({
    shopName: "",
    productType: "",
    zoneId: "",
    startDate: new Date().toISOString().split("T")[0],
  });
  const { vendorId } = useLocalSearchParams(); // Get the ID from the URL
  // 1. ดึงข้อมูลโซนทั้งหมดมาแสดงใน Dropdown
  useEffect(() => {
    fetchZones();
    console.log("Vendor ID from URL:", vendorId);
  }, []);

  const fetchZones = async () => {
    try {
      const { data, error } = await supabase
        .from("zones")
        .select("id, district_name");

      if (error) {
        console.error("Error fetching zones:", error);
        return;
      }

      if (data) {
        console.log("Fetched Zones:", data); // เช็คว่ามีข้อมูลออกมาไหม
        setZones(
          data.map((zone) => ({
            id: zone.id.toString(), // แปลง ID เป็น string ให้หมด
            name: zone.district_name,
          })),
        );
      }
    } catch (err) {
      console.error("Fetch Zones Exception:", err);
    }
  };

  const handleSubmit = async () => {
    if (!formData.shopName || !formData.productType || !formData.zoneId) {
      Alert.alert("แจ้งเตือน", "กรุณากรอกข้อมูลและเลือกโซนให้ครบถ้วน");
      return;
    }

    // 2. คำนวณ End Date (บวกไป 5 ปีจาก Start Date)
    const start = new Date(formData.startDate);
    const end = new Date(start.setFullYear(start.getFullYear() + 5));
    const endDateString = end.toISOString().split("T")[0];

    setLoading(true);
    try {
      const { error } = await supabase.from("contracts").insert({
        shop_name: formData.shopName,
        product_type: formData.productType,
        vendor_id: vendorId,
        zone_id: formData.zoneId,
        status: "active",
        start_date: formData.startDate,
        end_date: endDateString, // บันทึกวันที่ 5 ปีข้างหน้า
        location: { lat: 13.75, lng: 100.5 }, // หรือดึงพิกัดจากโซนที่เลือก
      });

      if (error) throw error;

      Alert.alert("สำเร็จ", `สัญญาของคุณจะสิ้นสุดในวันที่ ${endDateString}`, [
        {
          text: "ตกลง",
          onPress: () =>
            router.replace({
              pathname: "/(vendor)",
              params: { vendorId: vendorId }, // Pass the ID here
            }),
        },
      ]);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20} // ปรับค่านี้ถ้าต้องการระยะห่างเพิ่ม
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ flexGrow: 1 }} // สำคัญมากเพื่อให้ ScrollView ยืดตัวได้สุด
          showsVerticalScrollIndicator={false}
        >
          {/* --- ส่วน Header เดิม --- */}
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() =>
                router.replace({
                  pathname: "/(vendor)",
                  params: { vendorId: vendorId }, // Pass the ID here
                })
              }
            >
              <Ionicons name="arrow-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>จดทะเบียนสัญญาใหม่</Text>
          </View>

          {/* --- ส่วน Form Section --- */}
          <View style={styles.formSection}>
            <Text style={styles.label}>ชื่อร้านค้า</Text>
            <TextInput
              style={styles.input}
              placeholder="ระบุชื่อร้านของคุณ"
              value={formData.shopName}
              onChangeText={(text) =>
                setFormData({ ...formData, shopName: text })
              }
            />

            <Text style={styles.label}>ประเภทสินค้า</Text>
            <TextInput
              style={styles.input}
              placeholder="เช่น อาหาร, เครื่องดื่ม"
              value={formData.productType}
              onChangeText={(text) =>
                setFormData({ ...formData, productType: text })
              }
            />

            <Text style={styles.label}>เลือกโซนค้าขาย</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={formData.zoneId}
                onValueChange={(itemValue) =>
                  setFormData({ ...formData, zoneId: itemValue })
                }
                mode="dropdown"
                // เพิ่มการกำหนดสีตัวอักษรสำหรับตัวที่ถูกเลือก (หน้าจอหลัก)
                style={{
                  color: "#333", // สีตัวอักษรเข้มเพื่อให้เห็นชัด
                  height: Platform.OS === "ios" ? undefined : 55,
                }}
                dropdownIconColor="#F79432" // เปลี่ยนสีลูกศรให้เข้ากับธีม
              >
                {/* รายการแรก (Placeholder) ให้เป็นสีเทา */}
                <Picker.Item
                  label="-- กรุณาเลือกโซน --"
                  value=""
                  color="#999"
                />

                {/* รายการโซนต่างๆ ให้เป็นสีดำหรือเทาเข้ม */}
                {zones.map((zone) => (
                  <Picker.Item
                    key={zone.id.toString()}
                    label={zone.name}
                    value={zone.id.toString()}
                    color="#333" // กำหนดสีตัวอักษรในรายการที่เด้งขึ้นมา
                  />
                ))}
              </Picker>
            </View>

            {/* เพิ่มช่องว่างด้านล่างเพื่อให้ Scroll พ้นปุ่ม */}
            <View style={{ height: 20 }} />

            <TouchableOpacity
              style={[styles.submitBtn, loading && { opacity: 0.7 }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={styles.submitBtnText}>ยืนยันการทำสัญญา</Text>
              )}
            </TouchableOpacity>

            {/* เผื่อพื้นที่ด้านล่างสุดเมื่อเปิด Keyboard */}
            <View style={{ height: 100 }} />
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    backgroundColor: "white",
    elevation: 2,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", marginLeft: 15 },
  formSection: { padding: 20 },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 8, color: "#555" },
  input: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EEE",
  },
  pickerContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EEE",
    overflow: "hidden",
    justifyContent: "center", // เพิ่มเพื่อให้เนื้อหาอยู่กลาง
    minHeight: 50, // กำหนดความสูงขั้นต่ำ
  },
  infoBox: {
    flexDirection: "row",
    backgroundColor: "#FFF4E5",
    padding: 15,
    borderRadius: 10,
    marginBottom: 25,
    alignItems: "center",
  },
  infoText: { marginLeft: 10, color: "#856404", fontSize: 13, flex: 1 },
  submitBtn: {
    backgroundColor: "#F79432",
    padding: 18,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#F79432",
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  submitBtnText: { color: "white", fontWeight: "bold", fontSize: 16 },
});
