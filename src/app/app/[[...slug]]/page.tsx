import AppRouteRenderer from "@/components/next/AppRouteRenderer";

export default async function AppPage({
  params,
}: {
  params: Promise<{ slug?: string[] }>;
}) {
  const { slug } = await params;
  return <AppRouteRenderer slug={slug} />;
}
