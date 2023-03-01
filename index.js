const m3u8 = require("@eyevinn/m3u8");
const request = require("request");
const url = require("url");
//const _log = (s, i = 0) => console.log(JSON.stringify(s, null, 2), 2002 + i);
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
const findNearestGroupAndLang = (_group, _language, _playlist) => {
  const groups = Object.keys(_playlist);
  let group = groups[0]; // default
  if (groups.includes(_group)) {
    group = _group;
  }
  const langs = Object.keys(_playlist[group]);
  let lang = langs[0]; // default
  if (langs.includes(_language)) {
    lang = _language;
  }
  return [group, lang];
};

const findNearestBw = (bw, array) => {
  const sorted = array.sort((a, b) => b - a);
  return sorted.reduce((a, b) => {
    return Math.abs(b - bw) < Math.abs(a - bw) ? b : a;
  });
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
    this.playlistsAudio = {};
    this.baseUrl = null;
    this.targetDuration = 0;
    this.targetDurationAudio = 0;
    this.mergeBreaks = false; // Merge ad breaks at the same position into one single break
    this.bumperDuration = null;
    if (options && options.baseUrl) {
      this.baseUrl = options.baseUrl;
    }
    if (options && options.absoluteUrls) {
      const m = this.masterManifestUri.match("^(.*)/.*?");
      if (m) {
        this.baseUrl = m[1] + "/";
      }
    }
    if (options && options.merge) {
      this.mergeBreaks = true;
    }
    this.cmafMapUri = { video: {}, audio: {} };
  }

  /**
   *
   * @param {ReadStream} _injectMasterManifest
   * @param {ReadStream} _injectMediaManifest
   */
  load(_injectMasterManifest, _injectMediaManifest, _injectAudioManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on("m3u", (m3u) => {
        this.m3u = m3u;
        let mediaManifestPromises = [];
        let baseUrl;
        const m = this.masterManifestUri.match(/^(.*)\/.*?$/);
        if (m) {
          baseUrl = m[1] + "/";
        }
        for (let i = 0; i < m3u.items.StreamItem.length; i++) {
          const streamItem = m3u.items.StreamItem[i];
          const mediaManifestUrl = url.resolve(baseUrl, streamItem.get("uri"));
          mediaManifestPromises.push(
            this._loadMediaManifest(mediaManifestUrl, streamItem.get("bandwidth"), _injectMediaManifest)
          );
        }
        let audioItems = m3u.items.MediaItem.filter((item) => {
          return item.attributes.attributes.type === "AUDIO";
        });
        let loadedGroupLangs = [];
        for (let i = 0; i < audioItems.length; i++) {
          const audioItem = audioItems[i];
          // If no uri on mediaItem then it must exist on a streamItem
          let audioItemUri;
          if (!audioItem.get("uri")) {
            const aItemGroup = audioItem.get("group-id");
            const audioStreamItem = m3u.items.StreamItem.filter((streamItem) => {
              if (streamItem.get("resolution") === undefined) {
                return true;
              }
              let streamGroupId = streamItem.attributes.attributes["audio"];
              if (streamGroupId === aItemGroup) {
                return false;
              } else {
                return true;
              }
            })[0];
            if (audioStreamItem) {
              audioItemUri = audioStreamItem.get("uri");
            }
          } else {
            audioItemUri = audioItem.get("uri");
          }
          const audioItemGroupId = audioItem.get("group-id");
          const audioItemLanguage = audioItem.get("language") ? audioItem.get("language") : audioItem.get("name");
          if (loadedGroupLangs.includes(`${audioItemGroupId}-${audioItemLanguage}`)) {
            continue;
          } else {
            loadedGroupLangs.push(`${audioItemGroupId}-${audioItemLanguage}`);
          }
          const audioManifestUrl = url.resolve(baseUrl, audioItemUri);
          mediaManifestPromises.push(
            this._loadAudioManifest(audioManifestUrl, audioItemGroupId, audioItemLanguage, _injectAudioManifest)
          );
        }
        Promise.all(mediaManifestPromises).then(resolve).catch(reject);
      });

      if (!_injectMasterManifest) {
        try {
          request({ uri: this.masterManifestUri, gzip: true }).pipe(parser);
        } catch (exc) {
          reject(exc);
        }
      } else {
        _injectMasterManifest().pipe(parser);
      }
    });
  }

  insertAdAt(offset, adMasterManifestUri, _injectAdMasterManifest, _injectAdMediaManifest, _injectAdAudioManifest) {
    return new Promise((resolve, reject) => {
      this._parseAdMasterManifest(
        adMasterManifestUri,
        _injectAdMasterManifest,
        _injectAdMediaManifest,
        _injectAdAudioManifest
      )
        .then((ad) => {
          const startOffset = offset;
          const isPostRoll = offset == -1;
          const bandwidths = Object.keys(this.playlists);
          let closestCmafMapUri = "";

          if (isPostRoll) {
            let duration = 0;
            this.playlists[bandwidths[0]].items.PlaylistItem.map((plItem) => {
              duration += plItem.get("duration") * 1000;
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
            closestCmafMapUri = this._getCmafMapUri(this.playlists[bw], this.masterManifestUri, this.baseUrl);

            while (pos < offset && i < this.playlists[bw].items.PlaylistItem.length) {
              const plItem = this.playlists[bw].items.PlaylistItem[i];
              if (plItem.attributes.attributes["map-uri"]) {
                closestCmafMapUri = this._getCmafMapUri(this.playlists[bw], this.masterManifestUri, this.baseUrl, i);
              }
              pos += plItem.get("duration") * 1000;
              i++;
            }
            let insertCueIn = false;
            if (this.playlists[bw].items.PlaylistItem[this.playlists[bw].items.PlaylistItem.length - 1].get("cuein")) {
              insertCueIn = true;
            }
            const adLength = adPlaylist.items.PlaylistItem.length;
            if (this.playlists[bw].items.PlaylistItem[0])
              for (let j = 0; j < adLength; j++) {
                this.playlists[bw].items.PlaylistItem.splice(i + j, 0, adPlaylist.items.PlaylistItem[j]);
              }
            this.playlists[bw].items.PlaylistItem[i].set("discontinuity", true);
            this.playlists[bw].items.PlaylistItem[i].set("cueout", ad.duration);
            if (insertCueIn) {
              this.playlists[bw].items.PlaylistItem[i].set("cuein", true);
            }
            if (this.playlists[bw].items.PlaylistItem[i + adLength]) {
              this.playlists[bw].items.PlaylistItem[i + adLength].set("cuein", true);
              if (!isPostRoll) {
                this.playlists[bw].items.PlaylistItem[i + adLength].set("discontinuity", true);
              }
              if (closestCmafMapUri) {
                this.playlists[bw].items.PlaylistItem[i + adLength].set("map-uri", closestCmafMapUri);
              }
            } else {
              this.playlists[bw].addPlaylistItem({ cuein: true });
            }
            this.playlists[bw].set("targetDuration", this.targetDuration);
          }
          const groups = Object.keys(this.playlistsAudio);
          const adGroups = Object.keys(ad.playlistAudio);
          if (groups.length > 0 && adGroups.length > 0) {
            if (isPostRoll) {
              let duration = 0;
              const langs = Object.keys(this.playlistsAudio[groups[0]]);
              this.playlistsAudio[groups[0]][langs[0]].items.PlaylistItem.map((plItem) => {
                duration += plItem.get("duration") * 1000;
              });
              offset = duration;
            } else {
              if (this.bumperDuration) {
                offset = this.bumperDuration + startOffset;
              }
            }
            for (let i = 0; i < groups.length; i++) {
              const g = groups[i];
              const langs = Object.keys(this.playlistsAudio[g]);
              for (let ii = 0; ii < langs.length; ii++) {
                const l = langs[ii];
                const playlist = this.playlistsAudio[g][l];
                const [nearestGroup, nearestLang] = findNearestGroupAndLang(g, l, ad.playlistAudio);
                const adPlaylist = ad.playlistAudio[nearestGroup][nearestLang];
                let pos = 0;
                let idx = 0;
                closestCmafMapUri = this._getCmafMapUri(playlist, this.masterManifestUri, this.baseUrl);

                while (pos < offset && idx < playlist.items.PlaylistItem.length) {
                  const plItem = playlist.items.PlaylistItem[idx];
                  if (plItem.attributes.attributes["map-uri"]) {
                    closestCmafMapUri = this._getCmafMapUri(playlist, this.masterManifestUri, this.baseUrl, i);
                  }
                  pos += plItem.get("duration") * 1000;
                  idx++;
                }
                let insertCueIn = false;
                if (playlist.items.PlaylistItem[playlist.items.PlaylistItem.length - 1].get("cuein")) {
                  insertCueIn = true;
                }
                const adLength = adPlaylist.items.PlaylistItem.length;
                for (let j = 0; j < adLength; j++) {
                  playlist.items.PlaylistItem.splice(idx + j, 0, adPlaylist.items.PlaylistItem[j]);
                }
                playlist.items.PlaylistItem[idx].set("discontinuity", true);
                playlist.items.PlaylistItem[idx].set("cueout", ad.durationAudio);
                if (insertCueIn) {
                  playlist.items.PlaylistItem[idx].set("cuein", true);
                }

                if (playlist.items.PlaylistItem[idx + adLength]) {
                  playlist.items.PlaylistItem[idx + adLength].set("cuein", true);
                  if (!isPostRoll) {
                    playlist.items.PlaylistItem[idx + adLength].set("discontinuity", true);
                  }
                  if (closestCmafMapUri) {
                    playlist.items.PlaylistItem[idx + adLength].set("map-uri", closestCmafMapUri);
                  }
                } else {
                  playlist.addPlaylistItem({ cuein: true });
                }
                playlist.set("targetDuration", this.targetDurationAudio);
              }
            }
          }
          resolve();
        })
        .catch(reject);
    });
  }

  insertInterstitialAt(offset, id, uri, isAssetList, opts) {
    return new Promise((resolve, reject) => {
      if (this.bumperDuration) {
        offset = this.bumperDuration + offset;
      }

      let extraAttrs = "";
      if (opts) {
        if (opts.resumeOffset !== undefined) {
          extraAttrs += `,X-RESUME-OFFSET=${opts.resumeOffset / 1000}`;
        }
        if (opts.playoutLimit !== undefined) {
          extraAttrs += `,X-PLAYOUT-LIMIT=${opts.playoutLimit / 1000}`;
        }
        if (opts.snap === "IN" || opts.snap === "OUT") {
          extraAttrs += `,X-SNAP="${opts.snap}"`;
        }
      }

      const bandwidths = Object.keys(this.playlists);
      for (let b = 0; b < bandwidths.length; b++) {
        const bw = bandwidths[b];
        let pos = 0;
        let i = 0;
        this.playlists[bw].items.PlaylistItem[0].set("date", new Date(1));
        while (pos < offset && i < this.playlists[bw].items.PlaylistItem.length) {
          const plItem = this.playlists[bw].items.PlaylistItem[i];
          pos += plItem.get("duration") * 1000;
          i++;
        }
        let startDate = new Date(1 + offset).toISOString();
        let durationTag = "";
        if (opts && opts.plannedDuration) {
          durationTag = `,DURATION=${opts.plannedDuration / 1000}`;
        }
        if (isAssetList) {
          this.playlists[bw].items.PlaylistItem[i].set(
            "daterange",
            `ID=${id},CLASS="com.apple.hls.interstitial",START-DATE="${startDate}"${durationTag},X-ASSET-LIST="${uri}"${extraAttrs}`
          );
        } else {
          this.playlists[bw].items.PlaylistItem[i].set(
            "daterange",
            `ID=${id},CLASS="com.apple.hls.interstitial",START-DATE="${startDate}"${durationTag},X-ASSET-URI="${uri}"${extraAttrs}`
          );
        }
      }
      const groups = Object.keys(this.playlistsAudio);
      for (let i = 0; i < groups.length; i++) {
        const group = groups[i];
        const langs = Object.keys(this.playlistsAudio[group]);
        for (let j = 0; j < langs.length; j++) {
          const lang = langs[j];
          let pos = 0;
          let idx = 0;
          this.playlistsAudio[group][lang].items.PlaylistItem[0].set("date", new Date(1));
          while (pos < offset && idx < this.playlistsAudio[group][lang].items.PlaylistItem.length) {
            const plItem = this.playlistsAudio[group][lang].items.PlaylistItem[idx];
            pos += plItem.get("duration") * 1000;
            idx++;
          }
          let startDate = new Date(1 + offset).toISOString();
          let durationTag = "";
          if (opts && opts.plannedDuration) {
            durationTag = `,DURATION=${opts.plannedDuration / 1000}`;
          }
          if (isAssetList) {
            this.playlistsAudio[group][lang].items.PlaylistItem[idx].set(
              "daterange",
              `ID=${id},CLASS="com.apple.hls.interstitial",START-DATE="${startDate}"${durationTag},X-ASSET-LIST="${uri}"${extraAttrs}`
            );
          } else {
            this.playlistsAudio[group][lang].items.PlaylistItem[idx].set(
              "daterange",
              `ID=${id},CLASS="com.apple.hls.interstitial",START-DATE="${startDate}"${durationTag},X-ASSET-URI="${uri}"${extraAttrs}`
            );
          }
        }
      }
      resolve();
    });
  }

  insertBumper(
    bumperMasterManifestUri,
    _injectBumperMasterManifest,
    _injectBumperMediaManifest,
    _injectBumperAudioManifest
  ) {
    return new Promise((resolve, reject) => {
      this._parseAdMasterManifest(
        bumperMasterManifestUri,
        _injectBumperMasterManifest,
        _injectBumperMediaManifest,
        _injectBumperAudioManifest
      )
        .then((bumper) => {
          const bandwidths = Object.keys(this.playlists);
          for (let b = 0; b < bandwidths.length; b++) {
            const bw = bandwidths[b];

            const bumperPlaylist = bumper.playlist[findNearestBw(bw, Object.keys(bumper.playlist))];
            const bumperLength = bumperPlaylist.items.PlaylistItem.length;
            this.bumperDuration = 0;
            for (let j = 0; j < bumperLength; j++) {
              this.playlists[bw].items.PlaylistItem.splice(j, 0, bumperPlaylist.items.PlaylistItem[j]);
              this.bumperDuration += bumperPlaylist.items.PlaylistItem[j].get("duration") * 1000;
            }
            this.playlists[bw].items.PlaylistItem[bumperLength].set("discontinuity", true);
            this.playlists[bw].set("targetDuration", this.targetDuration);
          }
          // for audio
          const groups = Object.keys(this.playlistsAudio);
          for (let i = 0; i < groups.length; i++) {
            const g = groups[i];
            const langs = Object.keys(this.playlistsAudio[g]);
            for (let ii = 0; ii < langs.length; ii++) {
              const l = langs[ii];

              const [nearestGroup, nearestLang] = findNearestGroupAndLang(g, l, bumper.playlistAudio);
              const bumperPlaylist = bumper.playlistAudio[nearestGroup][nearestLang];
              const bumperLength = bumperPlaylist.items.PlaylistItem.length;
              this.bumperDuration = 0;
              for (let j = 0; j < bumperLength; j++) {
                this.playlistsAudio[g][l].items.PlaylistItem.splice(j, 0, bumperPlaylist.items.PlaylistItem[j]);
                this.bumperDuration += bumperPlaylist.items.PlaylistItem[j].get("duration") * 1000;
              }
              this.playlistsAudio[g][l].items.PlaylistItem[bumperLength].set("discontinuity", true);
              this.playlistsAudio[g][l].set("targetDuration", this.targetDurationAudio);
            }
          }
          resolve();
        })
        .catch(reject);
    });
  }

  getMasterManifest() {
    return this.m3u.toString();
  }

  getMediaManifest(bw) {
    try {
      if (this.mergeBreaks) {
        let adBreakDuration = 0;
        let itemToUpdate = null;
        for (let i = 0; i < this.playlists[bw].items.PlaylistItem.length; i++) {
          if (
            this.playlists[bw].items.PlaylistItem[i].get("cueout") &&
            this.playlists[bw].items.PlaylistItem[i].get("cuein")
          ) {
            adBreakDuration += this.playlists[bw].items.PlaylistItem[i].get("cueout");
            this.playlists[bw].items.PlaylistItem[i].set("cueout", null);
            this.playlists[bw].items.PlaylistItem[i].set("cuein", false);
          } else if (
            this.playlists[bw].items.PlaylistItem[i].get("cueout") &&
            !this.playlists[bw].items.PlaylistItem[i].get("cuein")
          ) {
            adBreakDuration = 0;
            itemToUpdate = this.playlists[bw].items.PlaylistItem[i];
          } else if (
            !this.playlists[bw].items.PlaylistItem[i].get("cueout") &&
            this.playlists[bw].items.PlaylistItem[i].get("cuein")
          ) {
            const cueOut = itemToUpdate.get("cueout");
            itemToUpdate.set("cueout", cueOut + adBreakDuration);
          }
        }
      }
      this.playlists[bw].set("playlistType", "VOD"); // Ensure playlist type is VOD
      return this.playlists[bw].toString().replace(/^\s*\n/gm, "");
    } catch (err) {
      return new Error("Failed to get manifest. " + err);
    }
  }

  getAudioManifest(g, l) {
    try {
      if (this.mergeBreaks) {
        let adBreakDuration = 0;
        let itemToUpdate = null;
        for (let i = 0; i < this.playlistsAudio[g][l].items.PlaylistItem.length; i++) {
          if (
            this.playlistsAudio[g][l].items.PlaylistItem[i].get("cueout") &&
            this.playlistsAudio[g][l].items.PlaylistItem[i].get("cuein")
          ) {
            adBreakDuration += this.playlistsAudio[g][l].items.PlaylistItem[i].get("cueout");
            this.playlistsAudio[g][l].items.PlaylistItem[i].set("cueout", null);
            this.playlistsAudio[g][l].items.PlaylistItem[i].set("cuein", false);
          } else if (
            this.playlistsAudio[g][l].items.PlaylistItem[i].get("cueout") &&
            !this.playlistsAudio[g][l].items.PlaylistItem[i].get("cuein")
          ) {
            adBreakDuration = 0;
            itemToUpdate = this.playlistsAudio[g][l].items.PlaylistItem[i];
          } else if (
            !this.playlistsAudio[g][l].items.PlaylistItem[i].get("cueout") &&
            this.playlistsAudio[g][l].items.PlaylistItem[i].get("cuein")
          ) {
            const cueOut = itemToUpdate.get("cueout");
            itemToUpdate.set("cueout", cueOut + adBreakDuration);
          }
        }
      }
      this.playlistsAudio[g][l].set("playlistType", "VOD"); // Ensure playlist type is VOD
      return this.playlistsAudio[g][l].toString().replace(/^\s*\n/gm, "");
    } catch (err) {
      return new Error("Failed to get manifest. " + err);
    }
  }

  _loadMediaManifest(mediaManifestUri, bandwidth, _injectMediaManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on("m3u", (m3u) => {
        this.duration = 0;
        if (!this.playlists[bandwidth]) {
          this.playlists[bandwidth] = m3u;
        }
        if (this.baseUrl) {
          for (let i = 0; i < this.playlists[bandwidth].items.PlaylistItem.length; i++) {
            let plItem = this.playlists[bandwidth].items.PlaylistItem[i];
            let uri = plItem.get("uri");
            if (!uri.includes("http")) {
              plItem.set("uri", this.baseUrl + uri);
            }
            let map_uri = plItem.attributes.attributes["map-uri"];
            if (map_uri && !map_uri.includes("http")) {
              plItem.attributes.attributes["map-uri"] = 
              this.baseUrl + map_uri;
            }
          }
        }
        const targetDuration = this.playlists[bandwidth].get("targetDuration");
        if (targetDuration > this.targetDuration) {
          this.targetDuration = targetDuration;
        }
        this.playlists[bandwidth].set("targetDuration", this.targetDuration);
        const initSegUri = this._getCmafMapUri(m3u, mediaManifestUri, this.baseUrl);
        if (initSegUri) {
          if (!this.cmafMapUri.video[bandwidth]) {
            this.cmafMapUri.video[bandwidth] =
              this.baseUrl && !initSegUri.includes("http") ? this.baseUrl + initSegUri : initSegUri;
          }
        }
        resolve();
      });

      if (!_injectMediaManifest) {
        try {
          request({ uri: mediaManifestUri, gzip: true }).pipe(parser);
        } catch (exc) {
          reject(exc);
        }
      } else {
        _injectMediaManifest(bandwidth).pipe(parser);
      }
    });
  }

  _loadAudioManifest(audioManifestUri, group, lang, _injectAudioManifest) {
    return new Promise((resolve, reject) => {
      const parser = m3u8.createStream();

      parser.on("m3u", (m3u) => {
        this.duration = 0;
        if (!this.playlistsAudio[group]) {
          this.playlistsAudio[group] = {};
        }
        if (!this.playlistsAudio[group][lang]) {
          this.playlistsAudio[group][lang] = m3u;
        }

        if (this.baseUrl) {
          for (let i = 0; i < this.playlistsAudio[group][lang].items.PlaylistItem.length; i++) {
            let plItem = this.playlistsAudio[group][lang].items.PlaylistItem[i];
            let uri = plItem.get("uri");
            if (!uri.includes("http")) {
              plItem.set("uri", this.baseUrl + uri);
            }
            let map_uri = plItem.attributes.attributes["map-uri"];
            if (map_uri && !map_uri.includes("http")) {
              plItem.attributes.attributes["map-uri"] = 
              this.baseUrl + map_uri;
            }
          }
        }
        const targetDuration = this.playlistsAudio[group][lang].get("targetDuration");
        if (targetDuration > this.targetDurationAudio) {
          this.targetDurationAudio = targetDuration;
        }
        this.playlistsAudio[group][lang].set("targetDuration", this.targetDurationAudio);
        const initSegUri = this._getCmafMapUri(m3u, audioManifestUri, this.baseUrl);
        if (initSegUri) {
          if (!this.cmafMapUri.audio[group]) {
            this.cmafMapUri.audio[group] = {};
          }
          this.cmafMapUri.audio[group][lang] =
            this.baseUrl && !initSegUri.includes("http") ? this.baseUrl + initSegUri : initSegUri;
        }
        resolve();
      });

      if (!_injectAudioManifest) {
        try {
          request({ uri: audioManifestUri, gzip: true }).pipe(parser);
        } catch (exc) {
          reject(exc);
        }
      } else {
        _injectAudioManifest(group, lang).pipe(parser);
      }
    });
  }

  _parseAdMasterManifest(manifestUri, _injectAdMasterManifest, _injectAdMediaManifest, _injectAdAudioManifest) {
    return new Promise((resolve, reject) => {
      let ad = {};
      const parser = m3u8.createStream();
      parser.on("m3u", (m3u) => {
        let mediaManifestPromises = [];
        ad.master = m3u;
        ad.playlist = {};
        ad.playlistAudio = {};
        ad.baseUrl = null;
        const m = manifestUri.match(/^(.*)\/.*?$/);
        if (m) {
          ad.baseUrl = m[1] + "/";
        }
        for (let i = 0; i < m3u.items.StreamItem.length; i++) {
          const streamItem = m3u.items.StreamItem[i];
          const mediaManifestUrl = url.resolve(ad.baseUrl, streamItem.get("uri"));
          const p = new Promise((res, rej) => {
            const mediaManifestParser = m3u8.createStream();

            mediaManifestParser.on("m3u", (m3u) => {
              if (m3u.get("targetDuration") > this.targetDuration) {
                this.targetDuration = m3u.get("targetDuration");
              }
              ad.duration = 0;
              let baseUrl;
              const n = mediaManifestUrl.match("^(.*)/.*?");
              if (n) {
                baseUrl = n[1] + "/";
              }
              for (let j = 0; j < m3u.items.PlaylistItem.length; j++) {
                let plItem = m3u.items.PlaylistItem[j];
                const plUri = plItem.get("uri");
                if (!plUri.match("^http")) {
                  plItem.set("uri", url.resolve(baseUrl, plUri));
                }
                const plMapUri = plItem.attributes.attributes["map-uri"];
                if (plMapUri && !plMapUri.match(/^http/)) {
                  plItem.set("map-uri", url.resolve(baseUrl, plMapUri));
                }
                ad.duration += plItem.get("duration");
              }
              ad.playlist[streamItem.get("bandwidth")] = m3u;
              res();
            });
            mediaManifestParser.on("error", (err) => {
              rej(err);
            });

            if (!_injectAdMediaManifest) {
              try {
                request({ uri: mediaManifestUrl, gzip: true })
                  .on("error", (err) => {
                    rej(err);
                  })
                  .pipe(mediaManifestParser);
              } catch (err) {
                rej(err);
              }
            } else {
              _injectAdMediaManifest(streamItem.get("bandwidth")).pipe(mediaManifestParser);
            }
          });
          mediaManifestPromises.push(p);
        }
        let audioItems = m3u.items.MediaItem.filter((item) => {
          return item.attributes.attributes.type === "AUDIO";
        });
        for (let i = 0; i < audioItems.length; i++) {
          const audioItem = audioItems[i];
          const g = audioItem.get("group-id");
          const l = audioItem.attributes.attributes["language"];
          const audioManifestUrl = url.resolve(ad.baseUrl, audioItem.get("uri"));
          const p = new Promise((res, rej) => {
            const audioManifestParser = m3u8.createStream();

            audioManifestParser.on("m3u", (m3u) => {
              if (m3u.get("targetDuration") > this.targetDurationAudio) {
                this.targetDurationAudio = m3u.get("targetDuration");
              }
              ad.durationAudio = 0;
              let baseUrl;
              const n = audioManifestUrl.match("^(.*)/.*?");
              if (n) {
                baseUrl = n[1] + "/";
              }
              for (let j = 0; j < m3u.items.PlaylistItem.length; j++) {
                let plItem = m3u.items.PlaylistItem[j];
                const plUri = plItem.get("uri");
                if (!plUri.match("^http")) {
                  plItem.set("uri", url.resolve(baseUrl, plUri));
                }
                const plMapUri = plItem.attributes.attributes["map-uri"];
                if (plMapUri && !plMapUri.match(/^http/)) {
                  plItem.set("map-uri", url.resolve(baseUrl, plMapUri));
                }
                ad.durationAudio += plItem.get("duration");
              }

              if (!ad.playlistAudio[g]) {
                ad.playlistAudio[g] = {};
              }
              if (!ad.playlistAudio[g][l]) {
                ad.playlistAudio[g][l] = m3u;
              }
              res();
            });
            audioManifestParser.on("error", (err) => {
              rej(err);
            });
            if (!_injectAdAudioManifest) {
              try {
                request({ uri: audioManifestUrl, gzip: true })
                  .on("error", (err) => {
                    rej(err);
                  })
                  .pipe(audioManifestParser);
              } catch (err) {
                rej(err);
              }
            } else {
              _injectAdAudioManifest(g, l).pipe(audioManifestParser);
            }
          });
          mediaManifestPromises.push(p);
        }

        Promise.all(mediaManifestPromises).then(() => {
          resolve(ad);
        });
      });

      parser.on("error", (err) => {
        reject(err);
      });

      if (!_injectAdMasterManifest) {
        try {
          request({ uri: manifestUri, gzip: true })
            .on("error", (err) => {
              reject(err);
            })
            .pipe(parser);
        } catch (exc) {
          reject(exc);
        }
      } else {
        _injectAdMasterManifest().pipe(parser);
      }
    });
  }

  _getCmafMapUri(m3u, manifestUri, useAbsUrl, index = 0) {
    let initSegment = undefined;
    if (m3u.items.PlaylistItem[index].attributes.attributes["map-uri"]) {
      initSegment = m3u.items.PlaylistItem[index].attributes.attributes["map-uri"];
      if (!initSegment.match("^http") && useAbsUrl) {
        const n = manifestUri.match("^(.*)/.*?$");
        if (n) {
          initSegment = url.resolve(n[1] + "/", initSegment);
        }
      }
    }
    return initSegment;
  }
}

module.exports = HLSSpliceVod;
