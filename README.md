[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT) [![Coverage Status](https://coveralls.io/repos/github/Eyevinn/hls-splice/badge.svg?branch=master)](https://coveralls.io/github/Eyevinn/hls-splice?branch=master) [![Slack](http://slack.streamingtech.se/badge.svg)](http://slack.streamingtech.se)

A Node library to insert segments from an HLS VOD (e.g. ad) into another HLS VOD.

## Installation

```
npm install --save @eyevinn/hls-splice
```

## Usage

The code below shows an example of how an ad (HLS VOD) is inserted 35 seconds from the start in an HLS VOD.

```javascript
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

This example below illustrates what this library does. Consider this HLS VOD:

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
## API

```javascript
class HLSSpliceVod {
  /**
   * Load manifest to be manipulated
   */
  load(): Promise<void>
  /**
   * Insert ad located at `adMasterManifestUri` at position `offset` (milliseconds)
   */
  insertAdAt(offset: number, adMasterManifesturi: string): Promise<void>
  /**
   * Insert pre-roll bumper located at `bumperManifestUri` (not flagged as an ad)
   */
  insertBumper(bumperManifestUri: string): Promise<void>
  /**
   * Insert an ad opportunity according to interstitial DATERANGE schema at position `offset` (milliseconds)
   */
  insertInterstitialAt(offset: number, id: string, uri: string, isAssetList: boolean): Promise<void>
}
```

# Authors

This open source project is maintained by Eyevinn Technology.

## Contributors

- Jonas Rydholm Birmé (jonas.birme@eyevinn.se)

# Contributing

## Submitting Issues

We use GitHub issues to track public bugs. If you are submitting a bug, please provide the contents of the HLS manifests (master and media manifests) to make it easier to reproduce the issue and update unit tests.

## Contributing Code

We follow the [GitHub Flow](https://guides.github.com/introduction/flow/index.html) so all contributions happen through pull requests. We actively welcome your pull requests:

 1. Fork the repo and create your branch from master.
 2. If you've added code that should be tested, add tests.
 3. If you've changed APIs, update the documentation.
 4. Ensure the test suite passes.
 5. Issue that pull request!

Use 2 spaces for indentation rather than tabs. Thank you.

When submit code changes your submissions are understood to be under the same MIT License that covers the project. Feel free to contact Eyevinn Technology if that's a concern.

# Code of Conduct

## Our Pledge

In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to making participation in our project and our community a harassment-free experience for everyone, regardless of age, body size, disability, ethnicity, gender identity and expression, level of experience, nationality, personal appearance, race, religion, or sexual identity and orientation.

## Our Standards

Examples of behavior that contributes to creating a positive environment include:

- Using welcoming and inclusive language
- Being respectful of differing viewpoints and experiences
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards other community members

Examples of unacceptable behavior by participants include:

- The use of sexualized language or imagery and unwelcome sexual attention or advances
- Trolling, insulting/derogatory comments, and personal or political attacks
- Public or private harassment
- Publishing others' private information, such as a physical or electronic address, without explicit permission
- Other conduct which could reasonably be considered inappropriate in a professional setting

## Our Responsibilities

Project maintainers are responsible for clarifying the standards of acceptable behavior and are expected to take appropriate and fair corrective action in response to any instances of unacceptable behavior.

Project maintainers have the right and responsibility to remove, edit, or reject comments, commits, code, wiki edits, issues, and other contributions that are not aligned to this Code of Conduct, or to ban temporarily or permanently any contributor for other behaviors that they deem inappropriate, threatening, offensive, or harmful.

## Scope

This Code of Conduct applies both within project spaces and in public spaces when an individual is representing the project or its community. Examples of representing a project or community include using an official project e-mail address, posting via an official social media account, or acting as an appointed representative at an online or offline event. Representation of a project may be further defined and clarified by project maintainers.

## Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team at [INSERT EMAIL ADDRESS]. All complaints will be reviewed and investigated and will result in a response that is deemed necessary and appropriate to the circumstances. The project team is obligated to maintain confidentiality with regard to the reporter of an incident. Further details of specific enforcement policies may be posted separately.

Project maintainers who do not follow or enforce the Code of Conduct in good faith may face temporary or permanent repercussions as determined by other members of the project's leadership.

## Attribution

This Code of Conduct is adapted from the Contributor Covenant, version 1.4, available at http://contributor-covenant.org/version/1/4

# License (MIT)

Copyright 2020 Eyevinn Technology AB

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

# About Eyevinn Technology

Eyevinn Technology is an independent consultant firm specialized in video and streaming. Independent in a way that we are not commercially tied to any platform or technology vendor.

At Eyevinn, every software developer consultant has a dedicated budget reserved for open source development and contribution to the open source community. This give us room for innovation, team building and personal competence development. And also gives us as a company a way to contribute back to the open source community.

Want to know more about Eyevinn and how it is to work here. Contact us at work@eyevinn.se!