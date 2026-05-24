"use client";

import { create } from "zustand";

type MobileDrawerState = {
  open: boolean;
  setOpen: (open: boolean) => void;
};

/**
 * 모바일 헤더 햄버거와 하단 탭바 "더보기" 가 공유하는 드로어 열림 상태.
 * UI 임시 상태라 persist 하지 않음.
 */
export const useMobileDrawerStore = create<MobileDrawerState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
