type QuestionImageProps = {
  imageUrl?: string | null;
  alt: string;
  className?: string;
};

export function QuestionImage({
  imageUrl,
  alt,
  className = '',
}: QuestionImageProps) {
  if (!imageUrl) {
    return null;
  }

  return (
    <figure
      className={`overflow-hidden rounded-lg border border-border bg-surface p-3 ${className}`}
    >
      <img
        src={imageUrl}
        alt={alt}
        loading="lazy"
        className="mx-auto max-h-80 w-full max-w-3xl object-contain"
      />
    </figure>
  );
}
