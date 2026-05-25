import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getCalendars } from "@/features/calendar/server/queries";
import { getPostsForCalendar } from "@/features/board/server/queries";
import { BoardClient } from "@/features/board/components/BoardClient";

export const metadata = { title: "게시판" };

export default async function BoardPage({
  searchParams,
}: {
  searchParams: { cal?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const calendars = await getCalendars();

  if (calendars.length === 0) {
    return (
      <BoardClient
        calendars={[]}
        currentCalendarId={null}
        posts={[]}
        currentUserId={user.id}
      />
    );
  }

  const currentId =
    searchParams.cal && calendars.some((c) => c.id === searchParams.cal)
      ? searchParams.cal
      : calendars[0].id;
  const posts = await getPostsForCalendar(currentId);

  return (
    <BoardClient
      calendars={calendars}
      currentCalendarId={currentId}
      posts={posts}
      currentUserId={user.id}
    />
  );
}
