// lib/nav.ts
import {
  Calendar,
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

/**
 * 사이드바(데스크톱) + 모바일 드로어 메뉴.
 * "하루(/day)" 는 캘린더 헤더의 월간/일간 토글에 흡수되어 메뉴에서 제외.
 * 라우트 자체는 유지 (토글이 /calendar ↔ /day 라우팅).
 */
export const navItems: NavItem[] = [
  { href: "/calendar", label: "캘린더", icon: Calendar },
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
