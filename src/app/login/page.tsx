import { getTranslations } from "next-intl/server";
import { AppMark } from "@/components/app-mark";
import { LanguageSwitch } from "@/components/language-switch";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const t = await getTranslations();
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pt-4 pb-10">
      <div className="flex justify-end">
        <LanguageSwitch compact />
      </div>
      <div className="mt-8 mb-8 space-y-3">
        <AppMark />
        <h1 className="text-3xl font-bold">{t("app.name")}</h1>
        <p className="text-lg text-muted">{t("login.intro")}</p>
      </div>
      <LoginForm />
    </main>
  );
}
