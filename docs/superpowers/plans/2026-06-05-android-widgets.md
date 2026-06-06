# 안드로이드 홈 화면 위젯 (캘린더 + 가계부) 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 본인 폰의 홈 화면에 캘린더(5×6) + 가계부(5×2) 위젯 2개를 추가하고, 투명도 5단계 + 외부 모달 자동 오픈 + 앱 변경 시 즉시 갱신이 동작하도록 한다.

**Architecture:** Capacitor 8.x 위에 로컬 커스텀 플러그인(WidgetCache) 을 직접 작성하여 JS ↔ SharedPreferences 다리를 놓는다. 앱이 일정/거래를 변경하면 캐시를 갱신 → `AppWidgetManager.notifyAppWidgetViewDataChanged` 로 즉시 다시 그림. 위젯 탭은 ACTION_VIEW 인텐트의 URI(`https://lunabear-calendar.vercel.app/expense?action=add-expense`)로 앱을 띄우고, 기존 ExpensePage 의 `initialAction` useEffect 가 이미 `add-expense` / `add-income` 을 받아 모달을 자동 오픈한다 (기존 코드 재활용 — 새 컴포넌트 불필요).

**Tech Stack:** Kotlin (Android Widget Provider + Capacitor Plugin), TypeScript (JS 브릿지 + 캐시 동기화), Next.js 14 (URL 모달 라우팅), Vitest (TDD 가능 부분).

---

## 디자인 결정 (이미 확정 — spec 참조)

- 위젯 1 = 캘린더 5×6, 위젯 2 = 가계부 5×2 (둘 다 미디엄 야망)
- 라이트 고정 + 투명도 5단계 (0/25/50/75/100%)
- 데이터 = 앱 캐시 (SharedPreferences, Option A)
- 마스코트 24dp / 20dp
- 가계부 위젯 버튼 **2개 (지출/수입)** — 탭 시 앱 모달 자동 오픈
  - **v1 결정 (2026-06-06)**: 이체 모달은 앱에 미구현 → 위젯에서도 제외. 추후 이체 기능 추가 시 v2 에서 3 버튼으로 확장.

Spec 전체: `docs/superpowers/specs/2026-06-03-android-widgets-design.md`

---

## 파일 구조 (생성/수정 대상)

### 안드로이드 네이티브 (Kotlin / Resources)
```
android/app/src/main/java/app/lunagom/calendar/
  ├── MainActivity.java                          (수정: 플러그인 등록)
  ├── WidgetCachePlugin.kt                       (신규)
  ├── CalendarWidgetProvider.kt                  (신규)
  ├── ExpenseWidgetProvider.kt                   (신규)
  └── WidgetConfigActivity.kt                    (신규)

android/app/src/main/res/
  ├── layout/widget_calendar.xml                 (신규)
  ├── layout/widget_expense.xml                  (신규)
  ├── layout/widget_config.xml                   (신규)
  ├── xml/widget_calendar_info.xml               (신규)
  ├── xml/widget_expense_info.xml                (신규)
  ├── drawable/widget_background.xml             (신규)
  └── font/pretendard.ttf                        (신규 — 파일 박기)

android/app/src/main/AndroidManifest.xml         (수정: 2개 receiver + config activity)
```

### JS / TS
```
lib/widget-cache.ts                              (신규)
lib/widget-cache.test.ts                         (신규)

features/android-widgets/
  ├── cache-types.ts                             (신규 — 캐시 JSON 스키마)
  ├── sync.ts                                    (신규)
  ├── sync.test.ts                               (신규)
  └── WidgetSyncBoot.tsx                         (신규 — 앱 마운트 시 1회 동기화)

features/expense/server/actions.ts               (수정: sync hook)
features/calendar/server/actions.ts              (수정: sync hook)
app/(app)/expense/page.tsx                       (수정: ?modal= 처리)
app/layout.tsx                                   (수정: WidgetSyncBoot 마운트)
```

---

## 작업 순서 (19 tasks)

전체 흐름: **인프라 (T1-T4) → 데이터 흐름 (T5-T8) → 위젯 1 (T9-T11) → 위젯 2 (T12-T14) → 투명도 (T15-T17) → 폰트 (T18) → 종합 (T19)**

게이트(폰 검증) 단계: T4, T11, T14, T17, T19

---

### Task 1: 작업 브랜치 + features/widgets 폴더 준비

**Files:**
- Create: `features/android-widgets/.gitkeep` (placeholder)

- [ ] **Step 1: 새 브랜치 생성 + 체크아웃**

```bash
cd /c/dev/lunabear-calendar && git checkout main && git pull origin main && git checkout -b feat/android-widgets
```

Expected: `Switched to a new branch 'feat/android-widgets'`

- [ ] **Step 2: features/widgets 디렉토리 생성**

```bash
mkdir -p /c/dev/lunabear-calendar/features/widgets
```

- [ ] **Step 3: 커밋 안 함** (코드 추가될 때 묶어서 커밋)

---

### Task 2: WidgetCache Capacitor 플러그인 (Kotlin)

**Files:**
- Create: `android/app/src/main/java/app/lunagom/calendar/WidgetCachePlugin.kt`

JS → Android SharedPreferences read/write/notify 다리 역할.

- [ ] **Step 1: WidgetCachePlugin.kt 작성**

```kotlin
package app.lunagom.calendar

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "WidgetCache")
class WidgetCachePlugin : Plugin() {

    companion object {
        const val PREFS_NAME = "lunabear_widget_cache"
    }

    @PluginMethod
    fun set(call: PluginCall) {
        val key = call.getString("key")
        val value = call.getString("value")
        if (key == null || value == null) {
            call.reject("key and value required")
            return
        }
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        prefs.edit().putString(key, value).apply()
        call.resolve()
    }

    @PluginMethod
    fun get(call: PluginCall) {
        val key = call.getString("key")
        if (key == null) {
            call.reject("key required")
            return
        }
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val value = prefs.getString(key, null)
        val result = JSObject()
        result.put("value", value)
        call.resolve(result)
    }

    @PluginMethod
    fun notifyWidgets(call: PluginCall) {
        val mgr = AppWidgetManager.getInstance(context)
        for (cls in listOf(CalendarWidgetProvider::class.java, ExpenseWidgetProvider::class.java)) {
            val ids = mgr.getAppWidgetIds(ComponentName(context, cls))
            if (ids.isNotEmpty()) {
                val intent = android.content.Intent(context, cls).apply {
                    action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                    putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids)
                }
                context.sendBroadcast(intent)
            }
        }
        call.resolve()
    }
}
```

- [ ] **Step 2: 빌드는 T4 게이트에서 한 번에** — 지금은 컴파일 검증 안 함 (이 파일만 봐서는 Provider 클래스가 아직 없어 빌드 깨질 수 있음).

---

### Task 3: MainActivity 에 플러그인 등록 + AndroidManifest 권한 점검

**Files:**
- Modify: `android/app/src/main/java/app/lunagom/calendar/MainActivity.java`

- [ ] **Step 1: MainActivity.java 를 .kt 로 변환 + 플러그인 등록**

```bash
# MainActivity.java 삭제
rm /c/dev/lunabear-calendar/android/app/src/main/java/app/lunagom/calendar/MainActivity.java
```

- [ ] **Step 2: MainActivity.kt 작성**

Create: `android/app/src/main/java/app/lunagom/calendar/MainActivity.kt`

```kotlin
package app.lunagom.calendar

import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(WidgetCachePlugin::class.java)
        super.onCreate(savedInstanceState)
    }
}
```

- [ ] **Step 3: build.gradle 에 Kotlin plugin 추가 (이미 있을 가능성 — Capacitor 가 추가했을 수 있음)**

확인: `cat android/app/build.gradle | head -3`
- "apply plugin: 'kotlin-android'" 가 있으면 skip.
- 없으면 `apply plugin: 'com.android.application'` 다음 줄에 `apply plugin: 'kotlin-android'` 추가.

루트 `android/build.gradle` 의 `buildscript.dependencies` 에 kotlin gradle plugin 이 있는지도 확인 (Capacitor 8 은 기본 제공).

- [ ] **Step 4: 커밋 안 함** (T4 빌드 통과 후 묶어서)

---

### Task 4: JS 래퍼 lib/widget-cache.ts (TDD) + 첫 빌드 게이트

**Files:**
- Create: `lib/widget-cache.ts`
- Create: `lib/widget-cache.test.ts`

웹/Capacitor 분기. 웹에서는 모든 호출이 no-op.

- [ ] **Step 1: 실패하는 테스트 작성**

Create: `lib/widget-cache.test.ts`

```typescript
import { describe, it, expect, afterEach, vi } from "vitest";

afterEach(() => {
  delete (window as unknown as { Capacitor?: unknown }).Capacitor;
  vi.resetModules();
});

describe("widget-cache (web)", () => {
  it("Capacitor 가 없으면 set/get/notifyWidgets 가 no-op (예외 없음)", async () => {
    const { setCache, getCache, notifyWidgets } = await import("./widget-cache");
    await expect(setCache("k", "v")).resolves.toBeUndefined();
    await expect(getCache("k")).resolves.toBeNull();
    await expect(notifyWidgets()).resolves.toBeUndefined();
  });
});

describe("widget-cache (capacitor)", () => {
  it("Capacitor 네이티브면 등록된 플러그인을 호출", async () => {
    const setMock = vi.fn().mockResolvedValue(undefined);
    const getMock = vi.fn().mockResolvedValue({ value: "cached" });
    const notifyMock = vi.fn().mockResolvedValue(undefined);

    (window as unknown as { Capacitor: object }).Capacitor = {
      isNativePlatform: () => true,
      Plugins: { WidgetCache: { set: setMock, get: getMock, notifyWidgets: notifyMock } },
      registerPlugin: (_name: string) => ({
        set: setMock,
        get: getMock,
        notifyWidgets: notifyMock,
      }),
    };

    const { setCache, getCache, notifyWidgets } = await import("./widget-cache");
    await setCache("widget_calendar", JSON.stringify({ events: [] }));
    expect(setMock).toHaveBeenCalledWith({ key: "widget_calendar", value: JSON.stringify({ events: [] }) });

    const v = await getCache("widget_calendar");
    expect(v).toBe("cached");

    await notifyWidgets();
    expect(notifyMock).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm test:run lib/widget-cache.test.ts
```

Expected: FAIL — `Failed to resolve import "./widget-cache"` 또는 export 없음 에러.

- [ ] **Step 3: lib/widget-cache.ts 최소 구현**

Create: `lib/widget-cache.ts`

```typescript
import { isCapacitorNative } from "@/lib/platform";

type WidgetCachePlugin = {
  set(options: { key: string; value: string }): Promise<void>;
  get(options: { key: string }): Promise<{ value: string | null }>;
  notifyWidgets(): Promise<void>;
};

let pluginRef: WidgetCachePlugin | null = null;

async function getPlugin(): Promise<WidgetCachePlugin | null> {
  if (!isCapacitorNative()) return null;
  if (pluginRef) return pluginRef;
  const { registerPlugin } = await import("@capacitor/core");
  pluginRef = registerPlugin<WidgetCachePlugin>("WidgetCache");
  return pluginRef;
}

export async function setCache(key: string, value: string): Promise<void> {
  const p = await getPlugin();
  if (!p) return;
  await p.set({ key, value });
}

export async function getCache(key: string): Promise<string | null> {
  const p = await getPlugin();
  if (!p) return null;
  const result = await p.get({ key });
  return result.value;
}

export async function notifyWidgets(): Promise<void> {
  const p = await getPlugin();
  if (!p) return;
  await p.notifyWidgets();
}
```

- [ ] **Step 4: 테스트 재실행 → 통과 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm test:run lib/widget-cache.test.ts
```

Expected: PASS — 2 tests passed.

- [ ] **Step 5: cap sync + 폰 빌드/설치 게이트**

```bash
cd /c/dev/lunabear-calendar && npx cap sync android
cd /c/dev/lunabear-calendar/android && \
  export JAVA_HOME="/c/Users/aarg1/AppData/Local/Programs/Eclipse Adoptium/jdk-21.0.11.10-hotspot" && \
  export PATH="$JAVA_HOME/bin:/c/Users/aarg1/.bubblewrap/android_sdk/platform-tools:$PATH" && \
  ./gradlew installDebug
```

⚠️ 이 시점에서는 CalendarWidgetProvider / ExpenseWidgetProvider 가 아직 없어서 컴파일 실패. **이 게이트는 T11 (위젯 1 Provider 작성) 후에 통과.** 그 전에 commit 만 하고 다음으로.

- [ ] **Step 6: 커밋**

```bash
cd /c/dev/lunabear-calendar && \
  git add lib/widget-cache.ts lib/widget-cache.test.ts \
          android/app/src/main/java/app/lunagom/calendar/WidgetCachePlugin.kt \
          android/app/src/main/java/app/lunagom/calendar/MainActivity.kt \
          android/app/src/main/java/app/lunagom/calendar/MainActivity.java && \
  git commit -m "feat(widgets): WidgetCache Capacitor 플러그인 + JS 래퍼"
```

Expected: 새 커밋, MainActivity.java 는 D (deleted).

---

### Task 5: 캐시 데이터 타입 (cache-types.ts)

**Files:**
- Create: `features/android-widgets/cache-types.ts`

위젯이 읽을 JSON 구조 한 곳에 정의.

- [ ] **Step 1: cache-types.ts 작성**

```typescript
/** 위젯이 SharedPreferences 에서 읽어 그릴 캐시 JSON 의 스키마. */

export type CalendarCacheEvent = {
  date: string; // "YYYY-MM-DD" (로컬 기준)
  color: string; // "#RRGGBB"
};

export type CalendarCache = {
  year: number;
  month: number; // 1-12
  events: CalendarCacheEvent[];
  updatedAt: string; // ISO
};

export type ExpenseCache = {
  year: number;
  month: number;
  totalExpense: number;
  updatedAt: string;
};

export const CACHE_KEYS = {
  calendar: "widget_calendar",
  expense: "widget_expense",
} as const;
```

- [ ] **Step 2: 커밋 안 함** (T6 와 묶음)

---

### Task 6: sync.ts (TDD)

**Files:**
- Create: `features/android-widgets/sync.ts`
- Create: `features/android-widgets/sync.test.ts`

Server Action 후 호출되어 캐시를 만든다. 실제 Supabase 호출은 호출자가 한 결과를 받는 식 (순수 함수에 가깝게 만들어 TDD 용이).

- [ ] **Step 1: 실패 테스트 작성**

Create: `features/android-widgets/sync.test.ts`

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildCalendarCache, buildExpenseCache } from "./sync";
import type { CalendarCacheEvent } from "./cache-types";

describe("buildCalendarCache", () => {
  it("이벤트 배열을 캐시 JSON 으로 변환 + 메타 채움", () => {
    const events: CalendarCacheEvent[] = [
      { date: "2026-06-05", color: "#3B82F6" },
      { date: "2026-06-12", color: "#16A34A" },
    ];
    const now = new Date("2026-06-05T12:00:00.000Z");
    const result = buildCalendarCache({ year: 2026, month: 6, events, now });
    expect(result.year).toBe(2026);
    expect(result.month).toBe(6);
    expect(result.events).toHaveLength(2);
    expect(result.updatedAt).toBe(now.toISOString());
  });
});

describe("buildExpenseCache", () => {
  it("합계와 메타 채움", () => {
    const now = new Date("2026-06-05T12:00:00.000Z");
    const result = buildExpenseCache({ year: 2026, month: 6, totalExpense: 1240000, now });
    expect(result.totalExpense).toBe(1240000);
    expect(result.year).toBe(2026);
    expect(result.month).toBe(6);
    expect(result.updatedAt).toBe(now.toISOString());
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm test:run features/android-widgets/sync.test.ts
```

Expected: FAIL — import 실패.

- [ ] **Step 3: sync.ts 작성**

Create: `features/android-widgets/sync.ts`

```typescript
import { setCache, notifyWidgets } from "@/lib/widget-cache";
import { CACHE_KEYS, type CalendarCache, type CalendarCacheEvent, type ExpenseCache } from "./cache-types";

export function buildCalendarCache(input: {
  year: number;
  month: number;
  events: CalendarCacheEvent[];
  now: Date;
}): CalendarCache {
  return {
    year: input.year,
    month: input.month,
    events: input.events,
    updatedAt: input.now.toISOString(),
  };
}

export function buildExpenseCache(input: {
  year: number;
  month: number;
  totalExpense: number;
  now: Date;
}): ExpenseCache {
  return {
    year: input.year,
    month: input.month,
    totalExpense: input.totalExpense,
    updatedAt: input.now.toISOString(),
  };
}

export async function syncCalendarCache(cache: CalendarCache): Promise<void> {
  await setCache(CACHE_KEYS.calendar, JSON.stringify(cache));
  await notifyWidgets();
}

export async function syncExpenseCache(cache: ExpenseCache): Promise<void> {
  await setCache(CACHE_KEYS.expense, JSON.stringify(cache));
  await notifyWidgets();
}
```

- [ ] **Step 4: 테스트 재실행 → 통과 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm test:run features/android-widgets/sync.test.ts
```

Expected: PASS — 2 tests passed.

- [ ] **Step 5: 커밋**

```bash
cd /c/dev/lunabear-calendar && \
  git add features/android-widgets/ && \
  git commit -m "feat(widgets): 캐시 동기화 함수 + 타입"
```

---

### Task 7: expense actions 에 sync hook + WidgetSyncBoot

**Files:**
- Modify: `features/expense/server/actions.ts` (sync 호출 추가)
- Create: `features/android-widgets/WidgetSyncBoot.tsx` (앱 마운트 시 1회 풀 동기화)
- Create: `features/android-widgets/queries.ts` (boot 시 사용할 풀 데이터 fetcher)

Server Action 은 사실 클라이언트에 결과가 돌아온 다음 클라이언트가 sync 호출하는 방식이 자연스러움 (server action 안에서 SharedPreferences 못 건드림 — 안드로이드 디바이스에서만 작동하니까).

→ 전략 변경: **클라이언트에서 mutation 직후 sync 호출**. Server action 은 그대로 두고, 호출 측 (예: 가계부 입력 모달 onSuccess) 에 sync 추가.

- [ ] **Step 1: features/android-widgets/queries.ts 작성 — 풀 동기화용 데이터 fetcher**

Create: `features/android-widgets/queries.ts`

```typescript
"use client";

import { createClient } from "@/lib/supabase/client";

export async function fetchCurrentMonthCalendarEvents(): Promise<
  Array<{ date: string; color: string }>
> {
  const supabase = createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const { data } = await supabase
    .from("events")
    .select("start_at, color")
    .gte("start_at", monthStart.toISOString())
    .lte("start_at", monthEnd.toISOString());
  if (!data) return [];
  return data.map((row) => ({
    date: new Date(row.start_at).toISOString().slice(0, 10),
    color: (row.color as string | null) ?? "#6B7280",
  }));
}

export async function fetchCurrentMonthExpenseTotal(): Promise<number> {
  const supabase = createClient();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  const { data } = await supabase
    .from("expenses")
    .select("amount")
    .gte("paid_at", monthStart.toISOString())
    .lte("paid_at", monthEnd.toISOString());
  if (!data) return 0;
  return data.reduce((sum, row) => sum + ((row.amount as number) ?? 0), 0);
}
```

⚠️ 실제 supabase 테이블 / 컬럼명이 위와 다를 수 있음. 실행 시 `types/database.ts` 확인 후 보정. expenses 테이블이 `transactions` 일 수 있고, color 컬럼이 없으면 카테고리 매핑 필요. **이 task 실행자는 먼저 `cat types/database.ts | head -100` 으로 실제 스키마 확인하고 위 코드를 보정할 것.**

- [ ] **Step 2: WidgetSyncBoot.tsx 작성**

Create: `features/android-widgets/WidgetSyncBoot.tsx`

```typescript
"use client";

import { useEffect } from "react";

import { isCapacitorNative } from "@/lib/platform";
import { buildCalendarCache, buildExpenseCache, syncCalendarCache, syncExpenseCache } from "./sync";
import { fetchCurrentMonthCalendarEvents, fetchCurrentMonthExpenseTotal } from "./queries";

/**
 * 앱 마운트 시 1회 위젯 캐시 풀 동기화.
 * 그 후엔 각 mutation 후에 부분 sync 가 일어남.
 * Capacitor 네이티브가 아니면 no-op.
 */
export function WidgetSyncBoot() {
  useEffect(() => {
    if (!isCapacitorNative()) return;
    let cancelled = false;
    (async () => {
      try {
        const now = new Date();
        const [events, totalExpense] = await Promise.all([
          fetchCurrentMonthCalendarEvents(),
          fetchCurrentMonthExpenseTotal(),
        ]);
        if (cancelled) return;
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        await syncCalendarCache(buildCalendarCache({ year, month, events, now }));
        await syncExpenseCache(buildExpenseCache({ year, month, totalExpense, now }));
      } catch (err) {
        console.warn("[widget-sync-boot] failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}
```

- [ ] **Step 3: app/layout.tsx 에 WidgetSyncBoot 마운트**

Modify: `app/layout.tsx`

CapacitorDeepLinkHandler 옆에 추가:

```typescript
import { WidgetSyncBoot } from "@/features/android-widgets/WidgetSyncBoot";
```

body 안:

```tsx
<ServiceWorkerRegister />
<CapacitorDeepLinkHandler />
<WidgetSyncBoot />
```

- [ ] **Step 4: typecheck 통과 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm typecheck
```

Expected: exit 0, no errors. 에러 있으면 queries.ts 의 supabase 스키마 보정.

- [ ] **Step 5: 커밋**

```bash
cd /c/dev/lunabear-calendar && \
  git add features/android-widgets/queries.ts features/android-widgets/WidgetSyncBoot.tsx app/layout.tsx && \
  git commit -m "feat(widgets): 앱 마운트 시 위젯 캐시 풀 동기화"
```

---

### Task 8: 위젯 → 가계부 URL 매핑 (TDD)

**Files:**
- Create: `features/android-widgets/widget-urls.ts`
- Create: `features/android-widgets/widget-urls.test.ts`

**중요한 발견 (2026-06-06):**
- 기존 `app/(app)/expense/page.tsx` 가 이미 `searchParams.action` 을 받아 `initialAction` 으로 ExpensePage 에 넘김
- ExpensePage 의 `useEffect` 가 `add-expense` / `add-income` 을 받아 모달을 자동 오픈 + `router.replace` 로 URL 정리
- → **새 WidgetModalOpener 컴포넌트 불필요**. 기존 패턴 그대로 활용.
- 또한 **이체 (transfer) 모달이 앱에 미구현** → 위젯도 2 버튼만 (지출/수입)

따라서 T8 은 단순히: 위젯 액션 → URL 매핑을 한 곳에 정의 + 단위 테스트. Kotlin Provider 는 이 매핑과 같은 URL 을 직접 박는다 (TS 못 읽음).

- [ ] **Step 1: 실패 테스트 작성**

Create: `features/android-widgets/widget-urls.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { widgetUrlForAction, parseWidgetAction } from "./widget-urls";

describe("widgetUrlForAction", () => {
  it("'add-expense' → /expense?action=add-expense", () => {
    expect(widgetUrlForAction("add-expense")).toBe("/expense?action=add-expense");
  });
  it("'add-income' → /expense?action=add-income", () => {
    expect(widgetUrlForAction("add-income")).toBe("/expense?action=add-income");
  });
});

describe("parseWidgetAction", () => {
  it("유효 값 통과", () => {
    expect(parseWidgetAction("add-expense")).toBe("add-expense");
    expect(parseWidgetAction("add-income")).toBe("add-income");
  });
  it("알 수 없는/빈 값 → null", () => {
    expect(parseWidgetAction("foo")).toBeNull();
    expect(parseWidgetAction(null)).toBeNull();
    expect(parseWidgetAction(undefined)).toBeNull();
    expect(parseWidgetAction("add-transfer")).toBeNull(); // v1 에 없음
  });
});
```

- [ ] **Step 2: 테스트 실행 → 실패 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm test:run features/android-widgets/widget-urls.test.ts
```

Expected: FAIL — 모듈 없음.

- [ ] **Step 3: widget-urls.ts 작성**

Create: `features/android-widgets/widget-urls.ts`

```typescript
/**
 * 위젯 → 가계부 페이지 URL 매핑.
 * 이 값들은 Kotlin 위젯 Provider 에서도 동일하게 박혀야 한다
 * (TS 가 source-of-truth, Kotlin 은 값 복사).
 *
 * ExpensePage 의 initialAction useEffect 가 이 action 값들을 받아 모달을 자동 오픈한다.
 */

export type WidgetAction = "add-expense" | "add-income";

const VALID_ACTIONS: readonly WidgetAction[] = ["add-expense", "add-income"];

export function parseWidgetAction(value: string | null | undefined): WidgetAction | null {
  if (value && (VALID_ACTIONS as readonly string[]).includes(value)) {
    return value as WidgetAction;
  }
  return null;
}

export function widgetUrlForAction(action: WidgetAction): string {
  return `/expense?action=${action}`;
}
```

- [ ] **Step 4: 테스트 재실행 → 통과 확인**

```bash
cd /c/dev/lunabear-calendar && pnpm test:run features/android-widgets/widget-urls.test.ts
```

Expected: PASS — 5 tests passed.

- [ ] **Step 5: page.tsx / ExpensePage 수정 안 함**

기존 코드가 이미 `searchParams.action` → `initialAction` → modal 오픈 흐름을 처리 중. 변경 없음.

- [ ] **Step 6: 커밋**

```bash
cd /c/dev/lunabear-calendar && \
  git add features/android-widgets/widget-urls.ts features/android-widgets/widget-urls.test.ts && \
  git commit -m "feat(widgets): 위젯 액션 URL 매핑 (지출/수입 v1)"
```

---

### Task 9: 위젯 1 메타데이터 + 레이아웃 + drawable

**Files:**
- Create: `android/app/src/main/res/xml/widget_calendar_info.xml`
- Create: `android/app/src/main/res/layout/widget_calendar.xml`
- Create: `android/app/src/main/res/drawable/widget_background.xml`

- [ ] **Step 1: drawable/widget_background.xml — 라운드 흰 배경 + 투명도 적용 가능**

```xml
<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"
       android:shape="rectangle">
    <corners android:radius="12dp" />
    <solid android:color="#FFFFFF" />
</shape>
```

- [ ] **Step 2: xml/widget_calendar_info.xml — 위젯 메타데이터**

```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="280dp"
    android:minHeight="280dp"
    android:targetCellWidth="5"
    android:targetCellHeight="6"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_calendar"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:configure="app.lunagom.calendar.WidgetConfigActivity"
    android:previewLayout="@layout/widget_calendar" />
```

`updatePeriodMillis="1800000"` = 30분.
`targetCellWidth/Height` 는 Android 12+ 에서 사용. 그 이전엔 minWidth/Height 가 셀 추정.
`configure` 는 T16 에서 만들 액티비티.

- [ ] **Step 3: layout/widget_calendar.xml — 한 달 그리드 레이아웃**

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="@drawable/widget_background"
    android:padding="12dp"
    android:id="@+id/widget_root">

    <!-- 헤더 -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:gravity="center_vertical">

        <TextView
            android:id="@+id/widget_calendar_title"
            android:layout_width="0dp"
            android:layout_height="wrap_content"
            android:layout_weight="1"
            android:textSize="16sp"
            android:textStyle="bold"
            android:textColor="#111827"
            android:text="2026년 6월" />

        <ImageView
            android:layout_width="24dp"
            android:layout_height="24dp"
            android:src="@mipmap/ic_launcher" />
    </LinearLayout>

    <!-- 요일 줄 -->
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:orientation="horizontal"
        android:layout_marginTop="8dp">
        <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:gravity="center" android:textSize="11sp" android:textColor="#DC2626" android:text="일" />
        <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:gravity="center" android:textSize="11sp" android:textColor="#374151" android:text="월" />
        <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:gravity="center" android:textSize="11sp" android:textColor="#374151" android:text="화" />
        <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:gravity="center" android:textSize="11sp" android:textColor="#374151" android:text="수" />
        <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:gravity="center" android:textSize="11sp" android:textColor="#374151" android:text="목" />
        <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:gravity="center" android:textSize="11sp" android:textColor="#374151" android:text="금" />
        <TextView android:layout_width="0dp" android:layout_height="wrap_content" android:layout_weight="1" android:gravity="center" android:textSize="11sp" android:textColor="#2563EB" android:text="토" />
    </LinearLayout>

    <!-- 6 줄 × 7 열 그리드. cell 별로 ID 부여하여 Provider 에서 setText/setVisibility 로 갱신. -->
    <!-- 셀 한 줄을 6번 반복. ID = widget_cell_<row><col> -->
    <include layout="@layout/widget_calendar_row" android:id="@+id/widget_row_0" />
    <include layout="@layout/widget_calendar_row" android:id="@+id/widget_row_1" />
    <include layout="@layout/widget_calendar_row" android:id="@+id/widget_row_2" />
    <include layout="@layout/widget_calendar_row" android:id="@+id/widget_row_3" />
    <include layout="@layout/widget_calendar_row" android:id="@+id/widget_row_4" />
    <include layout="@layout/widget_calendar_row" android:id="@+id/widget_row_5" />

</LinearLayout>
```

⚠️ RemoteViews 에서 `<include>` 는 ID rebind 가 까다로움. 더 안전한 방식: 각 셀에 고유 ID 박은 단일 XML (42개 TextView). 실행자가 RemoteViews 호환 패턴으로 직접 작성하는 게 낫다면 그 방향으로 가도 OK. **최소 안전 패턴**: 6×7 개의 LinearLayout 셀, 각 셀 안에 `widget_cell_day_NN` (TextView) + `widget_cell_dot_NN` (View, 색 점) 형태로 모두 인라인 정의 (긴 XML 이지만 RemoteViews 정상 동작).

→ 실행자는 위의 `<include>` 대신 6×7 = 42 개의 ID 박힌 인라인 셀로 다시 작성할 것. (RemoteViews ID 충돌 방지)

- [ ] **Step 4: 커밋 안 함** (T11 까지 묶음)

---

### Task 10: CalendarWidgetProvider.kt + AndroidManifest receiver

**Files:**
- Create: `android/app/src/main/java/app/lunagom/calendar/CalendarWidgetProvider.kt`
- Modify: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: CalendarWidgetProvider.kt 작성**

```kotlin
package app.lunagom.calendar

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.json.JSONObject
import java.util.Calendar

class CalendarWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val views = RemoteViews(context.packageName, R.layout.widget_calendar)
            renderMonth(context, views, id)
            attachOpenAppIntent(context, views)
            mgr.updateAppWidget(id, views)
        }
    }

    private fun renderMonth(context: Context, views: RemoteViews, widgetId: Int) {
        val prefs = context.getSharedPreferences(WidgetCachePlugin.PREFS_NAME, Context.MODE_PRIVATE)
        val cacheJson = prefs.getString("widget_calendar", null)
        val now = Calendar.getInstance()
        val year = now.get(Calendar.YEAR)
        val month = now.get(Calendar.MONTH) + 1
        views.setTextViewText(R.id.widget_calendar_title, "${year}년 ${month}월")

        // 투명도 적용
        val opacity = prefs.getInt("widget_opacity_$widgetId", 100) // 0-100
        val alpha = (255 * opacity / 100).coerceIn(0, 255)
        views.setInt(R.id.widget_root, "setBackgroundColor", (alpha shl 24) or 0xFFFFFF)

        if (cacheJson == null) return
        try {
            val cache = JSONObject(cacheJson)
            val cachedYear = cache.optInt("year", year)
            val cachedMonth = cache.optInt("month", month)
            // 캐시 월 ≠ 현재 월 → 비워두기 (자정 갱신 전 잠깐 보일 수 있음)
            if (cachedYear != year || cachedMonth != month) return
            // TODO 실행 시: 42개 셀에 일자 + 점 표시. 셀 ID 가 T9 에서 확정되면 구체 코드 작성.
            // 의사 코드:
            //   for row in 0..5: for col in 0..6:
            //     val day = computeDayForCell(year, month, row, col)
            //     val cellDayId = resources.getIdentifier("widget_cell_day_${row}${col}", "id", packageName)
            //     val cellDotId = resources.getIdentifier("widget_cell_dot_${row}${col}", "id", packageName)
            //     views.setTextViewText(cellDayId, if (day != null) day.toString() else "")
            //     val hasEvent = day != null && eventsForDate("$year-$month-$day").isNotEmpty()
            //     views.setViewVisibility(cellDotId, if (hasEvent) View.VISIBLE else View.GONE)
            //     val isToday = day == today
            //     views.setTextColor(cellDayId, if (isToday) Color.WHITE else dayColor(col))
        } catch (_: Exception) {
        }
    }

    private fun attachOpenAppIntent(context: Context, views: RemoteViews) {
        val openApp = Intent(context, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pi = PendingIntent.getActivity(
            context, 0, openApp,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        views.setOnClickPendingIntent(R.id.widget_root, pi)
    }
}
```

⚠️ 실행자: 위 `// TODO 실행 시` 블록을 T9 의 실제 셀 ID 와 spec 의 색상/오늘 강조 규칙대로 채울 것. `eventsForDate` 헬퍼는 JSONObject 의 events 배열을 date 별로 그룹핑한 Map<String, List<String>> 로.

- [ ] **Step 2: AndroidManifest 에 receiver 등록**

Modify: `android/app/src/main/AndroidManifest.xml`

`</activity>` 다음 `<provider>` 앞에 추가:

```xml
<receiver
    android:name=".CalendarWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_calendar_info" />
</receiver>
```

- [ ] **Step 3: 커밋 안 함** (T11 게이트 후)

---

### Task 11: 위젯 1 — 게이트 (빌드 + 폰 추가 + 시각 확인)

- [ ] **Step 1: 빌드 + 설치**

```bash
cd /c/dev/lunabear-calendar && npx cap sync android
cd /c/dev/lunabear-calendar/android && \
  export JAVA_HOME="/c/Users/aarg1/AppData/Local/Programs/Eclipse Adoptium/jdk-21.0.11.10-hotspot" && \
  export PATH="$JAVA_HOME/bin:/c/Users/aarg1/.bubblewrap/android_sdk/platform-tools:$PATH" && \
  ./gradlew installDebug
```

Expected: `BUILD SUCCESSFUL` + `Installed on 1 device`.

빌드 실패 시: 가장 가능성 높은 원인 — Provider 에서 참조한 R.id.xxx 가 layout 에 없음 → `./gradlew assembleDebug --info` 로 에러 줄 확인 후 layout 또는 코드 보정.

- [ ] **Step 2: 사용자 작업 — 폰 홈 화면에 위젯 추가**

폰 → 홈 화면 빈 공간 길게 → "위젯" → "루나곰 캘린더" → 5×6 위젯 끌어 놓기.

- [ ] **Step 3: 사용자 작업 — 시각 확인**

다음 항목 확인:
- [ ] 한 달 그리드가 보이는가
- [ ] 이번 달 일정이 있는 날에 점이 보이는가 (앱에서 일정 1개 추가 후 30초 정도 기다리거나 위젯 다시 그리기 → 점 즉시 나와야 함)
- [ ] 오늘 날짜가 강조되는가
- [ ] 토(파랑) / 일(빨강) 색이 맞는가
- [ ] 위젯 어디든 탭 → 앱이 열리는가

- [ ] **Step 4: 커밋**

```bash
cd /c/dev/lunabear-calendar && \
  git add android/app/src/main/res/xml/widget_calendar_info.xml \
          android/app/src/main/res/layout/widget_calendar.xml \
          android/app/src/main/res/drawable/widget_background.xml \
          android/app/src/main/java/app/lunagom/calendar/CalendarWidgetProvider.kt \
          android/app/src/main/AndroidManifest.xml && \
  git commit -m "feat(widgets): 캘린더 위젯 5×6 (월 그리드 + 일정 점)"
```

---

### Task 12: 위젯 2 메타데이터 + 레이아웃

**Files:**
- Create: `android/app/src/main/res/xml/widget_expense_info.xml`
- Create: `android/app/src/main/res/layout/widget_expense.xml`

- [ ] **Step 1: xml/widget_expense_info.xml**

```xml
<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="280dp"
    android:minHeight="60dp"
    android:targetCellWidth="5"
    android:targetCellHeight="2"
    android:updatePeriodMillis="1800000"
    android:initialLayout="@layout/widget_expense"
    android:resizeMode="horizontal"
    android:widgetCategory="home_screen"
    android:configure="app.lunagom.calendar.WidgetConfigActivity"
    android:previewLayout="@layout/widget_expense" />
```

- [ ] **Step 2: layout/widget_expense.xml**

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/widget_root_expense"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="horizontal"
    android:background="@drawable/widget_background"
    android:padding="10dp"
    android:weightSum="2">

    <!-- 좌측: 합계 -->
    <LinearLayout
        android:id="@+id/widget_expense_summary_block"
        android:layout_width="0dp"
        android:layout_height="match_parent"
        android:layout_weight="1"
        android:orientation="vertical"
        android:gravity="center_vertical">

        <LinearLayout
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:orientation="horizontal"
            android:gravity="center_vertical">
            <TextView
                android:id="@+id/widget_expense_label"
                android:layout_width="wrap_content"
                android:layout_height="wrap_content"
                android:textSize="11sp"
                android:textColor="#6B7280"
                android:text="6월 지출" />
            <ImageView
                android:layout_width="20dp"
                android:layout_height="20dp"
                android:layout_marginStart="4dp"
                android:src="@mipmap/ic_launcher" />
        </LinearLayout>

        <TextView
            android:id="@+id/widget_expense_total"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:textSize="18sp"
            android:textStyle="bold"
            android:textColor="#111827"
            android:layout_marginTop="2dp"
            android:text="0원" />
    </LinearLayout>

    <!-- 우측: 버튼 2개 (v1: 지출/수입. 이체는 앱 미구현으로 v2 보류) -->
    <LinearLayout
        android:layout_width="0dp"
        android:layout_height="match_parent"
        android:layout_weight="1"
        android:orientation="horizontal"
        android:weightSum="2">

        <TextView
            android:id="@+id/widget_expense_btn_expense"
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1"
            android:gravity="center"
            android:textSize="12sp"
            android:textColor="#DC2626"
            android:text="+지출" />

        <TextView
            android:id="@+id/widget_expense_btn_income"
            android:layout_width="0dp"
            android:layout_height="match_parent"
            android:layout_weight="1"
            android:gravity="center"
            android:textSize="12sp"
            android:textColor="#16A34A"
            android:text="+수입" />
    </LinearLayout>
</LinearLayout>
```

- [ ] **Step 3: 커밋 안 함** (T14 와 묶음)

---

### Task 13: ExpenseWidgetProvider.kt + Manifest receiver

**Files:**
- Create: `android/app/src/main/java/app/lunagom/calendar/ExpenseWidgetProvider.kt`
- Modify: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: ExpenseWidgetProvider.kt 작성**

```kotlin
package app.lunagom.calendar

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import org.json.JSONObject
import java.text.NumberFormat
import java.util.Calendar
import java.util.Locale

class ExpenseWidgetProvider : AppWidgetProvider() {

    override fun onUpdate(context: Context, mgr: AppWidgetManager, ids: IntArray) {
        for (id in ids) {
            val views = RemoteViews(context.packageName, R.layout.widget_expense)
            renderTotal(context, views, id)
            attachIntents(context, views)
            mgr.updateAppWidget(id, views)
        }
    }

    private fun renderTotal(context: Context, views: RemoteViews, widgetId: Int) {
        val prefs = context.getSharedPreferences(WidgetCachePlugin.PREFS_NAME, Context.MODE_PRIVATE)
        val cacheJson = prefs.getString("widget_expense", null)
        val cal = Calendar.getInstance()
        val month = cal.get(Calendar.MONTH) + 1
        views.setTextViewText(R.id.widget_expense_label, "${month}월 지출")

        val opacity = prefs.getInt("widget_opacity_$widgetId", 100)
        val alpha = (255 * opacity / 100).coerceIn(0, 255)
        views.setInt(R.id.widget_root_expense, "setBackgroundColor", (alpha shl 24) or 0xFFFFFF)

        if (cacheJson == null) {
            views.setTextViewText(R.id.widget_expense_total, "—")
            return
        }
        try {
            val cache = JSONObject(cacheJson)
            val total = cache.optLong("totalExpense", 0L)
            val fmt = NumberFormat.getNumberInstance(Locale.KOREA)
            views.setTextViewText(R.id.widget_expense_total, "${fmt.format(total)}원")
        } catch (_: Exception) {
            views.setTextViewText(R.id.widget_expense_total, "—")
        }
    }

    private fun attachIntents(context: Context, views: RemoteViews) {
        // 합계 부분 → 가계부 화면
        views.setOnClickPendingIntent(
            R.id.widget_expense_summary_block,
            openAppPi(context, "/expense", null, 1)
        )
        // 2 버튼 → 가계부 ?action=... (기존 ExpensePage 의 initialAction useEffect 가 처리)
        views.setOnClickPendingIntent(
            R.id.widget_expense_btn_expense,
            openAppPi(context, "/expense", "add-expense", 2)
        )
        views.setOnClickPendingIntent(
            R.id.widget_expense_btn_income,
            openAppPi(context, "/expense", "add-income", 3)
        )
        // 이체 버튼 없음 (v1: 앱에 이체 모달 미구현)
    }

    /**
     * 앱을 열되, 인텐트 데이터로 `https://lunabear-calendar.vercel.app/expense?action=add-expense` 같은 URI 전달.
     * MainActivity 가 onCreate / onNewIntent 에서 받아 webview 를 그 URL 로 navigate.
     *
     * 도착 후: ExpensePage 의 useEffect 가 `initialAction === "add-expense"` 를 보고 quick modal 오픈 + router.replace 로 URL 정리.
     * (위젯 측 변경 없이 기존 가계부 코드 재활용)
     *
     * Capacitor 의 server.url 모드에선 webview 가 이미 vercel.app 을 띄우고 있고,
     * 동일 origin 의 다른 경로로 가려면 webview 의 loadUrl 또는 JS evaluate 필요.
     * 가장 단순: 인텐트 data 에 URI 박고 MainActivity 에서 bridge.webView.loadUrl(...) 호출.
     */
    private fun openAppPi(context: Context, path: String, action: String?, code: Int): PendingIntent {
        val builder = Uri.parse("https://lunabear-calendar.vercel.app$path").buildUpon()
        if (action != null) builder.appendQueryParameter("action", action)
        val uri = builder.build()
        val intent = Intent(context, MainActivity::class.java).apply {
            action = Intent.ACTION_VIEW
            data = uri
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        return PendingIntent.getActivity(
            context, code, intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }
}
```

⚠️ **MainActivity 추가 작업 필요**: 위 인텐트의 URI 를 받아 webview 에 loadUrl 호출. 다음 step.

- [ ] **Step 2: MainActivity.kt 에 인텐트 처리 추가**

Modify: `android/app/src/main/java/app/lunagom/calendar/MainActivity.kt`

```kotlin
package app.lunagom.calendar

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        registerPlugin(WidgetCachePlugin::class.java)
        super.onCreate(savedInstanceState)
        handleWidgetIntent(intent)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleWidgetIntent(intent)
    }

    private fun handleWidgetIntent(intent: Intent?) {
        val data: Uri = intent?.data ?: return
        // server.url 모드에서 webview 를 다른 경로로 이동.
        // bridge 가 아직 init 중일 수 있어 post 로 안전하게.
        bridge?.webView?.post {
            bridge.webView.loadUrl(data.toString())
        }
    }
}
```

- [ ] **Step 3: AndroidManifest 에 receiver 추가**

`</activity>` 다음에 (이미 CalendarWidgetProvider 가 있으면 그 옆에):

```xml
<receiver
    android:name=".ExpenseWidgetProvider"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_UPDATE" />
    </intent-filter>
    <meta-data
        android:name="android.appwidget.provider"
        android:resource="@xml/widget_expense_info" />
</receiver>
```

- [ ] **Step 4: 커밋 안 함** (T14 게이트 후)

---

### Task 14: 위젯 2 — 게이트

- [ ] **Step 1: 빌드 + 설치**

```bash
cd /c/dev/lunabear-calendar && npx cap sync android
cd /c/dev/lunabear-calendar/android && \
  export JAVA_HOME="/c/Users/aarg1/AppData/Local/Programs/Eclipse Adoptium/jdk-21.0.11.10-hotspot" && \
  export PATH="$JAVA_HOME/bin:/c/Users/aarg1/.bubblewrap/android_sdk/platform-tools:$PATH" && \
  ./gradlew installDebug
```

- [ ] **Step 2: 사용자 작업 — 가계부 위젯 추가 + 동작 확인**

- [ ] 위젯 추가 → 합계 + 2 버튼 보임 (지출/수입)
- [ ] 합계 탭 → `/expense` 화면 열림
- [ ] +지출 탭 → 지출 모달 자동 오픈
- [ ] +수입 탭 → 수입 모달
- [ ] 앱에서 거래 추가 → 위젯 합계 즉시 갱신 (앱 종료 후 위젯 다시 봐도 반영)

- [ ] **Step 3: 커밋**

```bash
cd /c/dev/lunabear-calendar && \
  git add android/app/src/main/res/xml/widget_expense_info.xml \
          android/app/src/main/res/layout/widget_expense.xml \
          android/app/src/main/java/app/lunagom/calendar/ExpenseWidgetProvider.kt \
          android/app/src/main/java/app/lunagom/calendar/MainActivity.kt \
          android/app/src/main/AndroidManifest.xml && \
  git commit -m "feat(widgets): 가계부 위젯 5×2 + URL 모달 인텐트"
```

---

### Task 15: 투명도 설정 액티비티 — 레이아웃

**Files:**
- Create: `android/app/src/main/res/layout/widget_config.xml`

- [ ] **Step 1: widget_config.xml**

```xml
<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:orientation="vertical"
    android:background="#FFFFFF"
    android:padding="24dp">

    <TextView
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:textSize="18sp"
        android:textStyle="bold"
        android:textColor="#111827"
        android:text="위젯 투명도" />

    <TextView
        android:id="@+id/widget_config_value"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:textSize="14sp"
        android:textColor="#6B7280"
        android:text="100%" />

    <SeekBar
        android:id="@+id/widget_config_seekbar"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="16dp"
        android:max="4"
        android:progress="4" />

    <Button
        android:id="@+id/widget_config_apply"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="24dp"
        android:text="적용" />
</LinearLayout>
```

`max="4"` = 5 단계 (0/25/50/75/100).

- [ ] **Step 2: 커밋 안 함** (T17 게이트 후)

---

### Task 16: WidgetConfigActivity.kt

**Files:**
- Create: `android/app/src/main/java/app/lunagom/calendar/WidgetConfigActivity.kt`
- Modify: `android/app/src/main/AndroidManifest.xml`

- [ ] **Step 1: WidgetConfigActivity.kt**

```kotlin
package app.lunagom.calendar

import android.app.Activity
import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.Button
import android.widget.SeekBar
import android.widget.TextView

class WidgetConfigActivity : Activity() {

    private var appWidgetId = AppWidgetManager.INVALID_APPWIDGET_ID

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setResult(RESULT_CANCELED)
        setContentView(R.layout.widget_config)

        appWidgetId = intent.extras?.getInt(
            AppWidgetManager.EXTRA_APPWIDGET_ID,
            AppWidgetManager.INVALID_APPWIDGET_ID
        ) ?: AppWidgetManager.INVALID_APPWIDGET_ID
        if (appWidgetId == AppWidgetManager.INVALID_APPWIDGET_ID) {
            finish(); return
        }

        val prefs = getSharedPreferences(WidgetCachePlugin.PREFS_NAME, Context.MODE_PRIVATE)
        val current = prefs.getInt("widget_opacity_$appWidgetId", 100)
        val initialStep = current / 25 // 0,1,2,3,4

        val valueLabel = findViewById<TextView>(R.id.widget_config_value)
        val seek = findViewById<SeekBar>(R.id.widget_config_seekbar)
        val applyBtn = findViewById<Button>(R.id.widget_config_apply)

        seek.progress = initialStep
        valueLabel.text = "${initialStep * 25}%"

        seek.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(s: SeekBar?, progress: Int, fromUser: Boolean) {
                valueLabel.text = "${progress * 25}%"
            }
            override fun onStartTrackingTouch(s: SeekBar?) {}
            override fun onStopTrackingTouch(s: SeekBar?) {}
        })

        applyBtn.setOnClickListener {
            val opacity = seek.progress * 25
            prefs.edit().putInt("widget_opacity_$appWidgetId", opacity).apply()
            // 위젯 즉시 다시 그리기
            val mgr = AppWidgetManager.getInstance(this)
            val updateIntent = Intent(this, MainActivity::class.java) // dummy; broadcast 가 더 깔끔
            // 정확한 갱신: 해당 widgetId 가 어느 Provider 인지 알 수 없으므로 둘 다 broadcast
            for (cls in listOf(CalendarWidgetProvider::class.java, ExpenseWidgetProvider::class.java)) {
                val ids = mgr.getAppWidgetIds(android.content.ComponentName(this, cls))
                if (ids.contains(appWidgetId)) {
                    val b = Intent(this, cls).apply {
                        action = AppWidgetManager.ACTION_APPWIDGET_UPDATE
                        putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, intArrayOf(appWidgetId))
                    }
                    sendBroadcast(b)
                }
            }
            val result = Intent().apply {
                putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId)
            }
            setResult(RESULT_OK, result)
            finish()
        }
    }
}
```

- [ ] **Step 2: AndroidManifest 에 activity 등록**

`<provider>` 위에:

```xml
<activity
    android:name=".WidgetConfigActivity"
    android:theme="@android:style/Theme.DeviceDefault.Light.Dialog.NoActionBar"
    android:exported="true">
    <intent-filter>
        <action android:name="android.appwidget.action.APPWIDGET_CONFIGURE" />
    </intent-filter>
</activity>
```

- [ ] **Step 3: 커밋 안 함** (T17 게이트 후)

---

### Task 17: 투명도 — 게이트

- [ ] **Step 1: 빌드 + 설치**

```bash
cd /c/dev/lunabear-calendar/android && \
  export JAVA_HOME="/c/Users/aarg1/AppData/Local/Programs/Eclipse Adoptium/jdk-21.0.11.10-hotspot" && \
  export PATH="$JAVA_HOME/bin:/c/Users/aarg1/.bubblewrap/android_sdk/platform-tools:$PATH" && \
  ./gradlew installDebug
```

- [ ] **Step 2: 사용자 작업 — 투명도 동작 확인**

폰에서 위젯 1개 길게 → "설정" / "변경" 메뉴 (안드로이드 버전마다 다름) → 슬라이더 → 적용.

- [ ] 슬라이더 5단계 (0/25/50/75/100%) 가 보이는가
- [ ] 적용 후 위젯 배경 투명도가 즉시 바뀌는가
- [ ] 0% (완전 투명) — 홈 배경이 비치는가
- [ ] 50% — 적당히 비침
- [ ] 100% — 흰 배경
- [ ] 위젯 1, 위젯 2 둘 다에서 동작

- [ ] **Step 3: 커밋**

```bash
cd /c/dev/lunabear-calendar && \
  git add android/app/src/main/res/layout/widget_config.xml \
          android/app/src/main/java/app/lunagom/calendar/WidgetConfigActivity.kt \
          android/app/src/main/AndroidManifest.xml && \
  git commit -m "feat(widgets): 투명도 설정 액티비티 (5단계)"
```

---

### Task 18: Pretendard 폰트 박기

**Files:**
- Create: `android/app/src/main/res/font/pretendard.ttf` (파일 자체)
- Modify: 두 위젯 레이아웃 XML 의 TextView 들에 `android:fontFamily="@font/pretendard"` 추가

- [ ] **Step 1: 폰트 파일 위치 확인**

```bash
find /c/dev/lunabear-calendar/public -iname "pretendard*" 2>/dev/null
find /c/dev/lunabear-calendar/node_modules/pretendard 2>/dev/null | head -5
```

웹앱에 이미 깔린 게 있으면 그걸 복사. 없으면 https://github.com/orioncactus/pretendard 의 ttf 다운로드.

- [ ] **Step 2: font 디렉토리 생성 + 파일 복사**

```bash
mkdir -p /c/dev/lunabear-calendar/android/app/src/main/res/font
cp <소스경로>/Pretendard-Regular.ttf /c/dev/lunabear-calendar/android/app/src/main/res/font/pretendard.ttf
```

⚠️ 파일명은 소문자 + 영문/숫자만 (Android 리소스 규칙).

- [ ] **Step 3: 위젯 레이아웃의 TextView 들에 폰트 적용**

Modify: `widget_calendar.xml` 의 모든 `<TextView>` 에 `android:fontFamily="@font/pretendard"` 추가.
Modify: `widget_expense.xml` 도 동일.

- [ ] **Step 4: 빌드 + 설치 + 시각 확인**

```bash
cd /c/dev/lunabear-calendar/android && \
  export JAVA_HOME="/c/Users/aarg1/AppData/Local/Programs/Eclipse Adoptium/jdk-21.0.11.10-hotspot" && \
  export PATH="$JAVA_HOME/bin:/c/Users/aarg1/.bubblewrap/android_sdk/platform-tools:$PATH" && \
  ./gradlew installDebug
```

폰에서 위젯 글자가 Pretendard 로 보이는지 확인 (시스템 폰트와 미묘하게 다른 느낌).

- [ ] **Step 5: 커밋**

```bash
cd /c/dev/lunabear-calendar && \
  git add android/app/src/main/res/font/pretendard.ttf \
          android/app/src/main/res/layout/widget_calendar.xml \
          android/app/src/main/res/layout/widget_expense.xml && \
  git commit -m "feat(widgets): Pretendard 폰트 박기"
```

---

### Task 19: 종합 검증 + 메모리 업데이트 + 머지

- [ ] **Step 1: 전체 검증**

```bash
cd /c/dev/lunabear-calendar && pnpm test:run && pnpm typecheck
```

Expected: 둘 다 통과.

- [ ] **Step 2: 사용자 폰 회귀 테스트 — 위젯 + 기존 기능**

| 항목 | 확인 |
|---|---|
| 캘린더 위젯: 일정 추가 → 점 즉시 표시 | |
| 캘린더 위젯: 자정 넘기면 오늘 표시 이동 | (다음 날 확인) |
| 가계부 위젯: 거래 추가 → 합계 즉시 갱신 | |
| 가계부 위젯: 3 버튼 → 모달 자동 오픈 | |
| 투명도 설정: 위젯별 독립적으로 작동 | |
| OAuth 로그인 (회귀): 그대로 동작 | |
| 캘린더 / 가계부 / 할일 (회귀): 정상 | |

- [ ] **Step 3: 메모리 업데이트**

- `project-lunabear-android-plan.md` 의 Plan B 섹션을 "완료" 로 갱신
- 폰 위젯 추가 방법, 30분 갱신 주기, 알려진 한계 등 새 사실 있으면 추가

- [ ] **Step 4: main 머지 + push**

```bash
cd /c/dev/lunabear-calendar && \
  git checkout main && \
  git merge --ff-only feat/android-widgets && \
  git push origin main && \
  git branch -d feat/android-widgets
```

- [ ] **Step 5: 사용자 보고**

완료 결과 한 줄 요약 + 다음 가능한 작업 (iOS 위젯? Play Store 등록?) 제시.

---

## 위험 요소 / 미리 알기

1. **Capacitor server.url 모드에서 webview 가 다른 경로로 이동**: 같은 origin (lunabear-calendar.vercel.app) 이라 일반 navigation 됨. 단, 일부 Capacitor 버전에서 `bridge.webView.loadUrl` 이 보안 정책으로 막힐 수 있음 → 그 경우 JS evaluate (`bridge.eval("window.location.href = '...'", null)`) 로 대체.

2. **RemoteViews 의 `<include>` ID 충돌**: T9 에서 언급. 인라인 셀로 작성 권장.

3. **위젯 즉시 갱신이 안 보이는 케이스**: `notifyWidgets()` 가 broadcast 만 보내고 OS 가 받기까지 1-2초 lag 가능. 사용자에겐 "즉시" 보이지만 정확히는 sub-second.

4. **투명도 SeekBar Step**: SeekBar 는 0~max 의 연속값이지만 step 5단계만 허용하려면 onProgressChanged 에서 자동 snap 또는 단순히 progress*25 변환만. 후자 채택.

5. **위젯 첫 추가 시 캐시 빈 상태**: 앱이 한 번도 안 켜졌으면 SharedPreferences 비어있음 → "—" 또는 빈 그리드. 사용자 안내: "앱을 한 번 열어주세요". 또는 onUpdate 에서 빈 캐시 감지 시 RemoteViews 의 안내 텍스트 띄움.

6. **공휴일 색**: 현재 plan 에는 빨간색만 분기. 한국 공휴일 데이터를 위젯 native 가 알아야 함 → 캐시 JSON 에 휴일 정보 같이 박는 것도 옵션. 미디엄 야망에선 일/토 색만 적용하고 공휴일 색은 v2 로 미룸.

7. **잠금 화면 위젯**: 안드로이드 14+ 에선 잠금 화면 위젯이 별도 카테고리. spec 은 home_screen 만 → 잠금 화면엔 안 뜸. OK.

---

## Self-Review 체크

- ✅ spec 의 위젯 1, 2, 투명도, 캐시, 모달 오픈 모두 task 로 커버
- ✅ TDD 가능한 부분 (lib/widget-cache, sync, URL parsing) 은 RED→GREEN 단계 명시
- ✅ TDD 어려운 Kotlin/UI 는 폰 게이트 검증 명시
- ⚠️ 공휴일 색은 v2 로 미룸 (위 위험 #6) — 명시적 결정
- ⚠️ T7 Step 1 의 supabase 스키마는 실행 시 보정 필요 — 명시
- ⚠️ T9 Step 3 의 RemoteViews `<include>` 는 인라인으로 재작성 권장 — 명시
- ✅ 모든 파일 경로 절대/상대 명시
- ✅ 모든 커밋 메시지 명시
