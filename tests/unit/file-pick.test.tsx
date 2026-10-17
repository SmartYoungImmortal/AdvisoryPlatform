import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilePickButton } from "@/components/onboarding/file-pick";

describe("FilePickButton", () => {
  it("opens the matching file picker and reports only the selected file name", () => {
    const onPick = vi.fn();
    const { container } = render(
      <FilePickButton accept="image/*" onPick={onPick}>Choose file</FilePickButton>,
    );
    const input = container.querySelector<HTMLInputElement>('input[type="file"]');
    expect(input).not.toBeNull();
    expect(input?.getAttribute("accept")).toBe("image/*");
    const click = vi.spyOn(input!, "click");
    fireEvent.click(screen.getByRole("button", { name: "Choose file" }));
    expect(click).toHaveBeenCalledOnce();

    const file = new File(["proof"], "license.png", { type: "image/png" });
    fireEvent.change(input!, { target: { files: [file] } });
    expect(onPick).toHaveBeenCalledOnce();
    expect(onPick).toHaveBeenCalledWith("license.png");
    expect(input!.value).toBe("");
  });
});
