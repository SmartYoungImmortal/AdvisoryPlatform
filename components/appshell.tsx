import { BottomBar } from "@/components/bottombar";
import { TopBar } from "@/components/topbar";

export function AppShell() {
    return <div className="w-full h-full flex flex-1 flex-col mb-14 relative bg-background">
        <TopBar />
        <main className="flex flex-col w-full">

        </main>
        {/* Positioned by hand rather than laid out by a MobileScreen, so it drops
            the negative margin the bar carries to reach that frame's bottom edge. */}
        <BottomBar selected={null} role="anon" className="absolute -bottom-14 mb-0"/>
    </div>
}