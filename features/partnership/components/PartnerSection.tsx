import { getMyPartnership } from "../server/queries";
import { InviteForm } from "./InviteForm";
import { PendingInviteCard } from "./PendingInviteCard";
import { LinkedPartnerCard } from "./LinkedPartnerCard";

export async function PartnerSection() {
  const { active, receivedPending, sentPending } = await getMyPartnership();

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-semibold">부부 연결</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          부부로 연결하면 가계부 (지출·정기 구독·예산·월 목표) 가 양쪽 모두에게 보여요.
        </p>
      </div>

      {active && <LinkedPartnerCard partnership={active} />}
      {!active && receivedPending && (
        <PendingInviteCard partnership={receivedPending} mode="received" />
      )}
      {!active && sentPending && (
        <PendingInviteCard partnership={sentPending} mode="sent" />
      )}
      {!active && !receivedPending && !sentPending && <InviteForm />}
    </section>
  );
}
