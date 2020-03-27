const m3u8 = require('@eyevinn/m3u8');
const request = require('request');
const url = require('url');

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
    if (options && options.baseUrl) {
      this.baseUrl = options.baseUrl;
    }
    if (options && options.absoluteUrls) {
      const m = this.masterManifestUri.match('^(.*)/.*?');
      if (m) {
        this.baseUrl = m[1] + '/';
      }

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
        const bandwidths = Object.keys(this.playlists);
        for (let b = 0; b < bandwidths.length; b++) {
          const bw = bandwidths[b];
          const adPlaylist = ad.playlist[findNearestBw(bw, Object.keys(ad.playlist))];
          let pos = 0;
          let i = 0;
          while(pos < offset) {
            const plItem = this.playlists[bw].items.PlaylistItem[i];
            pos += (plItem.get('duration') * 1000);
            i++;
          }
          const adLength = adPlaylist.items.PlaylistItem.length;
          for (let j = 0; j < adLength; j++) {
            this.playlists[bw].items.PlaylistItem.splice(i + j, 0, adPlaylist.items.PlaylistItem[j]);
          }
          this.playlists[bw].items.PlaylistItem[i].set('discontinuity', true);
          this.playlists[bw].items.PlaylistItem[i].set('cueout', ad.duration);
          this.playlists[bw].items.PlaylistItem[i + adLength].set('cuein', true);
          this.playlists[bw].items.PlaylistItem[i + adLength].set('discontinuity', true);
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
    return this.playlists[bw].toString();
  }

  _loadMediaManifest(mediaManifestUri, bandwidth, _injectMediaManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on('m3u', m3u => {
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