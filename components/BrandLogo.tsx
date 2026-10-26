import Link from "next/link";

/**
 * The AetherSkin lockup (owner-supplied, transparent PNG) as a home link.
 * Used top-left on every page so the brand mark is consistent site-wide.
 */
export function BrandLogo({ height = 34, className }: { height?: number; className?: string }) {
  return (
    <Link href="/" aria-label="AetherSkin home" className={className} style={{ display: "inline-block", lineHeight: 0 }}>
      {/* eslint-disable-next-line @next/next/no-img-element -- static brand asset, fixed size */}
      <img
        src="/brand/lockup-aetherskin.png"
        alt="AetherSkin"
        width={Math.round((height * 1200) / 283)}
        height={height}
        style={{ height, width: "auto", display: "block" }}
      />
    </Link>
  );
}
