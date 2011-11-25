HOST = null; // localhost
PORT = 80;

// when the daemon started
var starttime = (new Date()).getTime();

var mem = process.memoryUsage();
// every 10 seconds poll for the memory.
setInterval(function () {
  mem = process.memoryUsage();
}, 10*1000);


var fu = require("./fu"),
    sys = require("sys"),
    url = require("url"),
    qs = require("querystring"),
 	express = require('express'),
	twitter = require('twitter'),
	OAuth = require('oauth').OAuth;

var TwitterConfig = {
	consumer_key: "",
	consumer_secret: ""
}
	
var oa_twitter = new OAuth(
	"https://api.twitter.com/oauth/request_token",
	"https://api.twitter.com/oauth/access_token",
	TwitterConfig.consumer_key,
	TwitterConfig.consumer_secret,
	"1.0",
	"http://localhost/oauth/twitter_callback",
	"HMAC-SHA1"
);

var MESSAGE_BACKLOG = 200,
    SESSION_TIMEOUT = 60 * 1000;

var channel = new function () {
  var messages = [],
      callbacks = [];

  this.appendMessage = function (nick, type, text) {
    var m = { nick: nick
            , type: type // "msg", "join", "part"
            , text: text
            , timestamp: (new Date()).getTime()
            };

    switch (type) {
      case "msg":
        sys.puts("<" + nick + "> " + text);
        break;
      case "join":
        sys.puts(nick + " join");
        break;
      case "part":
        sys.puts(nick + " part");
        break;
    }

    messages.push( m );

    while (callbacks.length > 0) {
      callbacks.shift().callback([m]);
    }

    while (messages.length > MESSAGE_BACKLOG)
      messages.shift();
  };

  this.query = function (since, callback) {
    var matching = [];
    for (var i = 0; i < messages.length; i++) {
      var message = messages[i];
      if (message.timestamp > since)
        matching.push(message)
    }

    if (matching.length != 0) {
      callback(matching);
    } else {
      callbacks.push({ timestamp: new Date(), callback: callback });
    }
  };

  // clear old callbacks
  // they can hang around for at most 30 seconds.
  setInterval(function () {
    var now = new Date();
    while (callbacks.length > 0 && now - callbacks[0].timestamp > 30*1000) {
      callbacks.shift().callback([]);
    }
  }, 3000);
};

var sessions = {};

function createSession (nick) {
  if (nick.length > 50) return null;
  if (/[^\w_\-^!]/.exec(nick)) return null;

  for (var i in sessions) {
    var session = sessions[i];
    if (session && session.nick === nick) return null;
  }

  var session = { 
    nick: nick, 
    id: Math.floor(Math.random()*99999999999).toString(),
    timestamp: new Date(),

    poke: function () {
      session.timestamp = new Date();
    },

    destroy: function () {
      channel.appendMessage(session.nick, "part");
      delete sessions[session.id];
    }
  };

  sessions[session.id] = session;
  return session;
}

// interval to kill off old sessions
setInterval(function () {
  var now = new Date();
  for (var id in sessions) {
    if (!sessions.hasOwnProperty(id)) continue;
    var session = sessions[id];

    if (now - session.timestamp > SESSION_TIMEOUT) {
      session.destroy();
    }
  }
}, 1000);

fu.listen(Number(process.env.PORT || PORT), HOST);

fu.get("/", fu.staticHandler("index.html"));
fu.get("/style.css", fu.staticHandler("style.css"));
fu.get("/client.js", fu.staticHandler("client.js"));
fu.get("/jquery-1.2.6.min.js", fu.staticHandler("jquery-1.2.6.min.js"));


fu.get("/who", function (req, res) {
  var nicks = [];
  for (var id in sessions) {
    if (!sessions.hasOwnProperty(id)) continue;
    var session = sessions[id];
    nicks.push(session.nick);
  }
  res.simpleJSON(200, { nicks: nicks
                      , rss: mem.rss
                      });
});

fu.get("/join", function (req, res) {

  // Se conecto via twitter
  if(express.session && express.session.oauth && express.session.oauth.access_token) {
	var twit = new twitter({
	    consumer_key: TwitterConfig.consumer_key,
	    consumer_secret: TwitterConfig.consumer_secret,
	    access_token_key: express.session.oauth.access_token,
	    access_token_secret: express.session.oauth.access_token_secret
	});

	twit.verifyCredentials(function(data) {
		var nick = data.screen_name;
		if (nick == null || nick.length == 0) {
		   res.simpleJSON(400, {error: "Bad nick."});
		   return;
		 }

		var session = createSession(nick);
		if (session == null) {
		  res.simpleJSON(400, {error: "Nick in use"});
		  return;
		}

		channel.appendMessage(session.nick, "join");
		res.simpleJSON(200, { id: session.id
		                     , nick: session.nick
		                     , rss: mem.rss
		                     , starttime: starttime
		                     });
	});

  // Metodo normal de login
  } else {

	var nick = qs.parse(url.parse(req.url).query).nick;	
	
  	if (nick == null || nick.length == 0) {
	   res.simpleJSON(400, {error: "Bad nick."});
	   return;
	 }
	
	var session = createSession(nick);
	if (session == null) {
	  res.simpleJSON(400, {error: "Nick in use"});
	  return;
	}

	channel.appendMessage(session.nick, "join");
	res.simpleJSON(200, { id: session.id
	                     , nick: session.nick
	                     , rss: mem.rss
	                     , starttime: starttime
	                     });
  }

});

// Conectar con twitter
fu.get("/oauth/twitter", function (req, res) {
	oa_twitter.getOAuthRequestToken(function(error, oauth_token, oauth_token_secret, results){
		if (error) {
			console.log(error);
			res.send("Error :(")
		}
		else {
						
			// Necesito almacenar la session
			express.session.oauth = {}
			express.session.oauth.token = oauth_token;
			express.session.oauth.token_secret = oauth_token_secret;
			
			res.writeHead(302, {
			  'Location': 'https://twitter.com/oauth/authenticate?oauth_token=' + oauth_token
			});
			res.end();
			
		}
	});
});

// Recibir la respuesta de twitter
fu.get("/oauth/twitter_callback", function (req, res) {
		
	getVariables = qs.parse(url.parse(req.url).query);
	
	if (express.session.oauth) {

		express.session.oauth.verifier = getVariables.oauth_verifier;
		var oauth = express.session.oauth;		

		oa_twitter.getOAuthAccessToken(oauth.token,oauth.token_secret,oauth.verifier, 
		function(error, oauth_access_token, oauth_access_token_secret, results){
			if (error){
				console.log(error);
			} else {
				
				// Sessiones
				express.session.oauth.access_token = oauth_access_token;
				express.session.oauth.access_token_secret = oauth_access_token_secret;
				
				res.writeHead(302, {
				  'Location': 'http://localhost/?twitter=true'
				});
				res.end();
			}
		}
		);
	} else
		next(new Error("Oops, no te pases de listo!"))
	
});



fu.get("/part", function (req, res) {
  var id = qs.parse(url.parse(req.url).query).id;
  var session;
  if (id && sessions[id]) {
    session = sessions[id];
    session.destroy();
	express.session.oauth = {};
  }
  res.simpleJSON(200, { rss: mem.rss });
});

fu.get("/recv", function (req, res) {
  if (!qs.parse(url.parse(req.url).query).since) {
    res.simpleJSON(400, { error: "Must supply since parameter" });
    return;
  }
  var id = qs.parse(url.parse(req.url).query).id;
  var session;
  if (id && sessions[id]) {
    session = sessions[id];
    session.poke();
  }

  var since = parseInt(qs.parse(url.parse(req.url).query).since, 10);

  channel.query(since, function (messages) {
    if (session) session.poke();
    res.simpleJSON(200, { messages: messages, rss: mem.rss });
  });
});

fu.get("/send", function (req, res) {
  var id = qs.parse(url.parse(req.url).query).id;
  var text = qs.parse(url.parse(req.url).query).text;

  var session = sessions[id];
  if (!session || !text) {
    res.simpleJSON(400, { error: "No such session id" });
    return;
  }

  session.poke();

  channel.appendMessage(session.nick, "msg", text);

  // Debería enviar el mensaje a twitter
  if(express.session.oauth) {
		var twit = new twitter({
		    consumer_key: TwitterConfig.consumer_key,
		    consumer_secret: TwitterConfig.consumer_secret,
		    access_token_key: express.session.oauth.access_token,
		    access_token_secret: express.session.oauth.access_token_secret
		});
		try {
			twit.updateStatus(text, function(data) {				
			});
		} catch(e) {
			
		}
	}

  res.simpleJSON(200, { rss: mem.rss });
});
