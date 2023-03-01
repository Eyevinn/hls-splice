const HLSSpliceVod = require("../index.js");
const fs = require("fs");

describe("HLSSpliceVod", () => {
  let mockMasterManifest;
  let mockMediaManifest;
  let mockAdMasterManifest;
  let mockAdMediaManifest;
  let mockAdMasterManifest2;
  let mockAdMediaManifest2;

  beforeEach(() => {
    mockMasterManifest = () => {
      return fs.createReadStream("testvectors/hls1/master.m3u8");
    };
    mockMediaManifest = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1",
      };
      return fs.createReadStream(`testvectors/hls1/index_${bwmap[bw]}_av.m3u8`);
    };
    mockMasterManifest1b = () => {
      return fs.createReadStream("testvectors/hls1b/master.m3u8");
    };
    mockMediaManifest1b = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1",
      };
      return fs.createReadStream(`testvectors/hls1b/index_${bwmap[bw]}_av.m3u8`);
    };
    mockAdMasterManifest = () => {
      return fs.createReadStream("testvectors/ad1/master.m3u8");
    };
    mockAdMediaManifest = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1",
      };
      return fs.createReadStream(`testvectors/ad1/index_${bwmap[bw]}_av.m3u8`);
    };
    mockAdMasterManifest2 = () => {
      return fs.createReadStream("testvectors/ad2/master.m3u8");
    };
    mockAdMediaManifest2 = (bw) => {
      const bwmap = {
        4397000: "0",
        2597000: "1",
      };
      return fs.createReadStream(`testvectors/ad2/index_${bwmap[bw]}_av.m3u8`);
    };
    mockAdMasterManifest3 = () => {
      return fs.createReadStream("testvectors/ad3/master.m3u8");
    };
    mockAdMediaManifest3 = (bw) => {
      const bwmap = {
        4397000: "0",
        2597000: "1",
      };
      return fs.createReadStream(`testvectors/ad3/index_${bwmap[bw]}_av.m3u8`);
    };
    mockAdMasterManifest4 = () => {
      return fs.createReadStream("testvectors/ad4/master.m3u8");
    };
    mockAdMediaManifest4 = (bw) => {
      const bwmap = {
        4397000: "0",
        2597000: "1",
      };
      return fs.createReadStream(`testvectors/ad4/index_${bwmap[bw]}_av.m3u8`);
    };
    mockBumperMasterManifest = () => {
      return fs.createReadStream("testvectors/ad1/master.m3u8");
    };
    mockBumperMediaManifest = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1",
      };
      return fs.createReadStream(`testvectors/ad1/index_${bwmap[bw]}_av.m3u8`);
    };
  });

  it("can prepend a baseurl on each segment", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { baseUrl: "https://baseurl.com/" });
    mockVod.load(mockMasterManifest, mockMediaManifest).then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const m = m3u8.match("https://baseurl.com/segment3_0_av.ts");
      expect(m).not.toBe(null);
      done();
    });
  });

  it("can provide absolute urls on each segment", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { absoluteUrls: true });
    mockVod.load(mockMasterManifest, mockMediaManifest).then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const m = m3u8.match("http://mock.com/segment3_0_av.ts");
      expect(m).not.toBe(null);
      done();
    });
  });

  it("contains a 15 second splice at 9 seconds from start", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertAdAt(9000, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const m = m3u8.match(
          /#EXTINF:9.0000,\s+segment1_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad\/ad1_0_av.ts/
        );
        expect(m).not.toBe(null);
        done();
      });
  });

  it("can handle ad with non matching profile", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertAdAt(9000, "http://mock.com/ad2/mockad.m3u8", mockAdMasterManifest2, mockAdMediaManifest2);
      })
      .then(() => {
        let m3u8 = mockVod.getMediaManifest(4497000);
        let m = m3u8.match(
          /#EXTINF:9.0000,\s+segment1_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad2\/ad1_0_av.ts/
        );
        expect(m).not.toBe(null);
        m3u8 = mockVod.getMediaManifest(2497000);
        m = m3u8.match(
          /#EXTINF:9.0000,\s+segment1_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad2\/ad1_0_av.ts/
        );
        expect(m).toBe(null);
        done();
      });
  });

  it("contains a 15 sec splice at 9 sec and at 30 sec from start", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertAdAt(9000, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        return mockVod.insertAdAt(30000, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const m = m3u8.match(
          /#EXTINF:9.0000,\s+segment1_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad\/ad1_0_av.ts/
        );
        expect(m).not.toBe(null);
        const n = m3u8.match(
          /#EXTINF:9.0000,\s+segment2_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad\/ad1_0_av.ts/
        );
        expect(n).not.toBe(null);
        done();
      });
  });

  it("handles two ads in a row", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertAdAt(0, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        // This one will go first
        return mockVod.insertAdAt(0, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest3, mockAdMediaManifest3);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[8]).toEqual("#EXT-X-CUE-OUT:DURATION=3");
        expect(lines[13]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles two ads in a row merged into one break", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { merge: true });
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertAdAt(0, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        // This one will go first
        return mockVod.insertAdAt(0, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest3, mockAdMediaManifest3);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[8]).toEqual("#EXT-X-CUE-OUT:DURATION=18");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles two ads that should not be merged into one break", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { merge: false });
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertAdAt(0, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        // This one will go first
        return mockVod.insertAdAt(0, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest3, mockAdMediaManifest3);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[8]).toEqual("#EXT-X-CUE-OUT:DURATION=3");
        expect(lines[13]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles post-roll ads", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertAdAt(-1, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[28]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        expect(lines[39]).toEqual("#EXT-X-CUE-IN");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles two post-roll ads", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertAdAt(-1, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        return mockVod.insertAdAt(-1, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[28]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        expect(lines[40]).toEqual("#EXT-X-CUE-IN");
        expect(lines[52]).toEqual("#EXT-X-CUE-IN");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles one pre-roll and one post-roll", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertAdAt(0, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        return mockVod.insertAdAt(-1, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[lines.length - 3]).toEqual("#EXT-X-CUE-IN");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles video bumper without any ads", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertBumper(
          "http://mock.com/ad/mockbumper.m3u8",
          mockBumperMasterManifest,
          mockBumperMediaManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[8]).toEqual("http://mock.com/ad/ad1_0_av.ts");
        expect(lines[17]).toEqual("#EXT-X-DISCONTINUITY");
        expect(lines[18]).not.toEqual("#EXT-X-CUE-IN");
        done();
      });
  });

  it("handles video bumper with one ad", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertAdAt(0, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        return mockVod.insertBumper(
          "http://mock.com/ad/mockbumper.m3u8",
          mockBumperMasterManifest,
          mockBumperMediaManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[8]).toEqual("http://mock.com/ad/ad1_0_av.ts");
        expect(lines[17]).toEqual("#EXT-X-DISCONTINUITY");
        expect(lines[18]).not.toEqual("#EXT-X-CUE-IN");
        expect(lines[18]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        done();
      });
  });

  it("handles video bumper and two ads in a row merged into one break", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { merge: true });
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertAdAt(0, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        // This one will go first
        return mockVod.insertAdAt(0, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest3, mockAdMediaManifest3);
      })
      .then(() => {
        return mockVod.insertBumper(
          "http://mock.com/ad/mockbumper.m3u8",
          mockBumperMasterManifest,
          mockBumperMediaManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[10 + 8]).toEqual("#EXT-X-CUE-OUT:DURATION=18");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles target duration for video bumper and two ads in a row merged into one break", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { merge: true });
    mockVod
      .load(mockMasterManifest1b, mockMediaManifest1b)
      .then(() => {
        return mockVod.insertAdAt(0, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        return mockVod.insertAdAt(0, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest3, mockAdMediaManifest3);
      })
      .then(() => {
        // This one will go first
        return mockVod.insertAdAt(0, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest4, mockAdMediaManifest4);
      })
      .then(() => {
        return mockVod.insertBumper(
          "http://mock.com/ad/mockbumper.m3u8",
          mockBumperMasterManifest,
          mockBumperMediaManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[1]).toEqual("#EXT-X-TARGETDURATION:5");
        expect(lines[10 + 8]).toEqual("#EXT-X-CUE-OUT:DURATION=23");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles target duration with video bumper and no ads", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { merge: true });
    mockVod
      .load(mockMasterManifest1b, mockMediaManifest1b)
      .then(() => {
        return mockVod.insertBumper("http://mock.com/ad/mockbumper.m3u8", mockAdMasterManifest4, mockAdMediaManifest4);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[1]).toEqual("#EXT-X-TARGETDURATION:5");
        done();
      });
  });

  it("ensures that video bumper is always first", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertBumper(
          "http://mock.com/ad/mockbumper.m3u8",
          mockBumperMasterManifest,
          mockBumperMediaManifest
        );
      })
      .then(() => {
        return mockVod.insertAdAt(0, "http://mock.com/ad/mockad.m3u8", mockAdMasterManifest, mockAdMediaManifest);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[8]).toEqual("http://mock.com/ad/ad1_0_av.ts");
        expect(lines[17]).toEqual("#EXT-X-DISCONTINUITY");
        expect(lines[18]).not.toEqual("#EXT-X-CUE-IN");
        expect(lines[18]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        done();
      });
  });

  it("can insert interstitial with an assetlist", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(16000, "001", "http://mock.com/assetlist", true);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:16.001Z",X-ASSET-LIST="http://mock.com/assetlist"'
        );
        done();
      });
  });

  it("can insert interstitial with an relative assetlist URL", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(16000, "001", "/assetlist/sdfsdfjlsdfsdf", true);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:16.001Z",X-ASSET-LIST="/assetlist/sdfsdfjlsdfsdf"'
        );
        done();
      });
  });

  it("can insert interstitial with an asset uri", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi"'
        );
        done();
      });
  });

  it("can insert interstitial with an asset uri and a resume offset", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false, {
          resumeOffset: 10500,
        });
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-RESUME-OFFSET=10.5'
        );
        done();
      });
  });

  it("can insert interstitial with an asset uri and a resume offset that is 0", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false, {
          resumeOffset: 0,
        });
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-RESUME-OFFSET=0'
        );
        done();
      });
  });

  it("can insert interstitial with an asset uri and a playout limit", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false, {
          playoutLimit: 12500,
        });
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-PLAYOUT-LIMIT=12.5'
        );
        done();
      });
  });

  it("can insert interstitial with an asset uri and a snap IN", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false, {
          snap: "IN",
        });
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-SNAP="IN"'
        );
        done();
      });
  });

  it("can insert interstitial with an asset uri and a snap OUT", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false, {
          snap: "OUT",
        });
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-SNAP="OUT"'
        );
        done();
      });
  });

  it("can insert interstitial with an assetlist uri and a planned duration", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", true, {
          plannedDuration: 30000,
        });
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",DURATION=30,X-ASSET-LIST="http://mock.com/asseturi"'
        );
        done();
      });
  });
});

describe("HLSSpliceVod with Demuxed Audio Tracks,", () => {
  let mockMasterManifest;
  let mockMediaManifest;
  let mockAudioManifest;
  let mockAdMasterManifest;
  let mockAdMediaManifest;
  let mockAdAudioManifest;
  let mockAdMasterManifest2;
  let mockAdMediaManifest2;
  let mockAdAudioManifest2;
  const _log = (s) => console.log(JSON.stringify(s, null, 2));
  beforeEach(() => {
    // MOCK VOD #1
    mockMasterManifest = () => {
      return fs.createReadStream("testvectors/demux/hls1/master.m3u8");
    };
    mockMediaManifest = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1",
      };
      return fs.createReadStream(`testvectors/demux/hls1/index_${bwmap[bw]}_v.m3u8`);
    };
    mockAudioManifest = (g, l) => {
      return fs.createReadStream(`testvectors/demux/hls1/index_${g}-${l}_a.m3u8`);
    };
    // MOCK VOD #2
    mockMasterManifest1b = () => {
      return fs.createReadStream("testvectors/demux/hls1b/master.m3u8");
    };
    mockMediaManifest1b = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1",
      };
      return fs.createReadStream(`testvectors/demux/hls1b/index_${bwmap[bw]}_v.m3u8`);
    };
    mockAudioManifest1b = (g, l) => {
      return fs.createReadStream(`testvectors/demux/hls1b/index_${g}-${l}_a.m3u8`);
    };
    // MOCK VOD #3
    mockAdMasterManifest = () => {
      return fs.createReadStream("testvectors/demux/ad1/master.m3u8");
    };
    mockAdMediaManifest = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1",
      };
      return fs.createReadStream(`testvectors/demux/ad1/index_${bwmap[bw]}_v.m3u8`);
    };
    mockAdAudioManifest = (g, l) => {
      return fs.createReadStream(`testvectors/demux/ad1/index_${g}-${l}_a.m3u8`);
    };
    // MOCK VOD #4
    mockAdMasterManifest2 = () => {
      return fs.createReadStream("testvectors/demux/ad2/master.m3u8");
    };
    mockAdMediaManifest2 = (bw) => {
      const bwmap = {
        4397000: "0",
        2597000: "1",
      };
      return fs.createReadStream(`testvectors/demux/ad2/index_${bwmap[bw]}_v.m3u8`);
    };
    mockAdAudioManifest2 = (g, l) => {
      return fs.createReadStream(`testvectors/demux/ad2/index_${g}-${l}_a.m3u8`);
    };
    // MOCK VOD #5
    mockAdMasterManifest3 = () => {
      return fs.createReadStream("testvectors/demux/ad3/master.m3u8");
    };
    mockAdMediaManifest3 = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1",
      };
      return fs.createReadStream(`testvectors/demux/ad3/index_${bwmap[bw]}_v.m3u8`);
    };
    mockAdAudioManifest3 = (g, l) => {
      return fs.createReadStream(`testvectors/demux/ad3/index_${g}-${l}_a.m3u8`);
    };
    // MOCK VOD #6
    mockAdMasterManifest4 = () => {
      return fs.createReadStream("testvectors/demux/ad4/master.m3u8");
    };
    mockAdMediaManifest4 = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1",
      };
      return fs.createReadStream(`testvectors/demux/ad4/index_${bwmap[bw]}_v.m3u8`);
    };
    mockAdAudioManifest4 = (g, l) => {
      return fs.createReadStream(`testvectors/demux/ad4/index_${g}-${l}_a.m3u8`);
    };
    // MOCK VOD #7
    mockBumperMasterManifest = () => {
      return fs.createReadStream("testvectors/demux/ad1/master.m3u8");
    };
    mockBumperMediaManifest = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1",
      };
      return fs.createReadStream(`testvectors/demux/ad1/index_${bwmap[bw]}_v.m3u8`);
    };
    mockBumperAudioManifest = (g, l) => {
      return fs.createReadStream(`testvectors/demux/ad1/index_${g}-${l}_a.m3u8`);
    };
  });

  it("can prepend a baseurl on each segment", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { baseUrl: "https://baseurl.com/" });
    mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest).then(() => {
      const m3u8v = mockVod.getMediaManifest(4497000);
      let lines = m3u8v.split("\n");
      expect(lines[8]).toEqual("https://baseurl.com/segment1_0_av.ts");
      const m3u8a = mockVod.getAudioManifest("mono", "en");
      lines = m3u8a.split("\n");
      expect(lines[8]).toEqual("https://baseurl.com/segment1_men_a.ts");
      done();
    });
  });

  it("can provide absolute urls on each segment", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { absoluteUrls: true });
    mockVod.load(mockMasterManifest, mockMediaManifest, mockAudioManifest).then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const m3u8a = mockVod.getAudioManifest("stereo", "sv");
      const m = m3u8.match("http://mock.com/segment3_0_av.ts");
      const m2 = m3u8a.match("http://mock.com/segment6_ssv_a.ts");
      expect(m).not.toBe(null);
      expect(m2).not.toBe(null);
      done();
    });
  });

  it("contains a 15 second splice at 9 seconds from start", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          9000,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const m3u8Audio = mockVod.getAudioManifest("stereo", "en");
        const m = m3u8.match(
          /#EXTINF:9.0000,\s+segment1_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad\/ad1_0_av.ts/
        );
        const m2 = m3u8Audio.match(
          /#EXTINF:9.0000,\s+segment1_sen_a.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad\/ad1_sen_a.ts/
        );
        expect(m).not.toBe(null);
        expect(m2).not.toBe(null);
        done();
      });
  });

  it("can handle ad with non matching profile", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          9000,
          "http://mock.com/ad2/mockad.m3u8",
          mockAdMasterManifest2,
          mockAdMediaManifest2,
          mockAdAudioManifest2
        );
      })
      .then(() => {
        let m3u8 = mockVod.getMediaManifest(4497000);
        let m3u8Audio = mockVod.getAudioManifest("stereo", "en");
        let m = m3u8.match(
          /#EXTINF:9.0000,\s+segment1_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad2\/ad1_0_av.ts/
        );
        m2 = m3u8.match(
          /#EXTINF:9.0000,\s+segment1_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad2\/ad1_ano_a.ts/
        );
        expect(m).not.toBe(null);
        expect(m2).toBe(null);
        m3u8 = mockVod.getMediaManifest(2497000);
        m3u8Audio = mockVod.getAudioManifest("mono", "sv");
        m = m3u8.match(
          /#EXTINF:9.0000,\s+segment1_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad2\/ad1_0_av.ts/
        );
        m2 = m3u8Audio.match(
          /#EXTINF:9.0000,\s+segment1_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad2\/ad1_ano_a.ts/
        );
        expect(m).toBe(null);
        expect(m2).toBe(null);
        done();
      });
  });

  it("contains a 15 sec splice at 9 sec and at 30 sec from start", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          9000,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        return mockVod.insertAdAt(
          30000,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const m3u8Audio = mockVod.getAudioManifest("stereo", "en");
        const m = m3u8.match(
          /#EXTINF:9.0000,\s+segment1_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad\/ad1_0_av.ts/
        );
        const m2 = m3u8Audio.match(
          /#EXTINF:9.0000,\s+segment1_sen_a.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad\/ad1_sen_a.ts/
        );
        expect(m).not.toBe(null);
        expect(m2).not.toBe(null);
        const n = m3u8.match(
          /#EXTINF:9.0000,\s+segment2_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad\/ad1_0_av.ts/
        );
        const n2 = m3u8Audio.match(
          /#EXTINF:9.0000,\s+segment2_sen_a.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad\/ad1_sen_a.ts/
        );
        expect(n).not.toBe(null);
        expect(n2).not.toBe(null);
        done();
      });
  });

  it("handles two ads in a row", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad3/mockad.m3u8",
          mockAdMasterManifest3,
          mockAdMediaManifest3,
          mockAdAudioManifest3
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[8]).toEqual("#EXT-X-CUE-OUT:DURATION=3");
        expect(lines[13]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        const linesAudio = m3u8Audio.split("\n");
        expect(linesAudio[8]).toEqual("#EXT-X-CUE-OUT:DURATION=3");
        expect(linesAudio[13]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        expect(linesAudio[linesAudio.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles two ads in a row merged into one break", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { merge: true });
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        // This one will go first
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest3,
          mockAdMediaManifest3,
          mockAdAudioManifest3
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const m3u8Audio = mockVod.getAudioManifest("stereo", "en");
        const lines = m3u8.split("\n");
        expect(lines[8]).toEqual("#EXT-X-CUE-OUT:DURATION=18");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        const linesAudio = m3u8Audio.split("\n");
        expect(linesAudio[8]).toEqual("#EXT-X-CUE-OUT:DURATION=18");
        expect(linesAudio[linesAudio.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles two ads that should not be merged into one break", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { merge: false });
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        // This one will go first
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest3,
          mockAdMediaManifest3,
          mockAdAudioManifest3
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[8]).toEqual("#EXT-X-CUE-OUT:DURATION=3");
        expect(lines[13]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        const m3u8Audio = mockVod.getAudioManifest("mono", "en");
        lines = m3u8Audio.split("\n");
        expect(lines[8]).toEqual("#EXT-X-CUE-OUT:DURATION=3");
        expect(lines[13]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles post-roll ads", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          -1,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[28]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        expect(lines[39]).toEqual("#EXT-X-CUE-IN");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        const m3u8Audio = mockVod.getAudioManifest("mono", "en");
        lines = m3u8Audio.split("\n");
        expect(lines[28]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        expect(lines[39]).toEqual("#EXT-X-CUE-IN");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles two post-roll ads", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          -1,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        return mockVod.insertAdAt(
          -1,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[28]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        expect(lines[40]).toEqual("#EXT-X-CUE-IN");
        expect(lines[52]).toEqual("#EXT-X-CUE-IN");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        const m3u8Audio = mockVod.getAudioManifest("mono", "en");
        lines = m3u8Audio.split("\n");
        expect(lines[28]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        expect(lines[40]).toEqual("#EXT-X-CUE-IN");
        expect(lines[52]).toEqual("#EXT-X-CUE-IN");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles one pre-roll and one post-roll", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        return mockVod.insertAdAt(
          -1,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[lines.length - 3]).toEqual("#EXT-X-CUE-IN");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        const m3u8Audio = mockVod.getAudioManifest("mono", "en");
        lines = m3u8Audio.split("\n");
        expect(lines[lines.length - 3]).toEqual("#EXT-X-CUE-IN");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles video bumper without any ads", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertBumper(
          "http://mock.com/ad/mockbumper.m3u8",
          mockBumperMasterManifest,
          mockBumperMediaManifest,
          mockBumperAudioManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const m3u8Audio = mockVod.getAudioManifest("mono", "en");
        let lines = m3u8.split("\n");
        expect(lines[8]).toEqual("http://mock.com/ad/ad1_0_av.ts");
        expect(lines[17]).toEqual("#EXT-X-DISCONTINUITY");
        expect(lines[18]).not.toEqual("#EXT-X-CUE-IN");
        lines = m3u8Audio.split("\n");
        expect(lines[8]).toEqual("http://mock.com/ad/ad1_men_a.ts");
        expect(lines[17]).toEqual("#EXT-X-DISCONTINUITY");
        expect(lines[18]).not.toEqual("#EXT-X-CUE-IN");
        done();
      });
  });

  it("handles video bumper with one ad", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        return mockVod.insertBumper(
          "http://mock.com/ad/mockbumper.m3u8",
          mockBumperMasterManifest,
          mockBumperMediaManifest,
          mockBumperAudioManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[8]).toEqual("http://mock.com/ad/ad1_0_av.ts");
        expect(lines[17]).toEqual("#EXT-X-DISCONTINUITY");
        expect(lines[18]).not.toEqual("#EXT-X-CUE-IN");
        expect(lines[18]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        const m3u8Audio = mockVod.getAudioManifest("mono", "en");
        lines = m3u8Audio.split("\n");
        expect(lines[8]).toEqual("http://mock.com/ad/ad1_men_a.ts");
        expect(lines[17]).toEqual("#EXT-X-DISCONTINUITY");
        expect(lines[18]).not.toEqual("#EXT-X-CUE-IN");
        expect(lines[18]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        done();
      });
  });

  it("handles video bumper and two ads in a row merged into one break", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { merge: true });
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        // This one will go first
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest3,
          mockAdMediaManifest3,
          mockAdAudioManifest3
        );
      })
      .then(() => {
        return mockVod.insertBumper(
          "http://mock.com/ad/mockbumper.m3u8",
          mockBumperMasterManifest,
          mockBumperMediaManifest,
          mockBumperAudioManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[10 + 8]).toEqual("#EXT-X-CUE-OUT:DURATION=18");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        lines = m3u8Audio.split("\n");
        expect(lines[10 + 8]).toEqual("#EXT-X-CUE-OUT:DURATION=18");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles target duration for video bumper and two ads in a row merged into one break", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { merge: true });
    mockVod
      .load(mockMasterManifest1b, mockMediaManifest1b, mockAudioManifest1b)
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest3,
          mockAdMediaManifest3,
          mockAdAudioManifest3
        );
      })
      .then(() => {
        // This one will go first
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest4,
          mockAdMediaManifest4,
          mockAdAudioManifest4
        );
      })
      .then(() => {
        return mockVod.insertBumper(
          "http://mock.com/ad/mockbumper.m3u8",
          mockBumperMasterManifest,
          mockBumperMediaManifest,
          mockBumperAudioManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[1]).toEqual("#EXT-X-TARGETDURATION:8");
        expect(lines[10 + 8]).toEqual("#EXT-X-CUE-OUT:DURATION=23");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        const m3u8Audio = mockVod.getAudioManifest("mono", "en");
        lines = m3u8Audio.split("\n");
        expect(lines[1]).toEqual("#EXT-X-TARGETDURATION:8");
        expect(lines[10 + 8]).toEqual("#EXT-X-CUE-OUT:DURATION=23");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles target duration with video bumper and no ads", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { merge: true });
    mockVod
      .load(mockMasterManifest1b, mockMediaManifest1b, mockAudioManifest1b)
      .then(() => {
        return mockVod.insertBumper(
          "http://mock.com/ad/mockbumper.m3u8",
          mockAdMasterManifest4,
          mockAdMediaManifest4,
          mockAdAudioManifest4
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[1]).toEqual("#EXT-X-TARGETDURATION:8");
        const m3u8Audio = mockVod.getAudioManifest("mono", "en");
        lines = m3u8Audio.split("\n");
        expect(lines[1]).toEqual("#EXT-X-TARGETDURATION:8");
        done();
      });
  });

  it("ensures that video bumper is always first", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertBumper(
          "http://mock.com/ad_bumper/mockbumper.m3u8",
          mockBumperMasterManifest,
          mockBumperMediaManifest,
          mockBumperAudioManifest
        );
      })
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockAdMasterManifest,
          mockAdMediaManifest,
          mockAdAudioManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[8]).toEqual("http://mock.com/ad_bumper/ad1_0_av.ts");
        expect(lines[17]).toEqual("#EXT-X-DISCONTINUITY");
        expect(lines[18]).not.toEqual("#EXT-X-CUE-IN");
        expect(lines[18]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
        const m3u8Audio = mockVod.getAudioManifest("mono", "en");
        lines = m3u8Audio.split("\n");
        expect(lines[8]).toEqual("http://mock.com/ad_bumper/ad1_men_a.ts");
        expect(lines[17]).toEqual("#EXT-X-DISCONTINUITY");
        expect(lines[18]).not.toEqual("#EXT-X-CUE-IN");
        expect(lines[18]).toEqual("#EXT-X-CUE-OUT:DURATION=15");

        done();
      });
  });

  it("can insert interstitial with an assetlist", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(16000, "001", "http://mock.com/assetlist", true);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:16.001Z",X-ASSET-LIST="http://mock.com/assetlist"'
        );
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        lines = m3u8Audio.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:16.001Z",X-ASSET-LIST="http://mock.com/assetlist"'
        );
        done();
      });
  });

  it("can insert interstitial with an relative assetlist URL", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(16000, "001", "/assetlist/sdfsdfjlsdfsdf", true);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:16.001Z",X-ASSET-LIST="/assetlist/sdfsdfjlsdfsdf"'
        );
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        lines = m3u8Audio.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:16.001Z",X-ASSET-LIST="/assetlist/sdfsdfjlsdfsdf"'
        );
        done();
      });
  });

  it("can insert interstitial with an asset uri", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi"'
        );
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        lines = m3u8Audio.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi"'
        );
        done();
      });
  });

  it("can insert interstitial with an asset uri and a resume offset", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false, {
          resumeOffset: 10500,
        });
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-RESUME-OFFSET=10.5'
        );
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        lines = m3u8Audio.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-RESUME-OFFSET=10.5'
        );
        done();
      });
  });

  it("can insert interstitial with an asset uri and a resume offset that is 0", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false, {
          resumeOffset: 0,
        });
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-RESUME-OFFSET=0'
        );
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        lines = m3u8Audio.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-RESUME-OFFSET=0'
        );
        done();
      });
  });

  it("can insert interstitial with an asset uri and a playout limit", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false, {
          playoutLimit: 12500,
        });
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-PLAYOUT-LIMIT=12.5'
        );
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        lines = m3u8Audio.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-PLAYOUT-LIMIT=12.5'
        );
        done();
      });
  });

  it("can insert interstitial with an asset uri and a snap IN", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false, {
          snap: "IN",
        });
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-SNAP="IN"'
        );
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        lines = m3u8Audio.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-SNAP="IN"'
        );
        done();
      });
  });

  it("can insert interstitial with an asset uri and a snap OUT", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false, {
          snap: "OUT",
        });
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-SNAP="OUT"'
        );
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        lines = m3u8Audio.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",X-ASSET-URI="http://mock.com/asseturi",X-SNAP="OUT"'
        );
        done();
      });
  });

  it("can insert interstitial with an assetlist uri and a planned duration", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockMasterManifest, mockMediaManifest, mockAudioManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", true, {
          plannedDuration: 30000,
        });
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",DURATION=30,X-ASSET-LIST="http://mock.com/asseturi"'
        );
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        lines = m3u8Audio.split("\n");
        expect(lines[12]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",DURATION=30,X-ASSET-LIST="http://mock.com/asseturi"'
        );
        done();
      });
  });
});

describe("HLSSpliceVod with CMAF and Demuxed Audio Tracks,", () => {
  const _log = (s) => console.log(JSON.stringify(s, null, 2));
  beforeEach(() => {
    // MOCK VOD #8 TEST
    mockCmafMasterManifest = () => {
      return fs.createReadStream("testvectors/demux_n_cmaf/hls1/master.m3u8");
    };
    mockCmafMediaManifest = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1",
      };
      return fs.createReadStream(`testvectors/demux_n_cmaf/hls1/index_${bwmap[bw]}_v.m3u8`);
    };
    mockCmafAudioManifest = (g, l) => {
      return fs.createReadStream(`testvectors/demux_n_cmaf/hls1/index_${g}-${l}_a.m3u8`);
    };
    // MOCK VOD #8 TEST
    mockCmafAdMasterManifest = () => {
      return fs.createReadStream("testvectors/demux_n_cmaf/ad1/master.m3u8");
    };
    mockCmafAdMediaManifest = (bw) => {
      const bwmap = {
        4545000: "0",
        2525000: "1",
      };
      return fs.createReadStream(`testvectors/demux_n_cmaf/ad1/index_${bwmap[bw]}_v.m3u8`);
    };
    mockCmafAdAudioManifest = (g, l) => {
      return fs.createReadStream(`testvectors/demux_n_cmaf/ad1/index_${g}-${l}_a.m3u8`);
    };
    // MOCK VOD #9 TEST
    mockCmafAdMasterManifest3 = () => {
      return fs.createReadStream("testvectors/demux_n_cmaf/ad3/master.m3u8");
    };
    mockCmafAdMediaManifest3 = (bw) => {
      const bwmap = {
        4545000: "0",
        2525000: "1",
      };
      return fs.createReadStream(`testvectors/demux_n_cmaf/ad3/index_${bwmap[bw]}_v.m3u8`);
    };
    mockCmafAdAudioManifest3 = (g, l) => {
      return fs.createReadStream(`testvectors/demux_n_cmaf/ad3/index_${g}-${l}_a.m3u8`);
    };
    // MOCK VOD #10 TEST
    mockCmafAdMasterManifest4 = () => {
      return fs.createReadStream("testvectors/demux_n_cmaf/ad4/master.m3u8");
    };
    mockCmafAdMediaManifest4 = (bw) => {
      const bwmap = {
        4545000: "0",
        2525000: "1",
      };
      return fs.createReadStream(`testvectors/demux_n_cmaf/ad4/index_${bwmap[bw]}_v.m3u8`);
    };
    mockCmafAdAudioManifest4 = (g, l) => {
      return fs.createReadStream(`testvectors/demux_n_cmaf/ad4/index_${g}-${l}_a.m3u8`);
    };
  });

  it("contains a 15 second splice at 9 seconds from start", (done) => {
    // TEZT
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockCmafMasterManifest, mockCmafMediaManifest, mockCmafAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          9000,
          "http://mock.com/ad/mockad.m3u8",
          mockCmafAdMasterManifest,
          mockCmafAdMediaManifest,
          mockCmafAdAudioManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        const expectedChunkVideo = `#EXT-X-MAP:URI="test-video=2500000.m4s"
#EXTINF:3.0000, no desc
test-video=2500000-1.m4s
#EXTINF:3.0000, no desc
test-video=2500000-2.m4s
#EXTINF:3.0000, no desc
test-video=2500000-3.m4s
#EXT-X-MAP:URI="http://mock.com/ad/mock-ad-video=2525000.m4s"
#EXT-X-DISCONTINUITY
#EXT-X-CUE-OUT:DURATION=14.16
#EXTINF:3.0000, no desc
http://mock.com/ad/mock-ad-video=2525000-1.m4s
#EXTINF:3.0000, no desc
http://mock.com/ad/mock-ad-video=2525000-2.m4s
#EXTINF:3.0000, no desc
http://mock.com/ad/mock-ad-video=2525000-3.m4s
#EXTINF:3.0000, no desc
http://mock.com/ad/mock-ad-video=2525000-4.m4s
#EXTINF:2.1600, no desc
http://mock.com/ad/mock-ad-video=2525000-5.m4s
#EXT-X-MAP:URI="test-video=2500000.m4s"
#EXT-X-DISCONTINUITY
#EXT-X-CUE-IN
#EXTINF:3.0000, no desc
test-video=2500000-4.m4s`;
        const expectedChunkAudio = `#EXT-X-MAP:URI="test-audio=256000.m4s"
#EXTINF:1.9200, no desc
test-audio=256000-1.m4s
#EXTINF:1.9200, no desc
test-audio=256000-2.m4s
#EXTINF:1.9200, no desc
test-audio=256000-3.m4s
#EXTINF:1.9200, no desc
test-audio=256000-4.m4s
#EXTINF:1.9200, no desc
test-audio=256000-5.m4s
#EXT-X-MAP:URI="http://mock.com/ad/mock-ad-audio=256000.m4s"
#EXT-X-DISCONTINUITY
#EXT-X-CUE-OUT:DURATION=14.9333
#EXTINF:1.9200, no desc
http://mock.com/ad/mock-ad-audio=256000-1.m4s
#EXTINF:1.9200, no desc
http://mock.com/ad/mock-ad-audio=256000-2.m4s
#EXTINF:1.9200, no desc
http://mock.com/ad/mock-ad-audio=256000-3.m4s
#EXTINF:1.9200, no desc
http://mock.com/ad/mock-ad-audio=256000-4.m4s
#EXTINF:1.9200, no desc
http://mock.com/ad/mock-ad-audio=256000-5.m4s
#EXTINF:1.9200, no desc
http://mock.com/ad/mock-ad-audio=256000-6.m4s
#EXTINF:1.9200, no desc
http://mock.com/ad/mock-ad-audio=256000-7.m4s
#EXTINF:1.4933, no desc
http://mock.com/ad/mock-ad-audio=256000-8.m4s
#EXT-X-MAP:URI="test-audio=256000.m4s"
#EXT-X-DISCONTINUITY
#EXT-X-CUE-IN
#EXTINF:1.9200, no desc
test-audio=256000-6.m4s`;
        expect(m3u8.includes(expectedChunkVideo)).toBe(true);
        expect(m3u8Audio.includes(expectedChunkAudio)).toBe(true);
        done();
      });
  });

  it("handles two ads in a row merged into one break", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { merge: true });
    mockVod
      .load(mockCmafMasterManifest, mockCmafMediaManifest, mockCmafAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockCmafAdMasterManifest,
          mockCmafAdMediaManifest,
          mockCmafAdAudioManifest
        );
      })
      .then(() => {
        // This one will go first
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockCmafAdMasterManifest3,
          mockCmafAdMediaManifest3,
          mockCmafAdAudioManifest3
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[8]).toEqual(`#EXT-X-MAP:URI="http://mock.com/ad/mock-ad3-video=2525000.m4s"`);
        expect(lines[9]).toEqual(`#EXT-X-DISCONTINUITY`);
        expect(lines[10]).toEqual(`#EXT-X-CUE-OUT:DURATION=17.16`);
        expect(lines[12]).toEqual(`http://mock.com/ad/mock-ad3-video=2525000-1.m4s`);
        expect(lines[13]).toEqual(`#EXT-X-MAP:URI="http://mock.com/ad/mock-ad-video=2525000.m4s"`);
        expect(lines[14]).toEqual(`#EXT-X-DISCONTINUITY`);
        expect(lines[16]).toEqual(`http://mock.com/ad/mock-ad-video=2525000-1.m4s`);
        expect(lines[25]).toEqual(`#EXT-X-MAP:URI="test-video=2500000.m4s"`);
        expect(lines[26]).toEqual(`#EXT-X-DISCONTINUITY`);
        expect(lines[27]).toEqual(`#EXT-X-CUE-IN`);
        expect(lines[29]).toEqual(`test-video=2500000-1.m4s`);
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        const linesAudio = m3u8Audio.split("\n");
        expect(linesAudio[8]).toEqual(`#EXT-X-MAP:URI="http://mock.com/ad/mock-ad3-audio=256000.m4s"`);
        expect(linesAudio[9]).toEqual(`#EXT-X-DISCONTINUITY`);
        expect(linesAudio[10]).toEqual(`#EXT-X-CUE-OUT:DURATION=18.3466`);
        expect(linesAudio[12]).toEqual(`http://mock.com/ad/mock-ad3-audio=256000-1.m4s`);
        expect(linesAudio[15]).toEqual(`#EXT-X-MAP:URI="http://mock.com/ad/mock-ad-audio=256000.m4s"`);
        expect(linesAudio[16]).toEqual(`#EXT-X-DISCONTINUITY`);
        expect(linesAudio[18]).toEqual(`http://mock.com/ad/mock-ad-audio=256000-1.m4s`);
        expect(linesAudio[33]).toEqual(`#EXT-X-MAP:URI="test-audio=256000.m4s"`);
        expect(linesAudio[34]).toEqual(`#EXT-X-DISCONTINUITY`);
        expect(linesAudio[35]).toEqual(`#EXT-X-CUE-IN`);
        expect(linesAudio[37]).toEqual(`test-audio=256000-1.m4s`);
        expect(linesAudio[linesAudio.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles two ads that should not be merged into one break", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { merge: false });
    mockVod
      .load(mockCmafMasterManifest, mockCmafMediaManifest, mockCmafAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockCmafAdMasterManifest,
          mockCmafAdMediaManifest,
          mockCmafAdAudioManifest
        );
      })
      .then(() => {
        // This one will go first
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockCmafAdMasterManifest3,
          mockCmafAdMediaManifest3,
          mockCmafAdAudioManifest3
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[8]).toEqual(`#EXT-X-MAP:URI="http://mock.com/ad/mock-ad3-video=2525000.m4s"`);
        expect(lines[9]).toEqual(`#EXT-X-DISCONTINUITY`);
        expect(lines[10]).toEqual(`#EXT-X-CUE-OUT:DURATION=3`);
        expect(lines[12]).toEqual(`http://mock.com/ad/mock-ad3-video=2525000-1.m4s`);
        expect(lines[13]).toEqual(`#EXT-X-MAP:URI="http://mock.com/ad/mock-ad-video=2525000.m4s"`);
        expect(lines[15]).toEqual(`#EXT-X-CUE-IN`);
        expect(lines[16]).toEqual(`#EXT-X-CUE-OUT:DURATION=14.16`);
        expect(lines[18]).toEqual(`http://mock.com/ad/mock-ad-video=2525000-1.m4s`);
        expect(lines[27]).toEqual(`#EXT-X-MAP:URI="test-video=2500000.m4s"`);
        expect(lines[29]).toEqual(`#EXT-X-CUE-IN`);
        expect(lines[31]).toEqual(`test-video=2500000-1.m4s`);
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        const linesAudio = m3u8Audio.split("\n");
        expect(linesAudio[8]).toEqual(`#EXT-X-MAP:URI="http://mock.com/ad/mock-ad3-audio=256000.m4s"`);
        expect(linesAudio[10]).toEqual(`#EXT-X-CUE-OUT:DURATION=3.4133`);
        expect(linesAudio[12]).toEqual(`http://mock.com/ad/mock-ad3-audio=256000-1.m4s`);
        expect(linesAudio[15]).toEqual(`#EXT-X-MAP:URI="http://mock.com/ad/mock-ad-audio=256000.m4s"`);
        expect(linesAudio[17]).toEqual(`#EXT-X-CUE-IN`);
        expect(linesAudio[18]).toEqual(`#EXT-X-CUE-OUT:DURATION=14.9333`);
        expect(linesAudio[20]).toEqual(`http://mock.com/ad/mock-ad-audio=256000-1.m4s`);
        expect(linesAudio[35]).toEqual(`#EXT-X-MAP:URI="test-audio=256000.m4s"`);
        expect(linesAudio[37]).toEqual(`#EXT-X-CUE-IN`);
        expect(linesAudio[39]).toEqual(`test-audio=256000-1.m4s`);
        done();
      });
  });

  it("handles setting absolutUrl on map uri, when no ad is stitched", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/test-vod/mock.m3u8", {
      absoluteUrls: 1
    });
    mockVod
      .load(mockCmafMasterManifest, mockCmafMediaManifest, mockCmafAudioManifest)
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[8]).toBe(`#EXT-X-MAP:URI="http://mock.com/test-vod/test-video=2500000.m4s"`)
        expect(lines[10]).toBe(`http://mock.com/test-vod/test-video=2500000-1.m4s`)
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        const linesAudio = m3u8Audio.split("\n");
        expect(linesAudio[8]).toBe(`#EXT-X-MAP:URI="http://mock.com/test-vod/test-audio=256000.m4s"`)
        expect(linesAudio[10]).toBe(`http://mock.com/test-vod/test-audio=256000-1.m4s`)
        expect(linesAudio[linesAudio.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles one pre-roll and one post-roll", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/test-vod/mock.m3u8");
    mockVod
      .load(mockCmafMasterManifest, mockCmafMediaManifest, mockCmafAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockCmafAdMasterManifest,
          mockCmafAdMediaManifest,
          mockCmafAdAudioManifest
        );
      })
      .then(() => {
        return mockVod.insertAdAt(
          -1,
          "http://mock.com/ad/mockad.m3u8",
          mockCmafAdMasterManifest,
          mockCmafAdMediaManifest,
          mockCmafAdAudioManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        const lines = m3u8.split("\n");
        expect(lines[lines.length - 3]).toEqual("#EXT-X-CUE-IN");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        const linesAudio = m3u8Audio.split("\n");
        expect(linesAudio[linesAudio.length - 3]).toEqual("#EXT-X-CUE-IN");
        expect(linesAudio[linesAudio.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("handles target duration for video bumper and two ads in a row merged into one break", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8", { merge: true });
    mockVod
      .load(mockCmafMasterManifest, mockCmafMediaManifest, mockCmafAudioManifest)
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockCmafAdMasterManifest,
          mockCmafAdMediaManifest,
          mockCmafAdAudioManifest
        );
      })
      .then(() => {
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockCmafAdMasterManifest3,
          mockCmafAdMediaManifest3,
          mockCmafAdAudioManifest3
        );
      })
      .then(() => {
        // This one will go first
        return mockVod.insertAdAt(
          0,
          "http://mock.com/ad/mockad.m3u8",
          mockCmafAdMasterManifest4,
          mockCmafAdMediaManifest4,
          mockCmafAdAudioManifest4
        );
      })
      .then(() => {
        return mockVod.insertBumper(
          "http://mock.com/ad/mockbumper.m3u8",
          mockCmafAdMasterManifest,
          mockCmafAdMediaManifest,
          mockCmafAdAudioManifest
        );
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[6]).toEqual("#EXT-X-TARGETDURATION:5");
        expect(lines[21]).toEqual("#EXT-X-CUE-OUT:DURATION=22.16");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        lines = m3u8Audio.split("\n");
        expect(lines[6]).toEqual("#EXT-X-TARGETDURATION:4");
        expect(lines[27]).toEqual("#EXT-X-CUE-OUT:DURATION=23.7599");
        expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
        done();
      });
  });

  it("can insert interstitial with an assetlist", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockCmafMasterManifest, mockCmafMediaManifest, mockCmafAudioManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(16000, "001", "http://mock.com/assetlist", true);
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[22]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:16.001Z",X-ASSET-LIST="http://mock.com/assetlist"'
        );
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        lines = m3u8Audio.split("\n");
        //lines.map((l, i) => console.log(l, i));
        expect(lines[28]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:16.001Z",X-ASSET-LIST="http://mock.com/assetlist"'
        );
        done();
      });
  });

  it("can insert interstitial with an assetlist uri and a planned duration", (done) => {
    const mockVod = new HLSSpliceVod("http://mock.com/mock.m3u8");
    mockVod
      .load(mockCmafMasterManifest, mockCmafMediaManifest, mockCmafAudioManifest)
      .then(() => {
        return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", true, {
          plannedDuration: 30000,
        });
      })
      .then(() => {
        const m3u8 = mockVod.getMediaManifest(4497000);
        let lines = m3u8.split("\n");
        expect(lines[22]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",DURATION=30,X-ASSET-LIST="http://mock.com/asseturi"'
        );
        const m3u8Audio = mockVod.getAudioManifest("stereo", "sv");
        lines = m3u8Audio.split("\n");
        expect(lines[30]).toEqual(
          '#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.001Z",DURATION=30,X-ASSET-LIST="http://mock.com/asseturi"'
        );
        done();
      });
  });
});
