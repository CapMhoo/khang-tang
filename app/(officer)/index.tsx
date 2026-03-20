import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Modal,
  Pressable,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { supabase } from "../../lib/supabase";

type OfficerHomeParams = {
  officerName?: string;
};

type Zone = {
  id: string;
  district: string;
};

const MENU_WIDTH = 180;
const MENU_MARGIN = 12;

export default function OfficerHomeScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<OfficerHomeParams>();
  const officerName = params.officerName || "เจ้าหน้าที่";

  const settingsBtnRef = useRef<any>(null);
  const [settingsMenu, setSettingsMenu] = useState<{ x: number; y: number } | null>(
    null,
  );

  const [zones, setZones] = useState<Zone[]>([]);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [selectedDistrictIndex, setSelectedDistrictIndex] = useState(0);

  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    totalZones: number;
    inspectedZonesToday: number;
    checkinZonesToday: number;
    lowScoreShops: number;
    avgScore: number;
  }>({
    totalZones: 0,
    inspectedZonesToday: 0,
    checkinZonesToday: 0,
    lowScoreShops: 3,
    avgScore: 80,
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      setZonesLoading(true);
      const { data, error } = await supabase
        .from("zones")
        .select("id, district_name")
        .limit(10000);

      if (!mounted) return;

      if (error) {
        console.error("Fetch zones error:", error);
        setZones([]);
        setZonesLoading(false);
        return;
      }

      const formatted: Zone[] = (data ?? []).map((z: any) => ({
        id: String(z.id),
        district: (z.district_name as string | null) ?? "ไม่ระบุเขต",
      }));

      setZones(formatted);
      setZonesLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const districtOptions = useMemo(() => {
    const districts = Array.from(new Set(zones.map((z) => z.district)));
    districts.sort((a, b) => a.localeCompare(b, "th"));
    return ["ทั้งหมด", ...districts];
  }, [zones]);

  const selectedDistrict =
    districtOptions[selectedDistrictIndex] ?? districtOptions[0];

  const cycleDistrict = () => {
    setSelectedDistrictIndex((i) => (i + 1) % districtOptions.length);
  };

  const getTodayRangeIso = () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 1);
    return { startIso: start.toISOString(), endIso: end.toISOString() };
  };

  useEffect(() => {
    let mounted = true;

    if (zonesLoading) return;
    if (zones.length === 0) {
      setSummary((prev) => ({
        ...prev,
        totalZones: 0,
        inspectedZonesToday: 0,
        checkinZonesToday: 0,
      }));
      return;
    }

    (async () => {
      setSummaryLoading(true);
      setSummaryError(null);
      const { startIso, endIso } = getTodayRangeIso();

      const zoneIds = zones
        .filter(
          (z) =>
            selectedDistrict === "ทั้งหมด" || z.district === selectedDistrict,
        )
        .map((z) => z.id);

      if (zoneIds.length === 0) {
        if (!mounted) return;
        setSummary((prev) => ({
          ...prev,
          totalZones: 0,
          inspectedZonesToday: 0,
          checkinZonesToday: 0,
        }));
        setSummaryLoading(false);
        return;
      }

      try {
        const { data: inspections, error: inspectionsError } = await supabase
          .from("inspections")
          .select("zone_id")
          .in("zone_id", zoneIds)
          .gte("created_at", startIso)
          .lt("created_at", endIso)
          .limit(10000);
        if (inspectionsError) throw inspectionsError;

        const inspectedZoneIds = new Set(
          (inspections ?? []).map((row: any) => String(row.zone_id)),
        );

        const { data: contracts, error: contractsError } = await supabase
          .from("contracts")
          .select("zone_id, vendor_id")
          .in("zone_id", zoneIds)
          .eq("status", "active")
          .limit(10000);
        if (contractsError) throw contractsError;

        const vendorToZone = new Map<string, string>();
        const vendorIds: string[] = [];
        for (const c of contracts ?? []) {
          const vid = String((c as any).vendor_id ?? "");
          const zid = String((c as any).zone_id ?? "");
          if (!vid || !zid) continue;
          if (!vendorToZone.has(vid)) {
            vendorToZone.set(vid, zid);
            vendorIds.push(vid);
          }
        }

        const { data: checkins, error: checkinsError } = vendorIds.length
          ? await supabase
              .from("daily_checkins")
              .select("vendor_id, checkin_time")
              .in("vendor_id", vendorIds)
              .gte("checkin_time", startIso)
              .lt("checkin_time", endIso)
              .order("checkin_time", { ascending: false })
              .limit(10000)
          : { data: [], error: null };
        if (checkinsError) throw checkinsError;

        const checkinZoneIds = new Set<string>();
        for (const ci of checkins ?? []) {
          const vid = String((ci as any).vendor_id ?? "");
          const zid = vendorToZone.get(vid);
          if (zid) checkinZoneIds.add(zid);
        }

        if (!mounted) return;
        setSummary((prev) => ({
          ...prev,
          totalZones: zoneIds.length,
          inspectedZonesToday: inspectedZoneIds.size,
          checkinZonesToday: checkinZoneIds.size,
        }));
      } catch (err: any) {
        console.error("Fetch summary error:", err);
        if (!mounted) return;
        setSummaryError(err?.message ?? "โหลดข้อมูลภาพรวมไม่สำเร็จ");
      } finally {
        if (!mounted) return;
        setSummaryLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [zones, zonesLoading, selectedDistrict]);

  const openTraffy = async () => {
    const url = "https://citydata.traffy.in.th/";
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (err) {
      console.error("openBrowserAsync error:", err);
    }
  };

  const closeSettingsMenu = () => setSettingsMenu(null);

  const openSettingsMenu = () => {
    settingsBtnRef.current?.measureInWindow?.(
      (x: number, y: number, width: number, height: number) => {
        const screenWidth = Dimensions.get("window").width;
        const left = Math.max(
          MENU_MARGIN,
          Math.min(
            x + width - MENU_WIDTH,
            screenWidth - MENU_WIDTH - MENU_MARGIN,
          ),
        );
        const top = y + height + 8;
        setSettingsMenu({ x: left, y: top });
      },
    );
  };

  const logout = async () => {
    closeSettingsMenu();
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("signOut error:", err);
    } finally {
      router.replace("/(auth)/officer-auth");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.page}>
        <View style={styles.topRow}>
          <Text style={styles.greetingText}>สวัสดี {officerName}</Text>
          <View style={styles.topIconRow}>
            <Pressable style={styles.topIconBtn} hitSlop={10}>
              <Ionicons
                name="notifications-outline"
                size={22}
                color="#111827"
              />
            </Pressable>
            <Pressable
              ref={settingsBtnRef}
              style={styles.topIconBtn}
              hitSlop={10}
              onPress={openSettingsMenu}
            >
              <Ionicons name="settings-outline" size={22} color="#111827" />
            </Pressable>
          </View>
        </View>

        <View style={styles.content}>
          <Pressable
            style={[styles.heroCard, styles.heroCardPrimary]}
            onPress={() => router.push("/(officer)/zone-map")}
          >
            <View style={styles.heroIconSquare}>
              <Ionicons name="map-outline" size={22} color="#111827" />
            </View>
            <Text style={styles.heroTitle} numberOfLines={2}>
              ดูแผนที่โซนค้าขาย และ ตรวจสอบร้านค้า
            </Text>
          </Pressable>

          <Pressable
            style={[styles.heroCard, styles.heroCardSecondary]}
            onPress={openTraffy}
          >
            <View style={[styles.heroIconSquare, styles.heroIconFondue]}>
              <Ionicons name="megaphone-outline" size={20} color="white" />
            </View>
            <Text style={styles.heroTitle} numberOfLines={1}>
              รายงานปัญหา Traffy Fondue
            </Text>
          </Pressable>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryHeaderTitle}>ภาพรวม</Text>
              <Pressable
                style={styles.summaryDistrictPill}
                onPress={cycleDistrict}
                hitSlop={10}
                disabled={zonesLoading || districtOptions.length <= 1}
              >
                <Text style={styles.summaryDistrictText} numberOfLines={1}>
                  เขต
                  {selectedDistrict === "ทั้งหมด"
                    ? "ทั้งหมด"
                    : selectedDistrict}
                </Text>
                <Ionicons name="chevron-down" size={16} color="white" />
              </Pressable>
            </View>

            {zonesLoading || summaryLoading ? (
              <View style={styles.summaryLoading}>
                <ActivityIndicator size="small" color="#64748B" />
                <Text style={styles.summaryLoadingText}>กำลังโหลด...</Text>
              </View>
            ) : summaryError ? (
              <View style={styles.summaryErrorBox}>
                <Text style={styles.summaryErrorText}>{summaryError}</Text>
              </View>
            ) : (
              <View style={styles.summaryGrid}>
                <SummaryTile
                  value={`${summary.inspectedZonesToday}/${summary.totalZones}`}
                  label="ตรวจสอบแล้ว"
                />
                <SummaryTile
                  value={`${summary.checkinZonesToday}/${summary.totalZones}`}
                  label="เช็คอินวันนี้"
                />
                <SummaryTile
                  value={`${summary.lowScoreShops}`}
                  label="ร้านค้าคะแนนต่ำ"
                />
                <SummaryTile value={`${summary.avgScore}`} label="คะแนนเฉลี่ย" />
              </View>
            )}
          </View>
	        </View>
	      </View>

	      <Modal
	        transparent
	        visible={Boolean(settingsMenu)}
	        animationType="fade"
	        onRequestClose={closeSettingsMenu}
	      >
	        <Pressable style={styles.menuBackdrop} onPress={closeSettingsMenu}>
	          <Pressable
	            style={[
	              styles.menuCard,
	              { top: settingsMenu?.y ?? 0, left: settingsMenu?.x ?? 0 },
	            ]}
	            onPress={() => {}}
	          >
	            <Pressable style={styles.menuItem} onPress={logout}>
	              <Ionicons name="log-out-outline" size={20} color="#111827" />
	              <Text style={styles.menuItemText}>ออกจากระบบ</Text>
	            </Pressable>
	          </Pressable>
	        </Pressable>
	      </Modal>
	    </SafeAreaView>
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
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  page: { flex: 1, paddingHorizontal: 18, paddingTop: 8, paddingBottom: 14 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
  },
  greetingText: {
    fontSize: 24,
    fontWeight: "900",
    color: "#111827",
  },
  topIconRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  topIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },

  menuBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  menuCard: {
    position: "absolute",
    width: MENU_WIDTH,
    backgroundColor: "white",
    borderRadius: 14,
    paddingVertical: 6,
    paddingHorizontal: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 18,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: "#F9FAFB",
  },
  menuItemText: { fontSize: 16, fontWeight: "900", color: "#111827" },

  content: { flex: 1, gap: 12, paddingTop: 10 },

  heroCard: {
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  heroCardPrimary: { backgroundColor: "#6B7280" },
  heroCardSecondary: { backgroundColor: "#475569" },
  heroIconSquare: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  heroIconFondue: {
    backgroundColor: "#8B5A2B",
    borderRadius: 28,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: "white",
    lineHeight: 26,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 4,
  },
  summaryHeader: {
    backgroundColor: "#475569",
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryHeaderTitle: { fontSize: 18, fontWeight: "900", color: "white" },
  summaryDistrictPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  summaryDistrictText: { fontSize: 14, fontWeight: "900", color: "white" },

  summaryGrid: {
    padding: 12,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryTile: {
    flexBasis: "48%",
    flexGrow: 1,
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  summaryValue: {
    fontSize: 34,
    fontWeight: "900",
    color: "#111827",
    marginBottom: 6,
    lineHeight: 38,
  },
  summaryLabel: { fontSize: 14, fontWeight: "900", color: "#6B7280" },

  summaryLoading: {
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryLoadingText: { fontSize: 14, fontWeight: "800", color: "#475569" },
  summaryErrorBox: { padding: 18 },
  summaryErrorText: { fontSize: 13, fontWeight: "800", color: "#991B1B" },
});

// import * as Location from "expo-location"; // Import Location
// import React, { useEffect, useState } from "react";
// import { Alert, StyleSheet, View } from "react-native";
// import MapView, { PROVIDER_GOOGLE, Polygon } from "react-native-maps";

// export default function App() {
//   const [locationPermission, setLocationPermission] = useState(false);

//   useEffect(() => {
//     (async () => {
//       // 1. Request Permission
//       let { status } = await Location.requestForegroundPermissionsAsync();
//       if (status !== "granted") {
//         Alert.alert(
//           "Permission denied",
//           "We need your location to show it on the map"
//         );
//         return;
//       }
//       setLocationPermission(true);
//     })();
//   }, []);

//   return (
//     <View style={styles.container}>
//       <MapView
//         provider={PROVIDER_GOOGLE}
//         style={styles.map}
//         // 2. These two lines show the Blue Dot and the "Center Me" button
//         showsUserLocation={true}
//         showsMyLocationButton={true}
//         initialRegion={{
//           latitude: 13.7563,
//           longitude: 100.5018,
//           latitudeDelta: 0.01,
//           longitudeDelta: 0.01,
//         }}
//       >
//         <Polygon
//           coordinates={[
//             { latitude: 13.7563, longitude: 100.5018 },
//             { latitude: 13.7573, longitude: 100.5018 },
//             { latitude: 13.7573, longitude: 100.5028 },
//             { latitude: 13.7563, longitude: 100.5028 },
//           ]}
//           fillColor="rgba(0, 255, 0, 0.3)"
//           strokeColor="rgba(0, 255, 0, 1)"
//         />
//       </MapView>
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
//   map: {
//     width: "100%",
//     height: "100%",
//   },
// });
