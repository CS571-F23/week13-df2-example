
// You MUST have a file called "token.secret" in the same directory as this file!
// This should be the secret token found in https://dashboard.ngrok.com/
// Make sure it is on a single line with no spaces!
// It will NOT be committed.

// TO START
//   1. Open a terminal and run 'npm start'
//   2. Open another terminal and run 'npm run tunnel'
//   3. Copy/paste the ngrok HTTPS url into the DialogFlow fulfillment.
//
// Your changes to this file will be hot-reloaded!

import fetch from 'node-fetch';
import fs from 'fs';
import ngrok from 'ngrok';
import morgan from 'morgan';
import express from 'express';

// Read and register with secret ngrok token.
ngrok.authtoken(fs.readFileSync("token.secret").toString().trim());

// Start express on port 53705
const app = express();
const port = 53705;

// Accept JSON bodies and begin logging.
app.use(express.json());
app.use(morgan(':date ":method :url" :status - :response-time ms'));

// "Hello World" endpoint.
// You should be able to visit this in your browser
// at localhost:53705 or via the ngrok URL.
app.get('/', (req, res) => {
  res.status(200).send(JSON.stringify({
    msg: 'Express Server Works!'
  }))
})

// Dialogflow will POST a JSON body to /.
// We use an intent map to map the incoming intent to
// its appropriate async functions below.
// You can examine the request body via `req.body`
// See https://cloud.google.com/dialogflow/es/docs/fulfillment-webhook#webhook_request
app.post('/', (req, res) => {
  const intent = req.body.queryResult.intent.displayName;

  // A map of intent names to callback functions.
  // The "HelloWorld" is an example only -- you may delete it.
  const intentMap = {
    "HelloWorld": doHelloWorld,
    "TellJoke": tellJoke,
    "TellJoke - more": tellAnotherJoke
  }

  if (intent in intentMap) {
    // Call the appropriate callback function
    intentMap[intent](req, res);
  } else {
    // Uh oh! We don't know what to do with this intent.
    // There is likely something wrong with your code.
    // Double-check your names.
    console.error(`Could not find ${intent} in intent map!`)
    res.status(404).send(JSON.stringify({ msg: "Not found!" }));
  }
})

// Open for business!
app.listen(port, () => {
  console.log(`DialogFlow Handler listening on port ${port}. Use 'npm run tunnel' to expose this.`)
})

// Your turn!
// See https://cloud.google.com/dialogflow/es/docs/fulfillment-webhook#webhook_response
// Use `res` to send your response; don't return!

async function doHelloWorld(req, res) {
  res.status(200).send({
    fulfillmentMessages: [
      {
        text: {
          text: [
            'You will see this if you trigger an intent named HelloWorld'
          ]
        }
      }
    ]
  })
}

async function tellJoke(req, res) {
  const params = req.body.queryResult.parameters;
  const joke = await getJoke(params.JokeType);
  res.status(200).send({
    fulfillmentMessages: [
      {
        card: {
          title: `${params.JokeType} joke`,
          subtitle: joke,
          buttons: [
            {
              text: "View More Jokes",
              postback: "https://v2.jokeapi.dev/"
            }
          ]
        }
      }
    ]
  })
}

async function tellAnotherJoke(req, res) {
  const jokeType = req.body.queryResult.outputContexts.filter(con => con.name.endsWith("telljoke-followup"))[0].parameters.JokeType
  const joke = await getJoke(jokeType);
  res.status(200).send({
    fulfillmentMessages: [
      {
        text: {
          text: [
            `Here's another ${jokeType} joke since you liked the last one!`
          ]
        }
      },
      {
        card: {
          title: `${jokeType} joke`,
          subtitle: joke,
          buttons: [
            {
              text: "View More Jokes",
              postback: "https://v2.jokeapi.dev/"
            }
          ]
        }
      }
    ]
  })
}

async function getJoke(jokeType) {
  const resp = await fetch(`https://v2.jokeapi.dev/joke/${jokeType}?safe-mode`);
  const jokeResp = await resp.json();
  if (jokeResp.type === "single") {
    return jokeResp.joke;
  } else if (jokeResp.type === "twopart") {
    return jokeResp.setup + " " + jokeResp.delivery;
  } else {
    return "Hmmm I don't know what happened... Please try again.";
  }
}