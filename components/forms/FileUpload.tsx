import { Feather } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import React from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function UploadDocStep({ data, onUpdate }: any) {
  const handleUpload = (docType: string) => {
    // แยก Logic ตามประเภทเอกสาร
    if (docType === "photo") {
      // สำหรับ "รูปถ่ายหน้าตรง" -> ให้เลือกได้แค่ ถ่ายรูป หรือ คลังภาพ
      Alert.alert("อัปโหลดรูปถ่าย", "กรุณาเลือกช่องทาง", [
        { text: "ถ่ายรูป", onPress: () => pickImage(docType, true) },
        {
          text: "เลือกจากคลังรูปภาพ",
          onPress: () => pickImage(docType, false),
        },
        { text: "ยกเลิก", style: "cancel" },
      ]);
    } else {
      // สำหรับเอกสารอื่นๆ -> ให้เลือกไฟล์ (PDF/Image) จากเครื่องเท่านั้น
      pickDocument(docType);
    }
  };

  // ฟังก์ชันสำหรับ "รูปถ่าย" โดยเฉพาะ (Camera / Gallery)
  const pickImage = async (docType: string, useCamera: boolean) => {
    let result;
    if (useCamera) {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("ขออภัย", "เราต้องการสิทธิ์การเข้าถึงกล้อง");
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
        aspect: [3, 4], // สัดส่วนรูปถ่าย 1x1.5 นิ้ว โดยประมาณ
      });
    } else {
      result = await ImagePicker.launchImageLibraryAsync({
        quality: 0.8,
        allowsEditing: true,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });
    }

    if (!result.canceled) {
      const asset = result.assets[0];
      onUpdate({
        [docType]: {
          uri: asset.uri,
          name: `photo_${Date.now()}.jpg`,
          mimeType: "image/jpeg",
        },
      });
    }
  };

  // ฟังก์ชันสำหรับ "เอกสาร" (File Explorer)
  const pickDocument = async (docType: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      // อนุญาตทั้ง PDF และรูปภาพสำบัตร
      type: ["application/pdf", "image/*"],
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      onUpdate({
        [docType]: {
          uri: asset.uri,
          name: asset.name,
          mimeType: asset.mimeType,
        },
      });
    }
  };

  const RenderUploadBox = ({ title, details, docType }: any) => {
    const fileData = data[docType];
    const isUploaded = !!fileData;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text
            style={[
              styles.statusText,
              isUploaded ? styles.success : styles.pending,
            ]}
          >
            {isUploaded ? "อัปโหลดแล้ว" : "ยังไม่อัปโหลด"}
          </Text>
        </View>

        {details && (
          <View style={styles.detailsContainer}>
            {details.map((item: string, index: number) => (
              <Text key={index} style={styles.detailItem}>
                • {item}
              </Text>
            ))}
          </View>
        )}

        {/* --- ส่วนของปุ่มอัปโหลดและปุ่มลบ --- */}
        <View style={styles.uploadWrapper}>
          <TouchableOpacity
            style={[styles.uploadButton, isUploaded && styles.uploadedButton]}
            onPress={() => handleUpload(docType)}
            activeOpacity={0.6}
          >
            <Feather
              name={isUploaded ? "file-text" : "plus-square"}
              size={20}
              color={isUploaded ? "#48BB78" : "#4A5568"}
            />
            <Text
              numberOfLines={1} // ป้องกันชื่อไฟล์ยาวเกินไป
              style={[
                styles.uploadButtonText,
                isUploaded && styles.uploadedButtonText,
                { flex: 1 }, // ให้ Text กินพื้นที่ที่เหลือ
              ]}
            >
              {isUploaded ? fileData.name : "อัปโหลดไฟล์"}
            </Text>

            {/* ปุ่มลบ (จะปรากฏเมื่อ isUploaded เป็น true เท่านั้น) */}
            {isUploaded && (
              <TouchableOpacity
                onPress={() => onUpdate({ [docType]: null })} // ส่งค่า null กลับไปเพื่อล้างข้อมูล
                style={styles.deleteIconButton}
              >
                <Feather name="trash-2" size={20} color="#808080" />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.content}>
        <Text style={styles.sectionTitle}>ผู้ขอรับใบอนุญาต</Text>

        <RenderUploadBox
          title="สำเนาบัตรประจำตัวประชาชนและสำเนาทะเบียนบ้าน"
          docType="idCardFile" // เปลี่ยนจาก id_card เป็น idCardFile
        />

        <RenderUploadBox
          title="รูปถ่ายหน้าตรง 1 x 1.5 นิ้ว (3 รูป)"
          details={["ไม่สวมหมวก", "ไม่สวมแว่นตาดำ", "ถ่ายไว้ไม่เกิน 60 วัน"]}
          docType="photo"
        />

        <RenderUploadBox
          title="สำเนาใบวุฒิบัตรผู้ผ่านการอบรมหลักสูตรการสุขาภิบาลอาหารของกรุงเทพมหานคร"
          docType="certificate"
        />

        <RenderUploadBox
          title="แผนที่สังเขปแสดงสถานที่ตั้งจำหน่ายสินค้า"
          docType="map"
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  uploadWrapper: {
    flexDirection: "row",
    alignItems: "center",
  },
  deleteIconButton: {
    padding: 8,
    marginLeft: 4,
  },
  // ปรับแก้ uploadButton เดิมเล็กน้อยให้รองรับการจัดวางปุ่มลบข้างใน
  uploadButton: {
    flex: 1, // ให้ขยายเต็มพื้นที่
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E0",
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    gap: 8,
    backgroundColor: "#F8F9FA",
  },
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA", // พื้นหลังเทาอ่อนตามรูป
  },
  content: {
    fontFamily: "Anuphan-Regular",
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Anuphan-Bold",
    fontWeight: "700",
    color: "#1A202C",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    // เงาบางๆ ให้การ์ดดูลอยขึ้น
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    fontFamily: "Anuphan-Regular",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    fontFamily: "Anuphan-Regular",
  },
  cardTitle: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Anuphan-SemiBold",
    color: "#1A202C",
    lineHeight: 22,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Anuphan-Regular",
  },
  pending: {
    color: "#A0AEC0", // สีเทาสำหรับสถานะยังไม่อัปโหลด
  },
  success: {
    color: "#48BB78",
  },
  detailsContainer: {
    marginBottom: 16,
    paddingLeft: 4,
  },
  detailItem: {
    fontSize: 13,
    color: "#718096",
    fontFamily: "Anuphan",
    marginBottom: 4,
  },
  uploadButtonText: {
    fontSize: 14,
    color: "#4A5568",
    fontFamily: "Anuphan-Medium",
  },
  uploadedButton: {
    borderColor: "#48BB78",
    backgroundColor: "#F0FFF4",
    borderStyle: "solid",
  },
  uploadedButtonText: {
    color: "#2F855A",
  },
});
