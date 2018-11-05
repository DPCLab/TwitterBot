require('dotenv').config();
var Twit = require('twit');
var request = require("request");

var T = new Twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

function getTweetUrl(screenName, id) {
  return `https://twitter.com/${screenName}/status/${id}`;
}

function urlEncode(text) {
  return encodeURIComponent(text);
}

var stream = T.stream('statuses/filter', {
  track: ['@TrackTheTrolls']
});
stream.on('tweet', function (tweet) {
  var user_who_invoked = "@" + tweet.user.screen_name;

  if (tweet.in_reply_to_status_id != null && user_who_invoked != "@TrackTheTrolls" && tweet.in_reply_to_screen_name != "TrackTheTrolls") {
    // If the Tweet is a reply, get that tweet text and respond back with the API. Also, make sure not to set off an infinite loop.
    console.log(`Detected tweet from ${user_who_invoked}...`);
    T.get('statuses/show/:id', {
      id: tweet.in_reply_to_status_id_str
    }, function (err, data, response) {
      var text = data.text; // Get the text of the Tweet that was being responded to
      var user_who_posted = '@' + data.user.screen_name; // User who posted the original tweet

      request.get("https://ru.dpccdn.net/analyze/" + encodeURIComponent(text.replace(/\//g, "")), function (err, res, body) { // Run it through the API
        var master = JSON.parse(body).master;

        let masterPercent = (master * 100).toFixed(2) + "%";

        let sentences = [];

        // Sentence 0: link
        let s0 = `${user_who_invoked} 🔗 Analyzing ${getTweetUrl(data.user.screen_name, tweet.in_reply_to_status_id_str)}.`;
        sentences.push(s0);

        // Sentence 1: exclamation
        let s1 = "";
        if (master > 0.5) {
          s1 = `🚨 Whoah! This tweet uses language specifically popular among Russian government trolls (${masterPercent}).`;
        } else if (master > 0.3) {
          s1 = `😬 Hmm... This tweet uses some language specifically popular among Russian government trolls (${masterPercent}).`;
        } else if (master > 0.1) {
          s1 = `🤨 Eh. This tweet only slightly uses language specifically popular among Russian government trolls (${masterPercent}).`;
        } else if (master > -0.1) {
          s1 = `😑 I'm not sure. This tweet leans towards neither Russian government trolls nor organic content (${masterPercent}).`;
        } else {
          s1 = `🕊️ Organic! This tweet uses language specifically unpopular among Russian government trolls (${masterPercent}).`;
        }
        sentences.push(s1);

        // Sentence 2: link
        let s2 = `🕵️ For a full analysis of this tweet and the disclaimer, check out https://dpclab.org/russia/troll-explorer/?text=${urlEncode(text)}`;
        sentences.push(s2);

        // Sentence 3: disclaimer
        let s3 = `ℹ️ I'm a bot and use a machine learning model.`;
        sentences.push(s3);

        let finalText = sentences.join("\n\n");

        T.post('statuses/update', {
          // Respond to user
          status: finalText,
          in_reply_to_status_id: tweet.id_str
        });
      });
    });
  }
});