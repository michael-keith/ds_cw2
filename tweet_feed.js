/////////////////////////////////////////////////
//MySQL setup
/////////////////////////////////////////////////
var mysql = require('mysql');
var pool  = mysql.createPool({
  connectionLimit : 200,
  waitForConnections : false,
  host            : '$HOST',
  user            : '$USER',
  password        : '$PASS',
  database	  : '$DB',
  charset         : 'utf8mb4'
});

///////////////////////////////////////////////
//Twitter Setup
///////////////////////////////////////////////
var Twitter = require('twitter');

var client = new Twitter({
  consumer_key: '$TWITTER_CONSUMER_KEY',
  consumer_secret: '$TWITTER_CONSUMER)SECRET',
  access_token_key: '$TWITTER_ACCESS_TOKEN',
  access_token_secret: '$TWITTER_ACCESS_TOKEN_SECRET'
});

//Stall checker
var time;
setInterval(function(){
  
  if( (Math.floor(Date.now() / 1000) - time) > 60000 ) {
    client.stream.destroy;
    process.exit();
  }
  
  console.log(Math.floor(Date.now() / 1000) - time);
  
}, 30000);

/////////////////////////////////////////////////
//Twitter Stream
/////////////////////////////////////////////////

client.stream('statuses/filter', {track: 'pmqs'}, function(stream) {
  stream.on('data', function(tweet) {
    
    add_tweet(tweet);
    time = Math.floor(Date.now() / 1000);
  });
  
  stream.on('error', function(error) {
    throw error;
    console.log(error);
  });
});

/////////////////////////////////////////////////
//Add tweet to DB
/////////////////////////////////////////////////

function add_tweet(tweet) {

  text = tweet.text;
  if(tweet.truncated){ text = tweet.extended_tweet.full_text;}

  tweet_id = tweet.id_str;
  source = tweet.source;
  date = convert_date(tweet.created_at);
  user_id = tweet.user.id_str;
  name = tweet.user.name;
  screen_name = tweet.user.screen_name;
  location = tweet.user.location;
  verified = tweet.user.verified;
  followers = tweet.user.followers_count;
  following = tweet.user.friends_count;
  tweets = tweet.user.statuses;
  lang = tweet.user.lang;
  picture = tweet.user.profile_image_url_https;
  default_profile = tweet.user.default_profile;
  default_profile_image = tweet.user.default_profile_image;
  
  quoted_text = null;
  quoted_screen_name = null;
  quoted_tweet_id = null;
  
  if(tweet.retweeted_status) {
    type = "RETWEET";
    
    if(tweet.retweeted_status.truncated){ text = tweet.retweeted_status.extended_tweet.full_text;}
    
    orig_poster_screen_name = tweet.retweeted_status.user.screen_name;
    orig_id = tweet.retweeted_status.id_str;
    orig_date = convert_date(tweet.retweeted_status.created_at);

    in_reply_to_id = null;
    in_reply_screen_name = null; 
    
    if(tweet.quoted_status) {

	quoted_text = tweet.quoted_status.text;
	if(tweet.quoted_status.truncated){ quoted_text = tweet.quoted_status.extended_tweet.full_text;}

	quoted_screen_name = tweet.quoted_status.user.screen_name;

	quoted_tweet_id = tweet.quoted_status_id_str;
    }

  }
  else if (tweet.in_reply_to_screen_name) {
    type = "REPLY";
    in_reply_to_id = tweet.in_reply_to_status_id_str;
    in_reply_screen_name = tweet.in_reply_to_screen_name; 

    orig_poster_screen_name = null;
    orig_id = null;
    orig_date = null;
    
  }
  else {
    type = "TWEET";

    orig_poster_screen_name = null;
    orig_id = null;
    orig_date = null;
    in_reply_to_id = null;
    in_reply_screen_name = null; 
    
  }

  console.log("----------------------------------------");
  console.log(type +  " : " + screen_name + " : " + text + " -- " + tweet_id )

    var sql = "INSERT INTO tweets(type, tweet_id, text, source, date, in_reply_to_id, in_reply_to_screen_name, user_id, name, screen_name, location, verified, followers, following, tweets, lang, orig_poster, orig_id, orig_date, picture, default_profile, default_profile_image, quoted_text, quoted_screen_name, quoted_tweet_id) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
    var inserts = [
      type,
      tweet_id,
      text,
      source,
      date, 
      in_reply_to_id,
      in_reply_screen_name,
      user_id,
      name, 
      screen_name,
      location,
      verified,
      followers,
      following,
      tweets,
      lang,
      orig_poster_screen_name,
      orig_id,
      orig_date,
      picture,
      default_profile,
      default_profile_image,
      quoted_text,
      quoted_screen_name,
      quoted_tweet_id
    ];
  
    sql = mysql.format(sql, inserts);
  
    pool.getConnection(function(err, connection) {
  
        connection.query( sql, function(err, rows) {
      	if (err) {throw err;}
  
        connection.release();
  
        });
      });

}

//////////////////////////////////////////////////////
//Helpers
//////////////////////////////////////////////////////

//Convert a date string to timestamp
function convert_date(date_string) {
  if(date_string) {
    ts = new Date(Date.parse(date_string.replace(/( \+)/, ' UTC$1')));
    return ts.getTime() / 1000
  }
}
