import { Search } from "lucide-react";

import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";

/**
 * Figma "Input" search row above every table (1042:15082). Presentational in
 * the static prototype — result variants are sibling routes (/no-results).
 */
export function AdminSearchBar({
  placeholder,
  defaultValue,
}: {
  readonly placeholder: string;
  readonly defaultValue?: string;
}) {
  return (
    <InputGroup className="w-full">
      <InputGroupAddon>
        <Search className="size-4" />
      </InputGroupAddon>
      <InputGroupInput defaultValue={defaultValue} placeholder={placeholder} />
    </InputGroup>
  );
}
