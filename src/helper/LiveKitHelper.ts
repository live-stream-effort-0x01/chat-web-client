import {
  ConnectionQuality,
  ConnectionState,
  DisconnectReason,
  LocalAudioTrack,
  LocalParticipant,
  LogLevel,
  MediaDeviceFailure,
  Participant,
  ParticipantEvent,
  RemoteParticipant,
  RemoteTrackPublication,
  RemoteVideoTrack,
  Room,
  RoomConnectOptions,
  RoomEvent,
  RoomOptions,
  Track,
  TrackPublication,
  VideoCaptureOptions,
  VideoCodec,
  VideoPresets,
  VideoQuality,
  createAudioAnalyser,
  setLogLevel,
  supportsAV1,
  supportsVP9, RemoteTrack,
} from 'livekit-client';
import ShareScreenIcon from "~/images/screen-share.png";
import StopShareScreenIcon from "~/images/stop-screen-share.png";

let currentRoom: Room | undefined;
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
let startTime: number;

const state = {
  isFrontFacing: false,
  encoder: new TextEncoder(),
  decoder: new TextDecoder(),
  defaultDevices: new Map<MediaDeviceKind, string>(),
  bitrateInterval: undefined as any,
};

enum DataPacket_Kind {
  RELIABLE = 0,
  LOSSY = 1,
  UNRECOGNIZED = -1,
}

class LiveKitHelper {
  private serverUrl: string;
  private apiKey: string;
  private apiSecret: string;

  constructor(serverUrl: string, apiKey: string, apiSecret: string) {
    this.serverUrl = serverUrl;
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;

    // ------------------------------------------------------------------------------------------------


    // // publish local camera and mic tracks
    // await room.localParticipant.enableCameraAndMicrophone();


  }

  async connectToRoom(
    url: string,
    token: string
  ) {

    const roomOpts: RoomOptions = {
      // adaptiveStream,
      // dynacast,
      publishDefaults: {
        // simulcast,
        videoSimulcastLayers: [VideoPresets.h90, VideoPresets.h216],
        videoCodec: 'vp8',
      },
      videoCaptureDefaults: {
        resolution: VideoPresets.h720.resolution,
      },
    };

    const connectOpts: RoomConnectOptions = {
      autoSubscribe: true,
    };
    // if (forceTURN) {
    //   connectOpts.rtcConfig = {
    //     iceTransportPolicy: 'relay',
    //   };
    // }
    const room = new Room(roomOpts);

    startTime = Date.now();
    await room.prepareConnection(url);
    // const prewarmTime = Date.now() - startTime;
    // console.log(`prewarmed connection in ${prewarmTime}ms`);

    room
      .on(RoomEvent.ParticipantConnected, this.participantConnected)
      .on(RoomEvent.ParticipantDisconnected, this.participantDisconnected)
      // .on(RoomEvent.DataReceived, this.handleData)
      // .on(RoomEvent.Disconnected, handleRoomDisconnect)
      .on(RoomEvent.TrackSubscribed, this.handleTrackSubscribed)
      .on(RoomEvent.TrackUnsubscribed, this.handleTrackUnsubscribed)
      .on(RoomEvent.ActiveSpeakersChanged, this.handleActiveSpeakerChange)
      .on(RoomEvent.Disconnected, this.handleDisconnect)
      .on(RoomEvent.Reconnecting, () => console.log('Reconnecting to room'))
      .on(RoomEvent.Reconnected, async () => {
        // console.log(
        //   'Successfully reconnected. server',
        //   await room.engine.getConnectedServerAddress(),
        // );
      })
      .on(RoomEvent.LocalTrackPublished, (pub) => {
        const track = pub.track as LocalAudioTrack;

        // if (track instanceof LocalAudioTrack) {
        //   const { calculateVolume } = createAudioAnalyser(track);

        //   setInterval(() => {
        //     $('local-volume')?.setAttribute('value', calculateVolume().toFixed(4));
        //   }, 200);
        // }
        // this.renderParticipant(room.localParticipant);
        // updateButtonsForPublishState();
        this.renderScreenShare(room);
      })
      .on(RoomEvent.LocalTrackUnpublished, () => {
        //   renderParticipant(room.localParticipant);
        //   this.updateButtonsForPublishState();
        this.renderScreenShare(room);
      })
      .on(RoomEvent.RoomMetadataChanged, (metadata) => {
        // console.log('new metadata for room', metadata);
      })
      // .on(RoomEvent.MediaDevicesChanged, handleDevicesChanged)
      .on(RoomEvent.AudioPlaybackStatusChanged, () => {
        // if (room.canPlaybackAudio) {
        //   $('start-audio-button')?.setAttribute('disabled', 'true');
        // } else {
        //   $('start-audio-button')?.removeAttribute('disabled');
        // }
      })
      // .on(RoomEvent.MediaDevicesError, (e: Error) => {
      //   const failure = MediaDeviceFailure.getFailure(e);
      //   console.log('media device failure', failure);
      // })
      .on(
        RoomEvent.ConnectionQualityChanged,
        (quality: ConnectionQuality, participant?: Participant) => {
          // console.log('connection quality changed', participant?.identity, quality);
        },
      )
      .on(RoomEvent.TrackSubscribed, (track, pub, participant) => {
        // console.log('subscribed to track', pub.trackSid, participant.identity);
        this.renderParticipant(participant);
        this.renderScreenShare(room);
      })
      .on(RoomEvent.TrackUnsubscribed, (_, pub, participant) => {
        // console.log('unsubscribed from track', pub.trackSid);
        this.renderParticipant(participant);
        this.renderScreenShare(room);
      })
      .on(RoomEvent.SignalConnected, async () => {
        // const signalConnectionTime = Date.now() - startTime;
        // console.log(`signal connection established in ${signalConnectionTime}ms`);
        // // speed up publishing by starting to publish before it's fully connected
        // // publishing is accepted as soon as signal connection has established
        // if (shouldPublish) {
        //   await room.localParticipant.enableCameraAndMicrophone();
        //   console.log(`tracks published in ${Date.now() - startTime}ms`);
        // this.updateButtonsForPublishState();
      })
    try {
      // debugger
      await room.connect(url, token, connectOpts);
      // const elapsed = Date.now() - startTime;
      // console.log(
      //   `successfully connected to ${room.name} in ${Math.round(elapsed)}ms`,
      //   await room.engine.getConnectedServerAddress(),
      // );
    } catch (error: any) {
      let message: any = error;
      if (error.message) {
        message = error.message;
      }
      // console.log('could not connect:', message);
      return;
    }
    currentRoom = room;
    // window.currentRoom = room;
    // setButtonsForState(true);

    // room.participants.forEach((participant) => {
    //   participantConnected(participant);
    // });
    // participantConnected(room.localParticipant);

    return room;
  }

  handleData(msg: Uint8Array, participant?: RemoteParticipant) {
    // const str = state.decoder.decode(msg);
    // const chat = <HTMLTextAreaElement>$('chat');
    // let from = 'server';
    // if (participant) {
    //   from = participant.identity;
    // }
    // chat.value += `${from}: ${str}\n`;
    return state.decoder.decode(msg);
  }

  disconnectRoom() {
    if (currentRoom) {
      currentRoom.disconnect();
    }
    window.location.href = '/';
    // if (state.bitrateInterval) {
    //   clearInterval(state.bitrateInterval);
    // }
  }

  enterText(value: string) {
    if (!currentRoom) return false;
    if (value) {
      const msg = state.encoder.encode(value);
      currentRoom.localParticipant.publishData(msg, DataPacket_Kind.RELIABLE);
      // (<HTMLTextAreaElement>(
      //   $('chat')
      // )).value += `${currentRoom.localParticipant.identity} (me): ${textField.value}\n`;
      // textField.value = '';
      return true
    }
    return false
  }

  async toggleAudio() {
    if (!currentRoom) return;
    const enabled = currentRoom.localParticipant.isMicrophoneEnabled;
    this.setButtonDisabled('toggle-audio-button', true);
    if (enabled) {
      console.log('disabling audio');
    } else {
      console.log('enabling audio');
    }
    await currentRoom.localParticipant.setMicrophoneEnabled(!enabled);
    this.setButtonDisabled('toggle-audio-button', false);
    this.renderSmallParticipant(currentRoom.localParticipant);
    // this.updateButtonsForPublishState();
  }

  updateButtonsForPublishState() {
    if (!currentRoom) {
      return;
    }
    const lp = currentRoom.localParticipant;

    // video
    this.setButtonState(
      'toggle-video-button',
      `${lp.isCameraEnabled ? 'Disable' : 'Enable'} Video`,
      lp.isCameraEnabled,
    );

    // audio
    this.setButtonState(
      'toggle-audio-button',
      `${lp.isMicrophoneEnabled ? 'Disable' : 'Enable'} Audio`,
      lp.isMicrophoneEnabled,
    );

    // screen share
    this.setButtonState(
      'share-screen-button',
      lp.isScreenShareEnabled ? 'Stop Screen Share' : 'Share Screen',
      lp.isScreenShareEnabled,
    );
  }

  setButtonDisabled(buttonId: string, isDisabled: boolean) {
    const el = $(buttonId) as HTMLButtonElement;
    el.disabled = isDisabled;
  }

  setButtonState(
    buttonId: string,
    buttonText: string,
    isActive: boolean,
    isDisabled: boolean | undefined = undefined,
  ) {
    const el = $(buttonId) as HTMLButtonElement;
    if (!el) return;
    if (isDisabled !== undefined) {
      el.disabled = isDisabled;
    }
    el.innerHTML = buttonText;
    if (isActive) {
      el.classList.add('active');
    } else {
      el.classList.remove('active');
    }
  }

  async toggleVideo() {
    if (!currentRoom) return;
    // setButtonDisabled('toggle-video-button', true);
    const enabled = currentRoom.localParticipant.isCameraEnabled;
    if (enabled) {
      console.log('disabling video');
    } else {
      console.log('enabling video');
    }
    await currentRoom.localParticipant.setCameraEnabled(!enabled);
    // setButtonDisabled('toggle-video-button', false);
    this.renderSmallParticipant(currentRoom.localParticipant);

    // update display
    // this.updateButtonsForPublishState();
  }

  updateVideoSize(element: HTMLVideoElement, target: HTMLElement) {
    target.innerHTML = `(${element.videoWidth}x${element.videoHeight})`;
  }

  // updates participant UI
  renderParticipant(participant: Participant, remove: boolean = false) {
    const container = $('participants-area');
    if (!container) return;
    const { identity } = participant;
    let div = $(`participant-${identity}`);
    if (!div && !remove) {
      div = document.createElement('div');
      div.id = `participant-${identity}`;
      div.className = 'participant';
      // <span id="codec-${identity}" class="codec">
      // </span>
      // <span id="size-${identity}" class="size">
      // </span>
      // <span id="bitrate-${identity}" class="bitrate">
      // </span>
      // <span id="signal-${identity}"></span>
      //     <span id="mic-${identity}" class="mic-on"></span>
      div.innerHTML = `
        <span id="size-${identity}" class="size">
      </span>
      <video id="video-${identity}"></video>
      <audio id="audio-${identity}"></audio>
      <div class="info-bar">
        <div id="name-${identity}" class="name">
        </div>
        <div style="text-align: center; margin: 0px 5px;">
          <span id="mic-${identity}" class="mic-on"  style="margin: 0px 5px;"></span>
          <i class="fas fa-light fa-camera" style="margin: 0px 5px;"></i>
          <i class="fas fa-light fa-video" style="margin: 0px 5px;"></i>
        </div>
        <div class="right">
          
        </div>
      </div>
    `;
      if ($(`video-element`)) {
        $(`video-element`).replaceWith(div);
      }

      const sizeElm = $(`size-${identity}`);
      const videoElm = <HTMLVideoElement>$(`video-${identity}`);
      videoElm.onresize = () => {
        this.updateVideoSize(videoElm!, sizeElm!);
      };
    }
    const videoElm = <HTMLVideoElement>$(`video-${identity}`);
    const audioELm = <HTMLAudioElement>$(`audio-${identity}`);
    if (remove) {
      div?.remove();
      if (videoElm) {
        videoElm.srcObject = null;
        videoElm.src = '';
      }
      if (audioELm) {
        audioELm.srcObject = null;
        audioELm.src = '';
      }
      return;
    }

    // update properties
    $(`name-${identity}`)!.innerHTML = participant.identity;
    if (participant instanceof LocalParticipant) {
      $(`name-${identity}`)!.innerHTML += ' (you)';
    }
    const micElm = $(`mic-${identity}`)!;
    const signalElm = $(`signal-${identity}`)!;
    const cameraPub = participant.getTrack(Track.Source.Camera);
    const micPub = participant.getTrack(Track.Source.Microphone);
    if (participant.isSpeaking) {
      div!.classList.add('speaking');
    } else {
      div!.classList.remove('speaking');
    }

    // if (participant instanceof RemoteParticipant) {
    //   const volumeSlider = <HTMLInputElement>$(`volume-${identity}`);
    //   volumeSlider.addEventListener('input', (ev) => {
    //     participant.setVolume(Number.parseFloat((ev.target as HTMLInputElement).value));
    //   });
    // }

    const cameraEnabled = cameraPub && cameraPub.isSubscribed && !cameraPub.isMuted;
    if (cameraEnabled) {
      if (participant instanceof LocalParticipant) {
        // flip
        videoElm.style.transform = 'scale(-1, 1)';
      } else if (!cameraPub?.videoTrack?.attachedElements.includes(videoElm)) {
        const renderStartTime = Date.now();
        // measure time to render
        videoElm.onloadeddata = () => {
          const elapsed = Date.now() - renderStartTime;
          let fromJoin = 0;
          if (participant.joinedAt && participant.joinedAt.getTime() < startTime) {
            fromJoin = Date.now() - startTime;
          }
          // appendLog(
          //   `RemoteVideoTrack ${cameraPub?.trackSid} (${videoElm.videoWidth}x${videoElm.videoHeight}) rendered in ${elapsed}ms`,
          //   fromJoin > 0 ? `, ${fromJoin}ms from start` : '',
          // );
        };
      }
      cameraPub?.videoTrack?.attach(videoElm);
    } else {
      // clear information display
      // $(`size-${identity}`)!.innerHTML = '';
      if (cameraPub?.videoTrack) {
        // detach manually whenever possible
        cameraPub.videoTrack?.detach(videoElm);
      } else {
        videoElm.src = '';
        videoElm.srcObject = null;
      }
    }

    const micEnabled = micPub && micPub.isSubscribed && !micPub.isMuted;
    if (micEnabled) {
      if (!(participant instanceof LocalParticipant)) {
        // don't attach local audio
        audioELm.onloadeddata = () => {
          if (participant.joinedAt && participant.joinedAt.getTime() < startTime) {
            const fromJoin = Date.now() - startTime;
            // appendLog(`RemoteAudioTrack ${micPub?.trackSid} played ${fromJoin}ms from start`);
          }
        };
        micPub?.audioTrack?.attach(audioELm);
      }
      micElm.className = 'mic-on';
      micElm.innerHTML = '<i class="fas fa-microphone"></i>';
    } else {
      micElm.className = 'mic-off';
      micElm.innerHTML = '<i class="fas fa-microphone-slash"></i>';
    }
    // const camEnabled = micPub && micPub.isSubscribed && !micPub.isMuted;
    // if (camEnabled) {
    //   // if (!(participant instanceof LocalParticipant)) {
    //   //   // don't attach local audio
    //   //   audioELm.onloadeddata = () => {
    //   //     if (participant.joinedAt && participant.joinedAt.getTime() < startTime) {
    //   //       const fromJoin = Date.now() - startTime;
    //   //       // appendLog(`RemoteAudioTrack ${micPub?.trackSid} played ${fromJoin}ms from start`);
    //   //     }
    //   //   };
    //   //   micPub?.audioTrack?.attach(audioELm);
    //   // }
    //   camElm.className = 'cam-on';
    //   camElm.innerHTML = '<i class="fa-light fa-video"></i>';
    // } else {
    //   camElm.className = 'cam-off';
    //   camElm.innerHTML = '<i class="fa-light fa-video"></i>';
    // }

    micElm.addEventListener("click", this.toggleAudio.bind(this));

    // switch (participant.connectionQuality) {
    //   case ConnectionQuality.Excellent:
    //   case ConnectionQuality.Good:
    //   case ConnectionQuality.Poor:
    //     signalElm.className = `connection-${participant.connectionQuality}`;
    //     signalElm.innerHTML = '<i class="fas fa-circle"></i>';
    //     break;
    //   default:
    //     signalElm.innerHTML = '';
    //   // do nothing
    // }
  }

  // updates participant UI
  renderSmallParticipant(participant: Participant, remove: boolean = false) {
    const container = $('joins-area');
    if (!container) return;
    const { identity } = participant;
    let div = $(`participant-${identity}`);
    if (!div && !remove) {
      div = document.createElement('div');
      div.id = `participant-${identity}`;
      div.className = 'participant';
      div.innerHTML = `
      <video id="video-${identity}"></video>
      <audio id="audio-${identity}"></audio>
      <div class="info-bar">
        <div id="name-${identity}" class="name">
        </div>
        <div style="text-align: center;">
          <span id="codec-${identity}" class="codec">
          </span>
          <span id="size-${identity}" class="size">
          </span>
          <span id="bitrate-${identity}" class="bitrate">
          </span>
        </div>
        <div class="right">
          <span id="signal-${identity}"></span>
          <span id="mic-${identity}" class="mic-on"></span>
        </div>
      </div>
      ${participant instanceof RemoteParticipant
          ? `<div class="volume-control">
        <input id="volume-${identity}" type="range" min="0" max="1" step="0.1" value="1" orient="vertical" />
      </div>`
          : `<progress id="local-volume" max="1" value="0" />`
        }

    `;
      $(`join-element`).replaceWith(div);

      const sizeElm = $(`size-${identity}`);
      const videoElm = <HTMLVideoElement>$(`video-${identity}`);
      videoElm.onresize = () => {
        this.updateVideoSize(videoElm!, sizeElm!);
      };
    }
    const videoElm = <HTMLVideoElement>$(`video-${identity}`);
    const audioELm = <HTMLAudioElement>$(`audio-${identity}`);
    if (remove) {
      div?.remove();
      if (videoElm) {
        videoElm.srcObject = null;
        videoElm.src = '';
      }
      if (audioELm) {
        audioELm.srcObject = null;
        audioELm.src = '';
      }
      return;
    }

    // update properties
    $(`name-${identity}`)!.innerHTML = participant.identity;
    if (participant instanceof LocalParticipant) {
      $(`name-${identity}`)!.innerHTML += ' (you)';
    }
    const micElm = $(`mic-${identity}`)!;
    const signalElm = $(`signal-${identity}`)!;
    const cameraPub = participant.getTrack(Track.Source.Camera);
    const micPub = participant.getTrack(Track.Source.Microphone);
    if (participant.isSpeaking) {
      div!.classList.add('speaking');
    } else {
      div!.classList.remove('speaking');
    }

    if (participant instanceof RemoteParticipant) {
      const volumeSlider = <HTMLInputElement>$(`volume-${identity}`);
      volumeSlider.addEventListener('input', (ev) => {
        participant.setVolume(Number.parseFloat((ev.target as HTMLInputElement).value));
      });
    }

    const cameraEnabled = cameraPub && cameraPub.isSubscribed && !cameraPub.isMuted;
    const currentVideoELm = <HTMLAudioElement>$(`toggle-video-button`);
    if (cameraEnabled) {
      if (participant instanceof LocalParticipant) {
        // flip
        videoElm.style.transform = 'scale(-1, 1)';
      } else if (!cameraPub?.videoTrack?.attachedElements.includes(videoElm)) {
        const renderStartTime = Date.now();
        // measure time to render
        videoElm.onloadeddata = () => {
          const elapsed = Date.now() - renderStartTime;
          let fromJoin = 0;
          if (participant.joinedAt && participant.joinedAt.getTime() < startTime) {
            fromJoin = Date.now() - startTime;
          }
          // appendLog(
          //   `RemoteVideoTrack ${cameraPub?.trackSid} (${videoElm.videoWidth}x${videoElm.videoHeight}) rendered in ${elapsed}ms`,
          //   fromJoin > 0 ? `, ${fromJoin}ms from start` : '',
          // );
        };
      }
      cameraPub?.videoTrack?.attach(videoElm);
      // videoElm.className = 'video-on';
      currentVideoELm.innerHTML = '<i class="fas fa-regular fa-video"></i>';
    } else {
      // clear information display
      $(`size-${identity}`)!.innerHTML = '';
      if (cameraPub?.videoTrack) {
        // detach manually whenever possible
        cameraPub.videoTrack?.detach(videoElm);
      } else {
        videoElm.src = '';
        videoElm.srcObject = null;
      }
      // videoElm.className = 'video-off';
      currentVideoELm.innerHTML = '<i class="fas fa-regular fa-video-slash"></i>';
    }

    const micEnabled = micPub && micPub.isSubscribed && !micPub.isMuted;
    // console.log("micEnabled : ", micEnabled)
    const currentAudioELm = <HTMLAudioElement>$(`toggle-audio-button`);
    const currentSmallAudioELm = <HTMLAudioElement>$(`item-current-user`);
    console.log("micEnabled : ", micEnabled);
    if (micEnabled) {
      if (!(participant instanceof LocalParticipant)) {
        // don't attach local audio
        audioELm.onloadeddata = () => {
          if (participant.joinedAt && participant.joinedAt.getTime() < startTime) {
            const fromJoin = Date.now() - startTime;
            // appendLog(`RemoteAudioTrack ${micPub?.trackSid} played ${fromJoin}ms from start`);
          }
        };
        micPub?.audioTrack?.attach(audioELm);
      }
      micElm.className = 'mic-on';
      micElm.innerHTML = '<i class="fas fa-microphone"></i>';
      currentAudioELm.innerHTML = '<i class="fas fa-regular fa-microphone"></i>';
      currentSmallAudioELm.innerHTML = '<i class="fas fa-light fa-microphone"></i>';
    } else {
      micElm.className = 'mic-off';
      micElm.innerHTML = '<i class="fas fa-microphone-slash"></i>';
      currentAudioELm.innerHTML = '<i class="fas fa-regular fa-microphone-slash"></i>';
      currentSmallAudioELm.innerHTML = '<i class="fas fa-light fa-microphone-slash"></i>';
    }

    // switch (participant.connectionQuality) {
    //   case ConnectionQuality.Excellent:
    //   case ConnectionQuality.Good:
    //   case ConnectionQuality.Poor:
    //     signalElm.className = `connection-${participant.connectionQuality}`;
    //     signalElm.innerHTML = '<i class="fas fa-circle"></i>';
    //     break;
    //   default:
    //     signalElm.innerHTML = '';
    //   // do nothing
    // }
  }

  renderScreenShare(room: Room) {
    const div = $('screenshare-area')!;
    if (room.state !== ConnectionState.Connected) {
      div.style.display = 'none';
      return;
    }
    let participant: Participant | undefined;
    let screenSharePub: TrackPublication | undefined = room.localParticipant.getTrack(
      Track.Source.ScreenShare,
    );
    let screenShareAudioPub: RemoteTrackPublication | undefined;
    if (!screenSharePub) {
      room.participants.forEach((p) => {
        if (screenSharePub) {
          return;
        }
        participant = p;
        const pub = p.getTrack(Track.Source.ScreenShare);
        if (pub?.isSubscribed) {
          screenSharePub = pub;
        }
        const audioPub = p.getTrack(Track.Source.ScreenShareAudio);
        if (audioPub?.isSubscribed) {
          screenShareAudioPub = audioPub;
        }
      });
    } else {
      participant = room.localParticipant;
    }
    const currentVideo = $('participants-area');
    const shareScreenButton = $('share-screen-button');

    if (screenSharePub && participant) {
      div.style.display = 'block';
      const videoElm = <HTMLVideoElement>$('screenshare-video');
      screenSharePub.videoTrack?.attach(videoElm);
      if (screenShareAudioPub) {
        screenShareAudioPub.audioTrack?.attach(videoElm);
      }
      // videoElm.onresize = () => {
      //   this.updateVideoSize(videoElm, <HTMLSpanElement>$('screenshare-resolution'));
      // };
      // const infoElm = $('screenshare-info')!;
      // infoElm.innerHTML = `Screenshare from ${participant.identity}`;
      currentVideo.style.display = 'none';
    } else {
      div.style.display = 'none';
      currentVideo.style.display = 'block';
    }
  }

  flipVideo() {
    const videoPub = currentRoom?.localParticipant.getTrack(Track.Source.Camera);
    if (!videoPub) {
      return;
    }
    // if (state.isFrontFacing) {
    //   setButtonState('flip-video-button', 'Front Camera', false);
    // } else {
    //   setButtonState('flip-video-button', 'Back Camera', false);
    // }
    state.isFrontFacing = !state.isFrontFacing;
    const options: VideoCaptureOptions = {
      resolution: VideoPresets.h720.resolution,
      facingMode: state.isFrontFacing ? 'user' : 'environment',
    };
    videoPub.videoTrack?.restartTrack(options);
  }

  async shareScreen() {
    if (!currentRoom) return;

    const enabled = currentRoom.localParticipant.isScreenShareEnabled;
    console.log(`${enabled ? 'stopping' : 'starting'} screen share`);
    // setButtonDisabled('share-screen-button', true);
    await currentRoom.localParticipant.setScreenShareEnabled(!enabled, { audio: true });
    // setButtonDisabled('share-screen-button', false);
    // this.updateButtonsForPublishState();
  }

  startAudio() {
    currentRoom?.startAudio();
  }

  handleTrackSubscribed(
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) {
    if (track.kind === Track.Kind.Video || track.kind === Track.Kind.Audio) {
      // attach it to a new HTMLVideoElement or HTMLAudioElement
      // parentElement.appendChild(element);
    }
    track.attach();
  }


  handleTrackUnsubscribed(
    track: RemoteTrack,
    publication: RemoteTrackPublication,
    participant: RemoteParticipant,
  ) {
    // remove tracks from all attached elements
    track.detach();
  }

  //  handleLocalTrackUnpublished(track: LocalTrackPublication, participant: LocalParticipant) {
  //   // when local tracks are ended, update UI to remove them from rendering
  //   track.detach();
  // }

  handleActiveSpeakerChange(speakers: Participant[]) {
    // show UI indicators when participant is speaking
  }

  handleDisconnect() {
    console.log('disconnected from room');
  }

  participantConnected(participant: Participant) {
    participant
      .on(ParticipantEvent.TrackMuted, (pub: TrackPublication) => {
        this.renderParticipant(participant);
      })
      .on(ParticipantEvent.TrackUnmuted, (pub: TrackPublication) => {
        this.renderParticipant(participant);
      })
      .on(ParticipantEvent.IsSpeakingChanged, () => {
        this.renderParticipant(participant);
      })
      .on(ParticipantEvent.ConnectionQualityChanged, () => {
        this.renderParticipant(participant);
      });
  }
  participantDisconnected(participant: RemoteParticipant) {

    this.renderParticipant(participant, true);
  }
}

export default LiveKitHelper;
