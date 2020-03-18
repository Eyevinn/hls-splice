const HLSSpliceVod = require('../index.js');

describe("HLSSpliceVod", () => {
  it("cat download and parse an HLS VOD", done => {
    const hlsVod = new HLSSpliceVod('https://maitv-vod.lab.eyevinn.technology/stswe17-ozer.mp4/master.m3u8');
    hlsVod.load()
    .then(() => {
      const masterManifest = hlsVod.getMasterManifest();
      expect(masterManifest.match(/#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=4928000,RESOLUTION=960x540,CODECS="avc1.4d001f,mp4a.40.2"/)).not.toBe(null);
      const mediaManifest = hlsVod.getMediaManifest(4928000);
      expect(mediaManifest.match(/2000-00213.ts/)).not.toBe(null);
      done();
    });
  });
});