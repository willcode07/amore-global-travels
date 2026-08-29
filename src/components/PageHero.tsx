import { assetPath } from "@/lib/asset";
import { site } from "@/lib/site";

type PageHeroProps = {
  title: string;
  subtitle: string;
  image: string;
};

export function PageHero({ title, subtitle, image }: PageHeroProps) {
  const imageUrl = image.startsWith("http") ? image : assetPath(image);

  return (
    <section className="relative isolate min-h-[46vh] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center amore-hero-zoom"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-black/88 via-black/55 to-black/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/20" />
      <div className="relative mx-auto flex min-h-[46vh] max-w-6xl flex-col justify-end px-5 pb-12 pt-28 md:px-8">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-gold amore-fade-up">
          {site.name}
        </p>
        <h1 className="max-w-3xl font-display text-4xl text-white md:text-5xl amore-fade-up-delay">
          {title}
        </h1>
        <p className="mt-3 max-w-2xl text-base text-white/85 md:text-lg amore-fade-up-delay-2">
          {subtitle}
        </p>
      </div>
    </section>
  );
}
