export function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group p-4">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold">
        {q}
        <span className="text-xl text-muted transition-transform group-open:rotate-45">+</span>
      </summary>
      <p className="mt-2 leading-7 text-muted">{a}</p>
    </details>
  );
}
