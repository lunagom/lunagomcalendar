import {
  getMyAcceptedShares,
  getMyIncomingInvites,
  getMyOwnedSharesGroupedByCalendar,
} from "@/features/social/server/queries";
import { SocialClient } from "@/features/social/components/SocialClient";

export const metadata = { title: "공유" };

export default async function SocialPage() {
  const [invites, accepted, owned] = await Promise.all([
    getMyIncomingInvites(),
    getMyAcceptedShares(),
    getMyOwnedSharesGroupedByCalendar(),
  ]);

  return (
    <SocialClient invites={invites} accepted={accepted} owned={owned} />
  );
}
