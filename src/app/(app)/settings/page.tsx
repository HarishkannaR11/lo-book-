import { getTranslations } from "next-intl/server";
import { DeleteAccount } from "@/components/delete-account";
import { LanguageSwitch } from "@/components/language-switch";
import { countRows } from "@/components/masters/lists";
import { SignOutButton } from "@/components/sign-out-button";
import { ListRow } from "@/components/ui/list-row";
import { PageHeader } from "@/components/ui/page-header";
import { OwnerForm } from "@/app/onboarding/owner-form";
import { formatMobile } from "@/lib/format";
import { requireOwner } from "@/lib/owner";

export default async function Settings() {
  const owner = await requireOwner();
  const t = await getTranslations();
  const [vehicles, drivers, parties] = await Promise.all([countRows("vehicles"), countRows("drivers"), countRows("parties")]);

  return (
    <div className="space-y-8">
      <PageHeader title={t("settings.title")} />

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("language.label")}</h2>
        <LanguageSwitch />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("settings.lists")}</h2>
        <ul className="card divide-y divide-line overflow-hidden">
          <li>
            <ListRow href="/settings/vehicles" title={t("vehicles.title")} subtitle={t("vehicles.count", { count: vehicles })} />
          </li>
          <li>
            <ListRow href="/settings/drivers" title={t("drivers.title")} subtitle={t("drivers.count", { count: drivers })} />
          </li>
          <li>
            <ListRow href="/settings/parties" title={t("parties.title")} subtitle={t("parties.count", { count: parties })} />
          </li>
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("settings.business")}</h2>
        <OwnerForm owner={owner} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-bold">{t("settings.account")}</h2>
        <p className="text-muted">{t("settings.signedInAs", { phone: `+91 ${formatMobile(owner.phone)}` })}</p>
        <SignOutButton />
        <a href="/privacy.html" className="btn-link">
          {t("settings.privacy")}
        </a>
      </section>

      <section id="delete-account" className="space-y-3">
        <DeleteAccount />
      </section>
    </div>
  );
}
