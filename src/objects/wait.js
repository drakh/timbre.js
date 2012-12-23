(function(timbre) {
    "use strict";
    
    var timevalue = timbre.utils.timevalue;
    
    var TYPE_WAIT    = 0;
    var TYPE_TIMEOUT = 1;
    
    function Wait(_args) {
        timbre.Object.call(this, _args);
        timbre.fn.timer(this);
        timbre.fn.fixKR(this);
        
        this._.currentTime = 0;
        this._.currentTimeIncr = timbre.cellsize * 1000 / timbre.samplerate;
        
        this._.waitSamples = 0;
        this._.samples = 0;
        this._.isEnded = true;
        
        this.once("init", oninit);
    }
    timbre.fn.extend(Wait, timbre.Object);
    
    var oninit = function() {
        if (!this._.time) {
            this.time = 1000;
        }
        if (this._.originkey === "wait") {
            this._.type = TYPE_WAIT;
            timbre.fn.deferred(this);
        } else {
            this._.type = TYPE_TIMEOUT;
        }
    };
    
    var $ = Wait.prototype;
    
    Object.defineProperties($, {
        time: {
            set: function(value) {
                var _ = this._;
                if (typeof value === "string") {
                    value = timevalue(value);
                }
                if (typeof value === "number" && value >= 0) {
                    _.time = value;
                    _.waitSamples = (timbre.samplerate * (value * 0.001))|0;
                    _.samples = _.waitSamples;
                    _.isEnded = false;
                }
            },
            get: function() {
                return this._.time;
            }
        },
        currentTime: {
            get: function() {
                return this._.currentTime;
            }
        }
    });

    $.bang = function() {
        var _ = this._;
        if (_.type === TYPE_TIMEOUT) {
            _.samples     = _.waitSamples;
            _.currentTime = 0;
            _.isEnded     = false;
        }
        _.emit("bang");
        return this;
    };
    
    $.seq = function(seq_id) {
        var cell = this.cell;
        var _ = this._;
        
        if (this.seq_id !== seq_id) {
            this.seq_id = seq_id;
            
            if (!_.isEnded) {
                if (_.samples > 0) {
                    _.samples -= cell.length;
                }
                
                if (_.samples <= 0) {
                    var inputs = this.inputs;
                    for (var i = 0, imax = inputs.length; i < imax; ++i) {
                        inputs[i].bang();
                    }
                    timbre.fn.nextTick(onended.bind(this));
                }
                _.currentTime += _.currentTimeIncr;
            }
        }
        return cell;
    };
    
    var onended = function() {
        var _ = this._;
        _.isEnded = true;
        if (_.type === TYPE_WAIT && !this.isResolved) {
            _.waitSamples = Infinity;
            _.emit("ended");
            _.deferred.resolve();
            var stop = this.stop;
            this.start = this.stop = timbre.fn.nop;
            stop.call(this);
        } else {
            _.emit("ended");
        }
    };
    
    timbre.fn.register("wait", Wait);
    timbre.fn.alias("timeout", "wait");
    
})(timbre);
