import { PageHeader } from "@/components/admin-ui";
import { requireOwner } from "@/lib/auth";
import { storeChat, telegramReady } from "@/lib/telegram";
import { connectTelegram, disconnectTelegram } from "./actions";
import { TestButton } from "./test-button";

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ err?: string }> }) {
  const { store } = await requireOwner();
  const { err } = await searchParams;
  const ready = telegramReady();
  const chat = ready ? await storeChat(store.id) : null;

  return (
    <div className="space-y-4">
      <PageHeader title="إشعارات تيليغرام" back="/dashboard/settings" />
      <section className="card space-y-3 p-5 text-sm">
        <p>
          كل طلب جديد بيوصلك رسالة على تيليغرام فوراً: شو طلب الزبون، المجموع، رقمه، وزر يفتح الطلب. حتى لو الزبون ما بعتلك عالواتساب.
        </p>
        {!ready ? (
          <p className="rounded-lg bg-[#fff4e5] p-3">الإشعارات لسا عم تتجهز من طرف المنصة. جرّب بعد شوي.</p>
        ) : chat ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-green-50 p-3 font-semibold text-green-800">✓ مربوط. الطلبات عم توصلك على تيليغرام.</p>
            <div className="flex flex-wrap gap-2">
              <TestButton />
              <form action={disconnectTelegram}>
                <button className="btn btn-outline">افصل</button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ol className="list-inside list-decimal space-y-1 text-muted">
              <li>اكبس الزر تحت، بيفتحلك تيليغرام.</li>
              <li>بتيليغرام اكبس <b>Start</b> (أو ابدأ).</li>
              <li>بتوصلك رسالة &quot;تم الربط&quot;. ارجع لهون واعمل تحديث للصفحة.</li>
            </ol>
            {err && <p className="rounded-lg bg-red-50 p-3 text-red-700">ما قدرنا نجهز الرابط، جرب كمان مرة بعد شوي.</p>}
            <form action={connectTelegram}>
              <button className="btn w-full !bg-[#229ED9] sm:w-auto">اربط تيليغرام</button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
