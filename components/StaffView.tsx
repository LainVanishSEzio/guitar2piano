"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { renderStaff } from "@/lib/staff";
import type { StaffMeasure } from "@/lib/staff";

interface Props {
  measures: StaffMeasure[];
  keyName: string;
  timeSignature: [number, number];
  activeIndex: number;
  title?: string;
  subtitle?: string;
  onReady?: (host: HTMLDivElement) => void;
}

export default function StaffView({
  measures,
  keyName,
  timeSignature,
  activeIndex,
  title,
  subtitle,
  onReady,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(900);

  useLayoutEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    const measure = () => setWidth(Math.max(260, el.clientWidth - 16));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const el = hostRef.current;
    if (!el) return;
    try {
      const mpr = width >= 1080 ? 4 : width >= 780 ? 3 : width >= 520 ? 2 : 1;
      renderStaff(el, {
        measures,
        key: keyName,
        timeSignature,
        width: width - 8,
        measuresPerRow: mpr,
        activeIndex,
        title,
        subtitle,
      });
      onReady?.(el);
    } catch {
      /* 渲染失败忽略 */
    }
  }, [measures, keyName, timeSignature, width, activeIndex, title, subtitle, onReady]);

  return (
    <div
      ref={hostRef}
      className="paper w-full overflow-x-auto rounded-lg border border-black/10"
      style={{ minHeight: 160 }}
    />
  );
}
