"use client";

import { useTransition } from "react";

import { signInWithOAuth } from "@/app/(auth)/login/actions";

/**
 * 카카오 / 구글 소셜 로그인 버튼.
 * 둘 다 form action 으로 server action 호출.
 * 브랜드 컬러는 각 플랫폼 가이드에 맞춤 (카카오 옐로우 #FEE500, 구글 화이트 라인).
 */
export function SocialButtons({ next }: { next?: string }) {
  const [isPending, startTransition] = useTransition();

  const handle = (provider: "kakao" | "google") => {
    startTransition(async () => {
      await signInWithOAuth(provider, next);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => handle("kakao")}
        className="
          flex h-11 items-center justify-center gap-2 rounded-lg
          bg-[#FEE500] text-[#191600] text-sm font-medium
          transition-opacity hover:opacity-90 disabled:opacity-50
        "
      >
        <KakaoIcon />
        카카오로 시작하기
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => handle("google")}
        className="
          flex h-11 items-center justify-center gap-2 rounded-lg
          border border-border bg-card text-sm font-medium
          transition-colors hover:bg-accent hover:text-accent-foreground
          disabled:opacity-50
        "
      >
        <GoogleIcon />
        Google로 시작하기
      </button>
    </div>
  );
}

function KakaoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 3C6.477 3 2 6.582 2 10.99c0 2.86 1.876 5.366 4.7 6.778-.208.78-.756 2.836-.866 3.276-.137.546.2.539.42.392.173-.115 2.751-1.87 3.864-2.625.621.092 1.26.14 1.882.14 5.523 0 10-3.582 10-7.991C22 6.582 17.523 3 12 3Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M21.6 12.227c0-.71-.064-1.391-.183-2.045H12v3.868h5.382a4.6 4.6 0 0 1-1.995 3.018v2.5h3.232c1.891-1.744 2.981-4.31 2.981-7.341Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.964-.894 6.619-2.432l-3.232-2.5c-.895.6-2.04.954-3.387.954-2.605 0-4.81-1.76-5.596-4.124H3.064v2.59A9.996 9.996 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.404 13.898A5.996 5.996 0 0 1 6.09 12c0-.659.114-1.298.314-1.898v-2.59H3.064a9.996 9.996 0 0 0 0 8.977l3.34-2.59Z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.977c1.469 0 2.788.505 3.825 1.496l2.868-2.868C16.96 2.99 14.695 2 12 2 8.087 2 4.708 4.246 3.064 7.512l3.34 2.59C7.19 7.737 9.395 5.977 12 5.977Z"
        fill="#EA4335"
      />
    </svg>
  );
}
