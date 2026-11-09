import type { Metadata } from "next";
import { getT } from "@/server/i18n";
import { PayFineForm } from "./pay-fine-form";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("pub.pay.title") };
}

export const dynamic = "force-dynamic";

export default async function PayPage() {
  const t = await getT();
  const provider = (process.env.TRAFFIC_ONLINE_PROVIDER || "off").toLowerCase();
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-extrabold text-ink">{t("pub.pay.title")}</h1>
      <p className="mb-5 text-sm text-slate">{t("pub.pay.intro")}</p>
      {provider === "off" ? (
        <p role="status" className="rounded-xl border border-line bg-card p-5 text-sm font-semibold text-ink">{t("pub.pay.off")}</p>
      ) : (
        <PayFineForm sandbox={provider === "sandbox"} />
      )}
    </div>
  );
}
