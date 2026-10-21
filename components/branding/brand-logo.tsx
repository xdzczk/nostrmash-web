import Image from "next/image";

const LOGO_DARK = "/branding/NostrMashLogoHorizontalDarkMode.webp";
const LOGO_LIGHT = "/branding/NostrMashLogoHorizontalLightMode.webp";

export function BrandLogo({
  className = "h-8 w-[132px] sm:w-[168px]",
  priority = false,
}: {
  /** Sizing classes; the caller owns height and width. */
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={`relative block shrink-0 ${className}`.trim()}>
      {/* Both assets render; the theme picks one via CSS so there is no flash on
          first paint and no client JS is required. */}
      <Image
        src={LOGO_DARK}
        alt="NostrMash"
        fill
        priority={priority}
        sizes="(min-width: 640px) 168px, 104px"
        className="theme-dark-only object-contain object-left"
      />
      <Image
        src={LOGO_LIGHT}
        alt="NostrMash"
        fill
        priority={priority}
        sizes="(min-width: 640px) 168px, 104px"
        className="theme-light-only object-contain object-left"
        aria-hidden
      />
    </span>
  );
}
