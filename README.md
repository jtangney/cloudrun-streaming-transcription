# Streaming Speech-to-Text transcription using Cloud Run

This repo contains a Node.js app that demonstrates streaming speech-to-text transcription of audio received from a web browser.
The app is hosted in [Cloud Run](https://cloud.google.com/run) and uses [Cloud Speech-to-Text](https://cloud.google.com/speech-to-text/docs/basics) for the transcription.

Quick points:

* Cloud Run [supports WebSockets](https://cloud.google.com/run/docs/triggering/websockets)
* The app uses socketio for the WebSocket connection between the client (browser) and server (Cloud Run service)
* The app uses [streaming recognition](https://cloud.google.com/speech-to-text/docs/basics#streaming-recognition) to transcribe
audio on the fly (in near real time)

See also:

* Related: [An architecture for production-ready live audio transcription using Speech-to-Text](https://cloud.google.com/architecture/architecture-for-production-ready-live-transcription-using-speech-to-text)