"use client";

import { useEffect, useRef, useState } from "react";
import LZ from "lz-string";
import CanvasDraw from "react-canvas-draw";
import { CanvasDrawLines } from "../../../types/canvasDrawing";


const NiftyView = ({ params }: { params: { cid: string } }) => {
  const cid = params?.cid;
  const [calculatedCanvaSize, setCalculatedCanvaSize] = useState<number>(500);

  const drawingCanvas = useRef<CanvasDrawLines>(null);
  const [drawingData, setDrawingData] = useState<string>("");

  const fetchAndShowDrawing = async () => {
    const url = `${process.env.NEXT_PUBLIC_IPFS_LINK}/${cid}`;
    try {
      console.log(`fetching from IPFS ${new Date().toISOString()}`);
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error("Failed to fetch drawing content");
      }
      const drawingContent = await response.arrayBuffer();
      console.log(`received from IPFS ${new Date().toISOString()}`);

      console.log(`decompressing ${new Date().toISOString()}`);

      const decompressed = LZ.decompressFromUint8Array(new Uint8Array(drawingContent));

      console.log(`finding length ${new Date().toISOString()}`);
      setDrawingData(decompressed);
      drawingCanvas.current?.loadSaveData(decompressed, false);
      console.log(`saving ${new Date().toISOString()}`);
      console.log(`done ${new Date().toISOString()}`);
    } catch (e) {
      console.error("Error loading or decompressing drawing:", e);
    }
  };

  useEffect(() => {
    const size = Math.round(0.7 * Math.min(window.innerWidth, window.innerHeight));
    fetchAndShowDrawing();
    setCalculatedCanvaSize(size);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <button
        className="btn btn-primary"
        onClick={() => {
          drawingCanvas.current?.loadSaveData(drawingData, false);
        }}
      >
        Play
      </button>
      <CanvasDraw
        ref={drawingCanvas}
        canvasWidth={calculatedCanvaSize}
        canvasHeight={calculatedCanvaSize}
        disabled={true}
        loadTimeOffset={3}
        hideInterface={true}
        hideGrid={true}
        className="border-2 border-gray-300 rounded-lg"
      />
    </div>
  );
};

export default NiftyView;
