import type { SchemaGraph, SchemaNode } from '@/lib/seo/schema';

/**
 * Renders a page's structured data as one `<script type="application/ld+json">`.
 *
 * A plain server-rendered `<script>` rather than `next/script`. Structured data
 * has to be in the initial HTML: `strategy="afterInteractive"` — which this repo
 * used on `/combo-bundles/[slug]` — injects the tag only once the bundle has
 * hydrated, and a crawler that does not execute JavaScript, or gives up before
 * hydration, simply never sees it. `beforeInteractive` does land in the HTML but
 * buys nothing here and drags the tag through Next's script pipeline for no
 * reason.
 *
 * One tag per page, not one per entity, so the nodes can cross-reference by
 * `@id` and resolve to a single Organization instead of one per page.
 */

/**
 * Escape the three characters that can break out of a `<script>` element.
 *
 * `<` is the dangerous one: a `</script>` sequence inside a JSON string value —
 * an admin-authored product description is entirely capable of containing one —
 * closes the element early and spills the rest of the graph into the document
 * as markup. Escaping to `<` keeps the JSON byte-for-byte equivalent while
 * making the sequence unrepresentable.
 */
function escapeJsonLd(value: SchemaGraph | SchemaNode): string {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

export function JsonLd({ graph }: { graph: SchemaGraph | SchemaNode | null | undefined }) {
  // A page whose data failed to load emits no tag at all rather than an empty
  // graph, which validators flag.
  if (!graph) return null;
  if ('@graph' in graph && Array.isArray(graph['@graph']) && graph['@graph'].length === 0) {
    return null;
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: escapeJsonLd(graph) }}
    />
  );
}

export default JsonLd;
