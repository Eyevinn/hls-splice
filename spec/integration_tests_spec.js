const HLSSpliceVod = require('../index.js');

describe("HLSSpliceVod", () => {
  it("can download and parse an HLS VOD", done => {
    const hlsVod = new HLSSpliceVod('https://maitv-vod.lab.eyevinn.technology/stswe17-ozer.mp4/master.m3u8');
    hlsVod.load()
    .then(() => {
      const masterManifest = hlsVod.getMasterManifest();
      expect(masterManifest.match(/#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=4928000,RESOLUTION=960x540,CODECS="avc1.4d001f,mp4a.40.2"/)).not.toBe(null);
      const mediaManifest = hlsVod.getMediaManifest(4928000);
      expect(mediaManifest.match(/2000-00213.ts/)).not.toBe(null);
      const lines = mediaManifest.split("\n");
      expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
      done();
    });
  });

  it("can insert ads in an HLS VOD", done => {
    const hlsVod = new HLSSpliceVod('https://maitv-vod.lab.eyevinn.technology/stswe17-ozer.mp4/master.m3u8');
    hlsVod.load()
    .then(() => {
      return hlsVod.insertAdAt(35000, 'https://maitv-vod.lab.eyevinn.technology/ads/apotea-15s.mp4/master.m3u8');
    })
    .then(() => {
      const mediaManifest = hlsVod.getMediaManifest(4928000);
      expect(mediaManifest.match(/#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:10.8800,\s+https:\/\/maitv-vod.lab.eyevinn.technology\/ads\/apotea-15s.mp4\/2000\/2000-00000.ts/)).not.toBe(null);
      expect(mediaManifest.match(/#EXT-X-TARGETDURATION:11/)).not.toBe(null);
      const lines = mediaManifest.split("\n");
      expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
      done();
    })
  });
});