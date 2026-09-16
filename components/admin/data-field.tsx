import type { ReactNode } from "react";

/**
 * Figma "Data Field Display" (1042:15207) / "Form Field" read-only
 * (1042:15165): label over an outlined value box, framed like an input the
 * admin can read but not edit.
 */
export function DataField({
  label,
  value,
}: {
  readonly label: ReactNode;
  readonly value: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-muted-foreground">
        {value}
      </div>
    </div>
  );
}

export function DataFieldGroup({ children }: { readonly children: ReactNode }) {
  return <div className="flex w-full max-w-md flex-col gap-3">{children}</div>;
}
