"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "@/lib/icons";
import { Button, Card, CardBody, CardHead, Field, Input, PageHead } from "@/components/ui";
import { useLims } from "@/components/lims-data-context";
import { useAuth } from "@/lib/auth-context";
import { useConfirm } from "@/lib/confirm-context";
import { apiErrorMessage, setAccessToken } from "@/lib/api-client";
import { ROLE_LABELS, changeOwnPassword, logoutOtherDevices, updateOwnProfile, type RoleId } from "@/lib/users-api";

/**
 * Self-service account page — open to every authenticated role. A user may edit
 * their own name and password only; role, email and status stay admin-only
 * (CONTEXT.md "Self-service").
 */
export default function ProfilePage() {
  const { user, loading } = useAuth();
  const { pushToast } = useLims();
  const router = useRouter();
  const confirm = useConfirm();

  const [name, setName] = useState("");
  const [savingName, setSavingName] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirmNext, setConfirmNext] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwErr, setPwErr] = useState<string | null>(null);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  if (loading || !user) {
    return <div className="grid h-full place-items-center text-[13px] text-muted">กำลังโหลด…</div>;
  }

  const nameDirty = name.trim() !== "" && name.trim() !== user.name;

  const handleSaveName = async () => {
    if (!nameDirty) return;
    setSavingName(true);
    try {
      await updateOwnProfile(name.trim());
      pushToast("บันทึกชื่อเรียบร้อย — จะแสดงผลเต็มที่หลังเข้าสู่ระบบครั้งถัดไป", "teal");
    } catch (err) {
      pushToast(apiErrorMessage(err), "red");
    } finally {
      setSavingName(false);
    }
  };

  const pwOk = current.length > 0 && next.length >= 8 && next === confirmNext;

  const handleChangePw = async () => {
    setPwErr(null);
    if (next !== confirmNext) {
      setPwErr("รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน");
      return;
    }
    if (next.length < 8) {
      setPwErr("รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร");
      return;
    }
    setSavingPw(true);
    try {
      await changeOwnPassword(current, next);
      setCurrent("");
      setNext("");
      setConfirmNext("");
      pushToast("เปลี่ยนรหัสผ่านเรียบร้อย — อุปกรณ์อื่นถูกออกจากระบบแล้ว", "green");
    } catch (err) {
      setPwErr(apiErrorMessage(err));
    } finally {
      setSavingPw(false);
    }
  };

  const handleLogoutEverywhere = async () => {
    const ok = await confirm({
      title: "ออกจากระบบทุกอุปกรณ์",
      message: "จะออกจากระบบทุกอุปกรณ์รวมถึงเครื่องนี้ ต้องเข้าสู่ระบบใหม่",
      confirmText: "ออกจากระบบทุกอุปกรณ์",
      cancelText: "ยกเลิก",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await logoutOtherDevices();
    } catch {
      // even if it fails, drop this session locally
    }
    setAccessToken(null);
    router.replace("/login");
  };

  return (
    <div className="animate-fade mx-auto w-full max-w-140">
      <PageHead title="โปรไฟล์ของฉัน" desc="จัดการชื่อและรหัสผ่านของบัญชีคุณ" />

      <Card className="mb-5">
        <CardHead icon={<Icons.User />} title="ข้อมูลบัญชี" />
        <CardBody className="flex flex-col gap-3.5">
          <Field label="ชื่อ-นามสกุล">
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="อีเมล">
              <Input value={user.email} disabled />
            </Field>
            <Field label="บทบาท (Role)">
              <Input value={ROLE_LABELS[user.role as RoleId] ?? user.role} disabled />
            </Field>
          </div>
          <div className="flex justify-end">
            <Button variant="teal" size="sm" onClick={handleSaveName} disabled={!nameDirty || savingName}>
              <Icons.Check className="h-3.5 w-3.5" />
              {savingName ? "กำลังบันทึก..." : "บันทึกชื่อ"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card className="mb-5">
        <CardHead icon={<Icons.Lock />} title="เปลี่ยนรหัสผ่าน" />
        <CardBody className="flex flex-col gap-3.5">
          <Field label="รหัสผ่านปัจจุบัน">
            <Input value={current} onChange={(e) => setCurrent(e.target.value)} type="password" autoComplete="current-password" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="รหัสผ่านใหม่ (≥ 8 ตัวอักษร)">
              <Input value={next} onChange={(e) => setNext(e.target.value)} type="password" autoComplete="new-password" />
            </Field>
            <Field label="ยืนยันรหัสผ่านใหม่">
              <Input value={confirmNext} onChange={(e) => setConfirmNext(e.target.value)} type="password" autoComplete="new-password" />
            </Field>
          </div>
          <p className="text-[11.5px] text-muted">
            เมื่อเปลี่ยนรหัสผ่าน อุปกรณ์อื่นทั้งหมดจะถูกออกจากระบบ เครื่องนี้ยังใช้งานต่อได้
          </p>
          {pwErr && <p className="text-[12px] text-red">{pwErr}</p>}
          <div className="flex justify-end">
            <Button variant="teal" size="sm" onClick={handleChangePw} disabled={!pwOk || savingPw}>
              {savingPw ? "กำลังเปลี่ยน..." : "เปลี่ยนรหัสผ่าน"}
            </Button>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHead icon={<Icons.Power />} title="ความปลอดภัย" />
        <CardBody className="flex items-center justify-between gap-4">
          <div className="text-[12.5px] text-muted">
            ออกจากระบบทุก session ในทุกอุปกรณ์ รวมถึงเครื่องนี้
          </div>
          <Button variant="ghost" size="sm" className="flex-none text-red" onClick={handleLogoutEverywhere}>
            ออกจากระบบทุกอุปกรณ์
          </Button>
        </CardBody>
      </Card>
    </div>
  );
}
