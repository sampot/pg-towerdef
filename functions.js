/** Optional Playgrounds Infrastructure stub. */
export default {
  async fetch(request) {
    return Response.json({
      ok: true,
      name: "pg-towerdef",
      path: new URL(request.url).pathname,
    });
  },
};
