import PublicRouteRenderer from "@/components/next/PublicRouteRenderer";

export default async function PublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicRouteRenderer slug={slug} />;
}
