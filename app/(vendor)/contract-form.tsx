import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import FileUpload from "../../components/forms/FileUpload";
import OwnerInfoStep from "../../components/forms/OwnerInfoStep";
import ShopInfoStep from "../../components/forms/ShopInfoStep";
import SuccessStep from "../../components/forms/SuccessStep";
import SummaryStep from "../../components/forms/SummaryStep";
import ZoneSelectionStep from "../../components/forms/ZoneSelection";
import ZoneSummary from "../../components/forms/ZoneSummary";
import { supabase } from "../../lib/supabase";
import { ContractFormData } from "../types/contract";

export default function ContractFormScreen() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 8;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<ContractFormData>({
    id: "",
    zoneId: "",
    zoneName: "",
    district: "",
    occupied: 0,
    max: 0,
    shopName: "",
    productType: "",
    startTime: "",
    endTime: "",
    assistantsCount: 0,
    contact: {
      prefix: "",
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      idCard: 0,
    },
    ownerDocs: {
      idCardFile: null,
      photo: null,
      certificate: null,
      map: null,
    },
  });

  const uploadFile = async (file: any, folder: string) => {
    // 1. If it's already a URL (string), it's already in the DB, so return it
    if (typeof file === "string" && file.startsWith("http")) return file;
    if (!file || !file.uri) return null;

    try {
      const fileExt = file.name ? file.name.split(".").pop() : "jpg";
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `${folder}/${fileName}`;

      // 2. Convert to Blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      // 3. Upload to the bucket (Ensure "registration_docs" exists in Supabase Storage)
      const { data, error } = await supabase.storage
        .from("registration_docs")
        .upload(filePath, blob, {
          contentType: file.mimeType || "image/jpeg",
          upsert: true,
        });

      if (error) throw error;

      // 4. Return Public URL
      const { data: urlData } = supabase.storage
        .from("registration_docs")
        .getPublicUrl(data.path);

      return urlData.publicUrl;
    } catch (err) {
      console.error("Upload error detail:", err);
      return null;
    }
  };

  // ฟังก์ชันสลับหน้า
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <ZoneSelectionStep data={formData} onUpdate={updateData} />;
      case 2:
        return <ZoneSummary data={formData} onUpdate={updateData} />;

      // NEW DUPLICATE: This is the Summary shown right after ZoneSummary
      case 3:
        return (
          <SummaryStep
            formData={formData}
            onEditStep={handleEditStep}
            isPreviewOnly={true}
          />
        );

      case 4:
        return <ShopInfoStep data={formData} onUpdate={updateData} />;
      case 5:
        return (
          <OwnerInfoStep data={formData.contact} onUpdate={updateContactData} />
        );
      case 6:
        return (
          <FileUpload data={formData.ownerDocs} onUpdate={updateDocsData} />
        );

      // ORIGINAL SUMMARY: This stays at the end
      case 7:
        return <SummaryStep formData={formData} onEditStep={handleEditStep} />;

      case 8:
        return (
          <SuccessStep
            onHome={() =>
              router.replace({
                pathname: "/(vendor)",
                params: { vendorId: vendorId },
              })
            }
          />
        );
      default:
        return (
          <View>
            <Text>Step {currentStep}</Text>
          </View>
        );
    }
  };

  const handleEditStep = (stepIndex: number) => {
    // เลื่อนกลับไปยัง Step ที่ส่งมาจากการกด Card
    setCurrentStep(stepIndex);
  };

  const { vendorId } = useLocalSearchParams(); // Get the ID from the URL

  const handleSaveDraft = async () => {
    setIsSubmitting(true);
    try {
      // 1. Upload files first
      // We use Promise.all to upload all files in parallel for speed
      const idCardUrl = await uploadFile(
        formData.ownerDocs.idCardFile,
        "id_cards",
      );
      const photoUrl = await uploadFile(formData.ownerDocs.photo, "photos");
      const certificateUrl = await uploadFile(
        formData.ownerDocs.certificate,
        "certificates",
      );
      const mapUrl = await uploadFile(formData.ownerDocs.map, "maps");

      // 2. Prepare the payload with the new URLs
      const payload: any = {
        vendor_id: vendorId,
        zone_id: formData.zoneId,
        shop_name: formData.shopName,
        product_type: formData.productType,
        daily_start_time: formData.startTime,
        daily_end_time: formData.endTime,
        employee: formData.assistantsCount,
        prefix: formData.contact.prefix,
        firstname: formData.contact.firstName,
        lastname: formData.contact.lastName,
        phone: formData.contact.phone,
        email: formData.contact.email,
        citizen_id: formData.contact.idCard || null,

        // Save the Public URLs returned from Storage
        citizen_id_doc: idCardUrl,
        owner_photo: photoUrl,
        course_doc: certificateUrl,
        map_doc: mapUrl,

        status: "draft",
      };

      if (formData.id) {
        payload.id = formData.id;
      }

      const { data, error } = await supabase
        .from("contracts")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();

      if (error) throw error;

      if (data) {
        setFormData((prev) => ({
          ...prev,
          id: data.id,
          // Update local state to show the saved URLs
          ownerDocs: {
            idCardFile: idCardUrl,
            photo: photoUrl,
            certificate: certificateUrl,
            map: mapUrl,
          },
        }));
      }

      Alert.alert("บันทึกร่างสำเร็จ", "ข้อมูลและไฟล์ของคุณถูกบันทึกแล้ว");
    } catch (error: any) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.shopName || !formData.contact.firstName || !formData.zoneId) {
      Alert.alert("ข้อมูลไม่ครบถ้วน", "กรุณากรอกข้อมูลให้ครบถ้วน");
      return;
    }

    setIsSubmitting(true);

    try {
      // Final check/upload for files (handles cases where user edited something)
      const idCardUrl = await uploadFile(
        formData.ownerDocs.idCardFile,
        "id_cards",
      );
      const photoUrl = await uploadFile(formData.ownerDocs.photo, "photos");
      const certificateUrl = await uploadFile(
        formData.ownerDocs.certificate,
        "certificates",
      );
      const mapUrl = await uploadFile(formData.ownerDocs.map, "maps");

      const payload = {
        vendor_id: vendorId,
        zone_id: formData.zoneId,
        shop_name: formData.shopName,
        product_type: formData.productType,
        daily_start_time: formData.startTime,
        daily_end_time: formData.endTime,
        employee: formData.assistantsCount,
        prefix: formData.contact.prefix,
        firstname: formData.contact.firstName,
        lastname: formData.contact.lastName,
        phone: formData.contact.phone,
        email: formData.contact.email,
        citizen_id: formData.contact.idCard || null,
        // USE THE URL STRINGS HERE
        citizen_id_doc: idCardUrl,
        owner_photo: photoUrl,
        course_doc: certificateUrl,
        map_doc: mapUrl,
        status: "pending",
      };

      if (formData.id) {
        // @ts-ignore
        payload.id = formData.id;
      }

      const { error } = await supabase
        .from("contracts")
        .upsert(payload, { onConflict: "id" });

      if (error) throw error;

      setCurrentStep(8); // GO TO SUCCESS PAGE
    } catch (error: any) {
      Alert.alert("เกิดข้อผิดพลาด", error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDocsData = (newDoc: any) => {
    setFormData((prev) => ({
      ...prev,
      ownerDocs: { ...prev.ownerDocs, ...newDoc },
    }));
  };

  const updateContactData = (
    newContactData: Partial<typeof formData.contact>,
  ) => {
    setFormData((prev) => ({
      ...prev,
      contact: { ...prev.contact, ...newContactData },
    }));
  };

  const renderFooterButtons = () => {
    // ถ้าเป็นหน้า Success (Step 7) ไม่ต้องแสดง Footer เดิม
    if (currentStep === 8) return null;

    // ถ้าเป็นหน้าสรุป (Step 6) ให้เปลี่ยนข้อความปุ่มเป็น "ส่งคำขอ"
    const isLastStep = currentStep === 7;

    return (
      <View style={[styles.footer, isMapStep && styles.footerAbsoluteMap]}>
        <TouchableOpacity
          style={[styles.nextButton, isSubmitting && { opacity: 0.7 }]}
          onPress={isLastStep ? handleSubmit : handleNext}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.nextButtonText}>
              {isLastStep ? "ส่งคำขอ" : "ถัดไป"}
            </Text>
          )}
        </TouchableOpacity>

        {currentStep > 1 && (
          <TouchableOpacity
            style={[styles.saveDraftButton, isSubmitting && { opacity: 0.5 }]}
            onPress={handleSaveDraft}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#666" />
            ) : (
              <>
                <Ionicons name="document-text-outline" size={18} color="#666" />
                <Text style={styles.saveDraftText}> บันทึกและทำต่อภายหลัง</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const updateData = (newData: Partial<ContractFormData>) => {
    setFormData((prev) => ({ ...prev, ...newData }));
  };

  const handleNext = async () => {
    console.log(formData);
    // --- Validation สำหรับ Step 1 (หน้าแผนที่) ---
    if (currentStep === 1) {
      if (!formData.zoneId) {
        Alert.alert(
          "แจ้งเตือน",
          "กรุณาเลือกพื้นที่ทำการค้าบนแผนที่หรือจากรายการก่อนไปต่อ",
        );
        return;
      }
    }

    // --- Validation สำหรับ Step 2 (หน้าสรุปพื้นที่) ---
    if (currentStep === 2) {
      // เช็คว่าพื้นที่เต็มหรือไม่
      const isFull = (formData.occupied ?? 0) >= (formData.max ?? 1);
      if (isFull) {
        Alert.alert(
          "พื้นที่เต็ม",
          "ขออภัย พื้นที่ทำการค้านี้มีผู้จองเต็มจำนวนแล้ว โปรดเลือกพื้นที่อื่น",
          [{ text: "ตกลง" }],
        );
        return; // บล็อกไม่ให้ไป Step 3
      }
    }

    // --- Validation สำหรับ Step 3 (ข้อมูลร้านค้า) ---
    if (currentStep === 4) {
      if (!formData.shopName || !formData.productType) {
        Alert.alert("ข้อมูลไม่ครบถ้วน", "กรุณากรอกชื่อร้านและประเภทสินค้า");
        return;
      }
    }

    // --- Validation สำหรับ Step 4 (ข้อมูลผู้ขออนุญาต) ---
    if (currentStep === 5) {
      const { prefix, firstName, lastName, phone, idCard } = formData.contact;
      if (!prefix || !firstName || !lastName || !phone || !idCard) {
        Alert.alert(
          "ข้อมูลไม่ครบถ้วน",
          "กรุณากรอกข้อมูลผู้ขอรับใบอนุญาตให้ครบถ้วน",
        );
        return;
      }
      // เช็คเบอร์โทร 10 หลัก (Simple Regex)
      if (phone.length < 10) {
        Alert.alert("ข้อมูลไม่ถูกต้อง", "กรุณากรอกเบอร์โทรศัพท์ให้ครบ 10 หลัก");
        return;
      }
    }

    // --- Validation สำหรับ Step 5 (อัปโหลดเอกสาร) ---
    if (currentStep === 6) {
      const docs = formData.ownerDocs;
      if (!docs.idCardFile || !docs.photo || !docs.certificate || !docs.map) {
        Alert.alert("เอกสารไม่ครบ", "กรุณาอัปโหลดเอกสารที่จำเป็นทั้งหมด");
        return;
      }

      setIsSubmitting(true);
      try {
        // Perform uploads
        const idCardUrl = await uploadFile(docs.idCardFile, "id_cards");
        const photoUrl = await uploadFile(docs.photo, "photos");
        const certUrl = await uploadFile(docs.certificate, "certificates");
        const mapUrl = await uploadFile(docs.map, "maps");

        if (!idCardUrl || !photoUrl || !certUrl || !mapUrl) {
          throw new Error("การอัปโหลดไฟล์ล้มเหลว");
        }

        // Update state with URLs
        setFormData((prev) => ({
          ...prev,
          ownerDocs: {
            idCardFile: idCardUrl,
            photo: photoUrl,
            certificate: certUrl,
            map: mapUrl,
          },
        }));

        setCurrentStep(7); // GO TO SUMMARY STEP
      } catch (error) {
        Alert.alert("เกิดข้อผิดพลาด", "ไม่สามารถอัปโหลดไฟล์ได้");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    // ถ้าผ่านทุกเงื่อนไข ให้ไปหน้าถัดไป
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };
  const handleBack = () =>
    currentStep > 1 ? setCurrentStep((prev) => prev - 1) : router.back();

  // Check if current step is the map view (Step 1)
  const isMapStep = currentStep === 1;

  // Check if current step has keyboard (Step 4 = OwnerInfoStep)
  const isKeyboardStep = currentStep === 5;

  useEffect(() => {
    const fetchDraftData = async () => {
      if (!vendorId) return;

      try {
        // 1. Fetch the Contract Draft
        const { data: contract, error: contractError } = await supabase
          .from("contracts")
          .select("*")
          .eq("vendor_id", vendorId)
          .eq("status", "draft")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (contractError) throw contractError;

        if (contract) {
          let zoneInfo = { district_name: "", district: "" };

          // 2. If contract has a zone, fetch zone details separately to avoid Join errors
          if (contract.zone_id) {
            const { data: zoneData } = await supabase
              .from("zones")
              .select("district_name, district")
              .eq("id", contract.zone_id)
              .single();

            if (zoneData) {
              zoneInfo = zoneData;
            }
          }

          // 3. Update the state with all combined data
          setFormData({
            id: contract.id, // Store the contract ID for future updates
            zoneId: contract.zone_id || "",
            zoneName: zoneInfo.district_name || "",
            district: zoneInfo.district || "",
            occupied: 0,
            max: 0,
            shopName: contract.shop_name || "",
            productType: contract.product_type || "",
            startTime: contract.daily_start_time || "",
            endTime: contract.daily_end_time || "",
            assistantsCount: Number(contract.employee) || 0,
            contact: {
              prefix: contract.prefix || "",
              firstName: contract.firstname || "",
              lastName: contract.lastname || "",
              phone: contract.phone || "",
              email: contract.email || "",
              idCard: contract.citizen_id || 0,
            },
            ownerDocs: {
              idCardFile: contract.citizen_id_doc || null,
              photo: contract.owner_photo || null,
              certificate: contract.course_doc || null,
              map: contract.map_doc || null,
            },
          });

          // Jump to Step 3 if we have a draft
          if (contract.zone_id) {
            setCurrentStep(3);
          }

          if (contract && contract.zone_id) {
            const { data: zoneData } = await supabase
              .from("zones")
              .select("district_name, district, max_vendor") // Add max_vendor here
              .eq("id", contract.zone_id)
              .single();

            if (zoneData) {
              // Also fetch how many people are already in this zone
              const { count } = await supabase
                .from("contracts")
                .select("*", { count: "exact", head: true })
                .eq("zone_id", contract.zone_id)
                .eq("status", "active"); // Count only confirmed vendors

              setFormData((prev) => ({
                ...prev,
                zoneName: zoneData.district_name,
                district: zoneData.district,
                max: zoneData.max_vendor, // Set the max capacity
                occupied: count || 0, // Set the current count
              }));
            }
          }
        }
      } catch (err: any) {
        console.error("Error loading draft:", err.message);
      }
    };

    fetchDraftData();
  }, [vendorId]);

  return (
    <View style={styles.container}>
      {/* Header - Only show for non-map steps */}
      {!isMapStep && (
        <View style={styles.header}>
          {currentStep < 7 ? (
            <TouchableOpacity onPress={handleBack}>
              <Ionicons name="chevron-back" size={24} color="black" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 24 }} /> // ใส่ View เปล่าไว้เพื่อให้ Title ยังอยู่ตรงกลาง
          )}
          <Text style={styles.headerTitle}>
            {currentStep === 1 && "แผนที่โซนค้าขาย"}
            {currentStep === 2 && "ข้อมูลพื้นที่ทำการค้า"}
            {(currentStep === 3 || currentStep === 7) &&
              "ลงทะเบียนพื้นที่ทำการค้า"}
            {currentStep === 4 && "ข้อมูลร้านค้า"}
            {currentStep === 5 && "ข้อมูลผู้ขอรับใบอนุญาต"}
            {currentStep === 6 && "อัปโหลดเอกสาร"}
          </Text>
          <View style={{ width: 24 }} />
        </View>
      )}

      {/* Progress Bar: เริ่มแสดงที่ Step 2 (ZoneSummary) เป็นต้นไป */}
      {currentStep > 3 && currentStep < 7 && (
        <View style={styles.progressContainer}>
          <View
            style={[styles.progressStep, currentStep >= 4 && styles.activeStep]}
          />
          <View
            style={[styles.progressStep, currentStep >= 5 && styles.activeStep]}
          />
          <View
            style={[styles.progressStep, currentStep >= 6 && styles.activeStep]}
          />
        </View>
      )}

      {/* Content Area */}
      {isMapStep ? (
        // MAP VIEW - No ScrollView wrapper, full flex
        <View style={styles.mapContent}>{renderStep()}</View>
      ) : isKeyboardStep ? (
        // KEYBOARD STEP (Step 4) - Wrap with KeyboardAvoidingView
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardContainer}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          {renderStep()}
        </KeyboardAvoidingView>
      ) : (
        // OTHER VIEWS - With ScrollView
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          scrollEnabled={true}
          nestedScrollEnabled={false}
          bounces={false}
        >
          {renderStep()}
        </ScrollView>
      )}

      {renderFooterButtons()}
    </View>
  );
}

const styles = StyleSheet.create({
  progressStep: {
    flex: 1,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
  },
  activeStep: {
    backgroundColor: "#28A745",
  },
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // Header styles
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: Platform.OS === "ios" ? 50 : 20,
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F3F5",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    fontFamily: "Anuphan-Bold",
    color: "#1A202C",
  },

  progressContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 8,
    backgroundColor: "white",
  },

  // MAP VIEW - Full screen, no padding
  mapContent: {
    flex: 1,
  },

  // KEYBOARD STEP - KeyboardAvoidingView
  keyboardContainer: {
    flex: 1,
    backgroundColor: "#F5F7FA",
  },

  // OTHER VIEWS - With ScrollView
  content: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  contentContainer: {
    padding: 20,
    paddingTop: 15,
    backgroundColor: "#F8F9FA",
  },

  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F1F3F5",
    backgroundColor: "white",
  },

  // Footer positioned above map (for map step only)
  footerAbsoluteMap: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 50,
  },

  nextButton: {
    backgroundColor: "#4A5568",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  nextButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: "Anuphan-Bold",
  },

  saveDraftButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  saveDraftText: {
    color: "#666",
    fontSize: 14,
    fontFamily: "Anuphan-Regular",
  },
});
