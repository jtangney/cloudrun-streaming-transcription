const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const speech = require('@google-cloud/speech');
const speechClient = new speech.SpeechClient();

const port = process.env.PORT || 8080;
const pendingWordCount = process.env.UNSTABLE_WORDS || 3;
let lastSentWordIndex = 0;
let unsentWords = [];
let speechConfig = null;
let recognizeStream = null;


io.on('connect', (socket) => {
  console.log('socket connected');
  // initialise Speech-to-Text
  socket.on('init', (config) => {
    speechConfig = config;
    initStreamingRecognize(speechConfig);
  })
  // audio received; send to SpeechToText
  .on('audio', (data) => {
    if (data) {
      recognizeStream.write(data);
    }
  })
  // client side disconnected; close the connection to SpeechToText
  .on('disconnect', () => {
    console.log('client disconnected');
    setTimeout(closeStream, 2000);
  });
});

function initStreamingRecognize(speechRequestConfig) {
  console.log('Inititalising streamingRecognize');
  console.log(speechRequestConfig);
  const speechRequest = {
    config: speechRequestConfig,
    interimResults: true,
  };
  // first request initialises the streaming recognize session
  recognizeStream = speechClient.streamingRecognize(speechRequest);
  
  // handle responses
  recognizeStream.on('data', function(recognitionResult) {
    const fragment = getLatestStableFragment(recognitionResult);
    if (fragment) {
      console.log(fragment);
      io.emit('transcript', fragment);
    }
  })
  .on('error', err => {
    // error 11 - STT timeout as it did not receive audio for some time
    if (err.code === 11) {
      console.log('Speech timeout, resetting');
      reset();
    } else {
      console.error('Speech error: ' + err);
      reset();
    }
  })
  .on('end', () => {
    console.log('recognizeStream ended, resetting');
    reset();
  });
}

function closeStream() {
  console.log('closing recognizeStream...');
  if (recognizeStream) {
    recognizeStream.end();
  }
}

function reset() {
  recognizeStream = null;
  unsentWords = [];
  lastSentWordIndex = 0;
}

function getLatestStableFragment(recognitionResult) {
  const result = recognitionResult.results[0];
  const alternative = result.alternatives[0];
  const latestTranscript = alternative.transcript;
  const elements = latestTranscript.split(' ');
  // final result - transcription won't change further, send any unsent words
  if (result.isFinal) {
    console.log('Final result received');
    const allUnsent = elements.slice(lastSentWordIndex);
    lastSentWordIndex = 0;
    unsentWords = [];
    return allUnsent.join(' ');
  }
  // ignore low-stability results (typically the first few results are low confidence)
  if (result.stability < 0.75) {
    console.log('Ingoring low-stability result')
    return;
  }
  // don't send results until we have sufficient words
  if (elements.length <= pendingWordCount) {
    console.log('Ingoring early stage result (insufficient words)')
    return;
  }
  // Discard the last N words - these may change in following transcription results.
  // The idea here is to let the transcription 'settle'. Typically it's only
  // the last few words that change between subsequent transcription results.
  const endStableIndex = elements.length - pendingWordCount;
  const stableElements = elements.slice(lastSentWordIndex, endStableIndex);
  lastSentWordIndex = endStableIndex;
  unsentWords = elements.slice(endStableIndex);
  return stableElements.join(' ');
}

app.use(express.static(__dirname + '/public'));
http.listen(port, () => console.log('listening on port ' + port));
