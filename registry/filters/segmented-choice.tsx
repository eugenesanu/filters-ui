"use client";

import { Segmented, type SegmentedOption, type SegmentedProps, type SegmentedValue } from "../ui/segmented";
import { useLoading } from "../ui/skeleton";
import { StatusFrame, type StateProps } from "../ui/status-frame";

export type SegmentedChoiceProps<V extends SegmentedValue> = SegmentedProps<V> & Omit<StateProps, "emptyText">;

/**
 * Pick one value, or none ("Any"), from a few options with counts.
 * An option whose count is 0 is dimmed and disabled, unless it is the current choice.
 */
export function SegmentedChoice<V extends SegmentedValue>({
  options,
  value,
  status = "ready",
  onRetry,
  errorText,
  disabled = false,
  className,
  style,
  ...props
}: SegmentedChoiceProps<V>) {
  // While loading, by its own status or in the loading frame of an item around it (a block's card), the counts are
  // not known yet, so no option is dimmed for a 0.
  const loading = useLoading().loading || status === "loading";
  const shown: SegmentedOption<V>[] = options.map((option) => ({
    ...option,
    disabled: option.disabled || (!loading && option.count === 0 && !Object.is(option.value, value)),
  }));
  // The frame dims and blocks the control while disabled, so the control is not dimmed a second time.
  return (
    <div className={className} style={style}>
      <StatusFrame status={status} onRetry={onRetry} errorText={errorText} disabled={disabled}>
        <Segmented options={shown} value={value} aria-disabled={disabled || undefined} {...props} />
      </StatusFrame>
    </div>
  );
}
