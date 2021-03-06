/*globals Twilio:false, callstats:false, CallstatsTwilio:false */
/*jshint unused:false*/

(function (global) {
  var CallstatsTwilioShim = function(callstats) {

    this.callStats = callstats;
    this.pcQueue = [];
    this.intialized = false;
    this.errQueue = [];

    var twilioErrorCodes = {
      createOfferAnswerErrorCode: 31000,
      getUserMediaErrorCode1: 31208,
      getUserMediaErrorCode2: 31201,
      iceFailureErrorCode: 31003
    };

    function sendCachedAddNewFabricEvents() {
      var pc;
      if(CallstatsTwilio.remoteUserID !== null && CallstatsTwilio.remoteUserID !== undefined && CallstatsTwilio.intialized) {
        while(CallstatsTwilio.pcQueue.length !== 0){
          pc = CallstatsTwilio.pcQueue.pop();
          CallstatsTwilio.callStats.addNewFabric(pc, CallstatsTwilio.remoteUserID, CallstatsTwilio.callStats.fabricUsage.multiplex, CallstatsTwilio.conferenceID, CallstatsTwilio.csCallback);
        }
      }
    }

    function sendCachedErrorEvents() {
      var err;
      if(CallstatsTwilio.conferenceID !== null && CallstatsTwilio.conferenceID !== undefined && CallstatsTwilio.intialized) {
        while(CallstatsTwilio.errQueue.length !== 0){
          err = CallstatsTwilio.errQueue.pop();
          sendErrorReport(err.errorType, err.errorMessage);
        }
      }
    }

    function sendCachedEvents() {
      sendCachedAddNewFabricEvents();
      sendCachedErrorEvents();
    }

    function sendErrorReport(errorType, errorMessage) {
      if(CallstatsTwilio.conferenceID !== null && CallstatsTwilio.conferenceID !== undefined) {
        CallstatsTwilio.callStats.reportError(null, CallstatsTwilio.conferenceID, errorType, errorMessage);
      } else {
        CallstatsTwilio.errQueue.push({errorType: errorType, errorMessage: errorMessage});
      }
    }

    // We dont have pc in the error callback. So what to do in this situation????
    function handleError(error) {
      if (error.code === twilioErrorCodes.createOfferAnswerErrorCode) {
        if (error.message.includes("offer")){
          sendErrorReport(CallstatsTwilio.callStats.webRTCFunctions.createOffer, error.message);
        } else if (error.message.includes("answer")) {
          sendErrorReport(CallstatsTwilio.callStats.webRTCFunctions.createAnswer, error.message);
        } else {
          sendErrorReport(CallstatsTwilio.callStats.webRTCFunctions.signalingError, error.message);
        }
      } else if (error.code === twilioErrorCodes.getUserMediaErrorCode1 || error.code === twilioErrorCodes.getUserMediaErrorCode2) {
        sendErrorReport(CallstatsTwilio.callStats.webRTCFunctions.getUserMedia, error.message);
      } else if (error.code === twilioErrorCodes.iceFailureErrorCode) {
        sendErrorReport(CallstatsTwilio.callStats.webRTCFunctions.iceConnectionFailure, error.message);
      }
    }

    function initializeTwilioDevice(twilioDevice) {
      twilioDevice.error(function(error) {
        handleError(error);
      });

      twilioDevice.connect(function(conn) {
        if(CallstatsTwilio.remoteUserID !== null && CallstatsTwilio.remoteUserID !== undefined) {
          CallstatsTwilio.callStats.addNewFabric(conn.mediaStream.version.pc, CallstatsTwilio.remoteUserID, CallstatsTwilio.callStats.fabricUsage.multiplex, CallstatsTwilio.conferenceID, CallstatsTwilio.csCallback);
        } else {
          console.log("[Error] remoteUserID is null")
        }
      });
    }

    CallstatsTwilioShim.prototype.setLocalUserID = function setLocalUserID(localUserID) {
      this.localUserID = localUserID;
    };

    CallstatsTwilioShim.prototype.initialize = function initialize(appID, appSecret, localUserID, params,
      csInitCallback, csCallback, twilioDevice) {
      this.callstatsAppID = appID;
      this.callstatsAppSecret = appSecret;
      this.localUserID = localUserID;
      this.csInitCallback = csInitCallback;
      this.csCallback = csCallback;
      this.callStats.initialize(appID, appSecret, localUserID, csInitCallback, csCallback, params);
      this.intialized = true;
      if (twilioDevice) {
        initializeTwilioDevice(twilioDevice);
      }
      sendCachedAddNewFabricEvents();
      return this.callStats;
    };

    CallstatsTwilioShim.prototype.setCallParams = function setRemoteUserID(remoteUserID, conferenceID) {
      this.remoteUserID = remoteUserID;
      this.conferenceID = conferenceID;
      sendCachedAddNewFabricEvents();
    };

    Twilio.Device.error(function(error) {
      handleError(error);
    });

    Twilio.Device.connect(function(conn) {
      if(CallstatsTwilio.remoteUserID !== null && CallstatsTwilio.remoteUserID !== undefined && CallstatsTwilio.intialized) {
        CallstatsTwilio.callStats.addNewFabric(conn.mediaStream.version.pc, CallstatsTwilio.remoteUserID, CallstatsTwilio.callStats.fabricUsage.multiplex, CallstatsTwilio.conferenceID, CallstatsTwilio.csCallback);
      } else {
        CallstatsTwilio.pcQueue.push(conn.mediaStream.version.pc);
      }
    });

    return this;
  };
  if (("function" === typeof define) && (define.amd)) { /* AMD support */
    define('callstats-twilio-client', ['callstats'], function(callstats) {
      global.CallstatsTwilio = new CallstatsTwilioShim(callstats);
      return  global.CallstatsTwilio;
    });
  } else { /* Browsers and Web Workers*/
    var callStats = new callstats();
    global.CallstatsTwilio = new CallstatsTwilioShim(callStats);
  }
}(this));
