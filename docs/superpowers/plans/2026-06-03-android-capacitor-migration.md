# 안드로이드 Capacitor 마이그레이션 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 기존 TWA (Bubblewrap) 안드로이드 앱을 Capacitor 로 갈아엎되, **기존 키스토어 / 패키지 ID / Asset Links 를 그대로 유지**해서 출시 작업 자산 손실 0 으로 만든다. Capacitor 전환 후 앱이 기존 TWA 와 동일하게 동작해야 한다 (로그인 / 캘린더 / 가계부 전부 정상).

**Architecture:** Capacitor 의 `server.url` 원격 모드를 사용해 웹뷰가 `https://lunabear-calendar.vercel.app` 을 그대로 띄운다 (정적 export 안 함). 안드로이드 영역은 비어 있는 Capacitor 기본 쉘 + signingConfig 만 기존 키스토어로 변경. Phase B (다음 plan) 에서 이 비어있는 안드로이드 영역에 위젯 코드를 박아넣는다.

**Tech Stack:**
- `@capacitor/core`, `@capacitor/cli`, `@capacitor/android` (최신 v6 또는 v7)
- `@capacitor/app` — deep link 처리 (Task 9 에서 조건부)
- 기존 키스토어 `C:\dev\lunabear-android\android.keystore`
- 기존 패키지 ID `app.lunagom.calendar`

**전제 자산 (변경 불가):**
- 키스토어: `C:\dev\lunabear-android\android.keystore`
- 키스토어 비밀번호: 사용자 비밀번호 매니저에 보관 (Task 5 에서 사용자에게 입력 요청)
- Key alias: `android`
- SHA256: `46:5B:66:E8:0F:3C:B3:E5:6A:A1:E6:7C:F5:02:70:AC:8C:84:E8:64:1E:15:09:3E:7C:2D:3F:6C:49:8B:80:43`
- Asset Links: `https://lunabear-calendar.vercel.app/.well-known/assetlinks.json` (이미 배포됨, 같은 SHA256)

**관련 문서:**
- 디자인: `docs/superpowers/specs/2026-06-03-android-widgets-design.md`
- 이전 안드로이드 작업: 메모리 `project-lunabear-android-plan`

---

## File Structure

### 추가 파일
| 파일 | 책임 |
|---|---|
| `capacitor.config.ts` | Capacitor 설정 — `server.url` 모드로 vercel.app 원격 띄움 |
| `out/index.html` | webDir 더미 (Capacitor CLI 가 요구하지만 server.url 모드에선 안 씀) |
| `android/` (디렉토리 전체) | `npx cap add android` 가 생성하는 안드로이드 프로젝트 — 거의 손 안 댐 |
| `android/app/android.keystore` | 기존 키스토어 복사본 |
| `android/keystore.properties` | 키스토어 비밀번호 — **git 제외** |
| `lib/platform.ts` | `isCapacitorEnvironment()` 유틸 함수 |
| `lib/platform.test.ts` | 유틸 단위 테스트 |

### 수정 파일
| 파일 | 변경 |
|---|---|
| `package.json` | Capacitor 의존성 추가 |
| `.gitignore` | `keystore.properties`, `android/.gradle/`, `android/build/`, `android/app/build/`, `out/` 추가 |
| `components/service-worker-register.tsx` | Capacitor 환경에서는 SW 등록 skip |
| `android/app/build.gradle` | `signingConfig` 기존 키스토어 사용 |
| `android/app/src/main/AndroidManifest.xml` | (Task 9 조건부) deep link intent-filter |
| `app/(auth)/login/actions.ts` | (Task 9 조건부) Capacitor 환경 시 redirect 변경 |

### 검증 게이트
- **Task 6 (첫 빌드 게이트)**: 폰에서 앱 켜져서 로그인까지 동작 — 통과해야 Task 7 으로 진행
- **Task 8 (OAuth 검증)**: 구글 로그인 끝까지 동작 — 통과하면 Task 9 skip 가능, 실패면 Task 9 진행
- **Task 10 (종합 검증)**: 디자인 스펙 섹션 10 의 "Capacitor 마이그레이션" 체크리스트 전부 통과

---

## Task 1: 작업 branch 생성 + TWA 백업

**Files:**
- Modify: git refs (새 브랜치)
- Create: `C:\dev\lunabear-android-twa-backup-2026-06-03\` (백업 디렉토리)

- [ ] **Step 1: 작업 브랜치 생성**

```bash
cd /c/dev/lunabear-calendar
git checkout -b feat/android-capacitor
```

Expected: `Switched to a new branch 'feat/android-capacitor'`

- [ ] **Step 2: 기존 TWA 디렉토리 백업**

```bash
cp -r /c/dev/lunabear-android /c/dev/lunabear-android-twa-backup-2026-06-03
ls /c/dev/lunabear-android-twa-backup-2026-06-03/ | head -5
```

Expected: `android.keystore`, `app-release-bundle.aab`, `app-release-signed.apk`, `twa-manifest.json` 등이 보임.

이유: 이 plan 도중 뭔가 잘못되면 TWA 환경으로 복귀 가능.

- [ ] **Step 3: 디자인 문서 commit (아직 staged 만 됨)**

```bash
git add docs/superpowers/specs/2026-06-03-android-widgets-design.md
git commit -m "docs(android): 위젯 디자인 스펙

- TWA -> Capacitor 마이그레이션 결정
- 캘린더 위젯 5x6 + 가계부 위젯 5x2 사양
- 라이트 고정 + 투명도 5단계 조절"
```

Expected: 커밋 성공.

---

## Task 2: Capacitor 의존성 설치

**Files:**
- Modify: `package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Capacitor 패키지 설치**

```bash
cd /c/dev/lunabear-calendar
pnpm add @capacitor/core @capacitor/cli @capacitor/android
```

Expected: 3개 패키지 + 의존성 설치, `package.json` 의 `dependencies` 에 추가됨.

만약 `pnpm-workspace.yaml` 관련 에러 또는 sharp 관련 에러:
```bash
pnpm add @capacitor/core @capacitor/cli @capacitor/android --ignore-workspace
```

- [ ] **Step 2: 버전 확인**

```bash
cd /c/dev/lunabear-calendar
pnpm list @capacitor/core @capacitor/cli @capacitor/android
```

Expected: 세 패키지 모두 같은 메이저 버전 (예: 모두 6.x 또는 모두 7.x).

같은 메이저가 아니면 강제로 맞추기:
```bash
pnpm add @capacitor/core@latest @capacitor/cli@latest @capacitor/android@latest
```

- [ ] **Step 3: package.json 변경 확인**

```bash
cd /c/dev/lunabear-calendar
git diff package.json | head -20
```

Expected: dependencies 에 세 패키지 추가됨.

- [ ] **Step 4: 커밋**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps(android): Capacitor core/cli/android 설치"
```

---

## Task 3: capacitor.config.ts + webDir 더미

**Files:**
- Create: `capacitor.config.ts`
- Create: `out/index.html`
- Modify: `.gitignore`

- [ ] **Step 1: capacitor.config.ts 작성**

`C:\dev\lunabear-calendar\capacitor.config.ts`:

```typescript
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lunagom.calendar",
  appName: "루나곰 캘린더",
  webDir: "out",
  server: {
    url: "https://lunabear-calendar.vercel.app",
    cleartext: false,
    allowNavigation: [
      "lunabear-calendar.vercel.app",
      "*.supabase.co",
      "accounts.google.com",
      "kauth.kakao.com",
      "kapi.kakao.com",
    ],
  },
  android: {
    allowMixedContent: false,
    backgroundColor: "#ffffff",
  },
};

export default config;
```

이유:
- `server.url` 로 vercel.app 을 웹뷰에 띄움 → 정적 export 안 함, Server Actions / RSC 그대로 동작
- `allowNavigation` 에 Supabase + OAuth 호스트들 — 외부 도메인 클릭 시 웹뷰 안에서 열기 허용
- `webDir: "out"` — Capacitor CLI 가 항상 webDir 디렉토리 존재 요구, server.url 모드여도 더미 필요

- [ ] **Step 2: webDir 더미 디렉토리 + index.html 생성**

`C:\dev\lunabear-calendar\out\index.html`:

```html
<!doctype html>
<html><body>Capacitor server.url 모드 — 이 파일은 사용되지 않음.</body></html>
```

- [ ] **Step 3: .gitignore 갱신**

`C:\dev\lunabear-calendar\.gitignore` 끝에 추가:

```
# Capacitor webDir 더미 (server.url 모드라 실제 사용 안 됨)
/out

# Capacitor 안드로이드 빌드 산출물
/android/.gradle/
/android/build/
/android/app/build/
/android/local.properties
/android/captures/

# 키스토어 비밀번호 (Task 5 에서 생성)
/android/keystore.properties
```

- [ ] **Step 4: 커밋**

```bash
cd /c/dev/lunabear-calendar
git add capacitor.config.ts .gitignore
git commit -m "feat(android): Capacitor 설정 — server.url 원격 모드"
```

`out/` 는 `.gitignore` 처리되어 commit 안 됨 — 의도된 동작.

---

## Task 4: 안드로이드 프로젝트 생성

**Files:**
- Create: `android/` (전체 디렉토리 — `npx cap add android` 가 생성)

- [ ] **Step 1: `npx cap add android` 실행**

```bash
cd /c/dev/lunabear-calendar
npx cap add android
```

Expected:
- `android/` 디렉토리 생성
- 출력 마지막에 `✔ add android` 표시
- 안드로이드 SDK 자동 감지 (이전 Bubblewrap 작업으로 `C:\Users\aarg1\.bubblewrap\` 에 SDK 있음, 또는 별도 설치)

만약 SDK 못 찾는 에러:
- 환경 변수 `ANDROID_HOME` 또는 `ANDROID_SDK_ROOT` 설정 필요
- 임시: PowerShell 에서 `$env:ANDROID_HOME = "C:\Users\aarg1\.bubblewrap\android_sdk"` 후 재시도

- [ ] **Step 2: 생성된 구조 확인**

```bash
cd /c/dev/lunabear-calendar
ls android/
ls android/app/src/main/
cat android/app/src/main/AndroidManifest.xml | head -20
```

Expected:
- `android/` 안에 `app/`, `gradle/`, `build.gradle`, `settings.gradle` 등
- `android/app/src/main/` 안에 `AndroidManifest.xml`, `java/`, `res/`
- `AndroidManifest.xml` 의 package 가 `app.lunagom.calendar`

- [ ] **Step 3: 패키지 ID 확인**

```bash
grep -r "app.lunagom.calendar" android/app/build.gradle android/app/src/main/AndroidManifest.xml
```

Expected: 두 파일에서 `app.lunagom.calendar` 발견.

만약 다른 ID 로 생성됐다면 capacitor.config.ts 의 `appId` 잘못된 것 — Task 3 으로 돌아가 수정 후 `npx cap sync android` 재실행.

- [ ] **Step 4: 커밋 (큰 변경, 별도 커밋)**

```bash
cd /c/dev/lunabear-calendar
git add android/ -- ':!android/.gradle' ':!android/build' ':!android/local.properties'
git status -s | head -20
```

Expected: 수십 개 파일이 staged 상태 (Gradle wrapper, Java, res 등).

```bash
git commit -m "feat(android): Capacitor 안드로이드 프로젝트 생성"
```

---

## Task 5: 키스토어 이전 + signing 설정

**Files:**
- Create: `android/app/android.keystore` (기존 파일 복사)
- Create: `android/keystore.properties` (비밀번호, git 제외)
- Modify: `android/app/build.gradle`

- [ ] **Step 1: 키스토어 복사**

```bash
cp /c/dev/lunabear-android/android.keystore /c/dev/lunabear-calendar/android/app/android.keystore
ls -la /c/dev/lunabear-calendar/android/app/android.keystore
```

Expected: 약 2666 bytes 파일 존재.

- [ ] **Step 2: 사용자에게 키스토어 비밀번호 받기**

> **사용자에게 질문:** "키스토어 비밀번호를 알려주세요. 비밀번호 매니저에 저장하셨던 값입니다. (안 보이는 형태로 입력해주시면 좋아요)"

받은 비밀번호를 `<KEYSTORE_PASSWORD>` 로 표기.

- [ ] **Step 3: keystore.properties 생성**

`C:\dev\lunabear-calendar\android\keystore.properties`:

```properties
storeFile=android.keystore
storePassword=<KEYSTORE_PASSWORD>
keyAlias=android
keyPassword=<KEYSTORE_PASSWORD>
```

(키스토어 만들 때 store password 와 key password 를 같게 설정했음 — 이전 세션 확인)

- [ ] **Step 4: .gitignore 에 keystore.properties 추가 확인**

Task 3 의 .gitignore 에 이미 `/android/keystore.properties` 추가됨. 확인:

```bash
cd /c/dev/lunabear-calendar
grep keystore.properties .gitignore
git status android/keystore.properties
```

Expected: 첫 명령은 `/android/keystore.properties` 출력, 두 번째 명령은 (해당 파일 ignored 라서) 아무것도 출력 안 함.

만약 ignore 안 된 상태로 보이면 commit 전에 절대 staged 시키지 말 것.

- [ ] **Step 5: android/app/build.gradle 수정**

`android/app/build.gradle` 의 `android { ... }` 블록 안에 `signingConfigs` 와 `buildTypes.release` 추가.

기존 코드에서 `android { ... }` 블록 찾고, 그 안에 다음을 추가:

```gradle
// 파일 상단 (apply plugin 위에) 키스토어 properties 로드
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

android {
    // ... 기존 설정 그대로 ...

    signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFiles('proguard-android-optimize.txt'), 'proguard-rules.pro'
            signingConfig signingConfigs.release
        }
    }
}
```

이유:
- `keystore.properties` 가 없는 빌드 환경 (다른 사람 / CI) 에서도 컴파일은 가능하게 `if (keystorePropertiesFile.exists())` 가드
- `storeFile file(...)` 의 경로는 `android/app/` 기준 — `android.keystore` 가 거기 있어야 함 (Step 1 에서 거기 복사함)

- [ ] **Step 6: 커밋 (keystore.properties 제외)**

```bash
cd /c/dev/lunabear-calendar
git add android/app/android.keystore android/app/build.gradle
git status android/keystore.properties
```

마지막 명령이 빈 출력이어야 함 (ignored). 아니면 STOP 하고 .gitignore 다시 확인.

```bash
git commit -m "feat(android): 기존 TWA 키스토어 이전 + signingConfig"
```

---

## Task 6: 첫 빌드 + 폰 설치 (검증 게이트 🚦)

**Files:** (코드 변경 없음, 빌드 + 실기기 확인)

이 task 가 **가장 큰 게이트**. 통과 못 하면 Task 7 으로 진행 금지.

- [ ] **Step 1: 폰 USB 디버깅 ON 확인**

> **사용자에게 안내:** "폰을 USB 로 연결하고 USB 디버깅을 켜주세요. '이 컴퓨터를 항상 허용' 체크 후 허용."

- [ ] **Step 2: ADB 로 폰 인식 확인**

```bash
& "C:\Users\aarg1\.bubblewrap\android_sdk\platform-tools\adb.exe" devices
```

Expected: `List of devices attached` 아래에 폰의 시리얼 + `device` 표시.

만약 `unauthorized` 표시면: 폰 화면에서 USB 디버깅 허용 팝업 → "허용" 탭.

- [ ] **Step 3: 기존 TWA 앱 제거 (있을 경우)**

```bash
& "C:\Users\aarg1\.bubblewrap\android_sdk\platform-tools\adb.exe" uninstall app.lunagom.calendar
```

Expected: `Success` 또는 `Failure [DELETE_FAILED_INTERNAL_ERROR]` (이미 없으면).

이유: 같은 package ID, 같은 키스토어라 업그레이드로 덮어쓰기 가능하지만, 마이그레이션 검증을 깨끗한 상태에서 하려고.

- [ ] **Step 4: Capacitor sync (config → android 반영)**

```bash
cd /c/dev/lunabear-calendar
npx cap sync android
```

Expected: `✔ Sync finished` 메시지.

- [ ] **Step 5: 안드로이드 빌드 + 폰 설치**

```bash
cd /c/dev/lunabear-calendar
npx cap run android
```

Expected:
- Gradle 빌드 (첫 빌드는 5~15분 — 의존성 다운로드)
- 빌드 성공 후 자동으로 폰에 설치 + 앱 시작
- 폰 화면에 vercel.app 의 루나곰 캘린더가 풀스크린으로 뜸

**막힐 만한 부분 1 — Gradle JDK 호환:**
에러 `Unsupported class file major version` 또는 `Could not find tools.jar`:
- JDK 17 사용 필요 — `C:\Users\aarg1\.bubblewrap\jdk\jdk-17.0.11+9` 가 있음
- `$env:JAVA_HOME = "C:\Users\aarg1\.bubblewrap\jdk\jdk-17.0.11+9"` 후 재시도

**막힐 만한 부분 2 — 백신 (알약):**
- 이전 세션에서 Bubblewrap 빌드 중 백신이 Gradle 프로세스 죽임
- 빌드 시작 전 백신 일시 정지 + `~/.bubblewrap`, `C:\dev\lunabear-calendar\android` 예외 추가

- [ ] **Step 6: 폰에서 동작 확인 (사용자 작업)**

> **사용자에게 안내:** "폰 화면에서 다음을 확인해주세요:"
> 1. 루나곰 캘린더 화면이 뜸 (로딩 화면 → 로그인 또는 캘린더)
> 2. **이미 로그인 상태였다면** (이전 TWA 앱이 같은 키스토어라 데이터 인계받았으면): 캘린더 뜨는지
> 3. **로그인 화면이라면**: 구글 로그인 버튼 보임
> 4. 로그인되어 있으면 캘린더 일정이 보임
> 5. 가계부 탭 → 거래 목록 보임

**🚦 게이트 판단:**
- 위 1~5 가 다 정상 → Task 7 으로 진행
- 1번부터 안 됨 (빈 화면, 오류) → STOP. 사용자에게 보고. 디버깅 (logcat 등) 필요.
- 3번 로그인 화면까지 떴지만 로그인 클릭 시 문제 → Task 8 (OAuth 검증) 으로 직행

- [ ] **Step 7: 커밋 (Task 6 자체는 코드 변경 없지만, 검증 통과 표시 commit)**

이 step 은 코드 commit 이 아니라 **plan 의 checkbox 갱신** 으로 대체:
- 위의 Step 1~6 checkbox 모두 체크
- 커밋 없이 다음 task 로

---

## Task 7: Service Worker 분기 (Capacitor 환경 감지)

**Files:**
- Create: `lib/platform.ts`
- Create: `lib/platform.test.ts`
- Modify: `components/service-worker-register.tsx`

배경: 우리 앱은 `@serwist/next` 로 PWA Service Worker 를 등록 중. Capacitor 웹뷰 안에서는 SW 가 등록되긴 하지만 캐싱 동작이 Capacitor 의 기본 캐시와 충돌할 수 있고, SW 가 vercel.app 의 응답을 캐시하면서 인증 쿠키 갱신 패턴과 충돌 가능. 안전하게 Capacitor 환경에선 SW skip.

- [ ] **Step 1: 실패하는 단위 테스트 작성**

`C:\dev\lunabear-calendar\lib\platform.test.ts`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { isCapacitorEnvironment } from "./platform";

describe("isCapacitorEnvironment", () => {
  const originalCapacitor = (globalThis as any).Capacitor;

  afterEach(() => {
    (globalThis as any).Capacitor = originalCapacitor;
  });

  it("Capacitor 전역이 없으면 false", () => {
    delete (globalThis as any).Capacitor;
    expect(isCapacitorEnvironment()).toBe(false);
  });

  it("Capacitor.isNativePlatform() 이 true 면 true", () => {
    (globalThis as any).Capacitor = {
      isNativePlatform: () => true,
    };
    expect(isCapacitorEnvironment()).toBe(true);
  });

  it("Capacitor.isNativePlatform() 이 false 면 false (웹 환경)", () => {
    (globalThis as any).Capacitor = {
      isNativePlatform: () => false,
    };
    expect(isCapacitorEnvironment()).toBe(false);
  });
});
```

- [ ] **Step 2: 테스트 실행 — 실패 확인**

```bash
cd /c/dev/lunabear-calendar
pnpm test:run lib/platform.test.ts
```

Expected: `Cannot find module './platform'` 또는 `isCapacitorEnvironment is not defined` 류 에러.

- [ ] **Step 3: platform.ts 구현**

`C:\dev\lunabear-calendar\lib\platform.ts`:

```typescript
type CapacitorGlobal = {
  isNativePlatform: () => boolean;
};

declare global {
  interface Window {
    Capacitor?: CapacitorGlobal;
  }
}

export function isCapacitorEnvironment(): boolean {
  if (typeof window === "undefined") return false;
  const cap = window.Capacitor;
  if (!cap || typeof cap.isNativePlatform !== "function") return false;
  return cap.isNativePlatform();
}
```

이유:
- Capacitor 웹뷰는 페이지에 자동으로 `window.Capacitor` 글로벌을 주입
- `isNativePlatform()` 은 안드로이드/iOS 일 때 true, 일반 브라우저는 false
- SSR (typeof window === "undefined") 안전 가드

- [ ] **Step 4: 테스트 다시 실행 — 통과 확인**

```bash
cd /c/dev/lunabear-calendar
pnpm test:run lib/platform.test.ts
```

Expected: 3개 테스트 모두 PASS.

- [ ] **Step 5: ServiceWorkerRegister 에 분기 추가**

`C:\dev\lunabear-calendar\components\service-worker-register.tsx` 수정:

```typescript
"use client";

import { useEffect } from "react";

import { isCapacitorEnvironment } from "@/lib/platform";

/**
 * Serwist 가 빌드한 /sw.js 를 브라우저에 등록.
 * - dev 환경에서는 Serwist 가 disable 되어 /sw.js 가 없으므로 skip.
 * - Capacitor 안드로이드 앱 환경에서도 skip — 웹뷰 캐싱과 충돌 회피.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (isCapacitorEnvironment()) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch((err) => {
          console.warn("[SW] registration failed", err);
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}
```

- [ ] **Step 6: 변경 확인 + vercel 배포 트리거**

```bash
cd /c/dev/lunabear-calendar
git add lib/platform.ts lib/platform.test.ts components/service-worker-register.tsx
git commit -m "feat(platform): Capacitor 환경 감지 + SW 분기

웹뷰가 vercel.app 을 띄울 때 Service Worker 등록 skip — Capacitor
기본 캐싱과 SW 캐시 충돌 회피. 일반 브라우저 PWA 동작은 변화 없음."
```

- [ ] **Step 7: Vercel 배포 후 폰에서 재확인**

```bash
git push origin feat/android-capacitor
```

> **사용자에게 안내:** "Vercel 에서 이 브랜치를 main 으로 머지하거나 preview 배포 후, 폰 앱 다시 켜서 새로 받아옵니다. (앱은 vercel.app 을 띄우는 거라서, 서버 쪽이 업데이트되면 앱도 자동 반영)"

또는 main 브랜치로 머지 후 prod 배포 트리거:
```bash
git checkout main
git merge feat/android-capacitor
git push
git checkout feat/android-capacitor
```

> **사용자 검증:** "폰 앱 다시 켜서 1) 캘린더 정상, 2) 가계부 정상 — 이게 그대로면 SW 분기 OK"

---

## Task 8: OAuth 콜백 검증

**Files:** (코드 변경 없음, 동작 확인만)

배경: Capacitor 의 `allowNavigation` 에 `accounts.google.com`, `kauth.kakao.com` 추가했으니 OAuth 가 웹뷰 안에서 처리될 가능성 높음. 단, 구글이 "Disallowed user agent" 정책으로 웹뷰를 OAuth 에서 차단하는 경우가 있어서 검증 필요.

- [ ] **Step 1: 로그아웃 상태 만들기**

> **사용자에게 안내:** "앱 안에서 로그아웃 — 설정 → 로그아웃. 또는 앱 삭제 후 재설치."

- [ ] **Step 2: 구글 로그인 시도**

> **사용자 검증:**
> 1. 로그인 화면 → "Google 로 시작하기" 탭
> 2. 다음 중 어느 시나리오?
>    - **A. 웹뷰 안에서 구글 로그인 화면 뜨고 → 로그인 → 캘린더로 들어감** ✅ — 성공, Task 9 skip
>    - **B. 구글이 "보안 정책상 이 앱에서 로그인 불가" 표시** ❌ — Task 9 필요
>    - **C. `ERR_CONNECTION_REFUSED` 또는 흰 화면** ❌ — redirect_uri 문제, Task 9 필요
>    - **D. 외부 크롬으로 로그인 페이지 열리고 → 로그인 후 다시 앱으로 안 돌아옴** ❌ — Task 9 의 deep link 필요

- [ ] **Step 3: 시나리오별 분기 판단**

- **A 시나리오 → 🚦 게이트 통과**: Task 9 skip, Task 10 (종합 검증) 으로 직행
- **B/C/D 시나리오 → Task 9 진행**

---

## Task 9: Deep Link 설정 (조건부)

이 task 는 Task 8 에서 OAuth 가 웹뷰 안에서 실패할 때만 진행.

**Files:**
- Modify: `android/app/src/main/AndroidManifest.xml`
- Modify: `app/(auth)/login/actions.ts` (redirect URL 분기)
- Create: `app/auth/native-callback/page.tsx`
- Modify: `package.json` (@capacitor/app 추가)
- Modify: `app/layout.tsx` (Capacitor app URL listener)

배경: 구글이 안드로이드 웹뷰에서 OAuth 차단하면, 우회 방식은 외부 브라우저 (Chrome Custom Tabs) 로 OAuth 진행 → 끝나면 deep link (`app.lunagom.calendar://` 또는 https 링크) 로 앱 복귀.

- [ ] **Step 1: @capacitor/app 설치**

```bash
cd /c/dev/lunabear-calendar
pnpm add @capacitor/app
```

- [ ] **Step 2: AndroidManifest intent-filter 추가**

`android/app/src/main/AndroidManifest.xml` 의 `<activity android:name=".MainActivity" ...>` 안에 추가:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data
        android:scheme="https"
        android:host="lunabear-calendar.vercel.app"
        android:pathPrefix="/auth/native-callback" />
</intent-filter>
```

이유: `https://lunabear-calendar.vercel.app/auth/native-callback?...` URL 을 열면 앱이 받음 (Asset Links 가 같은 SHA256 이라 검증 자동 통과).

- [ ] **Step 3: 네이티브 콜백 페이지 생성**

`app/auth/native-callback/page.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function NativeCallbackPage() {
  const router = useRouter();
  const params = useSearchParams();

  useEffect(() => {
    // OAuth code 는 별도 callback 에서 이미 처리됨.
    // 이 페이지는 단지 "앱으로 돌아왔다" 신호 + 메인으로 이동.
    const next = params.get("next") ?? "/";
    router.replace(next);
  }, [params, router]);

  return <p>로그인 처리 중…</p>;
}
```

- [ ] **Step 4: login actions 에 환경별 분기 추가**

`app/(auth)/login/actions.ts` 의 `signInWithOAuth` 호출 부분 수정 — Capacitor 환경에선 redirectTo 를 native-callback 으로:

```typescript
// 기존 코드를 찾아서 redirectTo 부분을 다음으로 교체:

const redirectTo = new URL("/auth/callback", siteUrl);
// "next" 쿼리는 그대로 유지

// Capacitor 환경 신호 — headers 의 user-agent 에서 감지하거나
// 클라이언트가 query parameter 로 'native=1' 보내게 함
```

**주의:** server action 은 client 환경 정보를 headers 외엔 못 봄. 단순한 방법:
- 로그인 버튼 클릭 시 클라이언트 컴포넌트에서 `isCapacitorEnvironment()` 체크 → `?native=1` 쿼리 붙임
- server action 이 `?native=1` 감지 시 redirectTo 를 `/auth/native-callback` 으로 변경

`components/auth/social-buttons.tsx` 수정 — 버튼 클릭 핸들러에서:

```typescript
import { isCapacitorEnvironment } from "@/lib/platform";

const onClick = (provider: "google" | "kakao") => {
  const native = isCapacitorEnvironment() ? "1" : "0";
  // 폼 제출 시 native 값 같이 전달, 또는 server action 시그니처에 추가
  signIn(provider, native);
};
```

`actions.ts` 의 `signIn` 함수에서 native 받아 분기:

```typescript
export async function signIn(provider: "google" | "kakao", native: string) {
  // ... 기존 로직 ...
  const callbackPath = native === "1" ? "/auth/native-callback" : "/auth/callback";
  const redirectTo = new URL(callbackPath, siteUrl);
  // ...
}
```

- [ ] **Step 5: app/layout.tsx 에 deep link listener 추가**

`app/layout.tsx` 에 클라이언트 컴포넌트로 listener 추가:

```typescript
// app/_components/native-deep-link-listener.tsx (신규):
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { isCapacitorEnvironment } from "@/lib/platform";

export function NativeDeepLinkListener() {
  const router = useRouter();

  useEffect(() => {
    if (!isCapacitorEnvironment()) return;

    let cleanup = () => {};
    (async () => {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("appUrlOpen", (event) => {
        try {
          const url = new URL(event.url);
          if (url.pathname.startsWith("/auth/native-callback")) {
            router.replace(url.pathname + url.search);
          }
        } catch {
          // ignore malformed URLs
        }
      });
      cleanup = () => {
        handle.remove();
      };
    })();

    return () => cleanup();
  }, [router]);

  return null;
}
```

그리고 `app/layout.tsx` 에 추가:

```typescript
import { NativeDeepLinkListener } from "./_components/native-deep-link-listener";

// body 안 어딘가:
<NativeDeepLinkListener />
```

- [ ] **Step 6: 변경 commit + 푸시**

```bash
cd /c/dev/lunabear-calendar
git add android/app/src/main/AndroidManifest.xml \
        app/auth/native-callback/page.tsx \
        app/(auth)/login/actions.ts \
        components/auth/social-buttons.tsx \
        app/_components/native-deep-link-listener.tsx \
        app/layout.tsx \
        package.json pnpm-lock.yaml
git commit -m "feat(android): OAuth deep link 콜백 처리

Capacitor 웹뷰에서 구글 OAuth 차단되는 경우 우회:
- @capacitor/app 로 https deep link 수신
- AndroidManifest 에 intent-filter 추가 (Asset Links 기반)
- /auth/native-callback 페이지로 복귀"
git push
```

- [ ] **Step 7: main 머지 후 재빌드 + 폰 검증**

```bash
git checkout main && git merge feat/android-capacitor && git push && git checkout feat/android-capacitor
cd /c/dev/lunabear-calendar
npx cap sync android
npx cap run android
```

> **사용자 검증:**
> 1. 앱에서 구글 로그인 클릭
> 2. 외부 브라우저로 구글 OAuth 진행
> 3. 로그인 끝나면 자동으로 앱 복귀
> 4. 캘린더 화면 보임

성공 → Task 10. 실패 → 사용자에게 logcat 출력 보고 요청.

---

## Task 10: 종합 검증 + 메모리 업데이트 + 머지

**Files:**
- Modify: `C:\Users\aarg1\.claude\projects\C--dev-----\memory\project-lunabear-android-plan.md`

- [ ] **Step 1: 디자인 스펙 섹션 10 의 "Capacitor 마이그레이션" 체크리스트 통과 확인**

스펙 파일 열어서 다음 체크박스 전부 확인:
- [ ] `npx cap run android` 로 앱 설치, vercel.app 뜸
- [ ] 구글 로그인 동작
- [ ] 카카오 로그인 (현재 hidden 이라 OFF — 검증 필요 없음, skip)
- [ ] 캘린더/가계부 기존 기능 다 동작

- [ ] **Step 2: APK 빌드 시도 (위젯 작업 전이지만 sideload 가능 확인)**

```bash
cd /c/dev/lunabear-calendar/android
./gradlew assembleRelease
ls -la app/build/outputs/apk/release/
```

Expected: `app-release.apk` 파일 생성 (서명됨).

이유: 위젯 Plan B 들어가기 전, 현재 마이그레이션 결과물 자체로 sideload 배포 가능한지 확인.

- [ ] **Step 3: 메모리 업데이트**

`C:\Users\aarg1\.claude\projects\C--dev-----\memory\project-lunabear-android-plan.md` 에 다음 섹션 추가 (또는 기존 섹션 갱신):

```markdown
## Capacitor 마이그레이션 (2026-06-03~)

- TWA -> Capacitor 전환 완료 (브랜치 `feat/android-capacitor` → main 머지)
- 키스토어 / 패키지 ID / Asset Links / SHA256 모두 그대로 유지
- 기존 TWA 백업: `C:\dev\lunabear-android-twa-backup-2026-06-03\`
- Capacitor 설정: `server.url = https://lunabear-calendar.vercel.app` (원격 모드)
- 안드로이드 영역 (`C:\dev\lunabear-calendar\android\`) 가 비어있는 쉘 상태 → 위젯 작업 (Plan B) 준비됨
- OAuth: [Task 8 결과 — 웹뷰 안 직접 OK / deep link 우회 OK 중 적용된 방식 기록]
```

- [ ] **Step 4: 최종 commit + main 머지**

이미 Step 들에서 commit 했다면 추가 commit 없음. 메모리 업데이트는 별도 영역 (`.claude/`) 이라 repo 와 무관.

main 으로 머지가 아직 안 됐다면:
```bash
cd /c/dev/lunabear-calendar
git checkout main
git merge feat/android-capacitor
git push
```

- [ ] **Step 5: 사용자에게 보고**

> **사용자에게 보고 (예시 형식):**
> "Capacitor 마이그레이션 완료. 폰에서 기존 TWA 동작 그대로 + 안드로이드 영역 비어있는 쉘 준비됨. 다음 단계: **Plan B (위젯 인프라 + 위젯 2개 + 투명도 + 다듬기)** 작성. 시작할까요?"

---

## 막힐 만한 부분 종합

| 문제 | 신호 | 해결 |
|---|---|---|
| Capacitor 패키지 설치 실패 | pnpm-workspace sharp 충돌 | `--ignore-workspace` 플래그 |
| `npx cap add android` 가 SDK 못 찾음 | `Could not find Android SDK` | `$env:ANDROID_HOME` 설정 |
| Gradle 빌드 JDK 에러 | `Unsupported class file major version` | JDK 17 사용 (`$env:JAVA_HOME`) |
| 백신 빌드 중단 | "session destroyed" / Gradle 프로세스 죽음 | 알약 일시 정지 + 디렉토리 예외 |
| 키스토어 비밀번호 잘못 | `Tag mismatch` 또는 `BAD_DECRYPT` | 비밀번호 다시 확인 |
| ADB 가 폰 인식 못 함 | `device unauthorized` | 폰에서 USB 디버깅 허용 |
| 앱 띄웠는데 흰 화면 | 빈 화면 / 무한 로딩 | `allowNavigation` 에 vercel.app 누락 |
| 구글 OAuth 차단 | `Disallowed user agent` | Task 9 (deep link) |
| 카카오 로그인 | 현재 NEXT_PUBLIC_KAKAO_ENABLED=false 라 OFF | Plan 범위 밖, 추후 |

---

## Self-Review 결과

✅ **Spec coverage**: 디자인 스펙 섹션 7 (마이그레이션 흐름 1~8단계) 모두 Task 1~10 에 매핑됨.
✅ **No placeholders**: 모든 step 에 구체적 command/code 있음. 단, Task 5 의 `<KEYSTORE_PASSWORD>` 는 의도된 사용자 입력 placeholder.
✅ **Type consistency**: `isCapacitorEnvironment()` 함수명 Task 7, 9 에서 일관 사용.
⚠️ **Scope check**: 위젯 작업은 Plan B 로 분리됨 (의도). 본 plan 은 Capacitor 마이그레이션만 다룸 — 단일 sub-system.
