import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase"; // ปรับ path ตามโปรเจกต์ของคุณ

export default function CheckInHistory() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { vendorId } = useLocalSearchParams(); // Get the ID from the URL

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      // ดึงข้อมูลประวัติการเช็คอิน เรียงจากใหม่ไปเก่า
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .order("checkin_time", { ascending: false })
        .eq("vendor_id", vendorId); // สมมติว่าคุณมี vendorId จาก context หรือ props

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    // จัดรูปแบบวันที่และเวลา
    const date = new Date(item.checkin_time).toLocaleDateString("th-TH", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
    const checkinTime = new Date(item.checkin_time).toLocaleTimeString(
      "th-TH",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );
    const checkoutTime = item.checkout_time
      ? new Date(item.checkout_time).toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : "--:--";

    return (
      <View style={styles.historyCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.dateText}>{date}</Text>
          <View
            style={[
              styles.statusTag,
              item.checkout_time ? styles.statusDone : styles.statusActive,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.checkout_time
                  ? styles.statusTextDone
                  : styles.statusTextActive,
              ]}
            >
              {item.checkout_time ? "เสร็จสิ้น" : "กำลังดำเนินการ"}
            </Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.timeColumn}>
            <View style={styles.timeRow}>
              <Ionicons name="enter-outline" size={16} color="#4CAF50" />
              <Text style={styles.timeLabel}> เช็คอิน: </Text>
              <Text style={styles.timeValue}>{checkinTime} น.</Text>
            </View>
            <View style={styles.timeRow}>
              <Ionicons name="exit-outline" size={16} color="#FF3B30" />
              <Text style={styles.timeLabel}> เช็คเอาท์: </Text>
              <Text style={styles.timeValue}>{checkoutTime} น.</Text>
            </View>
          </View>

          <View style={styles.imageGallery}>
            <Image
              source={{ uri: item.checkin_photo }}
              style={styles.previewImage}
            />
            {item.checkout_photo && (
              <Image
                source={{ uri: item.checkout_photo }}
                style={styles.previewImage}
              />
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() =>
            router.replace({
              pathname: "/(vendor)",
              params: { vendorId: vendorId },
            })
          }
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>ประวัติการทำงาน</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#F79432"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>ยังไม่มีประวัติการเช็คอิน</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "white",
  },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  listContent: { padding: 20 },
  historyCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingBottom: 10,
    marginBottom: 10,
  },
  dateText: { fontSize: 16, fontWeight: "bold", color: "#333" },
  statusTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusActive: { backgroundColor: "#FFF3E0" },
  statusDone: { backgroundColor: "#E8F5E9" },
  statusText: { fontSize: 12, fontWeight: "bold" },
  statusTextActive: { color: "#F79432" },
  statusTextDone: { color: "#4CAF50" },
  cardBody: { flexDirection: "row", justifyContent: "space-between" },
  timeColumn: { flex: 1 },
  timeRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  timeLabel: { fontSize: 14, color: "#666" },
  timeValue: { fontSize: 14, fontWeight: "600", color: "#333" },
  imageGallery: { flexDirection: "row", gap: 8 },
  previewImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "#EEE",
  },
  emptyText: { textAlign: "center", marginTop: 50, color: "#888" },
});
