// types/contract.ts

export interface ContractFormData {
  // หน้า 1: เลือกโซน (Vending Zone Map)
  id: string;
  zoneId: string;
  zoneName: string;
  district: string;
  occupied: number;
  max: number;

  // หน้า 2: ข้อมูลธุรกิจ (Zone Registration-1.png)
  shopName: string;
  productType: string;
  startTime: string;
  endTime: string;
  assistantsCount: number;

  // หน้า 3: ข้อมูลผู้ติดต่อ (Zone Registration-5.png)
  contact: {
    prefix: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    idCard: number;
  };

  // หน้า 4-5: เอกสารเจ้าของ (Zone Registration-2.png)
  ownerDocs: {
    idCardFile: any;
    photo: any;
    certificate: any;
    map: any;
  };

  // หน้า 6-7: เอกสารผู้ช่วย (Zone Registration-3.png)
  // ใช้ Array เพราะผู้ช่วยอาจมีหลายคนตามจำนวนที่กรอกในหน้า 2
}
