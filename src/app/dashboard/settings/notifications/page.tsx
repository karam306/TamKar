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
          تصلك رسالة فورية على تيليغرام بكل طلب جديد: ما طلبه الزبون، والمجموع، ورقم هاتفه، وزر لفتح الطلب. حتى لو لم يرسل الزبون الطلب عبر واتساب.
        </p>
        {!ready ? (
          <p className="rounded-lg bg-[#fff4e5] p-3">لا تزال المنصة تجهّز الإشعارات. حاول لاحقاً.</p>
        ) : chat ? (
          <div className="space-y-3">
            <p className="rounded-lg bg-green-50 p-3 font-semibold text-green-800">✓ مرتبط. تصلك الطلبات على تيليغرام.</p>
            <div className="flex flex-wrap gap-2">
              <TestButton />
              <form action={disconnectTelegram}>
                <button className="btn btn-outline">فصل</button>
              </form>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <ol className="list-inside list-decimal space-y-1 text-muted">
              <li>اضغط الزر أدناه لفتح تيليغرام.</li>
              <li>في تيليغرام اضغط <b>Start</b> (أو ابدأ).</li>
              <li>ستصلك رسالة &quot;تم الربط&quot;. عُد إلى هنا وحدّث الصفحة.</li>
            </ol>
            {err && <p className="rounded-lg bg-red-50 p-3 text-red-700">تعذّر تجهيز الرابط، حاول مرة أخرى لاحقاً.</p>}
            <form action={connectTelegram}>
              <button className="btn w-full !bg-[#229ED9] sm:w-auto">ربط تيليغرام</button>
            </form>
          </div>
        )}
      </section>
    </div>
  );
}
