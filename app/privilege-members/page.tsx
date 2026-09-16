import type { Metadata } from 'next';

import { JsonLd } from '@/lib/seo/JsonLd';
import { buildPageGraph, getSeoContext } from '@/lib/seo/graph';
import { buildMetadata } from '@/lib/seo/metadata';
import PrivilegeMembersPageClient from './PrivilegeMembersPageClient';

/**
 * Server shell for /privilege-members.
 *
 * The interactive page is the client sibling; this half exists so the route has
 * its own title, description, canonical and structured data. Without it this
 * URL inherited the site defaults, which is how seventeen public routes came to
 * share one title and one description.
 */
export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoContext();

  return buildMetadata({
    titleKey: 'seo.privilegeMembers.title',
    descriptionKey: 'seo.privilegeMembers.description',
    descriptionValues: { brand: seo.name },
    path: '/privilege-members',
  });
}

export default async function Page() {
  const context = await getSeoContext();
  const { seo, t } = context;

  const name = t('seo.privilegeMembers.title');
  const description = t('seo.privilegeMembers.description', { brand: seo.name });

  const { graph } = await buildPageGraph(
    {
      path: '/privilege-members',
      name,
      description,
      breadcrumbs: [{ name, path: '/privilege-members' }],
    },
    context,
  );

  return (
    <>
      <JsonLd graph={graph} />
      <PrivilegeMembersPageClient />
    </>
  );
}
