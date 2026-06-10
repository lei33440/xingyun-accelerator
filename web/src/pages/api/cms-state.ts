import type { APIRoute } from 'astro';
import { mockCms } from '@lib/mock-cms';

export const GET: APIRoute = async () => {
  const [global, articles, plans] = await Promise.all([
    mockCms.getGlobalSettings(),
    mockCms.getAllArticles(),
    mockCms.getAllPricingPlans(),
  ]);
  return new Response(
    JSON.stringify(
      { mode: 'mock', global, articles, plans },
      null,
      2,
    ),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
