import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function VendorDashboard() {
  const [uploading, setUploading] = useState(false);
  const { vendorId } = useLocalSearchParams(); // Get the ID from the URL
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [isCheckedOut, setIsCheckedOut] = useState(false);
  const router = useRouter();
  const [hasActiveContract, setHasActiveContract] = useState(false);
  const [contractLoading, setContractLoading] = useState(true);
  const [shopName, setShopName] = useState("");
  const [contractData, setContractData] = useState<any>(null);

  const checkContractStatus = async () => {
    try {
      setContractLoading(true);
      const today = new Date().toISOString().split("T")[0];

      // ดึงข้อมูลพร้อม Join กับ zones เพื่อเอา district_name
      const { data, error } = await supabase
        .from("contracts")
        .select(
          `
        *,
        zones (district_name)
      `,
        )
        .eq("vendor_id", vendorId)
        .eq("status", "active")
        .gte("end_date", today)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (data) {
        setHasActiveContract(true);
        setContractData(data); // เก็บข้อมูลทั้งหมดไว้ใน state เดียว
        setShopName(data.shop_name);
      } else {
        setHasActiveContract(false);
      }
    } catch (error) {
      console.error("Contract check error:", error);
    } finally {
      setContractLoading(false);
    }
  };

  const checkTodayStatus = async () => {
    try {
      if (!vendorId || vendorId === "undefined") return;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data, error } = await supabase
        .from("daily_checkins")
        .select("id, checkin_time, checkout_time") // ดึง checkout_time มาตรวจสอบด้วย
        .eq("vendor_id", vendorId)
        .gte("checkin_time", today.toISOString())
        .maybeSingle(); // ใช้ maybeSingle แทน single เพื่อป้องกัน Error กรณีไม่พบข้อมูลเลย

      if (data) {
        // 1. ถ้ามีข้อมูลแถวของวันนี้ แสดงว่าเช็คอินแล้ว
        setIsCheckedIn(true);

        // 2. ถ้า checkout_time ไม่เป็น null แสดงว่าเช็คเอาท์แล้ว
        if (data.checkout_time) {
          setIsCheckedOut(true);
        } else {
          setIsCheckedOut(false);
        }
      } else {
        // กรณีไม่พบข้อมูลเลย (ยังไม่ได้เริ่มเช็คอิน)
        setIsCheckedIn(false);
        setIsCheckedOut(false);
      }
    } catch (error) {
      console.log("Error checking status:", error);
    }
  };

  // ใช้ useEffect เพื่อให้ทำงานทันทีที่หน้าจอโหลด
  React.useEffect(() => {
    if (vendorId) {
      checkTodayStatus();
      checkContractStatus();
    }
  }, [vendorId]);

  const handleCheckIn = async () => {
    // 1. USE ImagePicker instead of Camera
    const { status } = await ImagePicker.requestCameraPermissionsAsync();

    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Sorry, we need camera permissions to make this work!",
      );
      return;
    }

    // 2. Now launch the camera
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1], // Square photos are great for profile/check-in pics
      quality: 0.5, // Keeps the file small for your hotspot upload
      base64: true,
    });

    if (!result.canceled) {
      // Pass the asset to your upload function
      uploadImage(result.assets[0]);
    }
  };

  const handleCheckOut = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Denied", "ต้องการกล้องเพื่อเช็คเอาท์");
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled) {
      uploadCheckoutImage(result.assets[0]);
    }
  };

  const uploadCheckoutImage = async (photo: any) => {
    setUploading(true);
    try {
      const fileExt = photo.uri.split(".").pop();
      const fileName = `out_${vendorId}_${Date.now()}.${fileExt}`;
      const filePath = `vendor_checks/${fileName}`;

      // 1. Upload รูป
      const { error: uploadError } = await supabase.storage
        .from("checkins")
        .upload(filePath, decode(photo.base64), {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("checkins").getPublicUrl(filePath);

      // 2. Update แถวของวันนี้ (หาแถวที่ยังไม่มี checkout_time)
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { error: dbError } = await supabase
        .from("daily_checkins")
        .update({
          checkout_time: new Date().toISOString(),
          checkout_photo: publicUrl,
        })
        .eq("vendor_id", vendorId)
        .gte("checkin_time", today.toISOString())
        .is("checkout_time", null); // ป้องกันการทับข้อมูลเดิม

      if (dbError) throw dbError;

      setIsCheckedOut(true);
      Alert.alert("สำเร็จ", "เช็คเอาท์เรียบร้อยแล้ว ขอบคุณที่ใช้บริการค่ะ!");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setUploading(false);
    }
  };

  const uploadImage = async (photo: any) => {
    setUploading(true);
    try {
      // 1. Get vendorId (Passed via router params or global state)
      // Make sure this is a valid UUID string
      const currentUserId = vendorId;

      // 2. Prepare Storage path
      const fileExt = photo.uri.split(".").pop();
      const fileName = `${currentUserId}_${Date.now()}.${fileExt}`;
      const filePath = `vendor_checks/${fileName}`;

      // 3. Upload to Storage (Ensure 'anon' policy is set to INSERT for 'checkins' bucket)
      const { error: uploadError } = await supabase.storage
        .from("checkins")
        .upload(filePath, decode(photo.base64), {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) throw uploadError;

      // 4. Get Public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("checkins").getPublicUrl(filePath);

      // 5. INSERT into daily_checkins (Matches your SQL schema)
      const { error: dbError } = await supabase.from("daily_checkins").insert({
        vendor_id: currentUserId,
        checkin_time: new Date().toISOString(), // Sets the timestamp for now
        checkin_photo: publicUrl,
        // checkout_time and checkout_photo stay null until they check out
      });

      if (dbError) throw dbError;

      setIsCheckedIn(true); // เพิ่มบรรทัดนี้
      Alert.alert("สำเร็จ", "เช็คอินและบันทึกข้อมูลเรียบร้อยแล้ว!");
    } catch (error: any) {
      Alert.alert("Upload Error", error.message);
      console.error(error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* 1. Header Section */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.brandText}>ข้างทาง</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity>
              <Ionicons name="notifications-outline" size={24} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
              style={{ marginLeft: 15 }}
              onPress={() => setShowMenu(true)}
            >
              <Ionicons name="settings-outline" size={24} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Profile Card / Contract Status */}
        {contractLoading ? (
          <View style={[styles.profileCard, { justifyContent: "center" }]}>
            <ActivityIndicator color="white" />
          </View>
        ) : hasActiveContract ? (
          /* กรณีมีสัญญา: โชว์ข้อมูลร้านแบบเดิม (แต่เปลี่ยนข้อมูลให้ดึงจาก DB จริง) */
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <MaterialCommunityIcons
                name="storefront"
                size={30}
                color="#FF9F43"
              />
            </View>
            <View style={styles.profileInfo}>
              {/* 1. ชื่อร้านจากสัญญา */}
              <Text style={styles.vendorName}>
                {contractData?.shop_name || "ไม่ระบุชื่อร้าน"}
              </Text>

              {/* 2. ประเภทสินค้าจากสัญญา */}
              <Text style={styles.ownerName}>
                ขาย: {contractData?.product_type || "-"}
              </Text>

              <View style={styles.locationRow}>
                <Ionicons name="location-sharp" size={14} color="white" />
                {/* 3. ดึงชื่อโซนที่ Join มา และแสดงรายละเอียดจาก jsonb location (ถ้ามี) */}
                <Text style={styles.locationText}>
                  {` ${contractData?.zones?.district_name || "ไม่ระบุโซน"}`}
                </Text>
              </View>
            </View>

            {/* 4. สถานะสัญญาจากฐานข้อมูล */}
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    contractData?.status === "active"
                      ? "rgba(76, 217, 100, 0.2)"
                      : "rgba(255, 59, 48, 0.2)",
                },
              ]}
            >
              <Ionicons
                name={
                  contractData?.status === "active"
                    ? "checkmark-circle"
                    : "alert-circle"
                }
                size={14}
                color={
                  contractData?.status === "active" ? "#4CD964" : "#FF3B30"
                }
              />
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color:
                      contractData?.status === "active" ? "#4CD964" : "#FF3B30",
                  },
                ]}
              >
                {contractData?.status === "active"
                  ? " อนุมัติแล้ว"
                  : " รอตรวจสอบ"}
              </Text>
            </View>
          </View>
        ) : (
          /* กรณีไม่มีสัญญา: โชว์ปุ่มลงทะเบียนที่ดูเด่นสะดุดตา */
          <View style={styles.noContractCard}>
            <View style={styles.warningIconContainer}>
              <Ionicons name="alert-circle" size={40} color="#FF3B30" />
            </View>

            <View style={styles.profileInfo}>
              <Text style={[styles.vendorName, { color: "#FF3B30" }]}>
                ยังไม่มีสัญญาค้าขาย
              </Text>
              <Text style={styles.locationText}>
                กรุณาลงทะเบียนเพื่อเริ่มใช้งานระบบ
              </Text>
            </View>

            {/* ปุ่มลงทะเบียนแยกเฉพาะจุด */}
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                router.replace({
                  pathname: "/contract-form",
                  params: { vendorId: vendorId }, // Pass the ID here
                })
              } // ไปที่หน้าฟอร์มใหม่
            >
              <Text style={styles.actionBtnText}>ลงทะเบียน</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* สร้าง View ครอบส่วนเนื้อหาทั้งหมดที่ต้องการล็อค */}
        <View
          pointerEvents={hasActiveContract ? "auto" : "none"} // ถ้าไม่มีสัญญา จะกดอะไรไม่ได้เลย
          style={!hasActiveContract && { opacity: 0.4 }} // ถ้าไม่มีสัญญา จะทำให้ดูจางลง
        >
          {/* 2. Today's Status Section */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionTitle}>สถานะวันนี้</Text>
                <Text style={styles.sectionSubtitle}>
                  <Ionicons name="time-outline" /> 10:00 - 20:00
                </Text>
              </View>

              {/* ส่วนที่เปลี่ยนตามสถานะ */}
              <View
                style={[
                  styles.checkInStatus,
                  isCheckedIn &&
                    !isCheckedOut && { backgroundColor: "#E8F5E9" },
                  isCheckedOut && { backgroundColor: "#FFEBEE" }, // สีแดงอ่อนเมื่อเช็คเอาท์
                ]}
              >
                <Text
                  style={[
                    styles.checkInStatusText,
                    isCheckedIn && !isCheckedOut && { color: "#4CAF50" },
                    isCheckedOut && { color: "#FF3B30" },
                  ]}
                >
                  {isCheckedOut
                    ? "เลิกขายแล้ว"
                    : isCheckedIn
                      ? "กำลังขาย"
                      : "ยังไม่เช็คอิน"}
                </Text>
              </View>
            </View>

            <View style={styles.buttonRow}>
              {/* Check-In Button */}
              <TouchableOpacity
                style={[
                  styles.checkInButton,
                  (uploading || isCheckedIn) && {
                    backgroundColor: "#A0A0A0",
                    opacity: 0.7,
                  }, // เทาเมื่อเช็คอินแล้ว
                ]}
                onPress={handleCheckIn}
                disabled={uploading || isCheckedIn} // ปิดปุ่มถ้าเช็คอินแล้ว
              >
                <Ionicons name="camera-outline" size={32} color="white" />
                <Text style={styles.buttonTextBold}>
                  {isCheckedIn
                    ? "เช็คอินแล้ว"
                    : uploading
                      ? "กำลัง..."
                      : "เช็คอิน"}
                </Text>
                <Text style={styles.buttonSubText}>ถ่ายรูปพื้นที่</Text>
              </TouchableOpacity>

              {/* Check-Out Button */}
              <TouchableOpacity
                style={[
                  styles.checkOutButton,
                  (!isCheckedIn || isCheckedOut) && { opacity: 0.5 }, // จางถ้ายังไม่เช็คอิน หรือเช็คเอาท์ไปแล้ว
                  isCheckedIn &&
                    !isCheckedOut && { backgroundColor: "#FF3B30" }, // แดงเด่นเมื่อพร้อมให้เช็คเอาท์
                ]}
                onPress={handleCheckOut}
                disabled={uploading || !isCheckedIn || isCheckedOut} // กดได้เฉพาะตอนเช็คอินแล้วแต่ยังไม่เช็คเอาท์
              >
                <Ionicons
                  name="close-circle-outline"
                  size={32}
                  color={isCheckedIn && !isCheckedOut ? "white" : "#A0A0A0"}
                />
                <Text
                  style={[
                    styles.buttonTextBold,
                    {
                      color: isCheckedIn && !isCheckedOut ? "white" : "#A0A0A0",
                    },
                  ]}
                >
                  เช็คเอาท์
                </Text>
                <Text
                  style={[
                    styles.buttonSubText,
                    {
                      color: isCheckedIn && !isCheckedOut ? "white" : "#A0A0A0",
                    },
                  ]}
                >
                  เลิกขาย
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* 3. Menu List */}
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push("/zone-map")}
          >
            <View
              style={[styles.menuIconContainer, { backgroundColor: "#FFF4E5" }]}
            >
              <Ionicons name="location" size={20} color="#FF9F43" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text>ดูแผนที่โซนค้าขาย</Text>
              <Text style={styles.menuSubtitle}>ค้นหาและจองพื้นที่ใหม่</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() =>
              router.replace({
                pathname: "/history",
                params: { vendorId: vendorId }, // Pass the ID here
              })
            }
          >
            <View
              style={[styles.menuIconContainer, { backgroundColor: "#E0F7F9" }]}
            >
              <Ionicons name="calendar" size={20} color="#26C6DA" />
            </View>
            <View style={styles.menuTextContainer}>
              <Text style={styles.menuTitle}>ประวัติการเช็คอิน</Text>
              <Text style={styles.menuSubtitle}>ดูบันทึกการทำงาน</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
          </TouchableOpacity>

          {/* 4. Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statValue}>28</Text>
              <Text style={styles.statLabel}>วันเช็คอินเดือนนี้</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={[styles.statValue, { color: "#00C853" }]}>100%</Text>
              <Text style={styles.statLabel}>อัตราการปฏิบัติตาม</Text>
            </View>
          </View>

          {/* 5. Weekly Schedule */}
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>กำหนดการสัปดาห์นี้</Text>
            <View style={styles.scheduleItem}>
              <Text style={styles.dayText}>จ.</Text>
              <View style={styles.progressBarContainer}>
                <View style={styles.progressBarFill} />
              </View>
              <Text style={styles.timeText}>10:00 - 20:00</Text>
            </View>
          </View>
        </View>
        {!hasActiveContract && !contractLoading && (
          <View style={styles.lockOverlayTextContainer}>
            <Ionicons name="lock-closed" size={30} color="#666" />
            <Text style={styles.lockText}>
              กรุณาทำสัญญาค้าขายเพื่อเปิดใช้งานระบบ
            </Text>
          </View>
        )}
      </ScrollView>
      <Modal
        transparent={true}
        visible={showMenu}
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={styles.dropdownMenu}>
            <TouchableOpacity
              style={styles.menuOption}
              onPress={() => {
                setShowMenu(false);
                router.replace("/vendor-auth");
              }}
            >
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
              <Text style={styles.logoutText}>ออกจากระบบ</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent", // หรือ 'rgba(0,0,0,0.1)' ถ้าอยากให้ฉากหลังมืดลงนิดนึง
  },
  dropdownMenu: {
    position: "absolute",
    top: 60, // ปรับระยะให้พอดีกับปุ่มด้านบน
    right: 20,
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 10,
    width: 150,
    // เงาเพื่อให้ดูมีมิติ (Elevation)
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  menuOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  logoutText: {
    marginLeft: 10,
    fontSize: 16,
    color: "#FF3B30", // สีแดงเพื่อให้สื่อถึงการ Logout
    fontWeight: "500",
  },
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    backgroundColor: "#FF9F43",
    paddingHorizontal: 20,
    paddingBottom: 30,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  brandText: { fontSize: 22, fontWeight: "bold", color: "white" },
  headerIcons: { flexDirection: "row" },
  profileCard: { flexDirection: "row", alignItems: "center" },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFEBD2",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: { flex: 1, marginLeft: 15 },
  vendorName: { fontSize: 20, fontWeight: "bold", color: "white" },
  ownerName: { fontSize: 14, color: "rgba(255,255,255,0.8)" },
  locationRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  locationText: { fontSize: 12, color: "white" },
  statusBadge: {
    backgroundColor: "rgba(255,255,255,0.3)",
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    position: "absolute",
    right: 0,
    top: 10,
  },
  statusBadgeText: { fontSize: 10, color: "#4CD964", fontWeight: "bold" },
  content: { flex: 1, paddingHorizontal: 20, marginTop: -20 },
  sectionCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  sectionSubtitle: { fontSize: 14, color: "#666", marginTop: 5 },
  checkInStatus: {
    backgroundColor: "#EFEFEF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  checkInStatusText: { fontSize: 12, color: "#888" },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 15, // Creates consistent space between buttons
    width: "100%",
  },
  checkInButton: {
    flex: 1, // Take up half the row
    backgroundColor: "#F79432",
    height: 140,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  checkOutButton: {
    flex: 1, // Take up half the row
    backgroundColor: "#F5F5F5",
    height: 140,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
    // Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonTextBold: {
    color: "#FFFFFF",
    fontSize: 18, // Slightly smaller to ensure no text wrapping
    fontWeight: "bold",
    marginTop: 8,
  },
  buttonSubText: {
    color: "#FFFFFF",
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
  },
  buttonTextSmall: { fontSize: 12, color: "white", opacity: 0.9 },
  menuItem: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  menuTextContainer: { flex: 1, marginLeft: 15 },
  menuTitle: { fontSize: 16, fontWeight: "600" },
  menuSubtitle: { fontSize: 12, color: "#888" },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  statBox: {
    backgroundColor: "white",
    width: "48%",
    borderRadius: 15,
    padding: 20,
    alignItems: "flex-start",
  },
  statValue: { fontSize: 28, fontWeight: "bold", color: "#FF9F43" },
  statLabel: { fontSize: 12, color: "#888", marginTop: 5 },
  scheduleItem: { flexDirection: "row", alignItems: "center", marginTop: 15 },
  dayText: { width: 25, fontSize: 14, fontWeight: "600" },
  progressBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: "#EEE",
    borderRadius: 4,
    marginHorizontal: 10,
  },
  progressBarFill: {
    width: "70%",
    height: "100%",
    backgroundColor: "#FF9F43",
    borderRadius: 4,
  },
  timeText: { fontSize: 12, color: "#666" },
  noContractCard: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.95)", // สีขาวนวลตัดกับ Header สีส้ม
    borderRadius: 15,
    padding: 15,
    marginTop: 15,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FF3B30", // สีแดงเตือนให้ทำสัญญา
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 8,
  },
  warningIconContainer: {
    marginRight: 15,
  },
  actionBtn: {
    backgroundColor: "#FF3B30",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionBtnText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  lockOverlayTextContainer: {
    position: "absolute",
    top: 100, // ปรับตามความเหมาะสม
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  lockText: {
    marginTop: 10,
    fontSize: 14,
    color: "#444",
    textAlign: "center",
    fontWeight: "600",
    backgroundColor: "rgba(255,255,255,0.8)",
    padding: 10,
    borderRadius: 10,
  },
});
