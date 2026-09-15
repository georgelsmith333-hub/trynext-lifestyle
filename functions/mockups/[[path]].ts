/*
 * Retire every historical browser-facing mockup URL at the edge.
 *
 * The old PNG bundles remain in the repository as audit/source evidence, but
 * the only public runtime namespace is Smart v10.3's reviewed role package.
 * Keeping this guard in front of static asset lookup prevents a stale link,
 * browser cache, or old database row from reviving a retired silhouette.
 */
const CANONICAL_RUNTIME_PREFIX = "psd-master-v10/runtime-roles/";

export const onRequest = async (context: {
  params: { path?: string | string[] };
  next: () => Promise<Response>;
}): Promise<Response> => {
  const path = Array.isArray(context.params.path)
    ? context.params.path.join("/")
    : context.params.path ?? "";

  if (!path.startsWith(CANONICAL_RUNTIME_PREFIX)) {
    return new Response("This mockup runtime has been retired.", {
      status: 410,
      headers: {
        "Cache-Control": "public, max-age=86400",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return context.next();
};