type ButtonTone = "edit" | "save" | "cancel" | "danger" | "success" | "warning";
type ButtonSize = "sm" | "md";

const buttonToneClasses: Record<ButtonTone, string> = {
  edit: "border-blue-200 bg-blue-50/60 text-blue-700 hover:bg-blue-50",
  save: "border-sky-200 bg-sky-50/60 text-sky-700 hover:bg-sky-50",
  cancel: "border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100/80",
  danger: "border-red-200 bg-red-50/60 text-red-700 hover:bg-red-50",
  success: "border-emerald-200 bg-emerald-50/60 text-emerald-700 hover:bg-emerald-50",
  warning: "border-amber-200 bg-amber-50/60 text-amber-700 hover:bg-amber-50",
};

const buttonSizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
};

export function adminButtonClass(tone: ButtonTone, size: ButtonSize = "md") {
  return `rounded-xl border font-medium transition-colors disabled:opacity-60 ${buttonSizeClasses[size]} ${buttonToneClasses[tone]}`;
}

export const adminPageShell = "space-y-6";
export const adminHeaderClass = "space-y-2";
export const adminCardClass = "rounded-2xl border border-slate-200 bg-white shadow-sm";
export const adminStatCardClass = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";
