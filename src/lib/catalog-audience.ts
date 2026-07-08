import { cookies } from "next/headers";
import { DEVICE_ACTOR_TYPE_COOKIE } from "@/lib/device-cookie";

export type CatalogAudience = "default" | "dealer";

export function toCatalogAudience(actorType: string | null | undefined): CatalogAudience {
  return actorType === "dealer" ? "dealer" : "default";
}

export async function getCatalogAudienceFromCookies(): Promise<CatalogAudience> {
  const actorType = (await cookies()).get(DEVICE_ACTOR_TYPE_COOKIE)?.value;
  return toCatalogAudience(actorType);
}
