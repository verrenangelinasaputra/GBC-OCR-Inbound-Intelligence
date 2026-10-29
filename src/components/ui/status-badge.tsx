import clsx from "clsx";

const STATUS_COLORS: Record<string, string> = {
  default: "bg-slate-100 text-slate-700",
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-800",
  danger: "bg-red-50 text-red-700",
  info: "bg-blue-50 text-blue-700",
};

export function StatusBadge({
  label,
  tone = "default",
}: {
  label: string;
  tone?: keyof typeof STATUS_COLORS;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STATUS_COLORS[tone] ?? STATUS_COLORS.default
      )}
    >
      {label}
    </span>
  );
}
