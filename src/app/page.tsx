import Hero from "@/app/hero";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; visitorId?: string }>;
}) {
  const params = await searchParams;
  const registeredVisitorId =
    params.registered === "1" &&
    params.visitorId &&
    /^\d+$/.test(params.visitorId)
      ? params.visitorId
      : null;

  return (
    <main>
      <Hero registeredVisitorId={registeredVisitorId} />
    </main>
  );
}
