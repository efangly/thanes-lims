import { apiFetch } from "@/lib/api-client";

/**
 * Vendor master data. Referenced by FK from Equipment, Inventory Items and
 * Purchase Orders, so a vendor typed into one form is the same record everywhere —
 * there is no per-form copy. There is deliberately no delete: the backend has no
 * such endpoint because removing a vendor would orphan the history that points at it.
 */
export interface Vendor {
  id: string;
  name: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
}

interface VendorDTO {
  id: string;
  name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
}

function mapVendor(d: VendorDTO): Vendor {
  return {
    id: d.id,
    name: d.name,
    contactName: d.contact_name,
    contactPhone: d.contact_phone,
    contactEmail: d.contact_email,
    address: d.address,
  };
}

export interface VendorInput {
  name: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  address?: string;
}

function toBody(v: VendorInput) {
  return JSON.stringify({
    name: v.name,
    contact_name: v.contactName ?? "",
    contact_phone: v.contactPhone ?? "",
    contact_email: v.contactEmail ?? "",
    address: v.address ?? "",
  });
}

export async function listVendors(): Promise<Vendor[]> {
  const rows = await apiFetch<VendorDTO[]>("/vendors");
  return rows.map(mapVendor);
}

export async function createVendor(input: VendorInput): Promise<Vendor> {
  return mapVendor(await apiFetch<VendorDTO>("/vendors", { method: "POST", body: toBody(input) }));
}

/** The backend's update is a full replace, so send every field, not just the changed ones. */
export async function updateVendor(id: string, input: VendorInput): Promise<Vendor> {
  return mapVendor(await apiFetch<VendorDTO>(`/vendors/${id}`, { method: "PATCH", body: toBody(input) }));
}
