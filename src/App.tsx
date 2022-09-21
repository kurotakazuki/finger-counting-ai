import { useCallback, useEffect, useState, useRef } from "react";
import { Camera } from "@mediapipe/camera_utils";
import { Hands, Results } from "@mediapipe/hands";
import { drawCanvas } from "./utils/drawCanvas";
import {
  detectFingerPose,
  FingerTypes,
  FingerType,
  getPitch,
} from "./utils/finger";

function App() {
  const [localStream, setLocalStream] = useState<MediaStream>();
  // video
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // audio
  const audioCtx = useRef<AudioContext | null>(null);
  const oscillator = useRef<OscillatorNode | null>(null);
  const prevFinger = useRef<FingerType>(FingerTypes.REST);
  const prevNote = useRef<FingerType>(FingerTypes.ONE);
  const isAttacked = useRef<Boolean>(false);

  const resultsRef = useRef<Results | null>(null);

  const createOscillator = (fingerType: FingerType) => {
    if (audioCtx.current) {
      oscillator.current = audioCtx.current.createOscillator();
      oscillator.current.type = "sine";
      oscillator.current.frequency.value =
        440 * Math.pow(2, getPitch(fingerType)! / 12);
      oscillator.current.connect(audioCtx.current.destination);
      oscillator.current.start();
    }
  };
  const deleteOscillator = () => {
    if (oscillator.current) {
      if (audioCtx.current) {
        oscillator.current.stop();
        oscillator.current.disconnect(audioCtx.current.destination);
        oscillator.current = null;
      }
    }
  };

  const onResults = useCallback((results: Results) => {
    resultsRef.current = results;

    // Audio
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        const fingerType = detectFingerPose(landmarks);

        const setNote = (fingerType: FingerType) => {
          deleteOscillator();
          createOscillator(fingerType);
          prevNote.current = fingerType;
          isAttacked.current = true;
        };

        if (fingerType !== prevFinger.current) {
          isAttacked.current = false;
        }
        prevFinger.current = fingerType;

        switch (fingerType) {
          case FingerTypes.REST:
            if (oscillator.current !== null) {
              deleteOscillator();
            }
            break;
          case FingerTypes.ONE:
          case FingerTypes.TWO:
          case FingerTypes.THREE:
          case FingerTypes.FOUR:
          case FingerTypes.FIVE:
          case FingerTypes.SIX:
          case FingerTypes.SEVEN:
          case FingerTypes.EIGHT:
          case FingerTypes.NINE:
            if (!isAttacked.current) {
              setNote(fingerType);
            }
            break;
          case FingerTypes.REPEAT:
            if (!isAttacked.current) {
              setNote(prevNote.current);
            }
            break;
          default:
            break;
        }

        console.log(fingerType);
      }
    }

    // Canvas
    const canvasCtx = canvasRef.current!.getContext("2d")!;
    drawCanvas(canvasCtx, results);
  }, []);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          // Init audio
          audioCtx.current = new AudioContext();
          // Init video
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch((e) => console.log(e));
        }
      })
      .catch((e) => {
        console.log(e);
      });
  }, []);

  useEffect(() => {
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      },
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.5,
    });

    hands.onResults(onResults);

    if (
      typeof localVideoRef.current !== "undefined" &&
      localVideoRef.current !== null
    ) {
      const camera = new Camera(localVideoRef.current, {
        onFrame: async () => {
          await hands.send({ image: localVideoRef.current! });
        },
      });
      camera.start();
    }
  }, [onResults]);

  return (
    <div className="App">
      <video ref={localVideoRef} />
      <canvas ref={canvasRef} />
      <div>
        {resultsRef.current
          ? resultsRef.current.multiHandLandmarks.map((landmarks) =>
              detectFingerPose(landmarks)
            )
          : null}
      </div>
    </div>
  );
}

export default App;
