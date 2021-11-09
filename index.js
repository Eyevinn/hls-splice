const m3u8 = require('@eyevinn/m3u8');
const request = require('request');
const url = require('url');

/*
const findNearestBw = (bw, array) => {
  // TO BE IMPLEMENTED
  const sorted = array.sort((a, b) => b - a);
  for (let i = 0; i < sorted.length; i++) {
    if (bw >= sorted[i]) {
      return sorted[i];
    }
  }
  return sorted[sorted.length - 1];
};
*/

const findNearestBw = (bw, array) => {
  const sorted = array.sort((a, b) => b - a);
  return sorted.reduce((a, b) => {
    return Math.abs(b - bw) < Math.abs(a - bw) ? b : a;
  });
}

class HLSSpliceVod {
  /**
   * Create an HLSSpliceVod instance
   * @param {string} vodManifestUrl 
   * @param {Object} options 
   */
  constructor(vodManifestUri, options) {
    this.masterManifestUri = vodManifestUri;
    this.playlists = {};
    this.baseUrl = null;
    this.targetDuration = 0;
    this.mergeBreaks = false; // Merge ad breaks at the same position into one single break
    this.bumperDuration = null;
    if (options && options.baseUrl) {
      this.baseUrl = options.baseUrl;
    }
    if (options && options.absoluteUrls) {
      const m = this.masterManifestUri.match('^(.*)/.*?');
      if (m) {
        this.baseUrl = m[1] + '/';
      }

    }
    if (options && options.merge) {
      this.mergeBreaks = true;
    }
  }

  /**
   * 
   * @param {ReadStream} _injectMasterManifest 
   * @param {ReadStream} _injectMediaManifest 
   */
  load(_injectMasterManifest, _injectMediaManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on('m3u', m3u => {
        this.m3u = m3u;
        let mediaManifestPromises = [];
        let baseUrl;
        const m = this.masterManifestUri.match(/^(.*)\/.*?$/);
        if (m) {
          baseUrl = m[1] + '/';
        }
        for (let i = 0; i < m3u.items.StreamItem.length; i++) {
          const streamItem = m3u.items.StreamItem[i];
          const mediaManifestUrl = url.resolve(baseUrl, streamItem.get('uri'));
          mediaManifestPromises.push(this._loadMediaManifest(mediaManifestUrl, streamItem.get('bandwidth'), _injectMediaManifest));
        }
        Promise.all(mediaManifestPromises)
        .then(resolve)
        .catch(reject);
      });

      if (!_injectMasterManifest) {
        try {
          request({ uri: this.masterManifestUri, gzip: true })
          .pipe(parser)
        } catch (exc) {
          reject(exc);
        }
      } else {
        _injectMasterManifest().pipe(parser);
      }
    });
  }

  insertAdAt(offset, adMasterManifestUri, _injectAdMasterManifest, _injectAdMediaManifest) {
    return new Promise((resolve, reject) => {
      this._parseAdMasterManifest(adMasterManifestUri, _injectAdMasterManifest, _injectAdMediaManifest)
      .then(ad => {
        const isPostRoll = (offset == -1);
        const bandwidths = Object.keys(this.playlists);

        if (isPostRoll) {
          let duration = 0;
          this.playlists[bandwidths[0]].items.PlaylistItem.map(plItem => {
            duration += (plItem.get('duration') * 1000);
          });
          offset = duration;
        } else {
          if (this.bumperDuration) {
            offset = this.bumperDuration + offset;
          }
        }

        for (let b = 0; b < bandwidths.length; b++) {
          const bw = bandwidths[b];
  
          const adPlaylist = ad.playlist[findNearestBw(bw, Object.keys(ad.playlist))];
          let pos = 0;
          let i = 0;
          while(pos < offset && i < this.playlists[bw].items.PlaylistItem.length) {
            const plItem = this.playlists[bw].items.PlaylistItem[i];
            pos += (plItem.get('duration') * 1000);
            i++;
          }
          let insertCueIn = false;
          if (this.playlists[bw].items.PlaylistItem[this.playlists[bw].items.PlaylistItem.length - 1].get('cuein')) {
            insertCueIn = true;
          }
          const adLength = adPlaylist.items.PlaylistItem.length;
          for (let j = 0; j < adLength; j++) {
            this.playlists[bw].items.PlaylistItem.splice(i + j, 0, adPlaylist.items.PlaylistItem[j]);
          }
          this.playlists[bw].items.PlaylistItem[i].set('discontinuity', true);
          this.playlists[bw].items.PlaylistItem[i].set('cueout', ad.duration);
          if (insertCueIn) {
            this.playlists[bw].items.PlaylistItem[i].set('cuein', true);
          }
          if (this.playlists[bw].items.PlaylistItem[i + adLength]) {
            this.playlists[bw].items.PlaylistItem[i + adLength].set('cuein', true);
            if (!isPostRoll) {
              this.playlists[bw].items.PlaylistItem[i + adLength].set('discontinuity', true);  
            }
          } else {
            this.playlists[bw].addPlaylistItem({ 'cuein': true });
          }
          this.playlists[bw].set('targetDuration', this.targetDuration);
        }
        //console.log(this.playlists[bandwidths[0]].toString());
        resolve();  
      }).catch(reject);
    });
  }

  insertInterstitialAt(offset, id, uri, isAssetList) {
    return new Promise((resolve, reject) => {
      if (this.bumperDuration) {
        offset = this.bumperDuration + offset;
      }

      const bandwidths = Object.keys(this.playlists);
      for (let b = 0; b < bandwidths.length; b++) {
        const bw = bandwidths[b];
        let pos = 0;
        let i = 0;
        this.playlists[bw].items.PlaylistItem[0].set('date', new Date(0));
        while(pos < offset && i < this.playlists[bw].items.PlaylistItem.length) {
          const plItem = this.playlists[bw].items.PlaylistItem[i];
          pos += (plItem.get('duration') * 1000);
          i++;
        }
        let startDate = (new Date(0 + offset)).toISOString();
        if (isAssetList) {
          this.playlists[bw].items.PlaylistItem[i].set('daterange', 
            `ID=${id},CLASS="com.apple.hls.interstitial",START-DATE="${startDate}",X-ASSET-LIST="${uri}"`);
        } else {
          this.playlists[bw].items.PlaylistItem[i].set('daterange', 
            `ID=${id},CLASS="com.apple.hls.interstitial",START-DATE="${startDate}",X-ASSET-URI="${uri}"`);
        }
      }
      resolve();
    });
  }

  insertBumper(bumperMasterManifestUri, _injectBumperMasterManifest, _injectBumperMediaManifest) {
    return new Promise((resolve, reject) => {
      this._parseAdMasterManifest(bumperMasterManifestUri, _injectBumperMasterManifest, _injectBumperMediaManifest)
      .then(bumper => {
        const bandwidths = Object.keys(this.playlists);
        for (let b = 0; b < bandwidths.length; b++) {
          const bw = bandwidths[b];

          const bumperPlaylist = bumper.playlist[findNearestBw(bw, Object.keys(bumper.playlist))];
          const bumperLength = bumperPlaylist.items.PlaylistItem.length;
          this.bumperDuration = 0;
          for (let j = 0; j < bumperLength; j++) {
            this.playlists[bw].items.PlaylistItem.splice(j, 0, bumperPlaylist.items.PlaylistItem[j]);
            this.bumperDuration += (bumperPlaylist.items.PlaylistItem[j].get('duration') * 1000);
          }
          this.playlists[bw].items.PlaylistItem[bumperLength].set('discontinuity', true);
          this.playlists[bw].set('targetDuration', this.targetDuration);
        }
        resolve();
      }).catch(reject);
    });
  }

  getMasterManifest() {
    return this.m3u.toString();
  }

  getMediaManifest(bw) {
    if (this.mergeBreaks) {
      let adBreakDuration = 0;
      let itemToUpdate = null;
      for (let i = 0; i < this.playlists[bw].items.PlaylistItem.length; i++) {
        if (this.playlists[bw].items.PlaylistItem[i].get('cueout') && this.playlists[bw].items.PlaylistItem[i].get('cuein')) {
          adBreakDuration += this.playlists[bw].items.PlaylistItem[i].get('cueout');
          this.playlists[bw].items.PlaylistItem[i].set('cueout', null);
          this.playlists[bw].items.PlaylistItem[i].set('cuein', false);
        } else if (this.playlists[bw].items.PlaylistItem[i].get('cueout') && !this.playlists[bw].items.PlaylistItem[i].get('cuein')) {
          adBreakDuration = 0;
          itemToUpdate = this.playlists[bw].items.PlaylistItem[i];
        } else if (!this.playlists[bw].items.PlaylistItem[i].get('cueout') && this.playlists[bw].items.PlaylistItem[i].get('cuein')) {
          const cueOut = itemToUpdate.get('cueout');
          itemToUpdate.set('cueout', cueOut + adBreakDuration);
        }
      }
    }
    this.playlists[bw].set('playlistType', "VOD"); // Ensure playlist type is VOD
    return this.playlists[bw].toString().replace(/^\s*\n/gm, '');
  }

  _loadMediaManifest(mediaManifestUri, bandwidth, _injectMediaManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on('m3u', m3u => {
        this.duration = 0;
        if (!this.playlists[bandwidth]) {
          this.playlists[bandwidth] = m3u;
        }
        if (this.baseUrl) {
          for (let i = 0; i < this.playlists[bandwidth].items.PlaylistItem.length; i++) {
            let plItem = this.playlists[bandwidth].items.PlaylistItem[i];
            let uri = plItem.get('uri');
            plItem.set('uri', this.baseUrl + uri);
          }
        }
        const targetDuration = this.playlists[bandwidth].get('targetDuration');
        if (targetDuration > this.targetDuration) {
          this.targetDuration = targetDuration;
        }
        this.playlists[bandwidth].set('targetDuration', this.targetDuration);
        resolve();
      });

      if (!_injectMediaManifest) {
        try {
          request({uri: mediaManifestUri, gzip: true })
          .pipe(parser)
        } catch (exc) {
          reject(exc);
        }
      } else {
        _injectMediaManifest(bandwidth).pipe(parser);
      }
    });
  }

  _parseAdMasterManifest(manifestUri, _injectAdMasterManifest, _injectAdMediaManifest) {
    return new Promise((resolve, reject) => {
      let ad = {};
      const parser = m3u8.createStream();

      parser.on('m3u', m3u => {
        let mediaManifestPromises = [];
        ad.master = m3u;
        ad.playlist = {};
        ad.baseUrl = null;

        const m = manifestUri.match(/^(.*)\/.*?$/);
        if (m) {
          ad.baseUrl = m[1] + '/';
        }
        for (let i = 0; i < m3u.items.StreamItem.length; i++) {
          const streamItem = m3u.items.StreamItem[i];
          const mediaManifestUrl = url.resolve(ad.baseUrl, streamItem.get('uri'));
          const p = new Promise((res, rej) => {
            const mediaManifestParser = m3u8.createStream();

            mediaManifestParser.on('m3u', m3u => {
              if (m3u.get('targetDuration') > this.targetDuration) {
                this.targetDuration = m3u.get('targetDuration');
              }
              ad.duration = 0;
              let baseUrl;
              const n = mediaManifestUrl.match('^(.*)/.*?');
              if (n) {
                baseUrl = n[1] + '/';
              }
              for (let j = 0; j < m3u.items.PlaylistItem.length; j++) {
                let plItem = m3u.items.PlaylistItem[j];
                const plUri = plItem.get("uri");
                if (!plUri.match('^http')) {
                  plItem.set("uri", url.resolve(baseUrl, plUri));
                }
                ad.duration += plItem.get("duration");
              }
              ad.playlist[streamItem.get('bandwidth')] = m3u;
              res();
            });
            mediaManifestParser.on('error', err => {
              rej(err);
            });

            if (!_injectAdMediaManifest) {
              try {
                request({ uri: mediaManifestUrl, gzip: true })
                .on('error', err => {
                  rej(err);
                })
                .pipe(mediaManifestParser)
              } catch (err) {
                rej(err);
              }
            } else {
              _injectAdMediaManifest(streamItem.get('bandwidth')).pipe(mediaManifestParser);
            }
          });
          mediaManifestPromises.push(p);
        }

        Promise.all(mediaManifestPromises)
        .then(() => {
          resolve(ad);
        });
      });

      parser.on('error', err => {
        reject(err);
      });

      if (!_injectAdMasterManifest) {
        try {
          request({ uri: manifestUri, gzip: true })
          .on('error', err => {
            reject(err);
          })
          .pipe(parser)
        } catch (exc) {
          reject(exc);
        }
      } else {
        _injectAdMasterManifest().pipe(parser);
      }
    });
  }
};

module.exports = HLSSpliceVod;
