import { AppShell } from "@/components/appshell";
import { MobileViewport } from "@/components/mobile/viewport";

export default function AppShellPage() {
    return <MobileViewport><AppShell/></MobileViewport>
}
