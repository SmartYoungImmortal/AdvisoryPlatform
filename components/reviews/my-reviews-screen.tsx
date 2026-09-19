"use client";

import { Star } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { arayaS as araya, christopherNolan as chris, jamesGunn as james } from "@/lib/assets/r2";
import { SiteFooter } from "@/components/marketing/site-footer";
import {
  MobileScreen,
  ScreenBody,
  ScreenHeading,
  ScreenSpacer,
  ScreenTopBar,
} from "@/components/mobile/screen";
import { ThaiText } from "@/components/mobile/thai-text";
import {
  ACCOUNT_NAV,
  ACCOUNT_PAGE,
  AccountBackBar,
} from "@/components/profile/account-chrome";
import { ReplyComposer, ReviewCard, Stars } from "@/components/reviews/review-parts";
import { TopBar } from "@/components/topbar";
import { cn } from "@/lib/utils";

/** Figma "Distribution" row — a 6px track with a proportional fill. */
function DistributionRow({ label, fill }: { readonly label: string; readonly fill: number }) {
  return (
    <div className="flex h-3.5 w-full shrink-0 items-center">
      <span className="font-latin w-2 shrink-0 text-xs leading-3.5 font-normal text-muted-foreground">
        {label}
      </span>
      <div className="ml-2 h-1.5 min-w-px flex-1 overflow-clip rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${fill}%` }} />
      </div>
    </div>
  );
}

/** The cards whose reply is still the advisor's to write. */
type ReplyTarget = "r2" | "r3";

/**
 * Figma "Advisor - My reviews" (995:9772), "My reviews - Empty" (995:9561),
 * "Advisor - My reviews (replying)" (995:8809) and "My reviews - Reply failed"
 * (995:9592).
 *
 * Figma "Desktop / Advisor - My reviews (Light)" (1787:26438), "Desktop / My
 * reviews - Empty (Light)" (1787:26362), "Desktop / Advisor - My reviews
 * (replying) (Light)" (1952:36812) and "Desktop / My reviews - Reply failed
 * (Light)" (1952:36597) re-seat the same four states on the 1200 grid: the
 * score and its distribution become a 384px aside the list scrolls past, the
 * empty state centres on the page instead, and the composer simply fills the
 * wider card — the desktop frames change nothing else about it.
 *
 * Composing a reply is real state, not a fourth layout: any card's reply
 * affordance opens the composer, cancelling closes it and sending turns the
 * draft into that card's reply block. `state` only says which frame the route
 * opens on — both composer frames open on the second card, and the reply-failed
 * one opens with its draft and its error already there, the way `LoginScreen`
 * seeds its banners.
 */
export function MyReviewsScreen({
  state = "default",
}: {
  readonly state?: "default" | "empty" | "replying" | "reply-failed";
}) {
  const t = useTranslations("reviews");
  const c = useTranslations("common");

  const composing = state === "replying" || state === "reply-failed";
  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(
    composing ? "r2" : null,
  );
  const [draft, setDraft] = useState(state === "reply-failed" ? t("replyDraft") : "");
  const [failed, setFailed] = useState(state === "reply-failed");
  const [sent, setSent] = useState<Partial<Record<ReplyTarget, string>>>({});

  function closeComposer() {
    setReplyingTo(null);
    setDraft("");
    setFailed(false);
  }

  function sendReply() {
    const body = draft.trim();
    if (!replyingTo || !body) return;
    setSent((current) => ({ ...current, [replyingTo]: body }));
    closeComposer();
  }

  /**
   * A card's ending, which is the same rule for every repliable card: the reply
   * once it is sent, the composer while it is open, the affordance otherwise.
   */
  function replyState(id: ReplyTarget) {
    const reply = sent[id];
    const open = replyingTo === id;
    return {
      onReply: () => {
        setReplyingTo(id);
        setDraft("");
        setFailed(false);
      },
      reply,
      replyAction: reply || open ? undefined : t("reply"),
      replyLabel: reply ? t("yourReply") : undefined,
    };
  }

  function composerFor(id: ReplyTarget) {
    if (replyingTo !== id) return null;
    return (
      <ReplyComposer
        failed={failed}
        id={`reply-${id}`}
        onCancel={closeComposer}
        onChange={(value) => {
          setDraft(value);
          // The error belongs to the send that failed, so editing retires it —
          // the same way typing clears the login banner.
          setFailed(false);
        }}
        onSubmit={sendReply}
        value={draft}
      />
    );
  }

  return (
    <MobileScreen wide>
      <ScreenTopBar className="lg:hidden" href="/profile" label={c("back")} />
      <ScreenBody>
        <div className={ACCOUNT_NAV}>
          <TopBar unreadNotifications />
        </div>
        <AccountBackBar href="/profile" label={c("back")} />

        {/* Figma "Head Band" — the title on the card surface, above the page.
            It holds the page column rather than the account column: what runs
            under it here is the 1200 grid, not an 800px form. */}
        <div className="w-full shrink-0 lg:bg-card">
          <ScreenHeading
            className={cn(ACCOUNT_PAGE, "pt-4 lg:pt-5 lg:pb-9")}
            title={t("title")}
          />
        </div>

        {state === "empty" ? (
          /* Figma "Empty State": 80px badge, 34/40 title block, then a 5-star row. */
          <div className="flex w-full shrink-0 flex-col items-center px-6 pt-[72px] text-center lg:mx-auto lg:max-w-[640px] lg:pt-28">
            <span className="flex size-20 shrink-0 items-center justify-center rounded-full bg-muted">
              <Star className="size-8.5 text-muted-foreground" />
            </span>
            <p className="mt-4 w-full text-2xl font-semibold text-foreground">
              {t("emptyTitle")}
            </p>
            <p className="mt-2 w-full text-sm font-normal text-muted-foreground">
              <ThaiText>{t("emptyBody")}</ThaiText>
            </p>
            <Stars className="mt-4" filled={0} gap={3} size={18} />
          </div>
        ) : (
          /* Figma "Body" (1787:26467) — the score stops being the first card of
             the list and becomes the column beside it, so a reader scrolling
             the reviews still has the shape of the score in view. */
          <div className="flex w-full shrink-0 flex-col items-start lg:mx-auto lg:grid lg:max-w-[1440px] lg:grid-cols-[384px_minmax(0,1fr)] lg:items-start lg:gap-8 lg:px-10 xl:px-30 lg:pt-12 lg:pb-24">
            {/* Figma "Summary Card": 4.9 score block beside the 5-bar distribution. */}
            <div className="flex w-full shrink-0 flex-col items-start px-6 pt-2 lg:px-0 lg:pt-0">
              <div className="flex w-full shrink-0 items-start gap-4 overflow-clip rounded-xl bg-card p-3.5">
                <div className="flex w-[72px] shrink-0 flex-col items-center gap-2.5 pt-3.5">
                  <p className="font-latin text-xl leading-6 font-semibold text-foreground">
                    4.9
                  </p>
                  <Stars gap={3} size={12} />
                  <p className="text-xs font-normal whitespace-nowrap text-muted-foreground">
                    {t("reviewCount")}
                  </p>
                </div>
                <div className="flex min-w-px flex-1 flex-col items-start gap-[5px]">
                  <DistributionRow fill={38} label="5" />
                  <DistributionRow fill={5} label="4" />
                  <DistributionRow fill={2} label="3" />
                  <DistributionRow fill={1} label="2" />
                  <DistributionRow fill={1} label="1" />
                </div>
              </div>
            </div>

            {/* Figma "Review List": 20px top padding, 12px between cards. The
                composer frames draw two cards rather than three, which is the
                taller composer being trimmed to the 874px frame and not a rule
                about the data — the list is the same list in every state. */}
            <div className="flex w-full shrink-0 flex-col items-start gap-3 px-6 pt-5 lg:px-0 lg:pt-0">
              <ReviewCard
                avatar={araya}
                body={t("r1Body")}
                date={t("r1Date")}
                meta={t("r1Meta")}
                name={t("r1Name")}
                reply={t("r1Reply")}
                replyLabel={t("yourReply")}
              />
              <ReviewCard
                avatar={chris}
                body={t("r2Body")}
                date={t("r2Date")}
                meta={t("r2Meta")}
                name={t("r2Name")}
                {...replyState("r2")}
              >
                {composerFor("r2")}
              </ReviewCard>
              <ReviewCard
                avatar={james}
                body={t("r3Body")}
                date={t("r3Date")}
                meta={t("r3Meta")}
                name={t("r3Name")}
                {...replyState("r3")}
              >
                {composerFor("r3")}
              </ReviewCard>
            </div>
          </div>
        )}

        {/* The slack under a short list on the phone; at 1440 it is also what
            holds the footer on the bottom edge of a tall viewport. */}
        <ScreenSpacer className="lg:min-h-24" />
        <SiteFooter className="hidden lg:flex" />
      </ScreenBody>
    </MobileScreen>
  );
}
