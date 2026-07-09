"use client";

import { useEffect } from "react";
import { recordFamilyClick } from "@/lib/click-tracker";

/** Ürün detay sayfası açıldığında ilgili aile için tıklamayı kaydeder. */
export function FamilyClickTracker({ familyId }: { familyId: string }) {
  useEffect(() => {
    recordFamilyClick(familyId);
  }, [familyId]);

  return null;
}
