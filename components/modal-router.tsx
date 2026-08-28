"use client";

import { AddSampleModal } from "@/components/modals/add-sample";
import { ScanBarcodeModal } from "@/components/modals/scan-barcode";
import { AddEquipmentModal } from "@/components/modals/add-equipment";
import { ExportAuditReportModal } from "@/components/modals/export-audit-report";
import { AddSensorModal } from "@/components/modals/add-sensor";
import { AlertThresholdsModal } from "@/components/modals/alert-thresholds";
import { AddInventoryModal } from "@/components/modals/add-inventory";
import { OrderHistoryModal } from "@/components/modals/order-history";
import { UploadDocumentModal } from "@/components/modals/upload-document";
import { ManageAccessModal } from "@/components/modals/manage-access";
import { OpenTestOrderModal } from "@/components/modals/open-test-order";
import { GenerateReportModal } from "@/components/modals/generate-report";
import { RecordCalibrationModal } from "@/components/modals/record-calibration";

export function ModalRouter() {
  return (
    <>
      <AddSampleModal />
      <ScanBarcodeModal />
      <AddEquipmentModal />
      <ExportAuditReportModal />
      <AddSensorModal />
      <AlertThresholdsModal />
      <AddInventoryModal />
      <OrderHistoryModal />
      <UploadDocumentModal />
      <ManageAccessModal />
      <OpenTestOrderModal />
      <GenerateReportModal />
      <RecordCalibrationModal />
    </>
  );
}
