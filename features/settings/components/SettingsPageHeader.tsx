/**
 * 설정 페이지 헤더 — h1 + 부제.
 */
export function SettingsPageHeader() {
  return (
    <header className="mb-4">
      <h1 className="text-2xl font-bold">설정</h1>
      <p className="text-sm text-muted-foreground">
        계정과 환경설정을 관리해요
      </p>
    </header>
  );
}
