import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCalendars } from "@/features/calendar/server/queries";
import { SettingsClient } from "@/features/settings/components/SettingsClient";

export const metadata = { title: "설정" };

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nickname")
    .eq("id", user.id)
    .maybeSingle();

  const calendars = await getCalendars();

  return (
    <SettingsClient
      email={user.email ?? ""}
      initialNickname={profile?.nickname ?? ""}
      calendars={calendars}
    />
  );
}
