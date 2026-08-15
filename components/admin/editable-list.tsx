import Link from "next/link";
import { Plus, Save } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

/**
 * Figma "Category Item" list (1042:15185): each row is an input with a save
 * icon; the footer row adds a new entry. Static prototype: save/add navigate
 * to the /saved state route.
 */
export function EditableList({ children }: { readonly children: ReactNode }) {
  return <div className="flex w-full flex-col gap-2.5">{children}</div>;
}

export function EditableListItem({
  defaultValue,
  saveHref,
  saveLabel,
}: {
  readonly defaultValue: string;
  readonly saveHref: string;
  readonly saveLabel: string;
}) {
  return (
    <InputGroup className="w-full">
      <InputGroupInput defaultValue={defaultValue} />
      <InputGroupAddon align="inline-end">
        <Button
          aria-label={saveLabel}
          render={<Link href={saveHref} />}
          size="icon-sm"
          variant="ghost"
        >
          <Save className="size-4" />
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}

export function EditableListAddRow({
  placeholder,
  addHref,
  addLabel,
}: {
  readonly placeholder: string;
  readonly addHref: string;
  readonly addLabel: string;
}) {
  return (
    <InputGroup className="mt-auto w-full">
      <InputGroupInput placeholder={placeholder} />
      <InputGroupAddon align="inline-end">
        <Button
          aria-label={addLabel}
          render={<Link href={addHref} />}
          size="icon-sm"
          variant="ghost"
        >
          <Plus className="size-4" />
        </Button>
      </InputGroupAddon>
    </InputGroup>
  );
}
