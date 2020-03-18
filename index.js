const m3u8 = require('@eyevinn/m3u8');
const request = require('request');
const url = require('url');

class HLSSpliceVod {
  /**
   * Create an HLSSpliceVod instance
   * @param {string} vodManifestUri 
   * @param {Object} options 
   */
  constructor(vodManifestUri, options) {
    this.masterManifestUri = vodManifestUri;
    this.playlists = {};
    this.baseUrl = null;
    if (options && options.baseUrl) {
      this.baseUrl = options.baseUrl;
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
      Object.keys(this.playlists).map(bw => {
        let pos = 0;
        let i = 0;
        while(pos < offset) {
          const plItem = this.playlists[bw].items.PlaylistItem[i];
          pos += (plItem.get('duration') * 1000);
          i++;
        }
        this.playlists[bw].items.PlaylistItem[i].set('discontinuity', true);
        this.playlists[bw].items.PlaylistItem[i].set('cueout', 15);
        this.playlists[bw].items.PlaylistItem.splice(i + 1, 0, m3u8.M3U.PlaylistItem.create({ uri: 'ad.ts', duration: 3 }));
        this.playlists[bw].items.PlaylistItem[i + 2].set('cuein', true);
        this.playlists[bw].items.PlaylistItem[i + 2].set('discontinuity', true);
      });
      resolve();
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
};

module.exports = HLSSpliceVod;