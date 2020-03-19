A Node library to insert segments from an HLS VOD (e.g. ad) into another HLS VOD.

Consider this HLS VOD:

```
#EXTM3U
#EXT-X-TARGETDURATION:9
#EXT-X-ALLOW-CACHE:YES
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:9.000,
segment1_0_av.ts
#EXTINF:9.000,
segment2_0_av.ts
#EXTINF:9.000,
segment3_0_av.ts
#EXTINF:9.000,
segment4_0_av.ts
#EXTINF:9.000,
segment5_0_av.ts
#EXTINF:9.000,
segment6_0_av.ts
#EXTINF:9.000,
segment7_0_av.ts
#EXTINF:9.000,
segment8_0_av.ts
#EXTINF:9.000,
segment9_0_av.ts
#EXTINF:6.266,
segment10_0_av.ts
#EXT-X-ENDLIST
```

and with this library we can insert this HLS VOD (ad):

```
#EXTM3U
#EXT-X-TARGETDURATION:3
#EXT-X-ALLOW-CACHE:YES
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:3.000,
ad1_0_av.ts
#EXTINF:3.000,
ad2_0_av.ts
#EXTINF:3.000,
ad3_0_av.ts
#EXTINF:3.000,
ad4_0_av.ts
#EXTINF:3.000,
ad5_0_av.ts
#EXT-X-ENDLIST
```

and get this result:

```
#EXTM3U
#EXT-X-TARGETDURATION:9
#EXT-X-ALLOW-CACHE:YES
#EXT-X-PLAYLIST-TYPE:VOD
#EXT-X-VERSION:3
#EXT-X-MEDIA-SEQUENCE:1
#EXTINF:9.0000,
segment1_0_av.ts
#EXT-X-DISCONTINUITY
#EXT-X-CUE-OUT:DURATION=15
#EXTINF:3.0000,
http://mock.com/ad2/ad1_0_av.ts
#EXTINF:3.0000,
http://mock.com/ad2/ad2_0_av.ts
#EXTINF:3.0000,
http://mock.com/ad2/ad3_0_av.ts
#EXTINF:3.0000,
http://mock.com/ad2/ad4_0_av.ts
#EXTINF:3.0000,
http://mock.com/ad2/ad5_0_av.ts
#EXT-X-DISCONTINUITY
#EXT-X-CUE-IN
#EXTINF:9.0000,
segment2_0_av.ts
#EXTINF:9.0000,
segment3_0_av.ts
#EXTINF:9.0000,
segment4_0_av.ts
#EXTINF:9.0000,
segment5_0_av.ts
#EXTINF:9.0000,
segment6_0_av.ts
#EXTINF:9.0000,
segment7_0_av.ts
#EXTINF:9.0000,
segment8_0_av.ts
#EXTINF:9.0000,
segment9_0_av.ts
#EXTINF:6.2660,
segment10_0_av.ts
#EXT-X-ENDLIST
```

## Example

```
$ npm install --save @eyevinn/hls-splice
```

```
const hlsVod = new HLSSpliceVod('https://maitv-vod.lab.eyevinn.technology/stswe17-ozer.mp4/master.m3u8');
hlsVod.load()
.then(() => {
  return hlsVod.insertAdAt(35000, 'https://maitv-vod.lab.eyevinn.technology/ads/apotea-15s.mp4/master.m3u8');
})
.then(() => {
  const mediaManifest = hlsVod.getMediaManifest(4928000);
  console.log(mediaManifest);
})
```

## License (MIT)

Copyright 2020 Eyevinn Technology AB

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.