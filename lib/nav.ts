// lib/nav.ts
import {
  Home,
  Calendar,
  CheckSquare,
  Wallet,
  Users,
  Settings,
  MessageSquare,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** 사이드바(데스크톱) + 모바일 드로어 메뉴. */
export const navItems: NavItem[] = [
  { href: "/", label: "홈", icon: Home },
  { href: "/calendar", label: "캘린더", icon: Calendar },
  { href: "/todos", label: "주간 할 일", icon: CheckSquare },
  { href: "/expense", label: "가계부", icon: Wallet },
  { href: "/board", label: "게시판", icon: MessageSquare },
  { href: "/social", label: "공유", icon: Users },
  { href: "/settings", label: "설정", icon: Settings },
];

export type MobileTabItem =
  | { kind: "link"; href: string; label: string; icon: LucideIcon }
  | { kind: "more"; label: string; icon: LucideIcon };

/** 모바일 하단 탭바 5개. */
export const mobileTabItems: MobileTabItem[] = [
  { kind: "link", href: "/", label: "홈", icon: Home },
  { kind: "link", href: "/calendar", label: "캘린더", icon: Calendar },
  { kind: "link", href: "/todos", label: "할 일", icon: CheckSquare },
  { kind: "link", href: "/expense", label: "가계부", icon: Wallet },
  { kind: "more", label: "더보기", icon: MoreHorizontal },
];
