/**
 * Workers Caching removes `Range` before this Worker runs, stores the full
 * 200, and slices that stored body into the 206 Safari requires. It can only
 * slice a body whose length it knows. Next's edge sandbox drops Content-Length,
 * and its document `Vary` has nothing to do with a video preview, so a range
 * probe otherwise comes back as the whole file with status 200.
 */
export async function videoFrameCacheResponse(response: Response): Promise<Response> {
  if (response.status !== 200 || !response.body) return response;
  const body = await response.arrayBuffer();
  const headers = new Headers(response.headers);
  headers.set("content-length", String(body.byteLength));
  headers.set("accept-ranges", "bytes");
  headers.delete("content-encoding");
  headers.delete("vary");
  return new Response(body, { status: 200, headers });
}
