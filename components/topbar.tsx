import Image from "next/image";
import logo from "@/assets/illustrations/logo.svg";
import { Button } from "@/components/ui/button";
import { Bell, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

export function TopBar({ unreadNotifications = false }) {
  return (
    <div className="w-full flex justify-between items-center py-1 px-4">
      <Button variant="ghost" size="icon-lg">
        <Menu className="size-6 text-muted-foreground" />
      </Button>
      <Image src={logo} alt="Advisory platform logo" className="h-14" />
      <Button variant="ghost" size="icon-lg">
        <div className="size-6 relative">
            <Bell
            className={cn(
                "size-6 absolute left-0 top-0",
                unreadNotifications ? "text-foreground" : "text-muted-foreground",
            )}
            />
            {unreadNotifications && <div className="size-2 bg-primary rounded-full right-0 top-0 absolute z-50"></div>}
        </div>
      </Button>
    </div>
  );
}
