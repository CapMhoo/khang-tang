import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

export default function ZoneSummary({ data }: any) {
  // Use the database values or fallbacks
  const occupied = data.occupied ?? 0;
  const max = data.max ?? 0;
  const isFull = occupied >= max && max > 0;

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* 1. เขตที่ทำการค้า */}
        <View style={styles.infoCard}>
          <View style={styles.labelRow}>
            <Ionicons name="location-outline" size={16} color="#718096" />
            <Text style={styles.label}>เขตที่ทำการค้า</Text>
          </View>
          <Text style={styles.valueText}>{data.district || "ไม่ระบุ"}</Text>
        </View>

        {/* 2. พื้นที่ทำการค้า */}
        <View style={styles.infoCard}>
          <View style={styles.labelRow}>
            <Ionicons name="map-outline" size={16} color="#718096" />
            <Text style={styles.label}>พื้นที่ทำการค้า</Text>
          </View>
          <Text style={styles.valueText}>
            {data.zoneName || "ไม่ได้เลือกพื้นที่"}
          </Text>
        </View>

        {/* 3. เวลาบริการ */}
        <View style={styles.infoCard}>
          <View style={styles.labelRow}>
            <Ionicons name="time-outline" size={16} color="#718096" />
            <Text style={styles.label}>เวลาบริการ</Text>
          </View>
          <Text style={styles.valueText}>
            {data.startTime ? data.startTime.substring(0, 5) : "--:--"} -{" "}
            {data.endTime ? data.endTime.substring(0, 5) : "--:--"} น.
          </Text>
        </View>

        {/* 4. ความจุ */}
        <View style={styles.infoCard}>
          <View style={styles.labelRow}>
            <Ionicons name="people-outline" size={16} color="#718096" />
            <Text style={styles.label}>ความจุพื้นที่</Text>
          </View>
          <Text style={[styles.valueText, isFull && { color: "#E53E3E" }]}>
            {occupied}/{max} ร้าน
          </Text>
        </View>

        {/* 5. รายละเอียดพื้นที่ (Skeleton placeholder) */}
        <View style={styles.detailCard}>
          <Text style={styles.detailTitleText}>รายละเอียดเพิ่มเติม</Text>
          <View style={styles.skeletonContainer}>
            <View style={[styles.skeletonLine, { width: "100%" }]} />
            <View style={[styles.skeletonLine, { width: "90%" }]} />
            <View style={[styles.skeletonLine, { width: "40%" }]} />
          </View>
        </View>

        {/* 6. Status Banner */}
        <View
          style={[
            styles.statusBanner,
            { backgroundColor: isFull ? "#FFF5F5" : "#F0FFF4" },
          ]}
        >
          <Ionicons
            name={isFull ? "close-circle" : "checkmark-circle"}
            size={22}
            color={isFull ? "#E53E3E" : "#48BB78"}
          />
          <Text
            style={[
              styles.statusText,
              { color: isFull ? "#E53E3E" : "#2F855A" },
            ]}
          >
            {isFull
              ? "โซนนี้เต็มแล้ว — โปรดเลือกโซนอื่นบนแผนที่"
              : "โซนนี้มีพื้นที่ว่าง — คุณสามารถดำเนินการลงทะเบียนต่อได้"}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  content: {
    padding: 0,
  },
  infoCard: {
    backgroundColor: "white",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    color: "#718096",
    fontFamily: "Anuphan",
  },
  valueText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#1A202C",
    fontFamily: "Anuphan-SemiBold",
    paddingLeft: 22, // Align with text after icon
  },
  detailCard: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#EDF2F7",
  },
  detailTitleText: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#1A202C",
    fontFamily: "Anuphan-Bold",
  },
  skeletonContainer: {
    gap: 8,
  },
  skeletonLine: {
    height: 12,
    backgroundColor: "#EDF2F7",
    borderRadius: 4,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    marginBottom: 40,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  statusText: {
    fontSize: 14,
    fontFamily: "Anuphan-Medium",
    flex: 1,
    lineHeight: 20,
  },
});
