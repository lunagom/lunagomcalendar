import { Calendar, Wallet, Users, Settings } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

// 사용자 명시: 좌측 사이드바 메뉴 — 캘린더 / 가계부 / 공유 / 설정
export const navItems: NavItem[] = [
  { href: "/calendar", label: "캘린더", icon: Calendar },
  { href: "/expense", label: "가계부", icon: Wallet },
  { href: "/social", label: "공유", icon: Users },
  { href: "/settings", label: "설정", icon: Settings },
];
