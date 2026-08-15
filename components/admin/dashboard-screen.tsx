import Link from "next/link";
import { Banknote, Flag, Receipt, ShieldCheck } from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";

import { MiniBarChart } from "@/components/admin/bar-chart";
import { AdminPageHeader } from "@/components/admin/page-header";
import { QueueCard } from "@/components/admin/queue-card";
import { AdminContent } from "@/components/admin/shell";
import { StatCard } from "@/components/admin/stat-card";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { dashboardStats, revenueSeries } from "@/lib/admin/dashboard";
import { satangToBaht } from "@/lib/admin/money";
import { userReports } from "@/lib/admin/reports";
import { identityRequests } from "@/lib/admin/verification";

/** Report category slugs → display labels (English, no i18n keys exist). */
const CATEGORY_LABELS: Record<string, string> = {
  "off-platform": "Off-platform",
  harassment: "Harassment",
  scam: "Scam",
};

/** "View all" affordance in a recent-activity card header. */
function ViewAllLink({ href, label }: { readonly href: string; readonly label: string }) {
  return (
    <Link className="text-sm font-medium text-primary hover:underline" href={href}>
      {label}
    </Link>
  );
}

/**
 * Figma "Admin Dashboard" (1042:15074) — the frame is empty beyond the
 * heading, so the content is net-new shadcn-admin style: KPI doors into the
 * four queues, the 6-month fee chart with the GMV total as a headline number
 * (single scale — see MiniBarChart), and the two freshest queues.
 */
export function DashboardScreen({
  state = "default",
}: {
  readonly state?: "default";
} = {}) {
  void state;
  const t = useTranslations("admin");
  const format = useFormatter();

  const gmvTotalSatang = revenueSeries.reduce(
    (sum, point) => sum + point.gmvSatang,
    0,
  );

  return (
    <AdminContent>
      <AdminPageHeader
        description={t("dashboard.description")}
        title={<span className="font-latin">{t("dashboard.title")}</span>}
      />

      <div className="flex w-full gap-4">
        <StatCard
          href="/admin/verification"
          icon={ShieldCheck}
          label={t("dashboard.statVerifications")}
          value={dashboardStats.pendingVerifications}
        />
        <StatCard
          href="/admin/refunds"
          icon={Receipt}
          label={t("dashboard.statRefunds")}
          value={dashboardStats.openRefunds}
        />
        <StatCard
          href="/admin/reports"
          icon={Flag}
          label={t("dashboard.statReports")}
          value={dashboardStats.openReports}
        />
        <StatCard
          href="/admin/payouts"
          icon={Banknote}
          label={t("dashboard.statPayouts")}
          value={format.number(
            satangToBaht(dashboardStats.payoutsDueSatang),
            "baht",
          )}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.chartTitle")}</CardTitle>
          <CardDescription>{t("dashboard.chartHint")}</CardDescription>
          <CardAction className="flex flex-col items-end gap-0.5">
            <span className="text-xs font-normal text-muted-foreground">
              {t("dashboard.gmvTotal")}
            </span>
            <span className="font-latin text-xl font-semibold text-foreground">
              {format.number(satangToBaht(gmvTotalSatang), "baht")}
            </span>
          </CardAction>
        </CardHeader>
        <CardContent>
          <MiniBarChart
            formatValue={(value) => format.number(value, "baht")}
            series={revenueSeries.map((point) => ({
              label: point.month,
              value: satangToBaht(point.feeSatang),
            }))}
          />
        </CardContent>
      </Card>

      <div className="flex w-full gap-4">
        <Card className="min-w-0 flex-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {t("dashboard.recentVerifications")}
            </CardTitle>
            <CardAction>
              <ViewAllLink href="/admin/verification" label={t("common.viewAll")} />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {identityRequests.slice(0, 3).map((request) => (
              <QueueCard
                avatarName={request.fullName}
                href="/admin/verification"
                key={request.id}
                subtitle={format.dateTime(new Date(request.submittedAt), "short")}
                title={request.fullName}
              />
            ))}
          </CardContent>
        </Card>

        <Card className="min-w-0 flex-1">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              {t("dashboard.recentReports")}
            </CardTitle>
            <CardAction>
              <ViewAllLink href="/admin/reports" label={t("common.viewAll")} />
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {userReports.slice(0, 3).map((report) => {
              const riskLabel =
                report.risk === "LOW"
                  ? t("reports.riskLow")
                  : t("reports.riskHigh");
              return (
                <QueueCard
                  href="/admin/reports"
                  key={report.id}
                  subtitle={
                    <span className="font-latin">{report.reportedUser}</span>
                  }
                  title={
                    <>
                      <span className="font-latin">
                        {CATEGORY_LABELS[report.category]}
                      </span>{" "}
                      ({riskLabel})
                    </>
                  }
                />
              );
            })}
          </CardContent>
        </Card>
      </div>
    </AdminContent>
  );
}
