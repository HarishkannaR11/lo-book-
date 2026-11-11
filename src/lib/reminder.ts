import "server-only";
import { getFormatter, getTranslations } from "next-intl/server";
import type { Locale } from "@/i18n/config";

type ReminderInput = {
  party: string;
  partyPhone: string | null;
  business: string;
  owner: string;
  ownerPhone: string;
  outstanding: number;
  today: string;
  trips: { from: string; to: string; date: string; freight: number }[];
};

/** The WhatsApp reminder text in one language. The amount is the party_outstanding figure. */
export async function reminderText(locale: Locale, r: ReminderInput): Promise<string> {
  const t = await getTranslations({ locale, namespace: "reminder" });
  const format = await getFormatter({ locale });
  const lines = [
    t("greeting", { party: r.party }),
    t("from", { business: r.business }),
    "",
    t("due", { amount: format.number(r.outstanding, "inr"), date: format.dateTime(new Date(r.today), "short") }),
  ];
  if (r.trips.length > 0) {
    lines.push("", t("recentTrips"));
    for (const trip of r.trips) {
      lines.push(
        t("tripLine", {
          from: trip.from,
          to: trip.to,
          date: format.dateTime(new Date(trip.date), "short"),
          freight: format.number(trip.freight, "inr"),
        }),
      );
    }
  }
  lines.push("", t("request"), t("sign", { owner: r.owner, phone: `+91 ${r.ownerPhone.slice(2, 7)} ${r.ownerPhone.slice(7)}` }));
  return lines.join("\n");
}

/** wa.me opens the chat with that number; with no number, WhatsApp asks whom to send it to. */
export function whatsappLink(phone: string | null, text: string): string {
  return `https://wa.me/${phone ?? ""}?text=${encodeURIComponent(text)}`;
}
