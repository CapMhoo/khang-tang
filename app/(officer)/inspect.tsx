import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system/legacy";
import * as ImagePicker from "expo-image-picker";
import * as Print from "expo-print";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import { useEffect, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { getOfficerSession, setOfficerSession } from "../../lib/officerSession";
import { supabase } from "../../lib/supabase";

// ─── helpers ────────────────────────────────────────────────────────────────

const scoreLabel = (score: number | null) => {
  if (!score) return "–";
  const labels: Record<number, string> = {
    1: "ควรปรับปรุง",
    2: "พอใช้",
    3: "ปานกลาง",
    4: "ดี",
    5: "ดีเยี่ยม",
  };
  return `${labels[score]} (${score}/5)`;
};

// ─── types ───────────────────────────────────────────────────────────────────

interface VendorCardData {
  shopName: string;
  district: string;
  zoneName: string;
  ownerName: string;
  productType: string;
  checkinTime: string;
  checkoutTime: string;
  shopPhoto?: string;
  contractId: string;
}

// ─── component ───────────────────────────────────────────────────────────────

export default function OfficerInspectScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    officerId?: string;
    shopName: string;
    district: string;
    zoneName: string;
    ownerName: string;
    productType: string;
    checkinTime: string;
    checkoutTime: string;
    shopPhoto?: string;
    contractId: string;
  }>();
  const session = getOfficerSession();
  const officerId = params.officerId ?? session?.officerId ?? "";

  useEffect(() => {
    if (params.officerId && params.officerId !== session?.officerId) {
      setOfficerSession({
        officerId: String(params.officerId),
        officerName: session?.officerName,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.officerId]);

  const vendor: VendorCardData = {
    shopName: params.shopName ?? "–",
    district: params.district ?? "–",
    zoneName: params.zoneName ?? "–",
    ownerName: params.ownerName ?? "–",
    productType: params.productType ?? "–",
    checkinTime: params.checkinTime ?? "–",
    checkoutTime: params.checkoutTime ?? "–",
    shopPhoto: params.shopPhoto,
    contractId: params.contractId ?? "",
  };

  // ── state ──────────────────────────────────────────────────────────────────
  const [isReviewing, setIsReviewing] = useState(false);
  const [cleanliness, setCleanliness] = useState<number | null>(null);
  const [orderliness, setOrderliness] = useState<number | null>(null);
  const [violations, setViolations] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const violationOptions = [
    "ตั้งวางสิ่งของเกินเขตหรือนอกจุดที่กำหนด",
    "ทิ้งขยะ/เทน้ำเสีย ลงบนถนนหรือท่อระบายน้ำ",
    "ขายสินค้านอกเวลาที่กำหนด",
    "กีดขวางทางเท้าหรือผิวจราจร",
    "ไม่สวมผ้ากันเปื้อน/หมวกคลุมผม (กรณีอาหาร)",
  ];

  const toggleViolation = (item: string) => {
    setViolations((prev) =>
      prev.includes(item) ? prev.filter((v) => v !== item) : [...prev, item],
    );
  };

  // ── photo ──────────────────────────────────────────────────────────────────
  const openCamera = async () => {
    if (imageUris.length >= 2) return;
    const { granted } = await ImagePicker.requestCameraPermissionsAsync();
    if (!granted) {
      alert("กรุณาอนุญาตการเข้าถึงกล้อง");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.6,
    });
    if (!result.canceled) {
      setImageUris((prev) => [...prev, result.assets[0].uri]);
    }
  };

  const removeImage = (uri: string) => {
    setImageUris((prev) => prev.filter((u) => u !== uri));
  };

  // ── PDF ────────────────────────────────────────────────────────────────────
  const generatePDF = async () => {
    let imagesHtml = "";
    for (const uri of imageUris) {
      try {
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        imagesHtml += `<img src="data:image/jpeg;base64,${base64}" class="evidence-img" />`;
      } catch {}
    }

    const html = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica'; padding: 24px; color: #111827; }
            h1 { text-align: center; color: #10B981; font-size: 22px; margin-bottom: 24px; }
            .card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 14px 16px; margin-bottom: 12px; }
            .label { font-size: 10px; color: #6B7280; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
            .value { font-size: 15px; color: #111827 }
            .value-bad { color: #EF4444; }
            .img-row { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px; }
            .evidence-img { width: 48%; border-radius: 10px; }
          </style>
        </head>
        <body>
          <h1>รายงานการตรวจสอบร้านค้า</h1>
          <div class="card">
            <p class="label">ร้านค้า</p>
            <p class="value">${vendor.shopName}</p>
            <p class="value" style="font-size:13px;color:#6B7280;margin-top:2px;">${vendor.ownerName} · ${vendor.productType}</p>
          </div>
          <div class="card">
            <p class="label">พื้นที่ / เขต</p>
            <p class="value">${vendor.district} · ${vendor.zoneName}</p>
          </div>
          <div class="card">
            <p class="label">เวลา</p>
            <p class="value">เช็คอิน ${vendor.checkinTime} · เช็คเอาท์ ${vendor.checkoutTime}</p>
          </div>
          <div class="card">
            <p class="label">ความสะอาด</p>
            <p class="value">${scoreLabel(cleanliness)}</p>
          </div>
          <div class="card">
            <p class="label">ความเป็นระเบียบเรียบร้อย</p>
            <p class="value">${scoreLabel(orderliness)}</p>
          </div>
          <div class="card">
            <p class="label">การฝ่าฝืน</p>
            ${
              violations.length
                ? violations
                    .map((v) => `<p class="value value-bad">• ${v}</p>`)
                    .join("")
                : '<p class="value">–</p>'
            }
          </div>
          <div class="card">
            <p class="label">บันทึกเพิ่มเติม</p>
            <p class="value">${notes || "–"}</p>
          </div>
          ${
            imagesHtml
              ? `<div class="card"><p class="label">หลักฐานภาพถ่าย</p><div class="img-row">${imagesHtml}</div></div>`
              : ""
          }
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, {
        UTI: ".pdf",
        mimeType: "application/pdf",
      });
    } catch (e: any) {
      alert("ไม่สามารถสร้าง PDF ได้: " + e.message);
    }
  };

  // ── save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!cleanliness || !orderliness) {
      alert("กรุณาให้คะแนนความสะอาดและความเป็นระเบียบ");
      return;
    }
    if (!officerId) {
      alert("ไม่พบข้อมูลเจ้าหน้าที่ (officerId) กรุณาเข้าสู่ระบบใหม่");
      return;
    }
    if (imageUris.length === 0) {
      alert("กรุณาถ่ายภาพหลักฐานอย่างน้อย 1 รูป");
      return;
    }

    setIsSaving(true);
    try {
      // Upload first photo
      const base64 = await FileSystem.readAsStringAsync(imageUris[0], {
        encoding: FileSystem.EncodingType.Base64,
      });
      const fileName = `inspection_${Date.now()}.jpg`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("inspections")
        .upload(fileName, decode(base64), { contentType: "image/jpeg" });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("inspections")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase.from("inspections").insert({
        contract_id: vendor.contractId,
        officer_id: officerId,
        inspection_time: new Date().toISOString(),
        inspection_photo: urlData.publicUrl,
        note: notes || null,
        cleanliness,
        tidiness: orderliness,
      });

      if (insertError) throw insertError;

      alert("บันทึกการตรวจสอบสำเร็จ!");
      router.back();
    } catch (e: any) {
      alert("เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  // ── shared sub-components ─────────────────────────────────────────────────

  const VendorCard = () => (
    <View style={styles.vendorCard}>
      <View style={styles.vendorCardInner}>
        {vendor.shopPhoto ? (
          <Image
            source={{ uri: vendor.shopPhoto }}
            style={styles.vendorThumb}
          />
        ) : (
          <View style={[styles.vendorThumb, styles.vendorThumbPlaceholder]}>
            <Ionicons name="storefront-outline" size={22} color="#9CA3AF" />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.vendorName}>{vendor.shopName}</Text>
          <View style={styles.vendorMeta}>
            <Ionicons name="location-outline" size={13} color="#6B7280" />
            <Text style={styles.vendorMetaText}>
              {vendor.district} · {vendor.zoneName}
            </Text>
          </View>
          <Text style={styles.vendorSubMeta}>
            {vendor.ownerName} · {vendor.productType}
          </Text>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Check-in / Check-out row */}
      <View style={styles.checkinRow}>
        <View style={styles.checkinBlock}>
          <Text style={styles.checkinLabel}>เช็คอิน</Text>
          <Text style={styles.checkinTime}>{vendor.checkinTime}</Text>
        </View>
        <View style={styles.checkinDividerV} />
        <View style={styles.checkinBlock}>
          <Text style={styles.checkinLabel}>เช็คเอาท์</Text>
          <Text style={styles.checkinTime}>{vendor.checkoutTime}</Text>
        </View>
      </View>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  //  FORM VIEW (Page 9)
  // ─────────────────────────────────────────────────────────────────────────
  const FormView = () => (
    <View>
      <VendorCard />

      {/* Cleanliness */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ความสะอาด</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              style={[
                styles.ratingBox,
                cleanliness === n && styles.ratingBoxSelected,
              ]}
              onPress={() => setCleanliness(n)}
            >
              <Text
                style={[
                  styles.ratingNum,
                  cleanliness === n && styles.ratingNumSelected,
                ]}
              >
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.ratingHints}>
          <Text style={styles.ratingHintText}>ควรปรับปรุง</Text>
          <Text style={styles.ratingHintText}>ดีเยี่ยม</Text>
        </View>
      </View>

      {/* Orderliness */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>ความเป็นระเบียบเรียบร้อย</Text>
        <View style={styles.ratingRow}>
          {[1, 2, 3, 4, 5].map((n) => (
            <TouchableOpacity
              key={n}
              style={[
                styles.ratingBox,
                orderliness === n && styles.ratingBoxSelected,
              ]}
              onPress={() => setOrderliness(n)}
            >
              <Text
                style={[
                  styles.ratingNum,
                  orderliness === n && styles.ratingNumSelected,
                ]}
              >
                {n}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.ratingHints}>
          <Text style={styles.ratingHintText}>ควรปรับปรุง</Text>
          <Text style={styles.ratingHintText}>ดีเยี่ยม</Text>
        </View>
      </View>

      {/* Violations — checkbox format kept as-is */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>การฝ่าฝืน (ถ้ามี)</Text>
        {violationOptions.map((item, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.checkboxRow}
            onPress={() => toggleViolation(item)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={violations.includes(item) ? "checkbox" : "square-outline"}
              size={22}
              color={violations.includes(item) ? "#10B981" : "#D1D5DB"}
            />
            <Text style={styles.checkboxLabel}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>บันทึกเพิ่มเติม</Text>
        <TextInput
          style={styles.textArea}
          placeholder="รายละเอียดการตรวจสอบ..."
          placeholderTextColor="#9CA3AF"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          value={notes}
          onChangeText={setNotes}
        />
      </View>

      {/* Evidence photos */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>หลักฐานภาพถ่าย</Text>
        <View style={styles.photoGrid}>
          {imageUris.map((uri) => (
            <View key={uri} style={styles.photoCell}>
              <TouchableOpacity
                onPress={() => setLightboxUri(uri)}
                activeOpacity={0.85}
              >
                <Image source={{ uri }} style={styles.photoThumb} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.photoDelete}
                onPress={() => removeImage(uri)}
                hitSlop={6}
              >
                <Ionicons name="close-circle" size={22} color="#EF4444" />
              </TouchableOpacity>
            </View>
          ))}
          {imageUris.length < 2 && (
            <TouchableOpacity style={styles.photoAdd} onPress={openCamera}>
              <Ionicons name="add" size={28} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryBtn}
        onPress={() => setIsReviewing(true)}
      >
        <Text style={styles.primaryBtnText}>ถัดไป</Text>
      </TouchableOpacity>
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  //  REVIEW VIEW (Page 10)
  // ─────────────────────────────────────────────────────────────────────────
  const ReviewView = () => (
    <View>
      <Text style={styles.reviewTitle}>ตรวจสอบข้อมูลก่อนบันทึก</Text>

      {/* Location & vendor info */}
      <View style={styles.reviewCard}>
        <ReviewRow label="เขตที่ทำการค้า" value={vendor.district} />
        <View style={styles.rowDivider} />
        <ReviewRow label="พื้นที่ทำการค้า" value={vendor.zoneName} />
        <View style={styles.rowDivider} />
        <ReviewRow label="ร้าน" value={vendor.shopName} />
        <View style={styles.rowDivider} />
        <View style={styles.checkinPair}>
          <View style={{ flex: 1 }}>
            <Text style={styles.reviewLabel}>เช็คอิน</Text>
            <Text style={styles.reviewValue}>{vendor.checkinTime}</Text>
          </View>
          <View style={styles.checkinDividerV} />
          <View style={{ flex: 1, paddingLeft: 16 }}>
            <Text style={styles.reviewLabel}>เช็คเอาท์</Text>
            <Text style={styles.reviewValue}>{vendor.checkoutTime}</Text>
          </View>
        </View>
      </View>

      {/* Cleanliness */}
      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>ความสะอาด</Text>
        <Text style={styles.reviewValue}>{scoreLabel(cleanliness)}</Text>
      </View>

      {/* Orderliness */}
      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>ความเป็นระเบียบเรียบร้อย</Text>
        <Text style={styles.reviewValue}>{scoreLabel(orderliness)}</Text>
      </View>

      {/* Violations */}
      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>การฝ่าฝืน</Text>
        {violations.length > 0 ? (
          violations.map((v, i) => (
            <Text key={i} style={[styles.reviewValue, styles.violationText]}>
              • {v}
            </Text>
          ))
        ) : (
          <Text style={styles.reviewValue}>–</Text>
        )}
      </View>

      {/* Evidence photos */}
      {imageUris.length > 0 && (
        <View style={styles.reviewCard}>
          <Text style={styles.reviewLabel}>หลักฐานภาพถ่าย</Text>
          <View style={[styles.photoGrid, { marginTop: 10 }]}>
            {imageUris.map((uri) => (
              <TouchableOpacity
                key={uri}
                style={styles.photoCell}
                onPress={() => setLightboxUri(uri)}
                activeOpacity={0.85}
              >
                <Image source={{ uri }} style={styles.photoThumb} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Notes */}
      <View style={styles.reviewCard}>
        <Text style={styles.reviewLabel}>บันทึก</Text>
        <Text style={styles.reviewValue}>{notes || "–"}</Text>
      </View>

      {/* PDF link */}
      <TouchableOpacity style={styles.pdfLink} onPress={generatePDF}>
        <Ionicons name="document-text-outline" size={17} color="#6B7280" />
        <Text style={styles.pdfLinkText}>ตัวอย่างแบบฟอร์มคำขอ</Text>
      </TouchableOpacity>

      {/* Save */}
      <TouchableOpacity
        style={[styles.primaryBtn, isSaving && { opacity: 0.6 }]}
        onPress={handleSave}
        disabled={isSaving}
      >
        <Ionicons
          name="save-outline"
          size={18}
          color="#fff"
          style={{ marginRight: 8 }}
        />
        <Text style={styles.primaryBtnText}>
          {isSaving ? "กำลังบันทึก..." : "บันทึกการตรวจสอบ"}
        </Text>
      </TouchableOpacity>

      {/* Back
      <TouchableOpacity style={styles.backLink} onPress={() => setIsReviewing(false)}>
        <Text style={styles.backLinkText}>ย้อนกลับไปแก้ไข</Text>
      </TouchableOpacity>
      */}
    </View>
  );

  // ─────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => (isReviewing ? setIsReviewing(false) : router.back())}
          style={styles.headerBack}
        >
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>
          {isReviewing ? "ตรวจสอบข้อมูลก่อนบันทึก" : "ตรวจสอบร้านค้า"}
        </Text>
        <View style={{ width: 42 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {isReviewing ? <ReviewView /> : <FormView />}
      </ScrollView>

      {/* Lightbox */}
      <Modal visible={!!lightboxUri} transparent animationType="fade">
        <View style={styles.lightboxOverlay}>
          <TouchableOpacity
            style={styles.lightboxClose}
            onPress={() => setLightboxUri(null)}
          >
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          {lightboxUri && (
            <Image
              source={{ uri: lightboxUri }}
              style={styles.lightboxImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── helper used in handleSave ────────────────────────────────────────────
function decode(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// ─── ReviewRow helper ─────────────────────────────────────────────────────
function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ paddingVertical: 2 }}>
      <Text style={reviewRowStyles.label}>{label}</Text>
      <Text style={reviewRowStyles.value}>{value}</Text>
    </View>
  );
}
const reviewRowStyles = StyleSheet.create({
  label: { fontSize: 12, color: "#6B7280", marginBottom: 2, fontWeight: "800" },
  value: { fontSize: 15, color: "#111827", fontWeight: "500" },
});

// ─── styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F1F5F9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerBack: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#111827" },
  scroll: { padding: 16, paddingBottom: 48 },

  // ── Vendor card ──
  vendorCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  vendorCardInner: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  vendorThumb: {
    width: 52,
    height: 52,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
  },
  vendorThumbPlaceholder: { alignItems: "center", justifyContent: "center" },
  vendorName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 3,
  },
  vendorMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 2,
  },
  vendorMetaText: { fontSize: 12, color: "#6B7280" },
  vendorSubMeta: { fontSize: 12, color: "#6B7280" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 12 },
  checkinRow: { flexDirection: "row" },
  checkinBlock: { flex: 1 },
  checkinDividerV: {
    width: 1,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 16,
  },
  checkinLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 2,
  },
  checkinTime: { fontSize: 16, fontWeight: "600", color: "#111827" },

  // ── Sections ──
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 10,
  },

  // ── Rating ──
  ratingHeader: {
    marginBottom: 10,
  },
  ratingHints: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },
  ratingHintText: { fontSize: 11, color: "#64748B" },
  ratingRow: { flexDirection: "row", gap: 8 },
  ratingBox: {
    flex: 1,
    height: 52,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  ratingBoxSelected: { backgroundColor: "#10B981", borderColor: "#10B981" },
  ratingNum: { fontSize: 18, fontWeight: "600", color: "#374151" },
  ratingNumSelected: { color: "#fff" },

  // ── Checkbox ──
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  checkboxLabel: { fontSize: 14, color: "#374151", flex: 1, lineHeight: 20 },

  // ── Notes ──
  textArea: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 14,
    color: "#111827",
    minHeight: 96,
  },

  // ── Photos ──
  photoGrid: { flexDirection: "row", gap: 10 },
  photoCell: { position: "relative" },
  photoThumb: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: "#E5E7EB",
  },
  photoDelete: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "#fff",
    borderRadius: 11,
  },
  photoAdd: {
    width: 100,
    height: 100,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Buttons ──
  primaryBtn: {
    backgroundColor: "#225A41",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 8,
  },
  primaryBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  // ── Review ──
  reviewTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 16,
  },
  reviewCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    gap: 4,
  },
  rowDivider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 8 },
  checkinPair: { flexDirection: "row", marginTop: 4 },
  reviewLabel: { fontSize: 12, color: "#6B7280", fontWeight: "500" },
  reviewValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "500",
    marginTop: 2,
  },
  violationText: { color: "#EF4444", fontSize: 14 },
  pdfLink: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
  },
  pdfLinkText: { fontSize: 16, color: "#475569", fontWeight: "400" },
  backLink: { paddingVertical: 14, alignItems: "center" },
  backLinkText: { fontSize: 14, color: "#6B7280", fontWeight: "600" },

  // ── Lightbox ──
  lightboxOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.88)",
    justifyContent: "center",
    alignItems: "center",
  },
  lightboxClose: {
    position: "absolute",
    top: 56,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  lightboxImage: { width: "92%", height: "72%" },
});
