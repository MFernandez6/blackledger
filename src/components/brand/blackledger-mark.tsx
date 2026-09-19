import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  markClassName?: string;
  as?: "h1" | "span";
};

/** Product wordmark: BLACKLEDGER™ */
export function BlackledgerMark({
  className,
  markClassName,
  as: Tag = "span",
}: Props) {
  return (
    <Tag className={cn("inline-flex items-start justify-center", className)}>
      <span>BLACKLEDGER</span>
      <span
        className={cn(
          "ml-0.5 mt-[0.32em] font-sans text-[0.38em] font-semibold leading-none tracking-normal text-brand-gold/80",
          markClassName
        )}
        aria-label="trademark"
      >
        TM
      </span>
    </Tag>
  );
}
