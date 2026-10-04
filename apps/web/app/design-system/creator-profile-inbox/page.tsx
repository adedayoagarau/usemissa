import {
  ProfileInbox,
  type ProfileInboxData,
} from "@/components/creator-profile/profile-inbox";

export const metadata = {
  title: "Profile inbox review",
  robots: { index: false, follow: false },
};

/** Fictional people and organizations; nothing here is sent anywhere. */
const SAMPLE: ProfileInboxData = {
  inquiries: [
    {
      id: "inq-1",
      senderName: "Ada Mensah",
      senderEmail: "ada@example.com",
      topic: "commission",
      message:
        "Hello Riley — I edit a small anthology of coastal writing and would love to commission a new sequence of three to five poems for our spring issue.\n\nWe pay £150 per poem. Would you be open to talking?",
      status: "new",
      createdAt: "2026-10-02T09:12:00Z",
    },
    {
      id: "inq-2",
      senderName: "Theo Park",
      senderEmail: "theo@example.com",
      topic: "booking",
      message:
        "We run a monthly reading night in Leeds and have a slot in November. Travel covered.",
      status: "read",
      createdAt: "2026-09-27T18:40:00Z",
    },
  ],
  invitations: [
    {
      id: "inv-1",
      organizationName: "The Quiet Review",
      opportunityId: "sample-call",
      opportunityTitle: "Spring reading period",
      deadline: "2026-11-30",
      open: true,
      message:
        "We loved “Tidal glossary” and think a longer sequence would suit our spring issue.",
      inviterName: "Ede, poetry editor",
      status: "sent",
      createdAt: "2026-10-01T11:00:00Z",
    },
  ],
  followers: [
    {
      accountId: "f-1",
      name: "Juno Adeyemi",
      handle: "junoadeyemi",
      since: "2026-09-30T10:00:00Z",
    },
    { accountId: "f-2", name: "Sam Ito", since: "2026-09-12T10:00:00Z" },
  ],
  following: [
    {
      accountId: "c-1",
      name: "Nadia Okafor",
      handle: "nadiaokafor",
      since: "2026-08-20T10:00:00Z",
    },
  ],
};

const EMPTY: ProfileInboxData = {
  inquiries: [],
  invitations: [],
  followers: [],
  following: [],
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const empty = (await searchParams).empty === "1";
  return <ProfileInbox initial={empty ? EMPTY : SAMPLE} demo />;
}
