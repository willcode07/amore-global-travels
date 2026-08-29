"use client";

import Image from "next/image";
import { assetPath } from "@/lib/asset";
import { site } from "@/lib/site";

export function BrandLogo({
  size = 48,
  invert = false,
}: {
  size?: number;
  invert?: boolean;
}) {
  return (
    <span className="relative inline-flex shrink-0">
      <Image
        src={assetPath(invert ? "/images/logo-alt.png" : "/images/logo.png")}
        alt={invert ? site.name : site.name}
        width={size}
        height={size}
        className={`${invert ? "hidden" : "block"} dark:hidden object-contain`}
        style={{ width: size, height: size }}
        priority
      />
      <Image
        src={assetPath("/images/logo-alt.png")}
        alt={invert ? site.name : ""}
        width={size}
        height={size}
        className={`${invert ? "block" : "hidden"} dark:block object-contain`}
        style={{ width: size, height: size }}
        aria-hidden={!invert}
      />
    </span>
  );
}
