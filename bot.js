require('dotenv').config();
const Twitter = require('twitter-lite');
const fetch = require('node-fetch');
const codec = require('./src/codec');

const handleRequest = async (requestTweet) => {
  //check for false positive
  if (!requestTweet.entities.user_mentions.find((mention => mention.screen_name == process.env.TWITTER_BOT_SCREEN_NAME))) {
    console.log(`caught false positive in "${requestTweet.text}"`);
    return false;
  }

  //find the target tweet
  let targetTweetId = requestTweet.in_reply_to_status_id_str;
  if (!targetTweetId) {
    console.log(`no target tweet`);
    return false;
  }

  //retrieve data for the target tweet
  const targetTweet = await client.get('statuses/show', {
    id: targetTweetId
  })
    .catch(err => console.log(err));
  if (!targetTweet) {
    console.log(`failed to retrieve terget tweet with id ${targetTweetId}`);
    return false;
  }

  //extract profile picture and text
  const text = targetTweet.text;
  const image = await fetch(targetTweet.user.profile_image_url)
    .then(response => { return response.buffer() })
    .catch(err => console.log(err));
  if (!image) {
    console.log(`cound not download image at ${targetTweet.user.profile_image_url}`);
    return false;
  }

  //make the codec image
  codec(image, text, false)
    .then(s => s.png().toFile('./images/out.png'))
    .catch(err => console.log(err));
}

const client = new Twitter({
  consumer_key: process.env.TWITTER_CONSUMER_KEY,
  consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
  access_token_key: process.env.TWITTER_ACCESS_TOKEN,
  access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
});

const stream = client.stream('statuses/filter', {
  track: process.env.TWITTER_TRACK_FILTER
})
  .on('start', response => console.log('start'))
  .on('data', tweet => {
    handleRequest(tweet);
  })
  .on('ping', () => console.log('ping'))
  .on('error', error => console.log('error', error))
  .on('end', response => console.log('end'));