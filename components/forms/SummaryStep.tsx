import { Feather, Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function SummaryStep({ formData, onEditStep }: any) {
  // Helper to check if a section is complete using the NEW step order
  const checkStatus = (stepIndex: number) => {
    switch (stepIndex) {
      case 1: // Zone Selection (Step 1)
        return !!formData.zoneId;
      case 4: // Shop Info (Formerly Step 3)
        return !!(formData.shopName && formData.productType);
      case 5: // Contact Info (Formerly Step 4)
        const c = formData.contact;
        return !!(c?.firstName && c?.lastName && c?.phone && c?.idCard);
      case 6: // File Upload (Formerly Step 5)
        const d = formData.ownerDocs;
        // Check if all 4 required files exist
        return !!(d?.idCardFile && d?.photo && d?.certificate && d?.map);
      default:
        return false;
    }
  };

  const SummaryCard = ({
    title,
    subtitle,
    stepIndex,
    missingFields = [],
  }: any) => {
    const isComplete = checkStatus(stepIndex);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => onEditStep(stepIndex)} // Navigates to the correct shifted index
        activeOpacity={0.7}
      >
        <View style={styles.cardContent}>
          <View style={styles.statusIcon}>
            <Ionicons
              name={
                isComplete ? "checkmark-circle" : "checkmark-circle-outline"
              }
              size={24}
              color={isComplete ? "#48BB78" : "#CBD5E0"}
            />
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.cardTitle}>{title}</Text>

            {!isComplete ? (
              <View>
                <Text style={styles.errorHeader}>ข้อมูลไม่ครบ</Text>
                {missingFields.map((field: string, index: number) => (
                  <Text key={index} style={styles.errorDetail}>
                    • {field}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.cardSubtitle} numberOfLines={2}>
                {subtitle}
              </Text>
            )}
          </View>

          <Feather name="chevron-right" size={20} color="#CBD5E0" />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        {/* 1. Zone Info - Step 1 */}
        <SummaryCard
          title="ข้อมูลพื้นที่ทำการค้า"
          subtitle={`${formData.district || "เขต..."}, โซน ${formData.zoneName || "-"}`}
          stepIndex={1}
          missingFields={["กรุณาเลือกพื้นที่บนแผนที่"]}
        />

        {/* 2. Shop Info - Step 4 (Shifted) */}
        <SummaryCard
          title="ข้อมูลร้านค้า"
          subtitle={`ร้าน${formData.shopName || "-"}, ${formData.productType || "-"}`}
          stepIndex={4}
          missingFields={["ชื่อร้าน", "ประเภทสินค้า"]}
        />

        {/* 3. Contact Info - Step 5 (Shifted) */}
        <SummaryCard
          title="ข้อมูลผู้ขอรับใบอนุญาต"
          subtitle={`${formData.contact?.firstName || ""} ${formData.contact?.lastName || ""}`}
          stepIndex={5}
          missingFields={["ชื่อ-นามสกุล", "เลขบัตรประชาชน", "เบอร์โทรศัพท์"]}
        />

        {/* 4. Documents - Step 6 (Shifted) */}
        <SummaryCard
          title="เอกสารผู้ขอรับใบอนุญาต"
          subtitle="แนบเอกสารครบถ้วนแล้ว"
          stepIndex={6}
          missingFields={[
            "สำเนาบัตรประจำตัวประชาชน",
            "รูปถ่าย",
            "ใบรับรอง",
            "แผนที่",
          ]}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8F9FA" },
  content: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 30 },
  headerTitle: {
    fontSize: 20,
    fontFamily: "Anuphan-Bold",
    textAlign: "center",
    marginBottom: 24,
    color: "#1A202C",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16, // Smoother corners like in your photo
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#F1F3F5",
  },
  cardContent: { flexDirection: "row", alignItems: "flex-start" },
  statusIcon: { marginRight: 12, marginTop: 2 },
  textContainer: { flex: 1 },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Anuphan-Bold",
    color: "#1A202C",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    fontFamily: "Anuphan-Regular",
    color: "#718096",
  },
  // Style for the "Incomplete" state
  errorHeader: {
    fontSize: 14,
    fontFamily: "Anuphan-Bold",
    color: "#E53E3E", // Orange-Red color
    marginTop: 2,
  },
  errorDetail: {
    fontSize: 13,
    fontFamily: "Anuphan-Regular",
    color: "#E53E3E",
    marginLeft: 4,
  },
});
