import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabase } from "../../lib/supabase";

export default function CheckInHistory() {
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [vendorData, setVendorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { vendorId } = useLocalSearchParams();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);

      // 1. Fetch from 'contracts' to get shop name and image
      const { data: cData } = await supabase
        .from("contracts")
        .select(`shop_name, zones (district_name)`)
        .eq("vendor_id", vendorId)
        .in("status", ["active", "pending"]); // Ensures card shows even if pending
      // .maybeSingle();

      setVendorData(cData);

      // 2. Fetch Check-in History
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .order("checkin_time", { ascending: false })
        .eq("vendor_id", vendorId);

      if (error) throw error;
      setHistory(data || []);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      console.log(vendorData);
      setLoading(false);
    }
  };

  const renderItem = ({ item }: { item: any }) => {
    const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      const options: any = { day: "numeric", month: "short", year: "2-digit" };
      return new Intl.DateTimeFormat("th-TH", options).format(d);
    };

    const formatTime = (timeStr: string | null) => {
      if (!timeStr) return "--:--";
      const d = new Date(timeStr);
      return d.toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    };

    return (
      <View style={styles.dateGroup}>
        <Text style={styles.groupDateText}>
          {formatDate(item.checkin_time)}
        </Text>
        <View style={styles.imageRow}>
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: item.checkin_photo }}
              style={styles.historyImage}
            />
            <View style={styles.timeOverlay}>
              <Text style={styles.overlayText}>
                เช็คอิน: {formatTime(item.checkin_time)} น.
              </Text>
            </View>
          </View>

          <View style={styles.imageContainer}>
            <Image
              source={
                item.checkout_photo
                  ? { uri: item.checkout_photo }
                  : require("../../assets/images/placeholder.svg")
              }
              style={[
                styles.historyImage,
                !item.checkout_photo && { opacity: 0.3 },
              ]}
            />
            <View style={styles.timeOverlay}>
              <Text style={styles.overlayText}>
                เช็คเอาท์: {formatTime(item.checkout_time)} น.
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Navbar */}
      <View style={styles.navbar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="chevron-back" size={28} color="black" />
        </TouchableOpacity>
        <Text style={styles.navbarTitle}>ประวัติการเช็คอิน</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <ActivityIndicator
          size="large"
          color="#00875A"
          style={{ marginTop: 50 }}
        />
      ) : (
        <FlatList
          data={history}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderItem}
          ListHeaderComponent={
            vendorData && (
              <View style={styles.vendorCard}>
                <Image
                  source={require("../../assets/images/shop.png")} // ✅ Correct way for local files
                  style={styles.vendorImage}
                />
                <View style={styles.vendorInfo}>
                  <Text style={styles.vendorName}>
                    {vendorData[0].shop_name}
                  </Text>
                  <View style={styles.locationRow}>
                    <Ionicons name="location-sharp" size={14} color="#666" />
                    <Text style={styles.locationText}>
                      {vendorData[0].zones?.district_name}
                    </Text>
                  </View>
                  {/* The Badge you wanted */}
                  <View style={styles.verifiedBadge}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color="#4CD964"
                    />
                    <Text style={styles.verifiedText}>ยืนยันตัวตนแล้ว</Text>
                  </View>
                </View>
              </View>
            )
          }
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.emptyText}>ไม่มีประวัติการเช็คอิน</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 10,
    paddingBottom: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
  },
  backButton: { padding: 5 },
  navbarTitle: { fontSize: 20, fontWeight: "bold", color: "#000" },

  // Updated Vendor Card to match Dashboard perfectly
  vendorCard: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    marginTop: 20,
    marginBottom: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  vendorImage: { width: 60, height: 60, borderRadius: 10 },
  vendorInfo: { flex: 1, marginLeft: 15, justifyContent: "center" },
  vendorName: { fontSize: 18, fontWeight: "bold", color: "#000" },
  locationRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  locationText: { fontSize: 13, color: "#666", marginLeft: 4 },
  verifiedBadge: { flexDirection: "row", alignItems: "center", marginTop: 5 },
  verifiedText: {
    color: "#4CD964",
    fontSize: 12,
    marginLeft: 4,
    fontWeight: "600",
  },

  // History List
  listContent: { paddingHorizontal: 20, paddingBottom: 40 },
  dateGroup: {
    marginTop: 25,
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
  },
  groupDateText: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  imageRow: { flexDirection: "row", justifyContent: "space-between" },
  imageContainer: {
    width: "48%",
    height: 130,
    borderRadius: 15,
    overflow: "hidden",
    backgroundColor: "#E0E0E0",
  },
  historyImage: { width: "100%", height: "100%" },
  timeOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingVertical: 5,
    alignItems: "center",
  },
  overlayText: { color: "white", fontSize: 12, fontWeight: "bold" },
  emptyText: { textAlign: "center", marginTop: 40, color: "#999" },
});
