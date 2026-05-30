import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개인정보 처리방침",
  description: "루나곰 캘린더 개인정보 처리방침.",
};

const EFFECTIVE_DATE = "2026년 5월 30일";
const CONTACT_EMAIL = "colri25@gmail.com";

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12 md:py-16">
      <div className="mb-8 flex items-center justify-between gap-4 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          ← 홈으로
        </Link>
        <span>시행일: {EFFECTIVE_DATE}</span>
      </div>

      <h1 className="mb-2 text-3xl font-semibold tracking-tight">
        개인정보 처리방침
      </h1>
      <p className="mb-10 text-sm text-muted-foreground">
        루나곰 캘린더(이하 &ldquo;서비스&rdquo;)는 이용자의 개인정보를 소중히
        다루며, 「개인정보 보호법」 등 관련 법령을 준수합니다.
      </p>

      <Section title="1. 수집하는 개인정보 항목">
        <p>서비스 이용 과정에서 다음 정보가 수집·생성됩니다.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>회원가입 시(필수)</strong>: 이메일, 비밀번호(암호화 저장),
            표시 이름
          </li>
          <li>
            <strong>카카오/구글 소셜 로그인 시(필수)</strong>: 이메일, 이름,
            프로필 사진(선택)
          </li>
          <li>
            <strong>서비스 이용 중(선택)</strong>: 일정, 할 일, 가계부(지출·수입·구독·예산),
            메모, 캘린더 색상 설정, 카드 이름, 부부 연결 정보
          </li>
          <li>
            <strong>자동 수집</strong>: 접속 IP, 브라우저/OS 정보, 쿠키, 오류
            로그, 익명 페이지뷰 통계
          </li>
        </ul>
      </Section>

      <Section title="2. 개인정보 수집·이용 목적">
        <ul className="ml-4 list-disc space-y-1">
          <li>회원 식별 및 인증, 로그인 유지</li>
          <li>일정·가계부 등 서비스 핵심 기능 제공</li>
          <li>부부 공유 등 이용자 동의 기반 공유 기능 제공</li>
          <li>서비스 안정성 확보, 오류 추적 및 개선</li>
          <li>이용 통계 분석 및 서비스 품질 향상</li>
        </ul>
      </Section>

      <Section title="3. 보유 및 이용 기간">
        <p>
          이용자의 개인정보는 회원 탈퇴 시까지 보유·이용하며, 탈퇴 요청 시
          지체 없이 파기합니다. 단, 관련 법령에 따라 보관이 필요한 경우 해당
          기간 동안 보관합니다.
        </p>
      </Section>

      <Section title="4. 제3자 제공 및 처리 위탁">
        <p>서비스는 다음 업체에 개인정보 처리를 위탁합니다.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>
            <strong>Supabase Inc.</strong> — 인증, 데이터베이스, 파일 저장 (미국)
          </li>
          <li>
            <strong>Vercel Inc.</strong> — 웹 호스팅 및 익명 사용 통계 (미국)
          </li>
          <li>
            <strong>Sentry (Functional Software, Inc.)</strong> — 오류 추적 (미국)
          </li>
          <li>
            <strong>Kakao Corp.</strong> — 카카오 로그인 (대한민국)
          </li>
          <li>
            <strong>Google LLC</strong> — 구글 로그인 (미국)
          </li>
        </ul>
        <p>
          위 업체 외 제3자에게는 이용자의 사전 동의 없이 개인정보를 제공하지
          않습니다. 부부 공유 기능은 이용자가 직접 상대를 초대·수락하는 경우에
          한해 동의 범위 내에서 데이터를 공유합니다.
        </p>
      </Section>

      <Section title="5. 정보주체의 권리">
        <p>이용자는 언제든지 다음 권리를 행사할 수 있습니다.</p>
        <ul className="ml-4 list-disc space-y-1">
          <li>개인정보 열람·정정·삭제·처리정지 요구</li>
          <li>회원 탈퇴를 통한 전체 데이터 삭제</li>
          <li>소셜 로그인 연결 해제</li>
        </ul>
        <p>
          위 권리는 서비스 내 설정에서 직접 행사하거나, 아래 연락처로 요청할 수
          있습니다.
        </p>
      </Section>

      <Section title="6. 개인정보의 안전성 확보 조치">
        <ul className="ml-4 list-disc space-y-1">
          <li>비밀번호 단방향 암호화 저장 (bcrypt)</li>
          <li>전송 구간 TLS 암호화</li>
          <li>행 수준 보안(RLS)으로 이용자별 데이터 접근 격리</li>
          <li>접근 로그 기록 및 비정상 접근 모니터링</li>
        </ul>
      </Section>

      <Section title="7. 쿠키 사용">
        <p>
          서비스는 로그인 세션 유지를 위해 필수 쿠키를 사용합니다. 분석용 쿠키는
          익명 통계 목적에 한해 사용됩니다. 브라우저 설정에서 쿠키 거부가
          가능하나, 이 경우 로그인 등 일부 기능을 이용할 수 없습니다.
        </p>
      </Section>

      <Section title="8. 만 14세 미만 아동의 개인정보">
        <p>
          서비스는 만 14세 미만 아동의 개인정보를 의도적으로 수집하지 않습니다.
          만 14세 미만 아동이 가입한 사실이 확인되는 경우 즉시 해당 계정을
          삭제합니다.
        </p>
      </Section>

      <Section title="9. 개인정보 보호책임자">
        <ul className="ml-4 list-disc space-y-1">
          <li>책임자: 루나곰 캘린더 운영자</li>
          <li>
            연락처:{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-primary underline-offset-4 hover:underline"
            >
              {CONTACT_EMAIL}
            </a>
          </li>
        </ul>
      </Section>

      <Section title="10. 처리방침 변경">
        <p>
          본 처리방침은 법령·서비스 변경에 따라 개정될 수 있으며, 중요한 변경
          시 서비스 내 공지를 통해 사전에 안내합니다.
        </p>
      </Section>

      <p className="mt-12 text-sm text-muted-foreground">
        시행일: {EFFECTIVE_DATE}
      </p>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 space-y-3 text-sm leading-relaxed">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-foreground/80">{children}</div>
    </section>
  );
}
