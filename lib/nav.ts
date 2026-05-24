// lib/nav.ts
import {
  Calendar,
  CalendarDays,
  CheckSquare,
  Wallet,
  Users,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** 사이드바(데스크톱) + 모바일 드로어 메뉴. 전 페이지 노출. */
export const navItems: NavItem[] = [
  { href: "/calendar", label: "캘린더", icon: Calendar },
  { href: "/day", label: "하루", icon: CalendarDays },
  { href: "/todos", label: "오늘의 할 일", icon: CheckSquare },
  { href: "/expense", label: "가계부", icon: Wallet },
  { href: "/social", label: "공유", icon: Users },
  { href: "/settings", label: "설정", icon: Settings },
];

export type MobileTabItem =
  | { kind: "link"; href: string; label: string; icon: LucideIcon }
  | { kind: "more"; label: string; icon: LucideIcon };

/**
 * 모바일 하단 탭바 4개. iOS 패턴.
 * "더보기" 는 헤더 햄버거와 같은 드로어를 연다 ({@link useMobileDrawerStore}).
 */
export const mobileTabItems: MobileTabItem[] = [
  { kind: "link", href: "/calendar", label: "캘린더", icon: Calendar },
  { kind: "link", href: "/todos", label: "할 일", icon: CheckSquare },
  { kind: "link", href: "/expense", label: "가계부", icon: Wallet },
  { kind: "more", label: "더보기", icon: MoreHorizontal },
];
