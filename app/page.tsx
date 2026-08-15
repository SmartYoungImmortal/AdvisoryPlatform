import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { logo } from "@/lib/assets/r2";
import { HomeIndicator } from "@/components/mobile/home-indicator";
import { MobileScreen, ScreenBody } from "@/components/mobile/screen";
import { StatusBar } from "@/components/mobile/status-bar";
import { MobileViewport } from "@/components/mobile/viewport";

/**
 * Screen directory. There is no home/dashboard frame in Figma yet, so this stands
 * in as the prototype's entry point and gives the Home tab somewhere to land.
 * Replace it once the dashboard is designed.
 */
const SECTIONS: ReadonlyArray<{
  readonly title: string;
  readonly node: string;
  readonly screens: ReadonlyArray<{ readonly href: string; readonly label: string }>;
}> = [
  {
    title: "Auth",
    node: "995:4115",
    screens: [
      { href: "/login", label: "Login" },
      { href: "/login/account-locked", label: "Login – Account locked" },
      { href: "/login/wrong-password", label: "Login – Wrong password" },
      { href: "/register", label: "Register" },
      { href: "/register/email-in-use", label: "Register – Email in use" },
      { href: "/register/validation-errors", label: "Register – Validation errors" },
      { href: "/forgot-password", label: "Forgot password" },
      { href: "/reset-sent", label: "Reset link sent" },
      { href: "/pdpa", label: "PDPA consent" },
      { href: "/terms", label: "Terms of Service" },
    ],
  },
  {
    title: "Profile & account",
    node: "995:7045",
    screens: [
      { href: "/profile", label: "Advisee profile – View" },
      { href: "/profile/edit", label: "Advisee profile – Edit" },
      { href: "/profile/edit/save-failed", label: "Edit profile – Save failed" },
      { href: "/profile/edit/photo-rejected", label: "Edit profile – Photo rejected" },
      { href: "/settings", label: "Account settings" },
      { href: "/settings/updated", label: "Account settings – updated" },
      { href: "/settings/password", label: "Change password" },
      { href: "/settings/password/wrong", label: "Change password – Wrong current" },
      { href: "/settings/delete", label: "Delete account" },
      { href: "/settings/delete/blocked", label: "Delete account – Blocked" },
      { href: "/settings/logout", label: "Log out confirm" },
    ],
  },
  {
    title: "Chat & messaging",
    node: "995:8151",
    screens: [
      { href: "/chat", label: "Chat Inbox" },
      { href: "/chat/empty", label: "Chat inbox – Empty" },
      { href: "/chat/sarah-jenskins", label: "Chat" },
      { href: "/chat/sarah-jenskins/message-failed", label: "Chat – Message failed" },
    ],
  },
  {
    title: "Notifications",
    node: "995:10812",
    screens: [
      { href: "/notifications", label: "Notification center" },
      { href: "/notifications/empty", label: "Notification center – Empty" },
      { href: "/notifications/push-primer", label: "Push primer" },
      { href: "/chat/session-banner", label: "In-app banner" },
    ],
  },
  {
    title: "Matching",
    node: "995:11175",
    screens: [
      { href: "/matching", label: "Problem description" },
      { href: "/matching/searching", label: "Matching in progress" },
      { href: "/matching/results", label: "Matched advisors" },
      { href: "/matching/results/no-results", label: "Matched advisors – No results" },
    ],
  },
  {
    title: "Screening & Trial",
    node: "995:11455",
    screens: [
      { href: "/screening/setup", label: "Advisor – Screening setup" },
      { href: "/screening/requests", label: "Advisor – Screening requests" },
      { href: "/screening/review", label: "Advisor – Review answers" },
      { href: "/screening/questions", label: "Advisee – Screening questions" },
      { href: "/screening/submitted", label: "Advisee – Screening submitted" },
      { href: "/screening/accepted", label: "Advisee – Screening accepted" },
      { href: "/screening/declined", label: "Advisee – Screening declined" },
      { href: "/screening/trial", label: "Trial consultation" },
    ],
  },
  {
    title: "Payment & checkout",
    node: "995:9906",
    screens: [
      { href: "/checkout/card", label: "Payment – Card details" },
      { href: "/checkout/card/errors", label: "Payment – Card details errors" },
      { href: "/checkout/processing", label: "Payment – Bank verification" },
      { href: "/checkout/success", label: "Payment – Success" },
      { href: "/checkout/failed", label: "Payment – Failed" },
      { href: "/checkout/unconfirmed", label: "Payment – Unconfirmed" },
      { href: "/checkout/slot-taken", label: "Payment – Slot taken" },
      { href: "/transactions", label: "Transaction history" },
      { href: "/transactions/detail", label: "Invoice detail" },
      { href: "/transactions/detail/failed", label: "Invoice detail – Failed" },
      { href: "/transactions/detail/refunded", label: "Invoice detail – Refunded" },
    ],
  },
  {
    title: "Reviews",
    node: "995:9560",
    screens: [
      { href: "/reviews", label: "Advisor – My reviews" },
      { href: "/reviews/empty", label: "My reviews – Empty" },
      { href: "/reviews/session", label: "Review – Submit failed" },
    ],
  },
  {
    title: "Advisor onboarding",
    node: "995:6214",
    screens: [
      { href: "/advisor/apply", label: "Become an advisor" },
      { href: "/advisor-onboarding/stage-1", label: "Stage 1" },
      { href: "/advisor-onboarding/stage-1/errors", label: "Stage 1 – Validation errors" },
      { href: "/advisor-onboarding/stage-2", label: "Stage 2" },
      { href: "/advisor-onboarding/stage-2/uploaded", label: "Stage 2 (uploaded)" },
      { href: "/advisor-onboarding/stage-2/rejected", label: "Stage 2 – Upload rejected" },
      { href: "/advisor-onboarding/stage-3", label: "Stage 3" },
      { href: "/advisor-onboarding/stage-3/missing-proof", label: "Stage 3 – Missing proof" },
      { href: "/advisor-onboarding/thank-you", label: "Thank You" },
      { href: "/advisor-onboarding/pending", label: "Verification Pending" },
      { href: "/advisor-onboarding/failed", label: "Verification Failed" },
    ],
  },
  {
    title: "Advisor profile & payouts",
    node: "995:8632",
    screens: [
      { href: "/advisor/profile", label: "Advisor profile – View" },
      { href: "/advisor/edit", label: "Advisor profile – Edit" },
      { href: "/advisor/skills", label: "Skill management" },
      { href: "/earnings", label: "Advisor – Earnings" },
      { href: "/earnings/payout-account", label: "Payout account – Status" },
      { href: "/earnings/payout-account/setup", label: "Payout account – Setup" },
      { href: "/earnings/payout-history", label: "Payout history" },
      { href: "/earnings/payout-history/failed", label: "Payout detail – Failed" },
    ],
  },
  {
    title: "Error states",
    node: "995:5918",
    screens: [
      { href: "/status/no-connection", label: "Error – No connection" },
      { href: "/status/not-found", label: "Error – Not found" },
      { href: "/status/server-error", label: "Error – Server" },
    ],
  },
  {
    title: "Admin Console",
    node: "1042:14855",
    screens: [
      { href: "/admin", label: "Admin – Entry (login)" },
      { href: "/admin/login", label: "Admin login" },
      { href: "/admin/login/error", label: "Admin login – Failed" },
      { href: "/admin/dashboard", label: "Dashboard" },
      { href: "/admin/users", label: "Users" },
      { href: "/admin/users/no-results", label: "Users – No results" },
      { href: "/admin/users/john-minecraft", label: "User detail" },
      { href: "/admin/users/john-minecraft/suspend", label: "User detail – Suspend confirm" },
      { href: "/admin/users/john-minecraft/suspended", label: "User detail – Suspended" },
      { href: "/admin/verification", label: "Identity verification" },
      { href: "/admin/verification/reject", label: "Verification – Reject reason" },
      { href: "/admin/verification/approved", label: "Verification – Approved" },
      { href: "/admin/verification/rejected", label: "Verification – Rejected" },
      { href: "/admin/verification/empty", label: "Verification – Empty" },
      { href: "/admin/verification/skills", label: "Skill-proof review" },
      { href: "/admin/verification/skills/approved", label: "Skill proof – Approved" },
      { href: "/admin/services", label: "Services" },
      { href: "/admin/services/no-results", label: "Services – No results" },
      { href: "/admin/manage", label: "Manage – Categories" },
      { href: "/admin/manage/saved", label: "Manage – Saved" },
      { href: "/admin/manage/skills", label: "Manage – Skills" },
      { href: "/admin/refunds", label: "Refund cases" },
      { href: "/admin/refunds/approve", label: "Refund – Confirm" },
      { href: "/admin/refunds/approved", label: "Refund – Approved" },
      { href: "/admin/refunds/rejected", label: "Refund – Rejected" },
      { href: "/admin/refunds/empty", label: "Refunds – Empty" },
      { href: "/admin/reports", label: "Report cases" },
      { href: "/admin/reports/suspend", label: "Report – Suspend confirm" },
      { href: "/admin/reports/suspended", label: "Report – Suspended" },
      { href: "/admin/reports/dismissed", label: "Report – Dismissed" },
      { href: "/admin/payouts", label: "Payouts" },
      { href: "/admin/payouts/paid", label: "Payouts – Marked paid" },
      { href: "/admin/payouts/failed", label: "Payouts – Failure desk" },
      { href: "/admin/transactions", label: "Transactions ledger" },
    ],
  },
];

export default function ScreenDirectoryPage() {
  const total = SECTIONS.reduce((n, s) => n + s.screens.length, 0);

  return (
    <MobileViewport>
    <MobileScreen>
      <StatusBar />
      <ScreenBody className="pb-6">
        <div className="flex w-full shrink-0 flex-col items-center px-6 pt-4">
          <Image alt="Advisory Platform" className="h-[63px] w-auto" priority src={logo} />
          <p className="mt-3 w-full text-center text-sm font-normal text-muted-foreground">
            {total} หน้าจากดีไซน์ · แตะเพื่อดูแต่ละหน้า
          </p>
        </div>

        {SECTIONS.map((section) => (
          <div
            className="flex w-full shrink-0 flex-col items-start gap-2 px-6 pt-5"
            key={section.node}
          >
            <div className="flex w-full items-baseline justify-between gap-3">
              <p className="text-sm font-medium text-foreground">
                {section.title}
              </p>
              <span className="font-latin text-xs font-normal text-muted-foreground">
                {section.node}
              </span>
            </div>
            <div className="flex w-full shrink-0 flex-col items-start overflow-clip rounded-xl bg-card">
              {section.screens.map((screen, i) => (
                <div className="w-full" key={screen.href}>
                  {i > 0 ? <div className="h-px w-full shrink-0 bg-muted" /> : null}
                  <Link
                    className="flex w-full shrink-0 items-center gap-3 overflow-clip p-3.5"
                    href={screen.href}
                  >
                    <span className="min-w-px flex-1 text-sm font-medium text-foreground">
                      {screen.label}
                    </span>
                    <span className="font-latin shrink-0 text-xs font-normal text-muted-foreground">
                      {screen.href}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                  </Link>
                </div>
              ))}
            </div>
          </div>
        ))}
      </ScreenBody>
      <HomeIndicator />
    </MobileScreen>
    </MobileViewport>
  );
}
