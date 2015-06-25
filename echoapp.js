/**
 * This sample shows how to interact with a Particle device using the Particle Cloud and Alexa AppKit.
 */


//needed for making requests to Particle Cloud API
var http = require('https');


var deviceID = "YOUR PARTICLE DEVICE ID";
var particleToken = "YOUR ACCESS TOKEN";

// Route the incoming request based on type (LaunchRequest, IntentRequest,
// etc.) The JSON body of the request is provided in the event parameter.
exports.handler = function (event, context) {
    try {
        console.log("event.session.application.applicationId=" + event.session.application.applicationId);

        /**
         * Uncomment this if statement and replace application.id with yours
         * to prevent other voice applications from using this function.
         */
        /*
        if (event.session.application.applicationId !== "amzn1.echo-sdk-ams.app.[unique-value-here]") {
            context.fail("Invalid Application ID");
        }
        */

        if (event.session.new) {
            onSessionStarted({requestId: event.request.requestId}, event.session);
        }

        if (event.request.type === "LaunchRequest") {
            onLaunch(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                        context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        }  else if (event.request.type === "IntentRequest") {
            onIntent(event.request,
                     event.session,
                     function callback(sessionAttributes, speechletResponse) {
                         context.succeed(buildResponse(sessionAttributes, speechletResponse));
                     });
        } else if (event.request.type === "SessionEndedRequest") {
            onSessionEnded(event.request, event.session);

            context.succeed();
        }
    } catch (e) {
        context.fail("Exception: " + e);
    }
};

/**
 * Called when the session starts.
 */
function onSessionStarted(sessionStartedRequest, session) {
    console.log("onSessionStarted requestId=" + sessionStartedRequest.requestId
                + ", sessionId=" + session.sessionId);
}

/**
 * Called when the user launches the app without specifying what they want.
 */
function onLaunch(launchRequest, session, callback) {
    console.log("onLaunch requestId=" + launchRequest.requestId
                + ", sessionId=" + session.sessionId);

    //Have Alexa say a welcome message
    getWelcomeResponse(callback);
}

/** 
 * Called when the user specifies an intent for this application.
 */
function onIntent(intentRequest, session, callback) {
    console.log("onIntent requestId=" + intentRequest.requestId
                + ", sessionId=" + session.sessionId);

    var intent = intentRequest.intent,
        intentName = intentRequest.intent.name;

    //Here you check what the user has asked for
    //based on Intents defined in the Interaction Model of
    //your Echo app
    if ("AskTempIntent" === intentName) {
        AskTempSession(intent, session, callback);
    } else if ("ControlPinIntent" === intentName) {
        SetPinSession(intent, session, callback);
    } else {
        throw "Invalid intent";
    }
}

/**
 * Called when the user ends the session.
 * Is not called when the app returns shouldEndSession=true.
 */
function onSessionEnded(sessionEndedRequest, session) {
    console.log("onSessionEnded requestId=" + sessionEndedRequest.requestId
                + ", sessionId=" + session.sessionId);
    // Add cleanup logic here
}

/**
 * Helpers that build all of the responses.
 */
function buildSpeechletResponse(title, output, repromptText, shouldEndSession) {
    return {
        outputSpeech: {
            type: "PlainText",
            text: output
        },
        card: {
            type: "Simple",
            title: "SessionSpeechlet - " + title,
            content: "SessionSpeechlet - " + output
        },
        reprompt: {
            outputSpeech: {
                type: "PlainText",
                text: repromptText
            }
        },
        shouldEndSession: shouldEndSession
    }
}

function buildResponse(sessionAttributes, speechletResponse) {
    return {
        version: "1.0",
        sessionAttributes: sessionAttributes,
        response: speechletResponse
    }
}

/** 
 * Functions that control the app's behavior.
 */
function getWelcomeResponse(callback) {
    // If we wanted to initialize the session to have some attributes we could add those here.
    var sessionAttributes = {};
    var cardTitle = "Welcome";
    var speechOutput = "Hi, I am Alexa and I can control IoT devices like the Particle, "
                + "Please tell me what you want to do with your Particle";
    // If the user either does not reply to the welcome message or says something that is not
    // understood, they will be prompted again with this text.
    var repromptText = "Please tell me what you want to do with your Particle";
    var shouldEndSession = false;

    callback(sessionAttributes,
             buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
}

/**
 * Sets the digital pin state of the Particle and prepares the speech to reply to the user.
 */
function SetPinSession(intent, session, callback) {
    var cardTitle = intent.name;
    var Pin = intent.slots.Pin;
    var repromptText = "";
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";

    //Check if user has specified the Pin status to HIGH or LOW
    if (Pin) {
        var PinStatus = Pin.value;
        //small workaround since sometimes one arrives as one and not 1
        if(Pin.value == 'one' || Pin.value=='1' || Pin.value==1)
            PinStatus = 1;
        console.log(PinStatus);
        //set the status {0,1} of the Pin through the Particle Cloud
        var data = 'args='+PinStatus;
        var options = {
            host: 'api.particle.io',
            port: 443,
            path: '/v1/devices/'+deviceID+'/relay',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': 'Bearer '+particleToken,
                'Content-Length': Buffer.byteLength(data)
            }
        };

        console.log('making the request');
        
        var req = http.request(options, function(res) {
            res.setEncoding('utf8');
            res.on('data', function (chunk) {
                console.log("body: " + chunk);
                speechOutput = "I have set the pin status to: "+PinStatus+ ". That's all for now, goodbye";
                shouldEndSession = true;
                callback(sessionAttributes, buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));
            });
            
            res.on('error', function (chunk) {
                console.log('Error: '+chunk);
            });
        });

        req.on('error', function(e){console.log('error: '+e)});
        req.write(data);
        req.end();
        
        
    } else {
        speechOutput = "I'm not sure I know what the pin is, please try again";
        repromptText = "I'm not sure what the pin is, please try again";
        callback(sessionAttributes, 
             buildSpeechletResponse(cardTitle, speechOutput, repromptText, shouldEndSession));

    }

}


function AskTempSession(intent, session, callback) {
    var cardTitle = intent.name;
    var temperature;
    var repromptText = null;
    var sessionAttributes = {};
    var shouldEndSession = false;
    var speechOutput = "";

    //Get the temperature variable from Particle Cloud
    http.get('https://api.particle.io/v1/devices/'+deviceID+'/temperature?access_token='+particleToken, function(res) {
            var body = '';
             res.on('data', function(d) {
                body += d;
                console.log('server says: '+body);
                //parse the JSON to extract the temperature value:
                var output = JSON.parse(body);
                temperature = Math.round(output.result*100)/100;
                speechOutput = "The temperature from the Particle sensor is: "+temperature+" celcius. Bye for now.";
                //send that message to Echo and end the session:
                shouldEndSession = true;
                callback(sessionAttributes,buildSpeechletResponse(intent.name, speechOutput, repromptText, shouldEndSession));
            });
    });

}