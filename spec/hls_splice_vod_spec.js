const HLSSpliceVod = require("../index.js");
const fs = require("fs");

const ll = (log_lines) => {
  log_lines.map((line, idx) => console.log(line, idx));
};

describe("HLSSpliceVod with adType functionality", () => {
  let mockSourceSubs;
  let mockVodShort;
  let mockVodShort2;
  let mockAdSubs;

  beforeEach(() => {
    // Source with subtitles
    mockSourceSubs = {
      master: () => {
        return fs.createReadStream("testvectors/demux_n_cmaf/hls1_demux_cmaf_subs/master.m3u8");
      },
      video: () => {
        return fs.createReadStream("testvectors/demux_n_cmaf/hls1_demux_cmaf_subs/video_1.m3u8");
      },
      audio: (group, lang) => {
        return fs.createReadStream("testvectors/demux_n_cmaf/hls1_demux_cmaf_subs/audio_1.m3u8");
      },
      subtitles: (group, lang) => {
        return fs.createReadStream("testvectors/demux_n_cmaf/hls1_demux_cmaf_subs/textstream_1.m3u8");
      }
    };

    // Short VOD with subtitles
    mockVodShort = {
      master: () => {
        return fs.createReadStream("testvectors/demux_n_cmaf/short_vod/master.m3u8");
      },
      video: () => {
        return fs.createReadStream("testvectors/demux_n_cmaf/short_vod/video_1.m3u8");
      },
      audio: (group, lang) => {
        return fs.createReadStream("testvectors/demux_n_cmaf/short_vod/audio_1.m3u8");
      },
      subtitles: (group, lang) => {
        return fs.createReadStream("testvectors/demux_n_cmaf/short_vod/textstream_1.m3u8");
      }
    };

    // Short VOD 2 with subtitles
    mockVodShort2 = {
      master: () => {
        return fs.createReadStream("testvectors/demux_n_cmaf/short_vod_2/master.m3u8");
      },
      video: () => {
        return fs.createReadStream("testvectors/demux_n_cmaf/short_vod_2/video_1.m3u8");
      },
      audio: (group, lang) => {
        return fs.createReadStream("testvectors/demux_n_cmaf/short_vod_2/audio_1.m3u8");
      },
      subtitles: (group, lang) => {
        return fs.createReadStream("testvectors/demux_n_cmaf/short_vod_2/textstream_1.m3u8");
      }
    };

    // Ad with subtitles
    mockAdSubs = {
      master: () => {
        return fs.createReadStream("testvectors/demux_n_cmaf/ad1_demux_cmaf_subs/master.m3u8");
      },
      video: () => {
        return fs.createReadStream("testvectors/demux_n_cmaf/ad1_demux_cmaf_subs/video_1.m3u8");
      },
      audio: (group, lang) => {
        return fs.createReadStream("testvectors/demux_n_cmaf/ad1_demux_cmaf_subs/audio_1.m3u8");
      },
      subtitles: (group, lang) => {
        return fs.createReadStream("testvectors/demux_n_cmaf/ad1_demux_cmaf_subs/textstream_1.m3u8");
      }
    };
  });

  describe("Ad type insertion (with cue tags)", () => {
    it("inserts an ad with explicit 'ad' type and verifies cue tags", (done) => {
      const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
      mockVod
        .load(mockSourceSubs.master, mockSourceSubs.video, mockSourceSubs.audio, mockSourceSubs.subtitles)
        .then(() => {
          return mockVod.insertAdAt(
            12000, 
            "http://mock.com/ad/mockad.m3u8", 
            "ad",  // Explicit ad type
            mockAdSubs.master, 
            mockAdSubs.video, 
            mockAdSubs.audio, 
            mockAdSubs.subtitles
          );
        })
        .then(() => {
          const m3u8Video = mockVod.getMediaManifest(454000);
          const m3u8Subs = mockVod.getSubtitleManifest("textstream", "sv");
          let substringsVideo = m3u8Video.split("\n");
          let substringsSubs = m3u8Subs.split("\n");

          // Find cue-out tag
          const cueOutIndex = substringsVideo.findIndex(line => line.includes("#EXT-X-CUE-OUT"));
          expect(cueOutIndex).toBeGreaterThan(0);
          expect(substringsVideo[cueOutIndex]).toMatch(/#EXT-X-CUE-OUT:DURATION=12/);
          
          // Find cue-in tag
          const cueInIndex = substringsVideo.findIndex(line => line.includes("#EXT-X-CUE-IN"));
          expect(cueInIndex).toBeGreaterThan(cueOutIndex);
          
          // Verify ad content is present
          const adContentIndex = substringsVideo.findIndex(line => 
            line.includes("http://mock.com/ad/ad/video_1-1.m4s")
          );
          expect(adContentIndex).toBeGreaterThan(cueOutIndex);
          expect(adContentIndex).toBeLessThan(cueInIndex);

          // Check subtitle manifest has same cue structure
          const subsCueOutIndex = substringsSubs.findIndex(line => line.includes("#EXT-X-CUE-OUT"));
          const subsCueInIndex = substringsSubs.findIndex(line => line.includes("#EXT-X-CUE-IN"));
          expect(subsCueOutIndex).toBeGreaterThan(0);
          expect(subsCueInIndex).toBeGreaterThan(subsCueOutIndex);

          done();
        });
    });

    it("inserts an ad with default type (should behave as 'ad')", (done) => {
      const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
      mockVod
        .load(mockSourceSubs.master, mockSourceSubs.video, mockSourceSubs.audio, mockSourceSubs.subtitles)
        .then(() => {
          // Omit adType parameter - should default to "ad"
          return mockVod.insertAdAt(
            12000, 
            "http://mock.com/ad/mockad.m3u8",
            null,
            mockAdSubs.master, 
            mockAdSubs.video, 
            mockAdSubs.audio, 
            mockAdSubs.subtitles
          );
        })
        .then(() => {
          const m3u8Video = mockVod.getMediaManifest(454000);
          let substringsVideo = m3u8Video.split("\n");
          // Should have cue tags (default behavior)
          const cueOutTags = substringsVideo.filter(line => line.includes("#EXT-X-CUE-OUT"));
          const cueInTags = substringsVideo.filter(line => line.includes("#EXT-X-CUE-IN"));
          expect(cueOutTags.length).toBe(1);
          expect(cueInTags.length).toBe(1);

          done();
        });
    });
  });

  describe("Segment type insertion (no cue tags)", () => {
    it("inserts a segment with 'segment' type and verifies no cue tags", (done) => {
      const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
      mockVod
        .load(mockSourceSubs.master, mockSourceSubs.video, mockSourceSubs.audio, mockSourceSubs.subtitles)
        .then(() => {
          return mockVod.insertAdAt(
            12000, 
            "http://mock.com/segment/mocksegment.m3u8", 
            "segment",  // Segment type - no cue tags
            mockVodShort.master, 
            mockVodShort.video, 
            mockVodShort.audio, 
            mockVodShort.subtitles
          );
        })
        .then(() => {
          const m3u8Video = mockVod.getMediaManifest(454000);
          const m3u8Subs = mockVod.getSubtitleManifest("textstream", "sv");
          let substringsVideo = m3u8Video.split("\n");
          let substringsSubs = m3u8Subs.split("\n");

          // Should have discontinuity tags but NO cue tags
          const discontinuityIndexes = substringsVideo
            .map((line, index) => line.includes("#EXT-X-DISCONTINUITY") ? index : -1)
            .filter(index => index !== -1);
          
          expect(discontinuityIndexes.length).toBeGreaterThanOrEqual(2); // Before and after segment

          // Verify NO cue tags anywhere in the manifest
          const cueOutLines = substringsVideo.filter(line => line.includes("#EXT-X-CUE-OUT"));
          const cueInLines = substringsVideo.filter(line => line.includes("#EXT-X-CUE-IN"));
          expect(cueOutLines.length).toBe(0);
          expect(cueInLines.length).toBe(0);

          // Same for subtitles
          const subsCueOutLines = substringsSubs.filter(line => line.includes("#EXT-X-CUE-OUT"));
          const subsCueInLines = substringsSubs.filter(line => line.includes("#EXT-X-CUE-IN"));
          expect(subsCueOutLines.length).toBe(0);
          expect(subsCueInLines.length).toBe(0);

          // Verify segment content is present
          const segmentContentIndex = substringsVideo.findIndex(line => 
            line.includes("http://mock.com/segment/short_vod/video_1-1.m4s")
          );
          expect(segmentContentIndex).toBeGreaterThan(0);

          done();
        });
    });

    it("inserts multiple segments and verifies no cue tags", (done) => {
      const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
      mockVod
        .load(mockSourceSubs.master, mockSourceSubs.video, mockSourceSubs.audio, mockSourceSubs.subtitles)
        .then(() => {
          return mockVod.insertAdAt(
            18000, 
            "http://mock.com/segment1/mocksegment1.m3u8", 
            "segment",
            mockVodShort.master, 
            mockVodShort.video, 
            mockVodShort.audio, 
            mockVodShort.subtitles
          );
        })
        .then(() => {
          return mockVod.insertAdAt(
            9000, 
            "http://mock.com/segment2/mocksegment2.m3u8", 
            "segment",
            mockVodShort2.master, 
            mockVodShort2.video, 
            mockVodShort2.audio, 
            mockVodShort2.subtitles
          );
        })
        .then(() => {
          const m3u8Video = mockVod.getMediaManifest(454000);
          let substringsVideo = m3u8Video.split("\n");
          expect(substringsVideo[6]).toBe(`#EXT-X-MAP:URI="video_1.m4a"`);
          expect(substringsVideo[7]).toBe(`#EXTINF:3.0000, no desc`);
          expect(substringsVideo[8]).toBe(`video_1-1.m4s`);
          expect(substringsVideo[13]).toBe(`#EXT-X-DISCONTINUITY`);
          expect(substringsVideo[14]).toBe(`#EXT-X-MAP:URI="http://mock.com/segment2/short_vod/video_1.m4a"`);

          expect(substringsVideo[20]).toBe(`#EXT-X-MAP:URI="video_1.m4a"`);
          expect(substringsVideo[21]).toBe(`#EXTINF:3.0000, no desc`);
          expect(substringsVideo[22]).toBe(`video_1-4.m4s`);
          expect(substringsVideo[27]).toBe(`#EXT-X-DISCONTINUITY`);
          expect(substringsVideo[28]).toBe(`#EXT-X-MAP:URI="http://mock.com/segment1/short_vod/video_1.m4a"`);
          expect(substringsVideo[32]).toBe(`#EXT-X-MAP:URI="video_1.m4a"`);
          
          done();
        });
    });
  });

  describe("Mixed ad and segment insertion", () => {
    it("inserts both ads and segments and verifies correct cue tag behavior", (done) => {
      const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
      mockVod
        .load(mockSourceSubs.master, mockSourceSubs.video, mockSourceSubs.audio, mockSourceSubs.subtitles)
        .then(() => {
          // Insert an ad (should have cue tags)
          return mockVod.insertAdAt(
            9000, 
            "http://mock.com/ad/mockad.m3u8", 
            "ad",
            mockAdSubs.master, 
            mockAdSubs.video, 
            mockAdSubs.audio, 
            mockAdSubs.subtitles
          );
        })
        .then(() => {
          // Insert a segment (should NOT have cue tags)
          return mockVod.insertAdAt(
            18000, 
            "http://mock.com/segment/mocksegment.m3u8", 
            "segment",
            mockVodShort.master, 
            mockVodShort.video, 
            mockVodShort.audio, 
            mockVodShort.subtitles
          );
        })
        .then(() => {
          // Insert another ad (should have cue tags)
          return mockVod.insertAdAt(
            27000, 
            "http://mock.com/ad2/mockad2.m3u8", 
            "ad",
            mockAdSubs.master, 
            mockAdSubs.video, 
            mockAdSubs.audio, 
            mockAdSubs.subtitles
          );
        })
        .then(() => {
          const m3u8Video = mockVod.getMediaManifest(454000);
          let substringsVideo = m3u8Video.split("\n");

          // Should have exactly 4 cue tags (2 ads × 2 tags each)
          const cueOutTags = substringsVideo.filter(line => line.includes("#EXT-X-CUE-OUT"));
          const cueInTags = substringsVideo.filter(line => line.includes("#EXT-X-CUE-IN"));
          expect(cueOutTags.length).toBe(2);
          expect(cueInTags.length).toBe(2);

          // Verify ad content is present
          const ad1Index = substringsVideo.findIndex(line => 
            line.includes("http://mock.com/ad/ad/video_1-1.m4s")
          );
          const ad2Index = substringsVideo.findIndex(line => 
            line.includes("http://mock.com/ad2/ad/video_1-1.m4s")
          );
          expect(ad1Index).toBeGreaterThan(0);
          expect(ad2Index).toBeGreaterThan(ad1Index);

          // Verify segment content is present (between the ads)
          const segmentIndex = substringsVideo.findIndex(line => 
            line.includes("http://mock.com/segment/short_vod/video_1-1.m4s")
          );
          expect(segmentIndex).toBeGreaterThan(ad1Index);
          expect(segmentIndex).toBeLessThan(ad2Index);

          done();
        });
    });

    it("verifies segment insertion doesn't interfere with existing ad cue tags", (done) => {
      const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
      mockVod
        .load(mockSourceSubs.master, mockSourceSubs.video, mockSourceSubs.audio, mockSourceSubs.subtitles)
        .then(() => {
          // Insert ad first
          return mockVod.insertAdAt(
            21000, 
            "http://mock.com/ad/mockad.m3u8", 
            "ad",
            mockAdSubs.master, 
            mockAdSubs.video, 
            mockAdSubs.audio, 
            mockAdSubs.subtitles
          );
        })
        .then(() => {
          // Insert segment after ad
          return mockVod.insertAdAt(
            9000,   
            "http://mock.com/segment/mocksegment.m3u8", 
            "segment",
            mockVodShort.master, 
            mockVodShort.video, 
            mockVodShort.audio, 
            mockVodShort.subtitles
          );
        })
        .then(() => {
          const m3u8Video = mockVod.getMediaManifest(454000);
          let substringsVideo = m3u8Video.split("\n");
          expect(substringsVideo[13]).toBe(`#EXT-X-DISCONTINUITY`);
          expect(substringsVideo[14]).toBe(`#EXT-X-MAP:URI="http://mock.com/segment/short_vod/video_1.m4a"`);
          expect(substringsVideo[15]).toBe(`#EXTINF:3.0000, no desc`);
          expect(substringsVideo[16]).toBe(`http://mock.com/segment/short_vod/video_1-1.m4s`);
          expect(substringsVideo[17]).toBe(`#EXT-X-DISCONTINUITY`);
          expect(substringsVideo[18]).toBe(`#EXT-X-MAP:URI="video_1.m4a"`);

          expect(substringsVideo[28]).toBe(`#EXT-X-CUE-OUT:DURATION=12`);
          expect(substringsVideo[29]).toBe(`#EXT-X-MAP:URI="http://mock.com/ad/ad/video_1.m4a"`);
          expect(substringsVideo[30]).toBe(`#EXTINF:3.0000, no desc`);
          expect(substringsVideo[31]).toBe(`http://mock.com/ad/ad/video_1-1.m4s`);
          expect(substringsVideo[32]).toBe(`#EXTINF:3.0000, no desc`);
          expect(substringsVideo[33]).toBe(`http://mock.com/ad/ad/video_1-2.m4s`);

          expect(substringsVideo[39]).toBe(`#EXT-X-CUE-IN`);
          expect(substringsVideo[40]).toBe(`#EXT-X-MAP:URI="video_1.m4a"`);
          expect(substringsVideo[41]).toBe(`#EXTINF:3.0000, no desc`);
          expect(substringsVideo[42]).toBe(`video_1-8.m4s`);

          done();
        });
    });

    it("inserts three items (segment, segment, ad) and verifies only the ad gets cue tags", (done) => {
      const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", {
        mergeAds: true
      });
      mockVod
        .load(mockSourceSubs.master, mockSourceSubs.video, mockSourceSubs.audio, mockSourceSubs.subtitles)
        .then(() => {
          // Insert ad FIRST (highest position: 24000ms)
          return mockVod.insertAdAt(
            0, 
            "http://mock.com/ad/mockad.m3u8", 
            "ad",
            mockAdSubs.master, 
            mockAdSubs.video, 
            mockAdSubs.audio, 
            mockAdSubs.subtitles
          );
        })
        .then(() => {
          // Insert second segment SECOND (middle position: 15000ms)
          return mockVod.insertAdAt(
            0, 
            "http://mock.com/segment2/mocksegment2.m3u8", 
            "segment",
            mockVodShort2.master, 
            mockVodShort2.video, 
            mockVodShort2.audio, 
            mockVodShort2.subtitles
          );
        })
        .then(() => {
          // Insert first segment LAST (lowest position: 6000ms)
          return mockVod.insertAdAt(
            0, 
            "http://mock.com/segment1/mocksegment1.m3u8", 
            "segment",
            mockVodShort.master, 
            mockVodShort.video, 
            mockVodShort.audio, 
            mockVodShort.subtitles
          );
        })
        .then(() => {
          const m3u8Video = mockVod.getMediaManifest(454000);
          const m3u8Subs = mockVod.getSubtitleManifest("textstream", "sv");
          let substringsVideo = m3u8Video.split("\n");
          let substringsSubs = m3u8Subs.split("\n");

          expect(substringsVideo[6]).toBe(`#EXT-X-DISCONTINUITY`);
          expect(substringsVideo[7]).toBe(`#EXT-X-MAP:URI="http://mock.com/segment1/short_vod/video_1.m4a"`);
          expect(substringsVideo[10]).toBe(`#EXT-X-DISCONTINUITY`);
          expect(substringsVideo[11]).toBe(`#EXT-X-MAP:URI="http://mock.com/segment2/short_vod/video_1.m4a"`);
          expect(substringsVideo[13]).toBe(`http://mock.com/segment2/short_vod/video_1-1.m4s`);
          expect(substringsVideo[16]).toBe(`#EXT-X-DISCONTINUITY`);
          expect(substringsVideo[17]).toBe(`#EXT-X-CUE-OUT:DURATION=12`);
          expect(substringsVideo[18]).toBe(`#EXT-X-MAP:URI="http://mock.com/ad/ad/video_1.m4a"`);
          expect(substringsVideo[27]).toBe(`#EXT-X-DISCONTINUITY`);
          expect(substringsVideo[28]).toBe(`#EXT-X-CUE-IN`);
          expect(substringsVideo[29]).toBe(`#EXT-X-MAP:URI="video_1.m4a"`);
          expect(substringsVideo[31]).toBe(`video_1-1.m4s`);

          expect(substringsSubs[6]).toBe(`#EXT-X-DISCONTINUITY`);
          expect(substringsSubs[8]).toBe(`http://mock.com/segment1/short_vod/textstream_1-1.vtt`);
          expect(substringsSubs[9]).toBe(`#EXT-X-DISCONTINUITY`);
          expect(substringsSubs[11]).toBe(`http://mock.com/segment2/short_vod/textstream_1-1.vtt`);
          expect(substringsSubs[14]).toBe(`#EXT-X-DISCONTINUITY`);
          expect(substringsSubs[15]).toBe(`#EXT-X-CUE-OUT:DURATION=12`);
          expect(substringsSubs[17]).toBe(`http://mock.com/ad/ad/textstream_1-1.vtt`);
          expect(substringsSubs[24]).toBe(`#EXT-X-DISCONTINUITY`);
          expect(substringsSubs[25]).toBe(`#EXT-X-CUE-IN`);
          expect(substringsSubs[27]).toBe(`textstream_1-1.vtt`);
          
          done();
        });
    });
  });
});