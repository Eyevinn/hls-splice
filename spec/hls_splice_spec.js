const HLSSpliceVod = require('../index.js');
const fs = require('fs');

describe("HLSSpliceVod", () => {
  let mockMasterManifest;
  let mockMediaManifest;
  let mockAdMasterManifest;
  let mockAdMediaManifest;
  let mockAdMasterManifest2;
  let mockAdMediaManifest2;

  beforeEach(() => {
    mockMasterManifest = () => {
      return fs.createReadStream('testvectors/hls1/master.m3u8')
    };
    mockMediaManifest = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1"
      }
      return fs.createReadStream(`testvectors/hls1/index_${bwmap[bw]}_av.m3u8`);
    };
    mockMasterManifest1b = () => {
      return fs.createReadStream('testvectors/hls1b/master.m3u8')
    };
    mockMediaManifest1b = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1"
      }
      return fs.createReadStream(`testvectors/hls1b/index_${bwmap[bw]}_av.m3u8`);
    };
    mockAdMasterManifest = () => {
      return fs.createReadStream('testvectors/ad1/master.m3u8')
    };
    mockAdMediaManifest = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1"
      }
      return fs.createReadStream(`testvectors/ad1/index_${bwmap[bw]}_av.m3u8`);
    };
    mockAdMasterManifest2 = () => {
      return fs.createReadStream('testvectors/ad2/master.m3u8')
    };
    mockAdMediaManifest2 = (bw) => {
      const bwmap = {
        4397000: "0",
        2597000: "1"
      }
      return fs.createReadStream(`testvectors/ad2/index_${bwmap[bw]}_av.m3u8`);
    };
    mockAdMasterManifest3 = () => {
      return fs.createReadStream('testvectors/ad3/master.m3u8')
    };
    mockAdMediaManifest3 = (bw) => {
      const bwmap = {
        4397000: "0",
        2597000: "1"
      }
      return fs.createReadStream(`testvectors/ad3/index_${bwmap[bw]}_av.m3u8`);
    };
    mockAdMasterManifest4 = () => {
      return fs.createReadStream('testvectors/ad4/master.m3u8')
    };
    mockAdMediaManifest4 = (bw) => {
      const bwmap = {
        4397000: "0",
        2597000: "1"
      }
      return fs.createReadStream(`testvectors/ad4/index_${bwmap[bw]}_av.m3u8`);
    };
    mockBumperMasterManifest = () => {
      return fs.createReadStream('testvectors/ad1/master.m3u8')
    };
    mockBumperMediaManifest = (bw) => {
      const bwmap = {
        4497000: "0",
        2497000: "1"
      }
      return fs.createReadStream(`testvectors/ad1/index_${bwmap[bw]}_av.m3u8`);
    };
  });

  it("can prepend a baseurl on each segment", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8', { baseUrl: 'https://baseurl.com/'});
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const m = m3u8.match('https://baseurl.com/segment3_0_av.ts');
      expect(m).not.toBe(null);
      done();
    });
  });

  it("can provide absolute urls on each segment", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8', { absoluteUrls: true });
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const m = m3u8.match('http://mock.com/segment3_0_av.ts');
      expect(m).not.toBe(null);
      done();
    });
  });


  it("contains a 15 second splice at 9 seconds from start", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertAdAt(9000, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const m = m3u8.match(/#EXTINF:9.0000,\s+segment1_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad\/ad1_0_av.ts/);
      expect(m).not.toBe(null);
      done();
    });
  });

  it("can handle ad with non matching profile", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertAdAt(9000, 'http://mock.com/ad2/mockad.m3u8', mockAdMasterManifest2, mockAdMediaManifest2);
    })
    .then(() => {
      let m3u8 = mockVod.getMediaManifest(4497000);
      let m = m3u8.match(/#EXTINF:9.0000,\s+segment1_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad2\/ad1_0_av.ts/);
      expect(m).not.toBe(null);
      m3u8 = mockVod.getMediaManifest(2497000);
      m = m3u8.match(/#EXTINF:9.0000,\s+segment1_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad2\/ad1_0_av.ts/);
      expect(m).toBe(null);
      done();
    });
  });

  it("contains a 15 sec splice at 9 sec and at 30 sec from start", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertAdAt(9000, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      return mockVod.insertAdAt(30000, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const m = m3u8.match(/#EXTINF:9.0000,\s+segment1_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad\/ad1_0_av.ts/);
      expect(m).not.toBe(null);
      const n = m3u8.match(/#EXTINF:9.0000,\s+segment2_0_av.ts\s+#EXT-X-DISCONTINUITY\s+#EXT-X-CUE-OUT:DURATION=15\s+#EXTINF:3.0000,\s+http:\/\/mock.com\/ad\/ad1_0_av.ts/);
      expect(n).not.toBe(null);
      done();
    });
  });

  it("handles two ads in a row", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertAdAt(0, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      // This one will go first
      return mockVod.insertAdAt(0, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest3, mockAdMediaManifest3);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[8]).toEqual("#EXT-X-CUE-OUT:DURATION=3");
      expect(lines[12]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
      expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
      done();
    });
  });

  it("handles two ads in a row merged into one break", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8', { merge: true });
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertAdAt(0, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      // This one will go first
      return mockVod.insertAdAt(0, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest3, mockAdMediaManifest3);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[8]).toEqual("#EXT-X-CUE-OUT:DURATION=18");
      expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
      done();
    });
  });

  it("handles two ads that should not be merged into one break", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8', { merge: true });
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertAdAt(9, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      // This one will go first
      return mockVod.insertAdAt(0, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest3, mockAdMediaManifest3);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[8]).toEqual("#EXT-X-CUE-OUT:DURATION=3");
      expect(lines[16]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
      expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
      done();
    });
  });


  it("handles post-roll ads", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertAdAt(-1, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);      
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[28]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
      expect(lines[39]).toEqual("#EXT-X-CUE-IN");
      expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
      done();
    })
  });

  it("handles two post-roll ads", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertAdAt(-1, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      return mockVod.insertAdAt(-1, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[28]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
      expect(lines[41]).toEqual("#EXT-X-CUE-IN");
      expect(lines[52]).toEqual("#EXT-X-CUE-IN");
      expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
      done();
    })
  });

  it("handles one pre-roll and one post-roll", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertAdAt(0, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      return mockVod.insertAdAt(-1, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[lines.length - 3]).toEqual("#EXT-X-CUE-IN");
      expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
      done();
    });
  });

  it("handles video bumper without any ads", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertBumper('http://mock.com/ad/mockbumper.m3u8', mockBumperMasterManifest, mockBumperMediaManifest);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[8]).toEqual("http://mock.com/ad/ad1_0_av.ts");
      expect(lines[17]).toEqual("#EXT-X-DISCONTINUITY");
      expect(lines[18]).not.toEqual("#EXT-X-CUE-IN");
      done();
    })
  });

  it("handles video bumper with one ad", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertAdAt(0, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      return mockVod.insertBumper('http://mock.com/ad/mockbumper.m3u8', mockBumperMasterManifest, mockBumperMediaManifest);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[8]).toEqual("http://mock.com/ad/ad1_0_av.ts");
      expect(lines[17]).toEqual("#EXT-X-DISCONTINUITY");
      expect(lines[18]).not.toEqual("#EXT-X-CUE-IN");
      expect(lines[18]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
      done();
    })
  });

  it("handles video bumper and two ads in a row merged into one break", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8', { merge: true });
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertAdAt(0, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      // This one will go first
      return mockVod.insertAdAt(0, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest3, mockAdMediaManifest3);
    })
    .then(() => {
      return mockVod.insertBumper('http://mock.com/ad/mockbumper.m3u8', mockBumperMasterManifest, mockBumperMediaManifest);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[10+8]).toEqual("#EXT-X-CUE-OUT:DURATION=18");
      expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
      done();
    });
  });

  it("handles target duration for video bumper and two ads in a row merged into one break", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8', { merge: true });
    mockVod.load(mockMasterManifest1b, mockMediaManifest1b)
    .then(() => {
      return mockVod.insertAdAt(0, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      return mockVod.insertAdAt(0, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest3, mockAdMediaManifest3);
    })
    .then(() => {
      // This one will go first
      return mockVod.insertAdAt(0, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest4, mockAdMediaManifest4);
    })
    .then(() => {
      return mockVod.insertBumper('http://mock.com/ad/mockbumper.m3u8', mockBumperMasterManifest, mockBumperMediaManifest);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[1]).toEqual("#EXT-X-TARGETDURATION:5");
      expect(lines[10+8]).toEqual("#EXT-X-CUE-OUT:DURATION=23");
      expect(lines[lines.length - 2]).toEqual("#EXT-X-ENDLIST");
      done();
    });
  });

  it("handles target duration with video bumper and no ads", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8', { merge: true });
    mockVod.load(mockMasterManifest1b, mockMediaManifest1b)
    .then(() => {
      return mockVod.insertBumper('http://mock.com/ad/mockbumper.m3u8', mockAdMasterManifest4, mockAdMediaManifest4);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[1]).toEqual("#EXT-X-TARGETDURATION:5");
      done();
    });
  });

  it("ensures that video bumper is always first", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertBumper('http://mock.com/ad/mockbumper.m3u8', mockBumperMasterManifest, mockBumperMediaManifest);
    })
    .then(() => {
      return mockVod.insertAdAt(0, 'http://mock.com/ad/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[8]).toEqual("http://mock.com/ad/ad1_0_av.ts");
      expect(lines[17]).toEqual("#EXT-X-DISCONTINUITY");
      expect(lines[18]).not.toEqual("#EXT-X-CUE-IN");
      expect(lines[18]).toEqual("#EXT-X-CUE-OUT:DURATION=15");
      done();
    })
  });

  it("can insert interstitial with an assetlist", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertInterstitialAt(16000, "001", "http://mock.com/assetlist", true);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[12]).toEqual('#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:16.000Z",X-ASSET-LIST="http://mock.com/assetlist"');
      done();
    });
  });

  it("can insert interstitial with an relative assetlist URL", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertInterstitialAt(16000, "001", "/assetlist/sdfsdfjlsdfsdf", true);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[12]).toEqual('#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:16.000Z",X-ASSET-LIST="/assetlist/sdfsdfjlsdfsdf"');
      done();
    });
  });

  it("can insert interstitial with an asset uri", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false);
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[12]).toEqual('#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.000Z",X-ASSET-URI="http://mock.com/asseturi"');
      done();
    });
  });

  it("can insert interstitial with an asset uri and a resume offset", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false, {
        resumeOffset: 10500,
      });
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[12]).toEqual('#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.000Z",X-ASSET-URI="http://mock.com/asseturi",X-RESUME-OFFSET=10.5');
      done();
    });
  });

  it("can insert interstitial with an asset uri and a playout limit", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false, {
        playoutLimit: 12500,
      });
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[12]).toEqual('#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.000Z",X-ASSET-URI="http://mock.com/asseturi",X-PLAYOUT-LIMIT=12.5');
      done();
    });
  });

  it("can insert interstitial with an asset uri and a snap IN", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false, {
        snap: "IN",
      });
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[12]).toEqual('#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.000Z",X-ASSET-URI="http://mock.com/asseturi",X-SNAP="IN"');
      done();
    });
  });

  it("can insert interstitial with an asset uri and a snap OUT", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", false, {
        snap: "OUT",
      });
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[12]).toEqual('#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.000Z",X-ASSET-URI="http://mock.com/asseturi",X-SNAP="OUT"');
      done();
    });
  });

  it("can insert interstitial with an assetlist uri and a planned duration", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertInterstitialAt(18000, "001", "http://mock.com/asseturi", true, {
        plannedDuration: 30000,
      });
    })
    .then(() => {
      const m3u8 = mockVod.getMediaManifest(4497000);
      const lines = m3u8.split('\n');
      expect(lines[12]).toEqual('#EXT-X-DATERANGE:ID="001",CLASS="com.apple.hls.interstitial",START-DATE="1970-01-01T00:00:18.000Z",DURATION="30",X-ASSET-LIST="http://mock.com/asseturi"');
      done();
    });
  });
});
