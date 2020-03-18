const HLSSpliceVod = require('../index.js');
const fs = require('fs');

describe("HLSSpliceVod", () => {
  let mockMasterManifest;
  let mockMediaManifest;
  let mockAdMasterManifest;
  let mockAdMediaManifest;

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

  it("contains a 15 second splice at 9 seconds from start", done => {
    const mockVod = new HLSSpliceVod('http://mock.com/mock.m3u8');
    mockVod.load(mockMasterManifest, mockMediaManifest)
    .then(() => {
      return mockVod.insertAdAt(9000, 'http://mock.com/mockad.m3u8', mockAdMasterManifest, mockAdMediaManifest);
    })
    .then(() => {
      console.log(mockVod.getMediaManifest(4497000));
      done();
    });
  });
});