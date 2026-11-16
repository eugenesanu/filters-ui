"use client";

import { Segmented, type SegmentedOption, type SegmentedProps, type SegmentedValue } from "../ui/segmented";

export type SegmentedChoiceProps<V extends SegmentedValue> = SegmentedProps<V>;

/**
 * Pick one value, or none ("Any"), from a few options with counts.
 * An option whose count is 0 is dimmed and disabled, unless it is the current choice.
 */
export function SegmentedChoice<V extends SegmentedValue>({ options, value, ...props }: SegmentedChoiceProps<V>) {
  const shown: SegmentedOption<V>[] = options.map((option) => ({
    ...option,
    disabled: option.disabled || (option.count === 0 && !Object.is(option.value, value)),
  }));
  return <Segmented options={shown} value={value} {...props} />;
}
