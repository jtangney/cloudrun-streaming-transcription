const io = require('socket.io-client');
const getUserMedia = require('get-user-media-promise');
const MicrophoneStream = require('microphone-stream').default;

const encoding = 'LINEAR16';
const languageCode = 'en-US';

const transcriptions = document.getElementById('results');

const startButton = document.getElementById('start-transcribe');
const stopButton = document.getElementById('stop-transcribe');
startButton.addEventListener('click', startTranscribing);
stopButton.addEventListener('click', stopTranscribing);
startButton.disabled = false;
stopButton.disabled = true;

let micStream = null;

/**
 * 'Start transcribe' button handler.
 * Initiate connection to server, activate browser microphone and 
 * start sending audio
 */
function startTranscribing() {
  socket = initSocket();
  startMic(socket)
  startButton.disabled = true;
  stopButton.disabled = false;
}

/**
 * 'Stop transcribe' button handler.
 * Stops the browser microphone
 */
 function stopTranscribing() {
  if (micStream) {
    console.log('Stopping microphone');
    micStream.stop();
    micStream = null;
  }
  startButton.disabled = false;
  stopButton.disabled = true;
};

/**
 * Establish websocket connection to server and register listeners to 
 * respond to events from server.
 */
function initSocket() {
  console.log('Inititiating socket');
  socket = io('', { 
    transports: ['websocket'] 
  });
  // connection established
  socket.on('connect', () => {
    console.log('Connected to server');
  });
  // transcription snippet received; add to textarea
  socket.on('transcript', (msg) => {
    transcriptions.value += (msg + ' ');
  });
  // connection terminated
  socket.on('disconnect', () => {
    console.log('Disconnected from server');
    stopTranscribing();
  });
  return socket;
}

/**
 * Activate browser microphone and register listeners to handle events.
 */
function startMic(socket) {
  console.log('Starting microphone');
  micStream = new MicrophoneStream({
    objectMode: true
  });
  getUserMedia({ video: false, audio: true})
    .then(function(stream) {
      micStream.setStream(stream);
    }).catch(function(error) {
      console.log(error);
    });

  micStream.on('format', function(format) {
    console.log(format);
    // establish stream to server
    const speechConfig = {
      encoding: encoding,
      sampleRateHertz: sampleRate,
      languageCode: languageCode
    }
    socket.emit('init', speechConfig);
  });

  micStream.on('data', function(chunk) {
    // mono - just get left channel
    const audio = chunk.getChannelData(0);
    // convert to LINEAR16
    const audio16 = convertFloat32ToInt16(audio);
    // send to server
    socket.emit('audio', audio16);
  });

  micStream.on('end', () => {
    console.log('Mic stream end');
    socket.disconnect();
  });
}

/**
 * Convert to LINEAR16: 16-bit signed little-endian samples
 */
function convertFloat32ToInt16(buffer) {
  l = buffer.length;
  buf = new Int16Array(l);
  while (l--) {
    buf[l] = Math.min(1, buffer[l])*0x7FFF;
  }
  return buf.buffer;
}
