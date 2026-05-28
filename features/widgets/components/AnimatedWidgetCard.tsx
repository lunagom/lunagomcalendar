"use client";

import { motion } from "framer-motion";

type Props = {
  index: number;
  children: React.ReactNode;
};

/**
 * 홈 위젯 카드를 framer-motion 으로 감싸는 래퍼.
 * 페이지 진입 시 index * 60ms stagger 로 fade-in + slide-up.
 * prefers-reduced-motion 사용자는 즉시 표시 (framer-motion 이 자동 처리).
 */
export function AnimatedWidgetCard({ index, children }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
        ease: "easeOut",
      }}
    >
      {children}
    </motion.div>
  );
}
