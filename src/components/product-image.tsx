import Image from "next/image";
import { withBase } from "@/lib/base-path";

// Las fotos reales pasan por el optimizador de Next (AVIF/WebP); los SVG se sirven tal cual.
export function ProductImage({
  src,
  alt,
  priority,
  sizes = "(min-width: 1024px) 25vw, 50vw",
  className = "",
}: {
  src: string | null | undefined;
  alt: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
}) {
  if (!src) return <div className={`aspect-[4/5] bg-line ${className}`} aria-hidden />;
  return (
    <div className={`relative aspect-[4/5] overflow-hidden bg-line ${className}`}>
      <Image
        src={withBase(src)}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={src.endsWith(".svg")}
        className="object-cover"
      />
    </div>
  );
}
