import { redirect } from "next/navigation";

// 루트는 캘린더로 보낸다. 캘린더가 앱의 기본 진입점이다.
export default function Home() {
  redirect("/calendar");
}
