import { AdminLoginForm } from "@/components/admin/forms/login";
import { logo } from "@/lib/assets/r2";
import { useTranslations } from "next-intl";
import Image from "next/image";

export default function AdminAuthPage() {
    const t = useTranslations("admin.auth");
    return (
        // <div className="w-full min-h-full flex flex-1">
            <main className="gap-y-6 flex flex-col w-80 mx-auto justify-center h-full">
                <div className="size-32 mx-auto flex justify-center">
                    <Image src={logo} alt="Advisory Platform Logo" className="w-auto h-auto"></Image>
                </div>
                <div className="flex flex-col gap-y-6">
                    <h1 className="text-xl font-medium">
                        {t('header')}
                    </h1>
                    <div className="flex flex-col gap-y-4">
                        <AdminLoginForm />
                    </div>
                </div>
            </main>
        // {/* </div> */}
    )
}