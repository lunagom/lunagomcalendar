import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCalendars } from "@/features/calendar/server/queries";
import { normalizeHidden } from "@/features/widgets/lib/items";
import { SettingsClient } from "@/features/settings/components/SettingsClient";
import { PartnerSection } from "@/features/partnership/components/PartnerSection";
import type { NotificationPrefs } from "@/features/settings/server/actions";

export const metadata = { title: "설정" };

const DEFAULT_PREFS: NotificationPrefs = {
  partnership_invite: true,
  partnership_accepted: true,
  partnership_ended: true,
  daily_summary: true,
};

function parsePrefs(raw: unknown): NotificationPrefs {
  if (!raw || typeof raw !== "object") return DEFAULT_PREFS;
  const o = raw as Record<string, unknown>;
  return {
    partnership_invite:
      typeof o.partnership_invite === "boolean" ? o.partnership_invite : true,
    partnership_accepted:
      typeof o.partnership_accepted === "boolean" ? o.partnership_accepted : true,
    partnership_ended:
      typeof o.partnership_ended === "boolean" ? o.partnership_ended : true,
    daily_summary:
      typeof o.daily_summary === "boolean" ? o.daily_summary : true,
  };
}

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname, widget_visibility, notification_prefs")
    .eq("id", user.id)
    .maybeSingle();

  const calendars = await getCalendars();

  return (
    <SettingsClient
      email={user.email ?? ""}
      initialNickname={profile?.nickname ?? ""}
      initialHiddenWidgets={normalizeHidden(profile?.widget_visibility)}
      initialNotificationPrefs={parsePrefs(profile?.notification_prefs)}
      calendars={calendars}
      partnerSlot={<PartnerSection />}
    />
  );
}
