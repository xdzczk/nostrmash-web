import Image from "next/image";

const LOGO_SRC = "/branding/NostrMashLogoHorizontalDarkMode.webp";

export function BrandLogo({
  className = "",
  priority = false,
}: {
  className?: string;
  priority?: boolean;
}) {
  return (
    <span className={`relative block h-8 w-[132px] shrink-0 sm:w-[168px] ${className}`.trim()}>
      <Image
        src={LOGO_SRC}
        alt="NostrMash"
        fill
        priority={priority}
        sizes="(min-width: 640px) 168px, 132px"
        className="object-contain object-left"
      />
    </span>
  );
}
