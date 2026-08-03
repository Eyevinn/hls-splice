const http = require("http");
const HLSSpliceVod = require("../index.js");

const MASTER_MANIFEST = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=4928000,RESOLUTION=960x540,CODECS="avc1.4d001f,mp4a.40.2"
media.m3u8
`;

const MEDIA_MANIFEST = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:9
#EXT-X-PLAYLIST-TYPE:VOD
#EXTINF:9.000,
segment1.ts
#EXTINF:9.000,
segment2.ts
#EXT-X-ENDLIST
`;

describe("HLSSpliceVod fetch handling", () => {
  describe("options.fetch", () => {
    it("uses an injected fetch implementation instead of node-fetch", async () => {
      const requested = [];
      const fakeFetch = (uri) => {
        requested.push(uri);
        const body = uri.match(/media\.m3u8$/) ? MEDIA_MANIFEST : MASTER_MANIFEST;
        return Promise.resolve({
          ok: true,
          status: 200,
          statusText: "OK",
          body: require("stream").Readable.from([body]),
        });
      };

      const hlsVod = new HLSSpliceVod("https://example.com/vod/master.m3u8", { fetch: fakeFetch });
      await hlsVod.load();

      expect(requested).toContain("https://example.com/vod/master.m3u8");
      expect(requested).toContain("https://example.com/vod/media.m3u8");
      expect(hlsVod.getMediaManifest(4928000).match(/segment1\.ts/)).not.toBe(null);
    });

    it("propagates a rejection from the injected fetch", async () => {
      const fakeFetch = () => Promise.reject(new Error("boom"));
      const hlsVod = new HLSSpliceVod("https://example.com/vod/master.m3u8", { fetch: fakeFetch });

      await expectAsync(hlsVod.load()).toBeRejected();
    });

    it("falls back to node-fetch when no implementation is given", () => {
      const hlsVod = new HLSSpliceVod("https://example.com/vod/master.m3u8");
      expect(hlsVod.fetch).toBe(null);
    });

    it("allows a caller to enforce a timeout, which node-fetch does not do by default", async () => {
      // An origin that accepts the connection and never responds. Without a
      // caller-supplied timeout this would hang indefinitely.
      const blackhole = http.createServer(() => {});
      await new Promise((res) => blackhole.listen(0, "127.0.0.1", res));
      const uri = `http://127.0.0.1:${blackhole.address().port}/master.m3u8`;

      const nodeFetch = require("node-fetch");
      const timeoutFetch = (u) => nodeFetch(u, { timeout: 300 });

      const hlsVod = new HLSSpliceVod(uri, { fetch: timeoutFetch });
      const started = Date.now();
      await expectAsync(hlsVod.load()).toBeRejected();
      expect(Date.now() - started).toBeLessThan(3000);

      await new Promise((res) => blackhole.close(res));
    });
  });

  describe("response body errors", () => {
    it("rejects rather than hanging when the body fails after the headers arrive", async () => {
      const { Readable } = require("stream");
      const failingBody = new Readable({
        read() {
          // Emit a partial manifest, then fail. The parser never sees a complete
          // m3u, so before body errors were forwarded this promise stayed
          // pending forever.
          this.push("#EXTM3U\n");
          this.destroy(new Error("socket hung up"));
        },
      });

      const fakeFetch = () =>
        Promise.resolve({ ok: true, status: 200, statusText: "OK", body: failingBody });

      const hlsVod = new HLSSpliceVod("https://example.com/vod/master.m3u8", { fetch: fakeFetch });

      await expectAsync(hlsVod.load()).toBeRejected();
    });

    it("still rejects on a non-2xx response", async () => {
      const fakeFetch = () =>
        Promise.resolve({
          ok: false,
          status: 404,
          statusText: "Not Found",
          body: require("stream").Readable.from([""]),
        });

      const hlsVod = new HLSSpliceVod("https://example.com/vod/master.m3u8", { fetch: fakeFetch });

      await expectAsync(hlsVod.load()).toBeRejectedWithError(/404 Not Found/);
    });
  });
});
