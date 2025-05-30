const HLSSpliceVod = require("../index.js");
const fs = require("fs");

const ll = (log_lines) => {
  log_lines.map((line, idx) => console.log(line, idx));
};

describe("HLSSpliceVod with subs", () => {
  let mockMasterManifestSubs;
  let mockMediaManifestSubs;
  let mockSubtitleManifestSubs;
  let mockMasterManifestNoSubs;
  let mockMediaManifestNoSubs;
  let mockAdMasterManifestSubs;
  let mockAdMediaManifestSubs;
  let mockAdSubtitleManifestSubs;
  let mockAdMasterManifestNoSubs;
  let mockAdMediaManifestNoSubs;

  beforeEach(() => {
    mockMasterManifestSubs = () => {
      return fs.createReadStream("testvectors/hls_subtitles/hls1/index.m3u8");
    };
    mockMediaManifestSubs = () => {
      return fs.createReadStream("testvectors/hls_subtitles/hls1/video.m3u8");
    };
    mockSubtitleManifestSubs = () => {
      return fs.createReadStream("testvectors/hls_subtitles/hls1/sub.m3u8");
    };
    mockMasterManifestNoSubs = () => {
      return fs.createReadStream("testvectors/hls1/master.m3u8");
    };
    mockMediaManifestNoSubs = () => {
      return fs.createReadStream("testvectors/hls1/index_0_av.m3u8");
    };
    mockAdMasterManifestSubs = () => {
      return fs.createReadStream("testvectors/hls_subtitles/ad1_subs/index.m3u8");
    };
    mockAdMediaManifestSubs = () => {
      return fs.createReadStream("testvectors/hls_subtitles/ad1_subs/video.m3u8");
    };
    mockAdSubtitleManifestSubs = () => {
      return fs.createReadStream("testvectors/hls_subtitles/ad1_subs/sub.m3u8");
    };
    mockAdMasterManifestNoSubs = () => {
      return fs.createReadStream("testvectors/ad1/master.m3u8");
    };
    mockAdMediaManifestNoSubs = () => {
      return fs.createReadStream("testvectors/ad1/index_0_av.m3u8");
    };
  });

  it("contains a 8 second splice at 12 seconds from start, both has subs", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifestSubs, mockMediaManifestSubs, null, mockSubtitleManifestSubs)
      .then(() => {
        return mockVod.insertAdAt(12000, "http://mock.com/ad/mockad.m3u8", null, mockAdMasterManifestSubs, mockAdMediaManifestSubs, null, mockAdSubtitleManifestSubs);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(3370400);
        let substrings = m3u8.split("\n")
        const m3u8Subs = mockVod.getSubtitleManifest("subs", "fr");
        let substringsSubs = m3u8Subs.split("\n")
        
        expect(substrings[12]).toBe("#EXT-X-DISCONTINUITY");
        expect(substrings[13]).toBe("#EXT-X-CUE-OUT:DURATION=8");
        expect(substrings[14]).toBe("#EXTINF:4.0000,");
        expect(substrings[15]).toBe("http://mock.com/ad/ad00.ts");
        expect(substrings[19]).toBe("#EXT-X-CUE-IN");

        expect(substringsSubs[11]).toBe("#EXT-X-DISCONTINUITY");
        expect(substringsSubs[12]).toBe("#EXT-X-CUE-OUT:DURATION=8");
        expect(substringsSubs[13]).toBe("#EXTINF:4.0000,");
        expect(substringsSubs[14]).toBe("http://mock.com/ad/ad0.webvtt");
        expect(substringsSubs[18]).toBe("#EXT-X-CUE-IN");
        done();
      });
  });

  it("contains a 15 second splice at 12 seconds from start, ad does not have subs", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { dummySubtitleEndpoint: "/dummy" });
    mockVod
      .load(mockMasterManifestSubs, mockMediaManifestSubs, null, mockSubtitleManifestSubs)
      .then(() => {
        return mockVod.insertAdAt(12000, "http://mock.com/ad/mockad.m3u8", null, mockAdMasterManifestNoSubs, mockAdMediaManifestNoSubs);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(3370400);
        let substrings = m3u8.split("\n")
        const m3u8Subs = mockVod.getSubtitleManifest("subs", "fr");
        let substringsSubs = m3u8Subs.split("\n")
        expect(substrings[12]).toBe("#EXT-X-DISCONTINUITY");
        expect(substrings[13]).toBe("#EXT-X-CUE-OUT:DURATION=15");
        expect(substrings[14]).toBe("#EXTINF:3.0000,");
        expect(substrings[15]).toBe("http://mock.com/ad/ad1_0_av.ts");
        expect(substrings[25]).toBe("#EXT-X-CUE-IN");

        expect(substringsSubs[11]).toBe("#EXT-X-DISCONTINUITY");
        expect(substringsSubs[12]).toBe("#EXT-X-CUE-OUT:DURATION=15");
        expect(substringsSubs[13]).toBe("#EXTINF:3.0000,");
        expect(substringsSubs[14]).toContain("/dummy?id=");
        expect(substringsSubs[24]).toBe("#EXT-X-CUE-IN");
        done();
      });
  });

  it("contains a 9 second splice at 12 seconds from start, source does not have subs", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifestNoSubs, mockMediaManifestNoSubs)
      .then(() => {
        return mockVod.insertAdAt(9000, "http://mock.com/ad/mockad.m3u8", null, mockAdMasterManifestSubs, mockAdMediaManifestSubs, null, mockAdSubtitleManifestSubs);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let substrings = m3u8.split("\n")
        expect(substrings[9]).toBe("#EXT-X-DISCONTINUITY");
        expect(substrings[10]).toBe("#EXT-X-CUE-OUT:DURATION=8");
        expect(substrings[11]).toBe("#EXTINF:4.0000,");
        expect(substrings[12]).toBe("http://mock.com/ad/ad00.ts");
        expect(substrings[16]).toBe("#EXT-X-CUE-IN");
        try {
          mockVod.getSubtitleManifest("subs", "fr")
        } catch (error) {
          const m = err.message.match(/Error: Failed to get manifest./)
          expect(m).nor.toBe(null);
        }
        done();
      });
  });

  it("insert Interstitial at 8 sec", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifestSubs, mockMediaManifestSubs, null, mockSubtitleManifestSubs)
      .then(() => {
        return mockVod.insertInterstitialAt(8000, "001", "http://mock.com/assetlist", true);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(3370400);
        let substrings = m3u8.split("\n")
        const m3u8Subs = mockVod.getSubtitleManifest("subs", "fr");
        let substringsSubs = m3u8Subs.split("\n")
        expect(substrings[11]).toBe(`#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:08.001Z",X-ASSET-LIST="http://mock.com/assetlist"`);
        expect(substringsSubs[10]).toBe(`#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:08.001Z",X-ASSET-LIST="http://mock.com/assetlist"`);
        
        done();
      });
  });

  it("insert bumper, both has subs", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifestSubs, mockMediaManifestSubs, null, mockSubtitleManifestSubs)
      .then(() => {
          return mockVod.insertBumper(
            "http://mock.com/ad/mockbumper.m3u8",
            mockAdMasterManifestSubs,
            mockAdMediaManifestSubs,
            null,
            mockAdSubtitleManifestSubs
            
          );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(3370400);
        let substrings = m3u8.split("\n")
        const m3u8Subs = mockVod.getSubtitleManifest("subs", "fr");
        let substringsSubs = m3u8Subs.split("\n")

        expect(substrings[8]).toBe("#EXTINF:4.0000,");
        expect(substrings[9]).toBe("http://mock.com/ad/ad01.ts");
        expect(substrings[10]).toBe("#EXT-X-DISCONTINUITY");
        expect(substrings[11]).toBe("#EXTINF:4.0000,");
        expect(substrings[12]).toBe("seg-00.ts");

        expect(substringsSubs[7]).toBe("#EXTINF:4.0000,");
        expect(substringsSubs[8]).toBe("http://mock.com/ad/ad1.webvtt");
        expect(substringsSubs[9]).toBe("#EXT-X-DISCONTINUITY");
        expect(substringsSubs[10]).toBe("#EXTINF:4.0000,");
        expect(substringsSubs[11]).toBe("0.webvtt");
        done();
      });
  });

  it("insert bumper, only source has subs", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { dummySubtitleEndpoint: "/dummy" });
    mockVod
      .load(mockMasterManifestSubs, mockMediaManifestSubs, null, mockSubtitleManifestSubs)
      .then(() => {
        return mockVod.insertBumper(
          "http://mock.com/ad/mockbumper.m3u8",
          mockAdMasterManifestNoSubs,
          mockAdMediaManifestNoSubs,
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(3370400);
        let substrings = m3u8.split("\n")
        const m3u8Subs = mockVod.getSubtitleManifest("subs", "fr");
        let substringsSubs = m3u8Subs.split("\n")

       expect(substrings[14]).toBe("#EXTINF:3.0000,");
       expect(substrings[15]).toBe("http://mock.com/ad/ad5_0_av.ts");
       expect(substrings[16]).toBe("#EXT-X-DISCONTINUITY");
       expect(substrings[17]).toBe("#EXTINF:4.0000,");
       expect(substrings[18]).toBe("seg-00.ts");

       expect(substringsSubs[14]).toContain("/dummy?id=");
       expect(substringsSubs[15]).toBe("#EXT-X-DISCONTINUITY");
       expect(substringsSubs[16]).toBe("#EXTINF:4.0000,");
       expect(substringsSubs[17]).toBe("0.webvtt");
       
        done();
      });
  });

});