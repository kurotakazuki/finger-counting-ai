import { useCallback, useEffect, useState, useRef } from "react";
import { Camera } from "@mediapipe/camera_utils";
import { Hands, Results } from "@mediapipe/hands";
import { drawCanvas } from "./utils/drawCanvas";
import { detectFingerPose } from "./utils/finger";

function App() {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [localStream, setLocalStream] = useState<MediaStream>();

  const [results, setResults] = useState<Results>();

  const onResults = useCallback((results: Results) => {
    setResults(results);

    const canvasCtx = canvasRef.current!.getContext("2d")!;
    drawCanvas(canvasCtx, results);
  }, []);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((stream) => {
        setLocalStream(stream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
          localVideoRef.current.play().catch((e) => console.log(e));
        }
      })
      .catch((e) => {
        console.log(e);
      });
  }, []);

  // 初期設定
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
        {results
          ? results.multiHandLandmarks.map((landmarks) =>
              detectFingerPose(landmarks)
            )
          : null}
      </div>
    </div>
  );
}

export default App;
