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
      done();
    });
  });

});