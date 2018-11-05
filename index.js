require('dotenv').config();
var Twit = require('twit');
var request = require("request");

var T = new Twit({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token: process.env.ACCESS_TOKEN,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET
});

var stream = T.stream('statuses/filter', { track: ['@TrackTheTrolls'] });
stream.on('tweet', function (tweet) {
  var user_who_invoked = "@" + tweet.user.screen_name;

  if(tweet.in_reply_to_status_id != null && user_who_invoked != "@TrackTheTrolls" && tweet.in_reply_to_screen_name != "TrackTheTrolls"){ //If the Tweet is a reply, get that tweet text and respond back with the API. Also, make sure not to set off an infinite loop.
    console.log("NEW TWEET");

    T.get('statuses/show/:id', {id: tweet.in_reply_to_status_id_str}, function(err, data, response) {
      var text = data.text; //Get the text of the Tweet that was being responded to
      var user_who_posted = "@" + data.user.screen_name; //User who posted the original tweet

      request.get("https://ru.dpccdn.net/analyze/" + encodeURIComponent(text.replace(/\//g, "")), function(err, res, body){ //Run it through the API
        var result_str = user_who_invoked + " The Tweet (https://twitter.com/" + data.user.screen_name + "/status/" + data.id_str + ") ";
        var master = JSON.parse(body).master;

        if(master > 0.5) result_str += "is significantly more troll-like than organic";
        else if(master > 0) result_str += "is more troll-like than organic";
        else if(master == 0) result_str += "is equally troll-like and organic";
        else if(master >= -0.5) result_str += "is more organic than troll-like";
        else if(master >= -1) result_str += "is significantly more organic than troll-like";
        result_str += " (" + (master * 100).toFixed(2) + "%). More information available at https://dpclab.org/russia/";

        console.log(result_str);

        //.bold()
        T.post('statuses/update', { //Respond to user
          status: result_str,
          in_reply_to_status_id: tweet.id_str
        });
      });
    });
  }
});
