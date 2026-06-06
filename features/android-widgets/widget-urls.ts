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
