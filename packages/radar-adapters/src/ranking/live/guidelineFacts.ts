import type { ContributorPayKind, ResponseTimeBand } from "@missa/radar-engine";

/**
 * Facts read from a magazine's own submission guidelines, each with the page
 * it came from and the words that state it. Used only where no directory
 * listing or submission portal records the fact.
 */
export interface MagazineGuidelineRecord {
  profileId: string;
  name: string;
  /** The day the quotes were checked against the live pages. */
  checkedOn: string;
  fee: { charges: boolean; amountUSD: number | null; url: string; quote: string } | null;
  pay: { kind: "cash" | "contributor copies only" | "no payment"; url: string; quote: string } | null;
  response: {
    band: "less than 3 months" | "3 to 6 months" | "greater than 6 months";
    url: string;
    quote: string;
  } | null;
  status: { value: "closed" | "hiatus"; url: string; quote: string } | null;
}

export interface GuidelineFacts {
  year: number;
  recordedOn: string;
  fee: { chargesFee: boolean; regularFeeCents: number | null; url: string } | null;
  pay: { kind: ContributorPayKind; url: string } | null;
  response: { band: ResponseTimeBand; url: string } | null;
}

const BANDS: Record<string, ResponseTimeBand> = {
  "less than 3 months": "under_3_months",
  "3 to 6 months": "3_to_6_months",
  "greater than 6 months": "over_6_months",
};
const PAY: Record<string, ContributorPayKind> = {
  cash: "cash",
  "contributor copies only": "copies_only",
  "no payment": "unpaid",
};

export function guidelineFacts(record: MagazineGuidelineRecord): GuidelineFacts {
  const fee = record.fee;
  return {
    year: Number(record.checkedOn.slice(0, 4)),
    recordedOn: record.checkedOn,
    fee: fee
      ? {
          chargesFee: fee.charges,
          regularFeeCents: fee.charges
            ? fee.amountUSD != null && fee.amountUSD > 0 ? Math.round(fee.amountUSD * 100) : null
            : 0,
          url: fee.url,
        }
      : null,
    pay: record.pay && PAY[record.pay.kind] ? { kind: PAY[record.pay.kind], url: record.pay.url } : null,
    response:
      record.response && BANDS[record.response.band]
        ? { band: BANDS[record.response.band], url: record.response.url }
        : null,
  };
}
