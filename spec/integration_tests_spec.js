const HLSSpliceVod = require("../index.js");

describe("HLSSpliceVod", () => {
  it("can download and parse an HLS VOD", (done) => {
    const hlsVod = new HLSSpliceVod("https://maitv-vod.lab.eyevinn.technology/stswe17-ozer.mp4/master.m3u8");
    hlsVod.load().then(() => {
      const masterManifest = hlsVod.getMasterManifest();
      expect(
        masterManifest.match(
          /#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=4928000,RESOLUTION=960x540,CODECS="avc1.4d001f,mp4a.40.2"/
        )
      ).not.toBe(null);
      const mediaManifest = hlsVod.getMediaManifest(4928000);
      expect(mediaManifest.match(/2000-00213.ts/)).not.toBe(null);
      const lines = mediaManifest.split("\n");
      expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
      done();
    });
  });

  xit("can download and parse an HLS VOD with separate audio and subtitles", (done) => {
    const hlsVod = new HLSSpliceVod(
      "https://lbs-usp-hls-vod.cmore.se/vod/81ed4/a5fa1fw0uoq(12535120_ISMUSP).ism/a5fa1fw0uoq(12535120_ISMUSP).m3u8?hls_no_multiplex=false"
    );
    hlsVod.load().then(() => {
      const masterManifest = hlsVod.getMasterManifest();
      done();
    });
  });

  it("can insert ads in an HLS VOD", (done) => {
    const hlsVod = new HLSSpliceVod("https://maitv-vod.lab.eyevinn.technology/stswe17-ozer.mp4/master.m3u8");
    hlsVod
      .load()
      .then(() => {
        return hlsVod.insertAdAt(35000, "https://maitv-vod.lab.eyevinn.technology/ads/apotea-15s.mp4/master.m3u8");
      })
      .then(() => {
        const mediaManifest = hlsVod.getMediaManifest(4928000);
        expect(
          mediaManifest.match(
            /#EXT-X-CUE-OUT:DURATION=15.*\s+#EXTINF:10.8800,\s+https:\/\/maitv-vod.lab.eyevinn.technology\/ads\/apotea-15s.mp4\/2000\/2000-00000.ts/
          )
        ).not.toBe(null);
        expect(mediaManifest.match(/#EXT-X-TARGETDURATION:11/)).not.toBe(null);
        const lines = mediaManifest.split("\n");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("can insert ads in an HLS VOD with seperate Manifest Loaders (Master + Media)", (done) => {
    const hlsVod = new HLSSpliceVod(
      "https://vod.streaming.a2d.tv/948a9dc4-ccb6-4de0-8295-40909bc90e43/c70657d0-5fe3-11ed-9d66-430eb269fe23_20331478.ism/.m3u8",
      {
        absoluteUrls: true,
      }
    );
    hlsVod
      .loadMasterManifest()
      .then(() => {
        hlsVod.loadMediaManifest(
          "https://vod.streaming.a2d.tv/948a9dc4-ccb6-4de0-8295-40909bc90e43/c70657d0-5fe3-11ed-9d66-430eb269fe23_20331478.ism/c70657d0-5fe3-11ed-9d66-430eb269fe23_20331478-video=300000.m3u8",
          455000
        );
      })
      .then(() => {
        return hlsVod.insertAdAt(
          0,
          "https://ovpuspvod.a2d-stage.tv/trailers/63ef9c36e3ffa90028603374/output.ism/.m3u8"
        );
      })
      .then(() => {
        const mediaManifest = hlsVod.getMediaManifest(455000);
        const lines = mediaManifest.split("\n");

        expect(lines[8]).toEqual(`#EXT-X-DISCONTINUITY`);
        expect(lines[9]).toEqual(`#EXT-X-CUE-OUT:DURATION=20`);
        expect(lines[10]).toEqual(`#EXT-X-MAP:URI="https://ovpuspvod.a2d-stage.tv/trailers/63ef9c36e3ffa90028603374/output.ism/hls/output-video=300000.m4s"`);
        expect(lines[11]).toEqual(`#EXTINF:3.8400, no desc`);
        expect(lines[12]).toEqual(`https://ovpuspvod.a2d-stage.tv/trailers/63ef9c36e3ffa90028603374/output.ism/hls/output-video=300000-1.m4s`);

        expect(lines[23]).toEqual(`#EXT-X-DISCONTINUITY`);  
        expect(lines[24]).toEqual(`#EXT-X-CUE-IN`);
        expect(lines[25]).toEqual(`#EXT-X-PROGRAM-DATE-TIME:1970-01-01T00:00:00Z`);
        expect(lines[26]).toEqual(`#EXT-X-MAP:URI="https://vod.streaming.a2d.tv/948a9dc4-ccb6-4de0-8295-40909bc90e43/c70657d0-5fe3-11ed-9d66-430eb269fe23_20331478.ism/hls/c70657d0-5fe3-11ed-9d66-430eb269fe23_20331478-video=300000.m4s"`);
        expect(lines[27]).toEqual(`#EXTINF:4.0000, no desc`);
        expect(lines[28]).toEqual(`https://vod.streaming.a2d.tv/948a9dc4-ccb6-4de0-8295-40909bc90e43/c70657d0-5fe3-11ed-9d66-430eb269fe23_20331478.ism/hls/c70657d0-5fe3-11ed-9d66-430eb269fe23_20331478-video=300000-1.m4s`);
        
        done();
      });
  });
  
  it("can insert ads in an HLS VOD with seperate Manifest Loaders (Master + Audio)", (done) => {
    const hlsVod = new HLSSpliceVod(
      "https://vod.streaming.a2d.tv/948a9dc4-ccb6-4de0-8295-40909bc90e43/c70657d0-5fe3-11ed-9d66-430eb269fe23_20331478.ism/.m3u8",
      {
        absoluteUrls: true,
      }
    );
    hlsVod
      .loadMasterManifest()
      .then(() => {
        hlsVod.loadAudioManifest(
          "https://vod.streaming.a2d.tv/948a9dc4-ccb6-4de0-8295-40909bc90e43/c70657d0-5fe3-11ed-9d66-430eb269fe23_20331478.ism/c70657d0-5fe3-11ed-9d66-430eb269fe23_20331478-audio=128000.m3u8",
          "audio-aacl-128",
          "audio"
        );
      })
      .then(() => {
        return hlsVod.insertAdAt(
          0,
          "https://ovpuspvod.a2d-stage.tv/trailers/63ef9c36e3ffa90028603374/output.ism/.m3u8"
        );
      })
      .then(() => {
        const audioManifest = hlsVod.getAudioManifest("audio-aacl-128", "audio");
        const lines = audioManifest.split("\n");
        expect(lines[8]).toEqual(`#EXT-X-DISCONTINUITY`);
        expect(lines[9]).toEqual(`#EXT-X-CUE-OUT:DURATION=20.032`);
        expect(lines[10]).toEqual(`#EXT-X-MAP:URI="https://ovpuspvod.a2d-stage.tv/trailers/63ef9c36e3ffa90028603374/output.ism/hls/output-audio=128000.m4s"`);
        expect(lines[12]).toEqual(`https://ovpuspvod.a2d-stage.tv/trailers/63ef9c36e3ffa90028603374/output.ism/hls/output-audio=128000-1.m4s`);

        expect(lines[23]).toEqual(`#EXT-X-DISCONTINUITY`);
        expect(lines[24]).toEqual(`#EXT-X-CUE-IN`);
        expect(lines[25]).toEqual(`#EXT-X-PROGRAM-DATE-TIME:1970-01-01T00:00:00Z`);
        expect(lines[26]).toEqual(`#EXT-X-MAP:URI="https://vod.streaming.a2d.tv/948a9dc4-ccb6-4de0-8295-40909bc90e43/c70657d0-5fe3-11ed-9d66-430eb269fe23_20331478.ism/hls/c70657d0-5fe3-11ed-9d66-430eb269fe23_20331478-audio=128000.m4s"`);
        expect(lines[27]).toEqual(`#EXTINF:3.8400, no desc`);
        expect(lines[28]).toEqual(`https://vod.streaming.a2d.tv/948a9dc4-ccb6-4de0-8295-40909bc90e43/c70657d0-5fe3-11ed-9d66-430eb269fe23_20331478.ism/hls/c70657d0-5fe3-11ed-9d66-430eb269fe23_20331478-audio=128000-1.m4s`);

        done();
      });
  });
});
