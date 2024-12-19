"use client";

import { useEffect, useRef, useState } from "react";
import LZ from "lz-string";
import CanvasDraw from "react-canvas-draw";
import { CanvasDrawLines } from "../../../types/canvasDrawing";


const NiftyView = ({ params }: { params: { cid: string } }) => {
  const cid = params?.cid;

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
    fetchAndShowDrawing();
  }, []);

  return (
    <>
      HI
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
        canvasWidth={200}
        canvasHeight={200}
        // brushColor={color}
        // lazyRadius={1}
        // brushRadius={brushRadius}
        // disabled={canvasDisabled}
        // onChange={handleCanvasChange}
        // saveData={initialDrawing}
        // immediateLoading={true} //drawingSize >= 10000}
        loadTimeOffset={3}
      />
      End
    </>
  );
};

export default NiftyView;
