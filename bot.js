require('dotenv').config();
const Twitter = require('twitter-lite');
const fetch = require('node-fetch');
const codec = require('./src/codec');

const newClient = (subdomain = 'api') => {
  return new Twitter({
    subdomain,
    consumer_key: process.env.TWITTER_CONSUMER_KEY,
    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
    access_token_key: process.env.TWITTER_ACCESS_TOKEN,
    access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET
  });
};

const handleRequest = async (requestTweet) => {
  console.log(`recieved request: ${process.env.TWITTER_TWEET_URL}${requestTweet.id_str}`);

  //check for false positive
  if (!requestTweet.entities.user_mentions.find((mention => mention.screen_name == process.env.TWITTER_BOT_SCREEN_NAME && mention.id_str == process.env.TWITTER_BOT_USER_ID_STR))) {
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
    id: targetTweetId,
    tweet_mode: 'extended'
  })
    .catch(err => console.log(err));
  if (!targetTweet) {
    console.log(`failed to retrieve terget tweet with id ${targetTweetId}`);
    return false;
  }

  //extract profile picture and text
  const text = targetTweet.full_text;
  const image = await fetch(targetTweet.user.profile_image_url)
    .then(response => { return response.buffer() })
    .catch(err => console.log(err));
  if (!image) {
    console.log(`could not download image at ${targetTweet.user.profile_image_url}`);
    return false;
  }

  //make the codec image
  let codecImg = await codec(image, text, false)
    .then(s => s.toBuffer().then(data => {
      return data.toString('base64');
    }))
    .catch(err => console.log(err));
  if (!codecImg) {
    console.log(`could not generate the codec image`);
    return false;
  }

  //upload the image
  const uploadClient = newClient('upload')
  const upload = await uploadClient.post('media/upload', {
    media_data: codecImg
  })
    .catch(err => { console.log(err) });
  if (!upload) {
    console.log(`could upload the codec image`);
    return false;
  }

  //post the tweet
  const responseTweet = await client.post("statuses/update", {
    status: '',
    in_reply_to_status_id: requestTweet.id_str,
    media_ids: upload.media_id_string
  })
    .catch(err => { console.log(err) });
  if (!responseTweet) {
    console.log(`failed to post reply tweet`);
    return false;
  }

  console.log(`posted reply: ${process.env.TWITTER_TWEET_URL}${responseTweet.id_str}`);
  return true;
}

const client = newClient();
const stream = client.stream('statuses/filter', {
  track: process.env.TWITTER_TRACK_FILTER,
})
  .on('start', response => console.log('start'))
  .on('data', tweet => {
    handleRequest(tweet)
      .catch(err => console.log(err));
  })
  .on('ping', () => console.log('ping'))
  .on('error', error => console.log('error', error))
  .on('end', response => console.log('end'));