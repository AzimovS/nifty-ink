import { useState } from "react";
import { useRouter } from "next/navigation";
import * as Hash from "ipfs-only-hash";
import LZ from "lz-string";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { CanvasDrawLines } from "~~/types/canvasDrawing";
import { checkAddressAndFund } from "~~/utils/checkAddressAndFund";
import { addToIPFS } from "~~/utils/ipfs";
import { notification } from "~~/utils/scaffold-eth";

type CreateInkGnosisFormProps = {
  connectedAddress: string;
  drawingCanvas: React.RefObject<CanvasDrawLines>;
};

export const CreateInkGnosisForm = ({ connectedAddress, drawingCanvas }: CreateInkGnosisFormProps) => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [inkName, setInkName] = useState<string>("");
  const [inkNumber, setInkNumber] = useState<number>(0);
  const { writeContractAsync: writeYourContractAsync } = useScaffoldWriteContract("NiftyInk");

  const createInkGnosis = async () => {
    const imageData = drawingCanvas?.current?.canvas.drawing.toDataURL("image/png");
    const imageBuffer = Buffer.from(imageData.split(",")[1], "base64");
    const imageHash = await Hash.of(imageBuffer);
    console.log("imageHash", imageHash);

    const saveData = drawingCanvas?.current?.getSaveData();
    if (!saveData) {
      throw new Error("Failed to get save data from canvas");
    }
    const compressedArray = LZ.compressToUint8Array(saveData);
    const drawingBuffer = Buffer.from(compressedArray);
    const drawingHash = await Hash.of(drawingBuffer);
    console.log("drawingHash", drawingHash);

    const timeInMs = new Date();
    const currentInk = {
      attributes: [
        {
          trait_type: "Limit",
          value: inkNumber.toString(),
        },
      ],
      name: inkName,
      description: `A Nifty Ink by ${connectedAddress} on ${timeInMs}`,
      drawing: drawingHash,
      image: `https://ipfs.io/ipfs/${imageHash}`,
      external_url: `https://nifty.ink/${drawingHash}`,
    };

    const inkStr = JSON.stringify(currentInk);
    const inkBuffer = Buffer.from(inkStr);
    const jsonHash = await Hash.of(inkBuffer);
    console.log("jsonHash", jsonHash);

    await checkAddressAndFund(connectedAddress);

    try {
      const drawingResult = addToIPFS(drawingBuffer);
      const imageResult = addToIPFS(imageBuffer);
      const inkResult = addToIPFS(inkBuffer);

      await Promise.all([drawingResult, imageResult, inkResult]).then(values => {
        console.log("FINISHED UPLOADING TO PINNER", values);
      });
    } catch (e) {
      console.log(e);
      setIsCreating(false);
      notification.error(`📛 Ink upload failed. Please wait a moment and try again ${(e as Error).message}`);
      return;
    }

    try {
      await writeYourContractAsync({
        functionName: "createInk",
        args: [drawingHash, jsonHash, BigInt(inkNumber)],
      });

      router.push("/ink/" + drawingHash);
    } catch (e) {
      console.log(e);
    }
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    console.log("Ink Number:", inkNumber);
    try {
      createInkGnosis();
    } catch (e) {
      console.log(e);
      notification.error(`📛 Ink upload failed. Please wait a moment and try again ${(e as Error).message}`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex justify-center">
      <form className="form-control w-full max-w-xs" onSubmit={handleSubmit}>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Ink Name</span>
          </label>
          <input
            type="text"
            placeholder="name"
            className="input input-sm input-bordered w-full max-w-xs"
            value={inkName}
            onChange={e => setInkName(e.target.value)}
            required
          />
        </div>

        <div className="form-control">
          <label className="label">
            <span className="label-text">Ink Number</span>
          </label>
          <input
            type="number"
            placeholder="limit"
            className="input input-sm input-bordered w-full max-w-xs"
            value={inkNumber}
            onChange={e => setInkNumber(Number(e.target.value))}
            min="0"
            required
          />
        </div>

        <div className="form-control mt-6">
          <button className="btn btn-primary" disabled={isCreating} type="submit">
            {isCreating && <span className="loading loading-spinner loading-sm"></span>}
            <span>Ink!</span>
          </button>
        </div>
      </form>
    </div>
  );
};
