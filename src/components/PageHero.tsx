import { assetPath } from "@/lib/asset";

type PageHeroProps = {
  title: string;
  subtitle: string;
  image: string;
};

export function PageHero({ title, subtitle, image }: PageHeroProps) {
  const imageUrl = image.startsWith("http") ? image : assetPath(image);

  return (
    <section className="relative isolate min-h-[42vh] overflow-hidden">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/85 via-ink/55 to-ink/25" />
      <div className="relative mx-auto flex min-h-[42vh] max-w-6xl flex-col justify-end px-5 pb-12 pt-24 md:px-8">
        <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-gold">
          Amore Global
        </p>
        <h1 className="max-w-3xl font-display text-4xl text-white md:text-5xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-base text-white/85 md:text-lg">{subtitle}</p>
      </div>
    </section>
  );
}
