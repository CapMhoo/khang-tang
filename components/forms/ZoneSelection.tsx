import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  PanResponder,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { supabase } from "../../lib/supabase";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const BOTTOM_SHEET_MIN_HEIGHT = SCREEN_HEIGHT * 0.35;
const BOTTOM_SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.85;

interface Zone {
  id: string;
  district_name: string;
  lat: number;
  lng: number;
  max_vender: number;
  district: string;
  occupied: number;
  time_start: string;
  time_end: string;
}

interface ZoneSelectionStepProps {
  data: {
    zoneId: string | null;
  };
  onUpdate: (zoneData: any) => void;
}

export default function ZoneSelectionStep({
  data,
  onUpdate,
}: ZoneSelectionStepProps) {
  const router = useRouter();
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"map" | "list">("map");
  const [expandedDistrict, setExpandedDistrict] = useState<string | null>(
    "พญาไท",
  );
  const [selectedDistrict, setSelectedDistrict] = useState<string>("เลือกเขต");
  const [districts, setDistricts] = useState<string[]>([]);
  const mapRef = useRef<MapView>(null);

  const handleSelectDistrict = () => {
    if (districts.length === 0) {
      Alert.alert("ขออภัย", "ไม่พบข้อมูลเขตในระบบ");
      return;
    }

    // เพิ่มตัวเลือก "ทั้งหมด" เพื่อให้ User กลับมาดูทุกเขตได้
    const options = ["ดูทั้งหมด", ...districts];

    Alert.alert("เลือกเขต", "กรุณาเลือกเขตที่ต้องการค้นหา", [
      ...options.map((name) => ({
        text: name,
        onPress: () => {
          setSelectedDistrict(name === "ดูทั้งหมด" ? "เลือกเขต" : name);

          // --- ส่วนที่ทำให้ Map เลื่อนไปยังเขตที่เลือก ---
          if (name !== "ดูทั้งหมด") {
            const zoneInDistrict = zones.find((z) => z.district === name);
            if (zoneInDistrict && mapRef.current) {
              mapRef.current.animateToRegion(
                {
                  latitude: zoneInDistrict.lat,
                  longitude: zoneInDistrict.lng,
                  latitudeDelta: 0.02, // ซูมเข้าไปให้เห็นชัดขึ้น
                  longitudeDelta: 0.02,
                },
                1000,
              );
            }
          }
        },
      })),
      { text: "ยกเลิก", style: "cancel" },
    ]);
  };

  const fetchDistricts = async () => {
    try {
      const { data, error } = await supabase.from("zones").select("district");
      if (error) throw error;

      if (data) {
        const uniqueDistricts = Array.from(
          new Set(data.map((item) => item.district)),
        ).filter(Boolean); // กรองค่า null/undefined ออกด้วย

        setDistricts(uniqueDistricts);
      }
    } catch (error) {
      console.error("Error fetching districts:", error);
    }
  };

  // เรียกใช้ใน useEffect
  useEffect(() => {
    fetchDistricts();
  }, []);

  // Bottom sheet animation
  const bottomSheetHeight = useRef(
    new Animated.Value(BOTTOM_SHEET_MIN_HEIGHT),
  ).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (evt, gestureState) => {
        const newHeight = BOTTOM_SHEET_MIN_HEIGHT - gestureState.dy;
        if (
          newHeight >= BOTTOM_SHEET_MIN_HEIGHT &&
          newHeight <= BOTTOM_SHEET_MAX_HEIGHT
        ) {
          bottomSheetHeight.setValue(newHeight);
        }
      },
      onPanResponderRelease: (evt, gestureState) => {
        const newHeight = BOTTOM_SHEET_MIN_HEIGHT - gestureState.dy;
        const midPoint =
          (BOTTOM_SHEET_MIN_HEIGHT + BOTTOM_SHEET_MAX_HEIGHT) / 2;

        Animated.spring(bottomSheetHeight, {
          toValue:
            newHeight > midPoint
              ? BOTTOM_SHEET_MAX_HEIGHT
              : BOTTOM_SHEET_MIN_HEIGHT,
          useNativeDriver: false,
          friction: 8,
          tension: 50,
        }).start();
      },
    }),
  ).current;

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);

      // 1. ดึงข้อมูลโซนทั้งหมด (ตัด occupied ออกเพราะเราจะนับใหม่)
      const { data: zonesData, error: zonesError } = await supabase
        .from("zones")
        .select(
          "id, district_name, lat, lon, max_vendor, district, time_start, time_end",
        );

      if (zonesError) throw zonesError;

      // 2. ดึงข้อมูลจำนวนการจองจากตาราง contracts โดยกรองเฉพาะสัญญาที่ Active (ถ้ามี column status)
      // ในที่นี้จะนับทุกแถวที่ผูกกับ zone_id นั้นๆ
      const { data: contractsData, error: contractsError } = await supabase
        .from("contracts")
        .select("zone_id");

      if (contractsError) throw contractsError;

      // 3. สร้าง Map เพื่อนับจำนวน Contract ต่อ Zone ID
      const occupancyMap: Record<string, number> = {};
      contractsData?.forEach((contract) => {
        occupancyMap[contract.zone_id] =
          (occupancyMap[contract.zone_id] || 0) + 1;
      });

      // 4. นำข้อมูลมารวมกัน (Format)
      const formatted = (zonesData || []).map((z: any) => ({
        id: z.id,
        district_name: z.district_name,
        lat: z.lat,
        lng: z.lon,
        max_vender: z.max_vendor, // แก้ตัวสะกดจาก max_vendor ใน db เป็น max_vender ใน interface
        district: z.district,
        occupied: occupancyMap[z.id] || 0, // ใช้ค่าที่นับได้จริงจากตาราง contracts
        time_start: z.time_start,
        time_end: z.time_end,
      }));

      setZones(formatted);
    } catch (error) {
      console.error("Error fetching zones and counts:", error);
    } finally {
      setLoading(false);
    }
  };

  // กรองข้อมูลตามเขตที่เลือก
  const filteredZones =
    selectedDistrict === "เลือกเขต"
      ? zones
      : zones.filter((zone) => zone.district === selectedDistrict);

  const groupedZones = filteredZones.reduce(
    (acc: Record<string, Zone[]>, zone) => {
      const district = zone.district || "อื่นๆ";
      if (!acc[district]) acc[district] = [];
      acc[district].push(zone);
      return acc;
    },
    {},
  );

  const getZoneStatus = (zone: Zone) => {
    const percent = zone.occupied / zone.max_vender;
    let status = "ว่าง";
    let bgColor = "#E6FFFA";
    let textColor = "#38B2AC";

    if (percent >= 1) {
      status = "เต็ม";
      bgColor = "#FED7D7";
      textColor = "#E53E3E";
    } else if (percent >= 0.7) {
      status = "ใกล้เต็ม";
      bgColor = "#FEF3C7";
      textColor = "#D69E2E";
    }

    return { status, bgColor, textColor };
  };

  const handleZoneSelect = (zone: Zone) => {
    onUpdate({
      zoneId: zone.id,
      zoneName: zone.district_name,
      district: zone.district,
      startTime: zone.time_start,
      endTime: zone.time_end,
      occupied: zone.occupied,
      max: zone.max_vender,
    });
  };

  const renderZoneCard = (zone: Zone) => {
    const isSelected = data.zoneId === zone.id;
    const { status, bgColor, textColor } = getZoneStatus(zone);

    return (
      <TouchableOpacity
        key={zone.id}
        style={[styles.zoneCard, isSelected && styles.selectedCard]}
        onPress={() => handleZoneSelect(zone)}
        activeOpacity={0.7}
      >
        <View style={styles.zoneInfo}>
          <Text style={styles.zoneNameText} numberOfLines={2}>
            {zone.district_name}
          </Text>
          <View style={styles.timeRow}>
            <Ionicons name="time-outline" size={16} color="#A0AEC0" />
            <Text style={styles.timeText}>
              {zone.time_start?.substring(0, 5)} -{" "}
              {zone.time_end?.substring(0, 5)} น.
            </Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
          <Text style={[styles.statusText, { color: textColor }]}>
            {status} {zone.occupied}/{zone.max_vender}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator size="large" color="#F79432" />
        <Text style={[styles.loadingText, { marginTop: 10 }]}>
          กำลังโหลดข้อมูลพื้นที่...
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header Section - Matches Design */}
      <View style={styles.headerSection}>
        {/* Header Top Row */}
        <View style={styles.headerTop}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={28} color="#1A202C" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>แผนที่โซนค้าขาย</Text>

          {/* District Dropdown */}
          <TouchableOpacity
            style={styles.districtDropdown}
            onPress={handleSelectDistrict} // เพิ่ม onPress ตรงนี้
            activeOpacity={0.7}
          >
            <Text style={styles.districtDropdownText}>{selectedDistrict}</Text>
            <Ionicons name="chevron-down" size={18} color="#1A202C" />
          </TouchableOpacity>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, viewMode === "map" && styles.activeTab]}
            onPress={() => setViewMode("map")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="location"
              size={18}
              color={viewMode === "map" ? "#1A202C" : "#64748B"}
            />
            <Text
              style={viewMode === "map" ? styles.activeTabText : styles.tabText}
            >
              แผนที่
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, viewMode === "list" && styles.activeTab]}
            onPress={() => setViewMode("list")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="list"
              size={18}
              color={viewMode === "list" ? "#1A202C" : "#64748B"}
            />
            <Text
              style={
                viewMode === "list" ? styles.activeTabText : styles.tabText
              }
            >
              รายการ
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Area - MAP VIEW */}
      {viewMode === "map" && (
        <View style={styles.mapWrapper}>
          <MapView
            ref={mapRef} // เชื่อม ref ตรงนี้
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            initialRegion={{
              latitude: 13.7367,
              longitude: 100.5231,
              latitudeDelta: 0.1, // ขยายมุมมองกว้างขึ้นหน่อยตอนเริ่ม
              longitudeDelta: 0.1,
            }}
          >
            {filteredZones.map((zone) => {
              const isSelected = data.zoneId === zone.id;
              return (
                <Marker
                  key={zone.id}
                  coordinate={{
                    latitude: zone.lat,
                    longitude: zone.lng,
                  }}
                  onPress={() => handleZoneSelect(zone)}
                >
                  <View
                    style={[
                      styles.customMarker,
                      { backgroundColor: isSelected ? "#28A745" : "#F79432" },
                    ]}
                  >
                    <View style={styles.markerInner} />
                  </View>
                </Marker>
              );
            })}
          </MapView>

          {/* Draggable Bottom Sheet */}
          <Animated.View
            style={[styles.bottomSheet, { height: bottomSheetHeight }]}
            {...panResponder.panHandlers}
          >
            {/* Handle Bar - for dragging */}
            <View style={styles.dragHandleContainer}>
              <View style={styles.sheetHandle} />
            </View>

            {/* Title */}
            <Text style={styles.sheetTitle}>พื้นที่ใกล้ฉัน</Text>

            {/* Scrollable Content */}
            <ScrollView contentContainerStyle={styles.bottomSheetContent}>
              {filteredZones.length > 0 ? (
                filteredZones.map((zone) => renderZoneCard(zone))
              ) : (
                <Text
                  style={{
                    textAlign: "center",
                    marginTop: 20,
                    color: "#A0AEC0",
                  }}
                >
                  ไม่พบพื้นที่ในเขตนี้
                </Text>
              )}
            </ScrollView>
          </Animated.View>
        </View>
      )}

      {/* Content Area - LIST VIEW */}
      {viewMode === "list" && (
        <ScrollView
          style={styles.listViewContainer}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
        >
          {Object.keys(groupedZones).map((district) => (
            <View key={district} style={styles.districtSection}>
              {/* District Header */}
              <TouchableOpacity
                style={styles.districtHeader}
                onPress={() =>
                  setExpandedDistrict(
                    expandedDistrict === district ? null : district,
                  )
                }
                activeOpacity={0.6}
              >
                <Text style={styles.districtHeaderText}>{district}</Text>
                <Ionicons
                  name={
                    expandedDistrict === district
                      ? "chevron-up"
                      : "chevron-down"
                  }
                  size={24}
                  color="#1A202C"
                />
              </TouchableOpacity>

              {/* Zone Cards - Only show if expanded */}
              {expandedDistrict === district && (
                <View>
                  {groupedZones[district].map((zone) => renderZoneCard(zone))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  loadingText: {
    textAlign: "center",
    color: "#666",
    fontSize: 14,
    fontFamily: "Anuphan-Regular",
  },

  // Header Section
  headerSection: {
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#E8EBF0",
    paddingBottom: 12,
  },

  // Header Top Row
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 12 : 16,
    paddingBottom: 12,
  },

  backButton: {
    padding: 4,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1A202C",
    flex: 1,
    marginLeft: 12,
    fontFamily: "Anuphan-Bold",
  },

  districtDropdown: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    borderRadius: 22,
    gap: 6,
    backgroundColor: "white",
  },

  districtDropdownText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A202C",
    fontFamily: "Anuphan-Bold",
  },

  // Tab Navigation - WHITE/GRAY COLORS
  tabContainer: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 8,
  },

  tab: {
    flex: 1,
    flexDirection: "row",
    height: 42,
    backgroundColor: "#E8EBF0", // Gray when inactive
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },

  activeTab: {
    backgroundColor: "#FFFFFF", // White when active
    borderWidth: 1,
    borderColor: "#E8EBF0",
  },

  tabText: {
    color: "#64748B", // Dark gray text when inactive
    fontSize: 14,
    fontWeight: "500",
    fontFamily: "Anuphan-Regular",
  },

  activeTabText: {
    color: "#1A202C", // Dark text when active
    fontSize: 14,
    fontWeight: "600",
    fontFamily: "Anuphan-Bold",
  },

  // MAP VIEW
  mapWrapper: {
    flex: 1,
    position: "relative",
  },

  map: {
    ...StyleSheet.absoluteFillObject,
  },

  // Bottom Sheet
  bottomSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "white",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingTop: 12,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 20,
    zIndex: 100,
  },

  dragHandleContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },

  sheetHandle: {
    width: 50,
    height: 5,
    backgroundColor: "#CBD5E0",
    borderRadius: 10,
  },

  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
    color: "#1A202C",
    paddingHorizontal: 10,
    fontFamily: "Anuphan-Bold",
  },

  bottomSheetScroll: {
    flex: 1,
  },

  bottomSheetContent: {
    paddingBottom: 20,
  },

  // LIST VIEW
  listViewContainer: {
    flex: 1,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: "#F5F7FA",
  },

  // District Section
  districtSection: {
    marginBottom: 15,
  },

  districtHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 10,
    marginBottom: 8,
  },

  districtHeaderText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A202C",
    fontFamily: "Anuphan-Bold",
  },

  // Zone Card
  zoneCard: {
    backgroundColor: "white",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    marginHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8EBF0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
  },

  selectedCard: {
    borderColor: "#28A745",
    backgroundColor: "#F0FFF4",
    borderWidth: 2,
  },

  // Zone Info
  zoneInfo: {
    flex: 1,
    marginRight: 10,
  },

  zoneNameText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 6,
    fontFamily: "Anuphan-Bold",
  },

  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  timeText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "500",
    fontFamily: "Anuphan-Regular",
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    minWidth: 65,
    justifyContent: "center",
    alignItems: "center",
  },

  statusText: {
    fontSize: 12,
    fontWeight: "700",
    fontFamily: "Anuphan-Bold",
  },

  // Custom Marker
  customMarker: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "white",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },

  markerInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "white",
  },
});
