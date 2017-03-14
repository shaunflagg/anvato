//Updated 12-06-2016

/**
 * Constructor for the strategy. This is what gets passed to the SDK via:
 * window['_cbv_strategies'].push(AnvatoStrategy);
 * @param {Object} player A pointer to the player being tracked. The player
 * is where all the video data is derived from
 */
function AnvatoStrategy(player) {
    this._player = player;

    this._isReady = false;
    this._currentState = AnvatoStrategy.VideoState.UNPLAYED;
    this._currentTime = 0;

    player.getThumbnail(function(r){
        console.log('bobo thumnail', r);
        this._thumbnailURL = r;
    });

    // Keep _currentTime up-to-date.
    var strategy = this;
    setInterval(function () {
        strategy._player.getCurrentTime(function(time) {
            strategy._currentTime = time;
        });
    }, 1);

    this.subscribeEvents();
}


/**
 * Set up the listener for player events.
 */
AnvatoStrategy.prototype.subscribeEvents = function() {
    var strategy = this;
    var that = this;
    var originalListener = this._player.listener;     // keep original listener
    
    this._player.setListener(generalListener);

    function generalListener(evt) {
        if (originalListener) {                      // run original listener first if it's not null
            originalListener(evt);
        }

    	if(!that._title){
    		that._player.getTitle(function(r){
				that._title = r;
			});
    	}
    	if(!that._duration){
    		that._player.getDuration(function(r){
				that._duration = r;
			});
    	}
        if(!that._thumbnailURL){
            that._player.getThumbnail(function(r){
                console.log('thumnail', r);
                that._thumbnailURL = r;
            });
        }
        switch (evt.name) {
            case 'METADATA_LOADED':
            case 'PROGRAM_CHANGED':
                strategy._updateMetadata(evt);
                break;
            case 'STATE_CHANGE':
                if (evt.args[0] == "videoPause") {
                    strategy._currentState = AnvatoStrategy.VideoState.STOPPED;
                } else if (evt.args[0] == "videoPlay") {
                    strategy._currentState = AnvatoStrategy.VideoState.PLAYED;
                }
                break;
            case 'PLAYING_START':
                // Only capture the time on the first play event.
                if (!strategy._viewStartTime) {
                    strategy._viewStartTime = Date.now();
                }
                break;
            case 'VIDEO_COMPLETED':
                strategy._currentState = AnvatoStrategy.VideoState.COMPLETED;
                break;
            case 'AD_STARTED':
                strategy._currentContentType = AnvatoStrategy.ContentType.AD;
                strategy._currentState = AnvatoStrategy.VideoState.PLAYED;
                break;
            case 'VIDEO_STARTED':
                strategy._currentContentType = AnvatoStrategy.ContentType.CONTENT;
                break;
            case 'FIRST_FRAME_READY':
                strategy._isReady = true;
                break;
            case 'CLIENT_BANDWIDTH': 
                strategy._clientBandwidth = evt.args[0];
                break;
            case 'AD_TIME_UPDATED': 
                strategy._currentContentType = AnvatoStrategy.ContentType.AD;
                break;
        }
    };
    
};




/**
 * Fetch and store the title and any other necessary video metadata.
 */
AnvatoStrategy.prototype._updateMetadata = function(evt) {
    var metadata = evt.args[0][2];

    this._title = metadata.title;
    this._duration = metadata.duration;
    this._thumbnailURL = metadata.thumbnail;
}


/**
 * Returns a short identifier for this strategy.
 * @return {string} A 2-3 character identifier.
 */
AnvatoStrategy.prototype.getStrategyName = function() {
    return "AN";
};


/**
 * Enum for the content type. One of these values should be returned from
 * the "getContentType" function.
 * @enum {string}
 */
AnvatoStrategy.ContentType = {
    AD: 'ad',
    CONTENT: 'ct'
};


/**
 * Enum for the ad position. One of these values should be returned from
 * the "getAdPosition" function.
 * @enum {string}
 */
AnvatoStrategy.AdPosition = {
    PREROLL: 'a1',
    MIDROLL: 'a2',
    POSTROLL: 'a3',
    OVERLAY: 'a4',
    SPECIAL: 'a5'
};


/**
 * Enum for the video state. One of these values should be returned from
 * the "getState" function.
 * @enum {string}
 */
AnvatoStrategy.VideoState = {
    UNPLAYED: 's1',
    PLAYED: 's2',
    STOPPED: 's3',
    COMPLETED: 's4'
};


/**
 * Enum for the autoplay state. One of thse values should be returns from the
 * "getAutoplayType" function.
 * @enum {string}
 */
AnvatoStrategy.AutoplayType = {
    UNKNOWN: 'unkn',
    MANUAL: 'man',
    AUTOPLAY: 'auto',
    CONTINUOUS: 'cont'
};


/**
 * Indicates if the video strategy is ready for pinging.
 * Typically this is called when all path and title metadata
 * is available
 * Note: Pings should only be sent after this reads true.
 * @return {boolean} The ready state of the strategy.
 */
AnvatoStrategy.prototype.isReady = function() {
    return this._isReady;
};


/**
 * Gets the human readable video title.
 * This is returned in the i key of the ping.
 * @return {string} The video title.
 */
AnvatoStrategy.prototype.getTitle = function() {
    if (this._title){
        return this._title;
    }
    var mc_title = this._player.mergedConfig.title;
    if (mc_title){
        this._title = mc_title;
        return mc_title;
    }
};


/**
 * Gets the video path.
 * This is returned in the p key of the ping.
 * Note: this should be the playable video path if available.
 * @return {string} The video path.
 */
AnvatoStrategy.prototype.getVideoPath = function() {
    // This is the video ID. It will work, but it would be nice if we could
    // provide a playable video path instead.
    return this._player.mergedConfig.video;
};


/**
 * Gets the type of video playing. Returns value from the ContentType enum.
 * This is returned in the _vt key of the ping.
 * @return {AnvatoStrategy.ContentType} The type of content (ad or ct).
 */
AnvatoStrategy.prototype.getContentType = function() {
    return this._currentContentType || AnvatoStrategy.ContentType.CONTENT;
};


/**
 * Gets the ad position. Returns value from the AdPosition enum.
 * This is returned in the _vap key of the ping.
 * @return {AnvatoStrategy.AdPosition|string} The ad position
 * from a1 (pre-roll), a2 (mid-roll), a3 (post-roll),
 * a4 (overlay), or a5 (special).
 */
AnvatoStrategy.prototype.getAdPosition = function() {};


/**
 * Gets the total duration of the video.
 * This is returned in the _vd key of the ping.
 * @return {number} The total duration time in milliseconds.
 */
AnvatoStrategy.prototype.getTotalDuration = function() {
    // If _duration is null, we need to return undefined rather than 0.
    return this._duration ? this._duration * 1000 : undefined;
};


/**
 * Gets the current state of the video. Returns value from the VideoState enum.
 * This is returned in the _vs key of the ping.
 * @return {string} The current video state. {@link AnvatoStrategy.VideoState}
 */
AnvatoStrategy.prototype.getState = function() {
    return this._currentState;
};


/**
 * Gets the current play time of the video (where the playhead is).
 * This is returned in the _vpt key of the ping.
 * @return {number} The current play time in milliseconds.
 */
AnvatoStrategy.prototype.getCurrentPlayTime = function() {
    return this._currentTime * 1000;
};


/**
 * Gets the current bitrate of the video.
 * This is returned in the _vbr key of the ping.
 * @return {number} The current bitrate in kbps.
 */
AnvatoStrategy.prototype.getBitrate = function() {
    return this._clientBandwidth;
};


/**
 * Gets the thumbnail of the video.
 * This is returned in the _vtn key of the ping.
 * @return {string} The [absolute] path to the thumbnail.
 */
AnvatoStrategy.prototype.getThumbnailPath = function() {
    return this._thumbnailURL || "";
};


/**
 * Gets the autoplay status of the player.
 * @return {string} The autoplay status. {@link AnvatoStrategy.AutoplayType}
 */
AnvatoStrategy.prototype.getAutoplayType = function() {
    return AnvatoStrategy.AutoplayType.UNKNOWN;
};


/**
 * Gets the video player type.
 * This is returned in the _vplt key of the ping.
 * @return {string} The player type (user defined).
 */
AnvatoStrategy.prototype.getPlayerType = function() {};


/**
 * Gets the time since start of viewing.
 * This is returned in the _vvs key of the ping.
 * @return {number} The time since viewing started in milliseconds.
 */
AnvatoStrategy.prototype.getViewStartTime = function() {
    return this._viewStartTime ? Date.now() - this._viewStartTime : 0;
};


/**
 * Gets the time since start of viewing for users in a play state -- regardless of current state.
 * This is returned in the _vvsp key of the ping.
 * @return {number} The time since viewing started in milliseconds.
 */
AnvatoStrategy.prototype.getViewPlayTime = function() {};


/**
 * Gets the time since play start for users who saw a preroll ad -- regardless of current state.
 * The timer continues after the ad completes as well.
 * This is returned in the _vasp key of the ping.
 * @return {number} The time since viewing started in milliseconds.
 */
AnvatoStrategy.prototype.getViewAdPlayTime = function() {};


/**
 * Verifies that the given player belongs to this strategy. Used for a
 * greedy search of the matching strategy for a given element or object.
 * @param {Object} player A pointer to the player being tracked.
 * @return {boolean} If the strategy can handle this type of object.
 */
AnvatoStrategy.verify = function(player) {
    try {
        return player.mergedConfig.baseURL.indexOf("up.anv.bz") >= 0;
    } catch(err) {
        return false;
    }
};

