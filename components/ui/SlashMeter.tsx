type SlashMeterProps = {
  /** Individual on/off state per slash — used for streaks (e.g. daily active/missed). */
  values?: boolean[];
  /** Simple "N of total filled" mode — used for progress toward a target. */
  filled?: number;
  total?: number;
  size?: "md" | "sm";
  /** Fill color when a slash is on. "blue" glows (progress); "green" is flat (streak history). */
  color?: "blue" | "green";
};

/**
 * The signature MetryxOS progress mechanic: filling skewed "slash" bars,
 * echoing the Velocity Mark. Used for daily action progress, rep streaks,
 * and sequence progress.
 */
export function SlashMeter({ values, filled, total = 7, size = "md", color = "blue" }: SlashMeterProps) {
  const slots = values ?? Array.from({ length: total }, (_, i) => i < (filled ?? 0));

  return (
    <div className={`slashmeter ${size === "sm" ? "sm" : ""}`}>
      {slots.map((on, i) => (
        <i key={i} className={on ? `on ${size === "sm" && color === "green" ? "g" : ""}` : size === "sm" ? "miss" : ""} />
      ))}
    </div>
  );
}
