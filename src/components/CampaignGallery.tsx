"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { optimizeCatalogImage } from "@/lib/image-url";

type CampaignImage = { id: string; url: string };

export type CampaignGalleryCampaign = {
  id: string;
  title: string;
  description: string | null;
  locationTag: string | null;
  sizeTag: string | null;
  qualityTag: string | null;
  images: CampaignImage[];
};

export function CampaignGallery({ campaign }: { campaign: CampaignGalleryCampaign }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const images = campaign.images;

  const close = useCallback(() => setOpen(false), []);

  const scrollToIndex = useCallback((i: number) => {
    pageRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  // Açılınca en üste sar; sayfalar kaydırıldıkça hangisinin görünür
  // olduğunu izleyip "x / y" göstergesini güncelle.
  useEffect(() => {
    if (!open) return;
    setIndex(0);
    scrollRef.current?.scrollTo({ top: 0 });

    const container = scrollRef.current;
    if (!container) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!mostVisible) return;
        const i = pageRefs.current.findIndex((el) => el === mostVisible.target);
        if (i !== -1) setIndex(i);
      },
      { root: container, threshold: [0.5, 0.75] }
    );
    pageRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        e.preventDefault();
        scrollToIndex(Math.min(index + 1, images.length - 1));
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        scrollToIndex(Math.max(index - 1, 0));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, index, images.length, scrollToIndex]);

  if (images.length === 0) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block w-full p-2 text-left"
      >
        {(campaign.locationTag || campaign.sizeTag || campaign.qualityTag) && (
          <div className="campaign-tag-medallion mb-3">
            {campaign.locationTag && (
              <span className="campaign-tag-line">{campaign.locationTag}</span>
            )}
            {campaign.sizeTag && (
              <span className="campaign-tag-line campaign-tag-line--muted">
                {campaign.sizeTag}
              </span>
            )}
            {campaign.qualityTag && (
              <span className="campaign-tag-line campaign-tag-line--muted">
                {campaign.qualityTag}
              </span>
            )}
          </div>
        )}
        <p className="font-semibold">{campaign.title}</p>
        {campaign.description && (
          <p className="theme-muted mt-1 text-xs">{campaign.description}</p>
        )}
        {images.length > 0 && (
          <p className="theme-muted mt-2 text-[10px]">
            {images.length} sayfa · görüntülemek için dokunun
          </p>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-[200] flex flex-col bg-black/95">
          <div className="flex items-center justify-between p-3 text-white">
            <span className="text-xs">
              {index + 1} / {images.length}
            </span>
            <button
              type="button"
              onClick={close}
              className="text-2xl leading-none"
              aria-label="Kapat"
            >
              ×
            </button>
          </div>

          {/*
            Yatay kaydırmalı carousel yerine dikey, sayfa-sayfa kayan (snap)
            bir liste: PDF görüntüleyici mantığına daha yakın ve ilk sayfanın
            altından bir sonraki sayfanın kenarı göründüğü için "daha var"
            algısı otomatik oluşuyor — ok/nokta göstergesine gerek kalmıyor.
          */}
          <div
            ref={scrollRef}
            className="snap-y snap-mandatory flex-1 overflow-y-auto overscroll-contain"
          >
            {images.map((img, i) => (
              <div
                key={img.id}
                ref={(el) => {
                  pageRefs.current[i] = el;
                }}
                className="flex h-[88dvh] w-full snap-start items-center justify-center px-2 py-4"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={optimizeCatalogImage(img.url, 1400)}
                  alt={`${campaign.title} — sayfa ${i + 1}`}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ))}
          </div>

          {images.length > 1 && index === 0 && (
            <div className="pointer-events-none fixed inset-x-0 bottom-5 flex justify-center">
              <span className="animate-bounce rounded-full bg-white/10 px-3 py-1 text-xs text-white">
                ↓ Diğer sayfalar için aşağı kaydırın
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
