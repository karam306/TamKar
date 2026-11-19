"use client";

import { useState } from "react";

export function ProductGallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);
  const list = images.length ? images : ["/demo/k1.svg"];
  return (
    <div className="flex flex-col gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={list[active]} alt={title} className="aspect-square w-full rounded-theme bg-surface object-cover" />
      {list.length > 1 && (
        <div className="grid grid-cols-5 gap-2">
          {list.map((src, i) => (
            <button key={src} type="button" onClick={() => setActive(i)} className={`overflow-hidden rounded-theme border-2 ${i === active ? "border-primary" : "border-transparent"}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" className="aspect-square w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
