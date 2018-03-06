/**
 * @class PingPong
 * @param {{}} params
 * @constructor
 */
var PingPong = function (params) {

    this.initialize(params);
};

function setThingspeakBusy() {
  setThingspeak(1);
}

function setThingspeakFree() {
  setThingspeak(0);
}

function setThingspeak(n) {
  var xhttp = new XMLHttpRequest();
  xhttp.open("GET", "https://api.thingspeak.com/update?api_key=1X5K66NJYYLPZAV8&field2=" + n, true);
  xhttp.send();
}

/**
 * Initialization
 * @param {{}} params
 */
PingPong.prototype.initialize = function (params) {

    this.el = params.el;

    /*******************/
    /*private variables*/
    /*******************/

    this.gameStarted = false;
    this.waitingReady = false;

    this.clickState = {};

    this.initialService = '';
    this.playerLeftScore = 20;
    this.playerRightScore = 20;

    this.clickCoolDown = 750;
    this.lastClickTimestamp = {};
    this.cancelHoldDelay = 1500;
    this.cancelTimeoutCheck = null;

    this.thingspeakDelay = 16000;

    this.clockStart = 0;
    this.clockInterval = null;

    /***********/
    /* runtime */
    /***********/

    this.initializeEvents();
    this.start();

    this.startClock();
};

/**
 * Bind events
 */
PingPong.prototype.initializeEvents = function () {

    $(document).on('contextmenu', function () {
        return false;
    });

    $(document).on('click', function (event) {

        event.preventDefault();
        event.stopPropagation();

        if (this.gameStarted) {

            var buttonId = event.which;

            /*check for cooldown*/

            if (
                typeof this.lastClickTimestamp[buttonId] === 'undefined'
                || ($.now() - this.lastClickTimestamp[buttonId]) > this.clickCoolDown
            ) {
                this.lastClickTimestamp[buttonId] = $.now();
                this.onClick(event);
            }
        }
    }.bind(this));

    $(document).on('mousedown', function (event) {

        var buttonId = event.which;
        this.clickState[buttonId] = true;

        if (this.waitingReady) {
            if (buttonId === 1) {
                this.el.find('#player-left-container').find('.ready').show();
            } else if (buttonId === 3) {
                this.el.find('#player-right-container').find('.ready').show();
            }

            if (this.clickState[1] === true && this.clickState[3] === true) {
                this.onStart();
            }
        } else if (this.gameStarted) {

            if (this.cancelTimeoutCheck !== null) {
                clearTimeout(this.cancelTimeoutCheck);
            }

            this.cancelTimeoutCheck = setTimeout(function () {

                if (this.clickState[buttonId] === true) {

                    this.lastClickTimestamp[buttonId] = $.now();
                    this.onLongClick(event);
                }

            }.bind(this), this.cancelHoldDelay);

        }

    }.bind(this));

    $(document).on('mouseup', function (event) {

        var buttonId = event.which;
        this.clickState[buttonId] = false;

        if (this.waitingReady) {
            if (buttonId === 1) {
                this.el.find('#player-left-container').find('.ready').hide();
            } else if (buttonId === 3) {
                this.el.find('#player-right-container').find('.ready').hide();
            }
        }

    }.bind(this));
};

PingPong.prototype.start = function () {

    this.gameStarted = false;

    this.initialService = '';
    this.currentService = '';
    this.playerLeftScore = 0;
    this.playerRightScore = 0;
    this.updateScore();

    this.clickState = {};
    this.waitingReady = true;
    this.el.find('#ready').show();


};

/**
 * Both players clicked "ready"
 */
PingPong.prototype.onStart = function () {

    this.waitingReady = false;
    this.el.find('.ready').hide();
    this.el.find('#ready').hide();

    if (this.thingspeakTimeout) {
      clearTimeout(this.thingspeakTimeout);
    }

    setThingspeakBusy();

    this.initialService = Math.round(Math.random()) === 1 ? 'left' : 'right';
    this.changeService(this.initialService);
    this.el.find('#service').show();

    this.gameStarted = true;
};

/**
 * start clock
 */
PingPong.prototype.startClock = function () {

  var hour = new Date().getHours();
  var minutes = new Date().getMinutes();
  if (minutes.toString().length == 1) {
            minutes = "0" + minutes;
        }

    this.el.find('[data-ui="time"]').html(hour + ':' + minutes);

    this.clockInterval = setInterval(function () {
        this.clockTick();
    }.bind(this), 1000);
};

/**
 * stop clock
 */
PingPong.prototype.stopClock = function () {
    //
    // clearInterval(this.clockInterval);
    // this.el.find('[data-ui="time"]').html('00:00');
};

/**
 * stop the clock
 */
PingPong.prototype.clockTick = function () {

  var hour = new Date().getHours();
  var minutes = new Date().getMinutes();
  if (minutes.toString().length == 1) {
            minutes = "0" + minutes;
        }

  this.el.find('[data-ui="time"]').html(hour + ':' + minutes);
};

/**
 * click detected
 * @param {{}} event
 */
PingPong.prototype.onClick = function (event) {

    switch (event.which) {

        case 1:
            this.addPoint('left');
            break;

        case 2:
            this.start();
            break;

        case 3:
            this.addPoint('right');
            break;
    }
};

/**
 * long click detected
 * @param {{}} event
 */
PingPong.prototype.onLongClick = function (event) {

    switch (event.which) {

        case 1:
            this.removePoint('left');
            break;

		/* case 2:
			this. */

        case 3:
            this.removePoint('right');
            break;
    }
};

/**
 * add point
 * @param {string} player
 */
PingPong.prototype.addPoint = function (player) {

    if (player === 'left') {
        this.playerLeftScore++;
    } else if (player === 'right') {
        this.playerRightScore++;
    } else {
        return;
    }

    this.updateScore();
};

/**
 * remove point
 * @param {string} player
 */
PingPong.prototype.removePoint = function (player) {

    if (player === 'left') {
        this.playerLeftScore = Math.max(this.playerLeftScore - 1, 0);
    } else if (player === 'right') {
        this.playerRightScore = Math.max(this.playerRightScore - 1, 0);
    } else {
        return;
    }

    this.updateScore();
};

PingPong.prototype.updateScore = function () {

    var maxPoints = 20;
    var maxTotalPoints = 2 * maxPoints;

    /*update points*/
    var totalPoints = this.playerLeftScore + this.playerRightScore;

    if (totalPoints >= maxTotalPoints) {

        if (this.playerLeftScore === this.playerRightScore) {
            this.el.find('[data-ui="player-left-score"]').html(maxPoints);
            this.el.find('[data-ui="player-right-score"]').html(maxPoints);
        } else {

            if (Math.abs(this.playerLeftScore - this.playerRightScore) >= 2) {
                if (this.playerLeftScore > this.playerRightScore) {
                    this.el.find('[data-ui="player-left-score"]').html(maxPoints + 1);
                } else {
                    this.el.find('[data-ui="player-right-score"]').html(maxPoints + 1);
                }
            } else {
                if (this.playerLeftScore > this.playerRightScore) {
                    this.el.find('[data-ui="player-left-score"]').html('ADV');
                    this.el.find('[data-ui="player-right-score"]').html(maxPoints);
                } else {
                    this.el.find('[data-ui="player-left-score"]').html(maxPoints);
                    this.el.find('[data-ui="player-right-score"]').html('ADV');
                }
            }
        }

    } else {
        this.el.find('[data-ui="player-left-score"]').html(this.playerLeftScore);
        this.el.find('[data-ui="player-right-score"]').html(this.playerRightScore);
    }

    if (
        (this.playerLeftScore >= maxPoints + 1 && (this.playerLeftScore - this.playerRightScore) >= 2)
        || (this.playerRightScore >= maxPoints + 1 && (this.playerRightScore - this.playerLeftScore) >= 2)
    ) {
        this.gameOver();
        return;
    }

    if (totalPoints >= maxTotalPoints) {

        if (totalPoints % 2 !== 0) {
            this.changeService(this.playerLeftScore > this.playerRightScore ? 'right' : 'left');
        }

    } else {

        if (this.playerLeftScore !== maxPoints && this.playerRightScore !== maxPoints && totalPoints !== 0 && totalPoints % 5 === 0) {
          this.changeService(this.currentService === 'left' ? 'right' : 'left');
        } else if (this.playerLeftScore === maxPoints) {
          this.changeService('right');
        } else if (this.playerRightScore === maxPoints) {
          this.changeService('left');
        }
    }
};

/**
 * game over
 */
PingPong.prototype.gameOver = function () {

    //this.stopClock();
    this.gameStarted = false;
    this.el.find('#service').hide();

    if (this.playerLeftScore > this.playerRightScore) {
        this.el.find('#player-left-container').find('.winner').show();
    } else {
        this.el.find('#player-right-container').find('.winner').show();
    }

    this.playSound('sounds/winner.wav');

    this.thingspeakTimeout = setTimeout(setThingspeakFree, this.thingspeakDelay);

    setTimeout(function () {
      this.el.find('.winner').hide();
      this.start();
    }.bind(this), 5000);
};

/**
 * change service
 * @param {string} side
 */
PingPong.prototype.changeService = function (side) {
    this.currentService = side;

    if (typeof playSound === 'undefined') {
        playSound = true;
    }

    var service = this.el.find('[data-ui="service"]');
    var servicePlayerLeftClass = 'service-player-left';
    var servicePlayerRightClass = 'service-player-right';

    var elementMoved = false;

    if (side === 'left') {

        if (service.hasClass(servicePlayerRightClass)) {
            service.removeClass(servicePlayerRightClass);
            elementMoved = true;
        }

        service.addClass(servicePlayerLeftClass);

    } else if (side === 'right') {

        if (service.hasClass(servicePlayerLeftClass)) {
            service.removeClass(servicePlayerLeftClass);
            elementMoved = true;
        }

        service.addClass(servicePlayerRightClass);
    }

    if (elementMoved && (this.playerLeftScore !== 0 || this.playerRightScore !== 0)) {
        this.playSound('sounds/change_service.wav');
    }
};

/**
 * this will play a sound
 *
 * @param {string} soundFile
 */
PingPong.prototype.playSound = function (soundFile) {

    var audioElement = this.el.find('.audioElement');
    if (audioElement.length === 0) {
        audioElement = $('<audio>');
        audioElement.addClass('audioElement').appendTo(this.el);
    }

    audioElement.attr('src', soundFile);
    audioElement[0].play();
};

/* jQuery wrapper */

$.fn.extend({
    pingPong: function (params) {

        if (typeof params !== 'object') {
            params = {};
        }

        window.addLeft = function (n) { p.playerLeftScore += n; p.updateScore(); }
        window.addRight = function (n) { p.playerRightScore += n; p.updateScore(); }

        params['el'] = $(this);
        var p = new PingPong(params);
        return p;
    }
});

// WHAT IS THIS DOING?
// $.ajax({
//   url: 'send-ajax-data.php',
// })
// .done(function(res) {
//   console.log(res);
// })
// .fail(function(err) {
//   console.log('Error: ' + err.status);
// });
