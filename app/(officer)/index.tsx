import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

type Zone = {
  id: string;
  district: string;
};

const MENU_WIDTH = 170;

export default function OfficerHomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ officerName?: string }>();
  const officerName = params.officerName || "ลีออน";

  const settingsBtnRef = useRef<any>(null);
  const [settingsMenu, setSettingsMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Animation values
  const mapScale = useRef(new Animated.Value(1)).current;
  const traffyScale = useRef(new Animated.Value(1)).current;

  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [selectedDistrictIndex, setSelectedDistrictIndex] = useState(0);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalVendors: 0,
    inspectedVendorsToday: 0,
    checkinVendorsToday: 0,
    lowScoreShops: 0,
    avgScore: 0,
  });

  // Scale Animation Helpers
  const animateIn = (val: Animated.Value) => {
    Animated.spring(val, { toValue: 0.97, useNativeDriver: true }).start();
  };
  const animateOut = (val: Animated.Value) => {
    Animated.spring(val, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    (async () => {
      setZonesLoading(true);
      const { data, error } = await supabase
        .from("zones")
        .select("id, district_name");
      if (!error && data) {
        setZones(
          data.map((z: any) => ({
            id: String(z.id),
            district: z.district_name || "ไม่ระบุเขต",
          })),
        );
      }
      setZonesLoading(false);
    })();
  }, []);

  const districtOptions = useMemo(() => {
    const districts = Array.from(new Set(zones.map((z) => z.district)));
    districts.sort((a, b) => a.localeCompare(b, "th"));
    return ["ทั้งหมด", ...districts];
  }, [zones]);

  const selectedDistrict = districtOptions[selectedDistrictIndex] || "ทั้งหมด";

  useEffect(() => {
    if (zonesLoading || zones.length === 0) return;
    const fetchSummary = async () => {
      setSummaryLoading(true);
      const today = new Date().toISOString().split("T")[0];
      const startTs = `${today}T00:00:00Z`;
      const endTs = `${today}T23:59:59.999Z`;
      const zoneIds = zones
        .filter(
          (z) =>
            selectedDistrict === "ทั้งหมด" || z.district === selectedDistrict,
        )
        .map((z) => z.id);
      try {
        const { data: contracts } = await supabase
          .from("contracts")
          .select("id, vendor_id")
          .in("zone_id", zoneIds)
          .eq("status", "active");
        const contractIds = contracts?.map((c) => c.id) || [];
        const vendorIds = Array.from(
          new Set(contracts?.map((c) => c.vendor_id) || []),
        );
        const { data: inspections } = await supabase
          .from("inspections")
          .select("contract_id, score")
          .in("contract_id", contractIds)
          .gte("created_at", startTs)
          .lte("created_at", endTs);
        const { data: checkins } = await supabase
          .from("daily_checkins")
          .select("vendor_id")
          .in("vendor_id", vendorIds)
          .gte("checkin_time", startTs);

        setSummary({
          totalVendors: vendorIds.length,
          inspectedVendorsToday: new Set(inspections?.map((i) => i.contract_id))
            .size,
          checkinVendorsToday: new Set(checkins?.map((c) => c.vendor_id)).size,
          lowScoreShops:
            inspections?.filter((i) => (i.score || 0) < 50).length || 0,
          avgScore: inspections?.length
            ? Math.round(
                inspections.reduce((a, b) => a + (b.score || 0), 0) /
                  inspections.length,
              )
            : 0,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setSummaryLoading(false);
      }
    };
    fetchSummary();
  }, [selectedDistrict, zones, zonesLoading]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.topRow}>
          <Text style={styles.greetingText}>สวัสดี {officerName}</Text>
          <View style={styles.topIconRow}>
            <Pressable style={styles.topIconBtn}>
              <Ionicons name="notifications" size={18} color="black" />
            </Pressable>
            <Pressable
              ref={settingsBtnRef}
              style={styles.topIconBtn}
              onPress={() => {
                settingsBtnRef.current?.measureInWindow?.(
                  (x, y, width, height) => {
                    setSettingsMenu({
                      x: x - MENU_WIDTH + width,
                      y: y + height + 5,
                    });
                  },
                );
              }}
            >
              <Ionicons name="settings-sharp" size={18} color="black" />
            </Pressable>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Map Box - Emerald Green with Opacity + Scale Effect */}
        <Animated.View style={{ transform: [{ scale: mapScale }] }}>
          <Pressable
            style={({ pressed }) => [
              styles.heroCard,
              styles.heroCardGreen,
              { opacity: pressed ? 0.7 : 1 }, // Native opacity effect
            ]}
            onPressIn={() => animateIn(mapScale)}
            onPressOut={() => animateOut(mapScale)}
            onPress={() => router.push("/(officer)/zone-map")}
          >
            <View style={styles.heroIconSquare}>
              <Ionicons name="map-outline" size={20} color="black" />
            </View>
            <Text style={styles.heroTitle}>
              ดูแผนที่โซนค้าขาย และ ตรวจสอบร้านค้า
            </Text>
          </Pressable>
        </Animated.View>

        {/* Traffy Box - Earth Brown with Opacity + Scale Effect */}
        <Animated.View style={{ transform: [{ scale: traffyScale }] }}>
          <Pressable
            style={({ pressed }) => [
              styles.heroCard,
              styles.heroCardBrown,
              { opacity: pressed ? 0.7 : 1 }, // Native opacity effect
            ]}
            onPressIn={() => animateIn(traffyScale)}
            onPressOut={() => animateOut(traffyScale)}
            onPress={() =>
              WebBrowser.openBrowserAsync("https://citydata.traffy.in.th/")
            }
          >
            <View style={[styles.heroIconSquare, styles.heroIconBrown]}>
              <Ionicons name="megaphone" size={18} color="white" />
            </View>
            <Text style={styles.heroTitle}>รายงานปัญหา Traffy Fondue</Text>
          </Pressable>
        </Animated.View>

        <View style={styles.summaryWrapper}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryHeaderTitle}>ภาพรวม</Text>
              <Pressable
                style={styles.summaryDistrictPill}
                onPress={() =>
                  setSelectedDistrictIndex(
                    (i) => (i + 1) % districtOptions.length,
                  )
                }
              >
                <Text style={styles.summaryDistrictText}>
                  เขต{selectedDistrict}
                </Text>
                <Ionicons name="chevron-down" size={14} color="white" />
              </Pressable>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryTile
                value={
                  summaryLoading
                    ? "..."
                    : `${summary.inspectedVendorsToday}/${summary.totalVendors}`
                }
                label="ตรวจสอบแล้ว"
              />
              <SummaryTile
                value={
                  summaryLoading
                    ? "..."
                    : `${summary.checkinVendorsToday}/${summary.totalVendors}`
                }
                label="เช็คอินวันนี้"
              />
              <SummaryTile
                value={`${summary.lowScoreShops}`}
                label="ร้านค้าคะแนนต่ำ"
              />
              <SummaryTile value={`${summary.avgScore}`} label="คะแนนเฉลี่ย" />
            </View>
          </View>
        </View>
        <View style={{ height: 150 }} />
      </ScrollView>

      <Modal transparent visible={Boolean(settingsMenu)} animationType="fade">
        <Pressable
          style={styles.menuBackdrop}
          onPress={() => setSettingsMenu(null)}
        >
          <View
            style={[
              styles.menuCard,
              { top: settingsMenu?.y, left: settingsMenu?.x },
            ]}
          >
            <Pressable
              style={styles.menuItem}
              onPress={() => router.replace("/(auth)/officer-auth")}
            >
              <Ionicons name="log-out-outline" size={18} color="black" />
              <Text style={styles.menuItemText}>ออกจากระบบ</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function SummaryTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.summaryTile}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  headerSafeArea: {
    paddingTop: Platform.OS === "ios" ? 15 : 30,
    backgroundColor: "white",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  greetingText: { fontSize: 20, fontFamily: "Anuphan-Bold", color: "black" },
  topIconRow: { flexDirection: "row", gap: 10 },
  topIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1 },
  scrollContent: { paddingTop: 5 },
  heroCard: { paddingHorizontal: 20, paddingVertical: 20 },
  heroCardGreen: { backgroundColor: "#067A52" },
  heroCardBrown: { backgroundColor: "#7A4D2E" },
  heroIconSquare: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  heroIconBrown: {
    backgroundColor: "#7A4D2E",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  heroTitle: { fontSize: 18, fontFamily: "Anuphan-Bold", color: "white" },
  summaryWrapper: { padding: 15, marginTop: -5 },
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  summaryHeader: {
    backgroundColor: "#069668",
    paddingHorizontal: 15,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryHeaderTitle: {
    fontSize: 15,
    color: "white",
    fontFamily: "Anuphan-Bold",
  },
  summaryDistrictPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  summaryDistrictText: { fontSize: 12, fontWeight: "bold", color: "white" },
  summaryGrid: { padding: 10, flexDirection: "row", flexWrap: "wrap", gap: 10 },
  summaryTile: {
    flexBasis: "47%",
    flexGrow: 1,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  summaryValue: {
    fontSize: 22,
    fontFamily: "Anuphan-Bold",
    color: "black",
    marginBottom: 2,
  },
  summaryLabel: {
    fontSize: 12,
    color: "#64748B",
    fontFamily: "Anuphan-Regular",
  },
  menuBackdrop: { ...StyleSheet.absoluteFillObject },
  menuCard: {
    position: "absolute",
    width: MENU_WIDTH,
    backgroundColor: "white",
    borderRadius: 10,
    padding: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
  },
  menuItemText: { fontSize: 14, fontFamily: "Anuphan-Medium", color: "black" },
});
