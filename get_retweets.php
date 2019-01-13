<?php

//Script requires this Twitter oAuth library: https://github.com/abraham/twitteroauth

require "vendor/autoload.php";

use Abraham\TwitterOAuth\TwitterOAuth;

//Twitter creds
$consumer_key = $CONSUMER_KEY;
$consumer_secret = $CONSUMER_SECRET;
$access_token = $ACCESS_TOKEN;
$access_token_secret = $ACCESS_TOKEN_SECRET;

//Establish the API conn
$connection = new TwitterOAuth(
	$consumer_key,
	$consumer_secret,
	$access_token,
	$access_token_secret);

//Connect to DB
$db = new PDO('mysql:host=localhost;dbname=$DB;charset=utf8mb4', $USER, $PASS);
$db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$db->setAttribute(PDO::ATTR_EMULATE_PREPARES, false);

while(true) {

    //Get a list of ids
    $stmt = $db->prepare('SELECT tweet_id FROM tweets WHERE checked IS NULL LIMIT 100');
		$stmt->execute();
    $tweet_ids = $stmt->fetchAll(PDO::FETCH_NUM);

    //Create ID string for the request to the API
		$ids = "";
		foreach($tweet_ids as $id) {
			$ids = $ids . $id[0] . ",";

      //Need to set a checked flag in order to prevent searching the same id multiple times
			$stmt = $db->prepare('UPDATE tweets SET checked = 1 WHERE tweet_id = ?');
			$stmt->execute(array(
				$id[0]
			));

		}

    //Make the request to the API
		$tweets = $connection->get("statuses/lookup", [ "id" => $ids ]);

		foreach($tweets as $tweet) {

			if($tweet->id_str) {
				$retweets = $tweet->retweet_count;
				$likes = $tweet->favorite_count;
				$deleted = 0;
			}
			else {$deleted = 1;}

			echo $tweet->id_str . ": " . $retweets . " : " . $likes . " - " . $deleted . "\n";

			$stmt = $db->prepare('UPDATE tweets SET retweets = ?, likes = ?, deleted = ? WHERE tweet_id = ?');
			$stmt->execute(array(
				$retweets,
				$likes,
				$deleted,
				$tweet->id_str
			));

		}

		echo "Next Round\n";
		sleep(1); //Added to prevent rate limiting, but in reality the time taken to insert the rows into the DB exceeds the necessary wait time.

}
