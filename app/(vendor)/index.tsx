import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  Modal,
  Platform,
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
  const [vendorName, setVendorName] = useState("");
  const [todayCheckinData, setTodayCheckinData] = useState<{
    time: string | null;
    photo: string | null;
  }>({ time: null, photo: null });
  const [todayCheckoutData, setTodayCheckoutData] = useState<{
    time: string | null;
    photo: string | null;
  }>({ time: null, photo: null });
  const [contractStatus, setContractStatus] = useState<string | null>(null);

  const formatThaiTime = (isoString: string | null | undefined) => {
    if (!isoString) return "";

    try {
      const date = new Date(isoString);

      // ตรวจสอบว่า Date ถูกต้องหรือไม่
      if (isNaN(date.getTime())) return "";

      return (
        new Intl.DateTimeFormat("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Bangkok",
        }).format(date) + " น."
      );
    } catch (e) {
      console.error("Error formatting time:", e);
      return "";
    }
  };

  const getThaiDate = () => {
    const now = new Date();
    const options: any = { day: "numeric", month: "short", year: "2-digit" };

    // ใช้ 'th-TH' เพื่อให้เดือนเป็นภาษาไทย และใช้ปีพุทธศักราช
    const formattedDate = new Intl.DateTimeFormat("th-TH", options).format(now);

    return `วันนี้ ${formattedDate}`;
  };

  const fetchVendorName = async () => {
    const { data, error } = await supabase
      .from("vendors")
      .select("first_name")
      .eq("id", vendorId)
      .single();
    console.log("Vendor Name Data:", data, "Error:", error);
    if (data) setVendorName(data.first_name);
  };

  const checkContractStatus = async () => {
    fetchVendorName();
    try {
      setContractLoading(true);

      // 1. Change the query to look for EITHER 'active' OR 'pending'
      const { data, error } = await supabase
        .from("contracts")
        .select(`*, zones (district_name)`)
        .eq("vendor_id", vendorId)
        .in("status", ["active", "pending"]) // Check for both
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (data) {
        // If it's active, they see the full dashboard
        // If it's pending, they still see the "Empty" state but with a different banner
        setHasActiveContract(data.status === "active");
        setContractStatus(data.status); // Store 'pending' or 'active'
        setContractData(data);
        setShopName(data.shop_name);
      } else {
        setHasActiveContract(false);
        setContractStatus(null);
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
        .select("checkin_time, checkout_time, checkin_photo, checkout_photo") // ✅ เพิ่ม checkout_photo
        .eq("vendor_id", vendorId)
        .gte("checkin_time", today.toISOString())
        .maybeSingle();

      if (data) {
        setIsCheckedIn(true);
        setIsCheckedOut(!!data.checkout_time);

        setTodayCheckinData({
          time: data.checkin_time,
          photo: data.checkin_photo,
        });

        // ✅ เก็บข้อมูลเช็คเอาท์ลง State
        setTodayCheckoutData({
          time: data.checkout_time,
          photo: data.checkout_photo,
        });
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

  const getFormattedHeader = () => {
    // 1. Get Today's Date in Thai Format (e.g., 15 มี.ค.)
    const now = new Date();
    const dateStr = new Intl.DateTimeFormat("th-TH", {
      day: "numeric",
      month: "short",
    }).format(now);

    // 2. Get Operating Hours from contractData
    // Assuming your DB columns are named 'start_time' and 'end_time' (e.g., "16:00:00")
    const startTime =
      contractData?.daily_start_time?.substring(0, 5) || "00:00";
    const endTime = contractData?.daily_end_time?.substring(0, 5) || "00:00";

    return `${dateStr} | เวลา ${startTime}-${endTime} น.`;
  };

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
      // ... โค้ด upload เดิมของคุณ ...
      const fileExt = photo.uri.split(".").pop();
      const fileName = `out_${vendorId}_${Date.now()}.${fileExt}`;
      const filePath = `vendor_checks/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("checkins")
        .upload(filePath, decode(photo.base64), {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("checkins").getPublicUrl(filePath);

      const checkoutTimestamp = new Date().toISOString(); // ✅ สร้าง Timestamp
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { error: dbError } = await supabase
        .from("daily_checkins")
        .update({
          checkout_time: checkoutTimestamp,
          checkout_photo: publicUrl,
        })
        .eq("vendor_id", vendorId)
        .gte("checkin_time", today.toISOString())
        .is("checkout_time", null);

      if (dbError) throw dbError;

      // ✅ อัปเดต State ทันทีเพื่อให้รูปโชว์
      setTodayCheckoutData({
        time: checkoutTimestamp,
        photo: publicUrl,
      });

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
      const currentUserId = vendorId;
      const fileExt = photo.uri.split(".").pop();
      const fileName = `${currentUserId}_${Date.now()}.${fileExt}`;
      const filePath = `vendor_checks/${fileName}`;

      // 1. Upload to Storage
      const { error: uploadError } = await supabase.storage
        .from("checkins")
        .upload(filePath, decode(photo.base64), {
          contentType: `image/${fileExt}`,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("checkins").getPublicUrl(filePath);

      // 2. INSERT into daily_checkins
      const checkinTimestamp = new Date().toISOString(); // สร้างเวลาไว้ใช้ร่วมกัน
      const { error: dbError } = await supabase.from("daily_checkins").insert({
        vendor_id: currentUserId,
        checkin_time: checkinTimestamp,
        checkin_photo: publicUrl,
      });

      if (dbError) throw dbError;

      // ✅ 3. อัปเดต State ทันทีเพื่อให้ UI แสดงผลรูปและเวลา
      setContractData((prev: any) => ({
        ...prev,
        last_checkin_photo: publicUrl, // แมพให้ตรงกับ JSX ที่ใช้
        checkin_time: checkinTimestamp,
      }));

      setTodayCheckinData({
        time: checkinTimestamp,
        photo: publicUrl,
      });

      setIsCheckedIn(true);
      Alert.alert("สำเร็จ", "เช็คอินเรียบร้อยแล้ว!");
    } catch (error: any) {
      Alert.alert("Upload Error", error.message);
    } finally {
      setUploading(false);
    }
  };

  if (!hasActiveContract && !contractLoading) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="dark-content"
          translucent
          backgroundColor="transparent"
        />

        {/* Header with Greeting */}
        <View style={styles.safeAreaTop}>
          <View style={styles.headerTopSimple}>
            <Text style={styles.headerTitleDark}>
              สวัสดี {vendorName || "ลีออน"}
            </Text>
            <View style={styles.headerIcons}>
              <TouchableOpacity style={styles.iconCircleSimple}>
                <Ionicons name="notifications-outline" size={22} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconCircleSimple}
                onPress={() => setShowMenu(true)}
              >
                <Ionicons name="settings-outline" size={22} color="#333" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <ScrollView
          style={styles.emptyContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Decorative Registration Card */}
          <View style={styles.registrationBannerContainer}>
            <TouchableOpacity
              activeOpacity={0.9}
              style={styles.registrationBannerButton}
              onPress={() => {
                // Prevent navigating back to form if already pending
                if (contractStatus !== "pending") {
                  router.push({
                    pathname: "/contract-form",
                    params: { vendorId },
                  });
                } else {
                  Alert.alert(
                    "อยู่ระหว่างตรวจสอบ",
                    "คำขอของคุณกำลังได้รับการตรวจสอบโดยเจ้าหน้าที่",
                  );
                }
              }}
            >
              <Image
                source={
                  contractStatus === "pending"
                    ? require("../../assets/images/banner-bg-pending.png") // Your new photo
                    : require("../../assets/images/banner-bg.png") // Original photo
                }
                style={styles.bannerImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          </View>

          {/* Steps Instruction Card */}
          <View style={styles.stepsCard}>
            <View style={styles.stepsHeader}>
              <Text style={styles.stepsHeaderText}>
                ขั้นตอนการขอรับใบอนุญาตฯ
              </Text>
            </View>
            <View style={styles.stepsBody}>
              <View style={styles.stepRow}>
                <View style={styles.stepDotContainer}>
                  <View style={styles.greenDot} />
                  <View style={styles.stepLine} />
                </View>
                <Text style={styles.stepText}>ส่งคำขอผ่านแอปฯ KhangTang</Text>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepDotContainer}>
                  <View style={styles.greenDot} />
                  <View style={styles.stepLine} />
                </View>
                <Text style={styles.stepText}>รอเจ้าหน้าที่ตรวจสอบข้อมูล</Text>
              </View>

              <View style={styles.stepRow}>
                <View style={styles.stepDotContainer}>
                  <View style={styles.greenDot} />
                </View>
                <Text style={styles.stepText}>
                  เจ้าหน้าที่อนุมัติคำขอและออกใบอนุญาตฯ
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Chatbot Floating Button */}
        <TouchableOpacity style={styles.chatBotButton}>
          <Text style={styles.chatBotText}>AI{"\n"}Chat bot</Text>
        </TouchableOpacity>

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
      </View>
    );
  }

  // ตามด้วย return ( เดิมของคุณ...
  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        translucent
        backgroundColor="transparent"
      />

      {/* 1. Profile Header */}
      <View style={styles.safeAreaTop}>
        <View style={styles.headerTopSimple}>
          <Text style={styles.headerTitleDark}>
            สวัสดี {vendorName || "ลีออน"}
          </Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.iconCircleSimple}>
              <Ionicons name="notifications-outline" size={22} color="#333" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.iconCircleSimple}
              onPress={() => setShowMenu(true)}
            >
              <Ionicons name="settings-outline" size={22} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 2. Shop Info Card */}
        <View style={styles.shopCardClean}>
          <Image
            source={{
              uri: contractData?.shop_image || "../../assets/images/shop.png",
            }}
            style={styles.shopImageSmall}
          />
          <View style={styles.shopDetail}>
            <Text style={styles.shopNameText}>
              {contractData?.shop_name || "ชื่อร้านค้า"}
            </Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-sharp" size={14} color="#666" />
              <Text style={styles.locationText}>
                {contractData?.zones?.district_name || "พญาไท"}
              </Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color="#4CD964" />
              <Text style={styles.verifiedText}>ยืนยันตัวตนแล้ว</Text>
            </View>
          </View>
        </View>

        {/* 3. Check-in Section with Green Header */}
        <View style={styles.checkInSection}>
          <View style={styles.greenTimeHeader}>
            <Text style={styles.whiteHeaderText}>{getFormattedHeader()}</Text>
          </View>

          <View style={styles.checkInBody}>
            {/* Check-in Row */}
            {isCheckedIn ? (
              <View style={styles.statusRow}>
                <Ionicons name="checkmark" size={20} color="#00875A" />
                <Text style={styles.statusTextBold}>เช็คอินสำเร็จ</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.dashedActionBox}
                onPress={handleCheckIn}
              >
                <Ionicons name="camera" size={32} color="#666" />
                <Text style={styles.actionLabel}>ถ่ายรูปพื้นที่</Text>
              </TouchableOpacity>
            )}

            {/* Check-out Row */}
            {isCheckedIn &&
              (isCheckedOut ? (
                <View style={styles.statusRow}>
                  <Ionicons name="checkmark" size={20} color="#00875A" />
                  <Text style={styles.statusTextBold}>เช็คเอาท์สำเร็จ</Text>
                </View>
              ) : (
                <View style={styles.checkOutPrompt}>
                  <Text style={styles.promptTitle}>เช็คเอาท์</Text>
                  <TouchableOpacity
                    style={styles.dashedActionBox}
                    onPress={handleCheckOut}
                  >
                    <Ionicons name="camera" size={32} color="#666" />
                    <Text style={styles.actionLabel}>ถ่ายรูปพื้นที่</Text>
                  </TouchableOpacity>
                </View>
              ))}
          </View>
        </View>

        {/* 4. History Link */}
        <TouchableOpacity
          style={styles.historyLinkRow}
          onPress={() =>
            router.push({ pathname: "/history", params: { vendorId } })
          }
        >
          <Text style={styles.historyLinkText}>ประวัติการเช็คอิน</Text>
          <Ionicons name="chevron-forward" size={20} color="#333" />
        </TouchableOpacity>

        {/* 5. Score Section */}
        <View style={styles.scoreCard}>
          <Text style={styles.scoreHeader}>คะแนนร้านค้า</Text>
          <View style={styles.scoreCircleContainer}>
            <View style={styles.progressRing}>
              <Text style={styles.bigScoreText}>100</Text>
              <Text style={styles.scoreSubText}>คะแนน</Text>
            </View>
          </View>
          <View style={styles.statusMessageBar}>
            <Text style={styles.statusMessageText}>status messages</Text>
          </View>
        </View>
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
    </View>
  );
}

const styles = StyleSheet.create({
  checkOutPrompt: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1, // Keep only this one to separate "In" from "Out"
    borderTopColor: "#EEEEEE",
    width: "100%",
  },
  scoreCircleContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 25,
    width: "100%",
  },
  scoreSubText: {
    fontSize: 14,
    color: "#666666",
    fontWeight: "500",
    marginTop: -5, // Pulls the label closer to the big number
  },
  shopCardClean: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    flexDirection: "row",
    marginBottom: 20,
    elevation: 2,
  },
  shopImageSmall: { width: 60, height: 60, borderRadius: 10 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  verifiedText: { color: "#4CD964", fontSize: 12, marginLeft: 4 },

  checkInSection: {
    backgroundColor: "white",
    borderRadius: 15,
    overflow: "hidden",
    marginBottom: 15,
    elevation: 2,
  },
  greenTimeHeader: {
    backgroundColor: "#00875A",
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  whiteHeaderText: { color: "white", fontWeight: "bold", fontSize: 16 },
  checkInBody: { padding: 15 },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    // REMOVE borderBottomWidth if it was here
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  statusTextBold: { fontSize: 16, fontWeight: "bold", marginLeft: 10 },

  dashedActionBox: {
    height: 100,
    borderWidth: 1,
    borderColor: "#ccc",
    borderStyle: "dashed",
    borderRadius: 10,
    backgroundColor: "#f9f9f9",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 10,
  },
  actionLabel: { color: "#666", marginTop: 5 },
  promptTitle: { fontSize: 16, fontWeight: "bold", marginTop: 10 },

  historyLinkRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 15,
    backgroundColor: "white",
    borderRadius: 15,
    marginBottom: 20,
  },
  historyLinkText: { fontWeight: "bold", fontSize: 16 },

  scoreCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
  },
  scoreHeader: { fontWeight: "bold", fontSize: 16, marginBottom: 15 },
  progressRing: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 8,
    borderColor: "#707E94",
    justifyContent: "center",
    alignItems: "center",
  },
  bigScoreText: { fontSize: 40, fontWeight: "bold" },
  statusMessageBar: {
    backgroundColor: "#eee",
    width: "100%",
    padding: 8,
    marginTop: 20,
    borderRadius: 5,
  },
  statusMessageText: { color: "#666", textAlign: "center" },
  pendingOverlay: {
    backgroundColor: "rgba(0,0,0,0.4)",
    padding: 10,
    borderRadius: 10,
  },
  pendingText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
    fontFamily: "Anuphan-Bold", // Using your project font if available
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  emptyContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  registrationBannerContainer: {
    height: 260, // Fixed height for the banner area
    borderRadius: 20,
    overflow: "hidden", // Ensures the image corners are rounded
    marginBottom: 20,
    elevation: 5, // Shadow for Android
    shadowColor: "#000", // Shadow for iOS
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  registrationBannerButton: {
    flex: 1, // Fill the container
    justifyContent: "center",
    alignItems: "center",
  },
  bannerImage: {
    ...StyleSheet.absoluteFillObject, // Makes image fill the entire button area
    width: "100%",
    height: "100%",
  },
  whiteRegisterButtonLabel: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 15,
    alignItems: "center",
    // Make sure it sits above the image
    zIndex: 1,
  },
  whiteRegisterButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginRight: 8,
  },
  headerTopSimple: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
  },
  headerTitleDark: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#000",
  },
  iconCircleSimple: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  registrationBanner: {
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },

  whiteRegisterButton: {
    flexDirection: "row",
    backgroundColor: "white",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },

  stepsCard: {
    backgroundColor: "white",
    borderRadius: 20,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  stepsHeader: {
    backgroundColor: "#00875A", // Green from the photo
    paddingVertical: 12,
    alignItems: "center",
  },
  stepsHeaderText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  stepsBody: {
    padding: 20,
  },
  stepRow: {
    flexDirection: "row",
    minHeight: 50,
  },
  stepDotContainer: {
    alignItems: "center",
    marginRight: 15,
    width: 20,
  },
  greenDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#28a745",
    zIndex: 1,
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#D1D5DB",
    marginVertical: 2,
  },
  stepText: {
    fontSize: 16,
    color: "#374151",
    flex: 1,
    paddingBottom: 20,
  },
  chatBotButton: {
    position: "absolute",
    bottom: 30,
    right: 20,
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#546E7A",
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
  },
  chatBotText: {
    color: "white",
    fontSize: 12,
    textAlign: "center",
    fontWeight: "bold",
  },
  header: {
    backgroundColor: "#707E94",
    paddingHorizontal: 20,
    // ไม่ต้องมี paddingTop เยอะ เพราะเราใช้ SafeAreaView ภายในคุมระยะไว้แล้ว
    paddingBottom: 40,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10, // ปรับระยะห่างจากขอบบนหลังจากพ้น Safe Area มาแล้ว
    marginBottom: 20,
  },
  content: {
    flex: 1,
    // ใช้ค่าติดลบเพื่อให้ Card ร้านค้าลอยทับส่วน Header เล็กน้อยตามดีไซน์เดิม
    marginTop: -25,
    paddingHorizontal: 20,
    paddingTop: 40,
  },
  emptyContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center", // จัดให้อยู่กลางจอ
    marginTop: -40, // ขยับขึ้นไปทับส่วน Header ที่เหลือเล็กน้อย
  },
  emptyCard: {
    backgroundColor: "#E0E0E0", // สีเทาอ่อนตามรูป
    height: 350,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  registerButton: {
    backgroundColor: "white",
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent", // หรือ 'rgba(0,0,0,0.1)' ถ้าอยากให้ฉากหลังมืดลงนิดนึง
  },
  safeAreaTop: {
    // สำหรับ iOS เราจะใช้ค่าประมาณ 44-47 (หรือใช้คลังแสงจริงถ้าลง safe-area-context)
    // สำหรับ Android ใช้ StatusBar.currentHeight
    paddingTop: Platform.OS === "ios" ? 50 : StatusBar.currentHeight,
    backgroundColor: "#FFFFFF",
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
  cameraBoxFilled: {
    padding: 0, // เอา padding ออกเพื่อให้รูปเต็มพื้นที่
    overflow: "hidden",
    borderWidth: 0,
  },
  capturedImage: {
    width: "100%",
    height: "100%",
    borderRadius: 15,
  },
  timeOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // แถบสีดำจางๆ
    paddingVertical: 5,
    alignItems: "center",
  },
  overlayText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  headerTitle: { fontSize: 20, fontWeight: "bold", color: "white" },
  headerIcons: { flexDirection: "row" },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.8)",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
  shopCard: {
    backgroundColor: "white",
    borderRadius: 18,
    padding: 15,
    flexDirection: "row",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  shopImageContainer: {
    width: 70,
    height: 70,
    borderRadius: 12,
    overflow: "hidden",
  },
  shopImage: { width: "100%", height: "100%" },
  shopDetail: { flex: 1, marginLeft: 15 },
  shopNameText: { fontSize: 18, fontWeight: "bold", color: "#000" },
  locationRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  locationText: { fontSize: 13, color: "#666", marginLeft: 4 },
  approvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F2FBF2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  approvedText: { fontSize: 12, color: "#4CD964", fontWeight: "600" },
  checkCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#4CD964",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 5,
  },
  sectionCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 10,
  },
  timeRow: { flexDirection: "row", alignItems: "center" },
  timeText: { fontSize: 16, color: "#333" },
  dateLabelText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 15,
    marginBottom: 10,
  },

  checkInRow: { flexDirection: "row", justifyContent: "space-between" },
  cameraBox: {
    width: "48%",
    height: 150,
    backgroundColor: "#E8EDF2",
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBoxDashed: {
    width: "48%",
    height: 150,
    backgroundColor: "#E8EDF2",
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: "#A0AAB8",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraLabel: { fontSize: 16, fontWeight: "bold", marginTop: 8 },
  cameraSubLabel: { fontSize: 12, color: "#666" },

  scoreTitle: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 20,
  },
  scoreContainer: { alignItems: "center", marginVertical: 10 },
  progressCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    borderColor: "#A0AAB8", // This mimics the circle in the photo
    justifyContent: "center",
    alignItems: "center",
  },
  scoreValue: { fontSize: 40, fontWeight: "bold" },
  scoreUnit: { fontSize: 14, color: "#666" },
  grayBar: {
    height: 20,
    backgroundColor: "#E0E0E0",
    width: "100%",
    marginTop: 20,
    borderRadius: 5,
  },

  historyButton: {
    backgroundColor: "white",
    padding: 18,
    borderRadius: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 40,
  },
  historyText: { fontSize: 16, fontWeight: "bold" },
});
