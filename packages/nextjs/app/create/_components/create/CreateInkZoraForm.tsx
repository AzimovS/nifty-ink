import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCreatorClient } from "@zoralabs/protocol-sdk";
import LZ from "lz-string";
import { usePublicClient, useWriteContract } from "wagmi";
import { CanvasDrawLines } from "~~/types/canvasDrawing";
import { notification } from "~~/utils/scaffold-eth";

// Helper function: Convert Data URL to File
const dataURLToFile = (dataURL: string, filename: string): File => {
  const [header, base64] = dataURL.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/png";
  const binary = atob(base64);
  const u8arr = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i++) {
    u8arr[i] = binary.charCodeAt(i);
  }

  return new File([u8arr], filename, { type: mime });
};

const handleFileUpload = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/pinFile", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Failed to upload the file");
    }

    const { IpfsHash } = await res.json();
    return IpfsHash;
  } catch (error) {
    console.log(error);
  }
};

const handleJsonUpload = async (json: object) => {
  try {
    const res = await fetch("/api/pinJson", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(json),
    });

    if (!res.ok) {
      throw new Error("Failed to upload the JSON data");
    }

    const { IpfsHash } = await res.json();
    return IpfsHash as string;
  } catch (error) {
    console.log(error);
  }
};

type CreateInkGnosisFormProps = {
  connectedAddress: string;
  drawingCanvas: React.RefObject<CanvasDrawLines>;
  chainId: number;
};

export const CreateInkZoraForm = ({ connectedAddress, drawingCanvas, chainId }: CreateInkGnosisFormProps) => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [contractName, setContractName] = useState<string>("");
  const [inkName, setInkName] = useState<string>("");
  const [inkDescription, setInkDescription] = useState<string>("");
  const publicClient = usePublicClient()!;

  const creatorClient = createCreatorClient({ chainId, publicClient });
  const { writeContract } = useWriteContract();

  const createInkZora = async () => {
    if (!drawingCanvas?.current) {
      notification.error("Your canvas is empty");
      return;
    }
    console.log("Inking:");

    setIsCreating(true);

    const imageData = drawingCanvas?.current?.canvas.drawing.toDataURL("image/png");

    const compressedArray = LZ.compressToUint8Array(drawingCanvas?.current?.getSaveData());

    const drawingBuffer = Buffer.from(compressedArray);
    const imageBuffer = Buffer.from(imageData.split(",")[1], "base64");

    const imageFile = dataURLToFile(imageData, "drawing.png");
    const imageResult = await handleFileUpload(imageFile);

    const drawingBlob = new Blob([drawingBuffer], { type: "application/octet-stream" });
    const drawingFile = new File([drawingBlob], "drawing.lz", { type: "application/octet-stream" });

    const drawingResult = await handleFileUpload(drawingFile);

    const metadataJson = {
      name: inkName,
      description: inkDescription,
      content: {
        mime: "text/html",
        uri: `https://nifty-view.vercel.app/ink/${drawingResult}`,
      },
      image: `https://nifty-view.vercel.app/ink/${drawingResult}`,
      animation_url: `https://nifty-view.vercel.app/ink/${drawingResult}`,
    };
    // console.log("metadataJson", metadataJson);

    const jsonMetadataUri = await handleJsonUpload(metadataJson);

    // const { IpfsHash } = await pinFileWithPinata(file);

    const { parameters, contractAddress } = await creatorClient.create1155({
      contract: {
        name: contractName,
        uri: `https://azure-qualified-blackbird-912.mypinata.cloud/ipfs/bafkreigorjcxgchsxaccgn4w754nymzw6on4wuh4nbykiqvwrzgoohhf4a`,
      },
      token: {
        tokenMetadataURI: `https://azure-qualified-blackbird-912.mypinata.cloud/ipfs/${jsonMetadataUri}`,
      },
      // account to execute the transaction (the creator)
      account: connectedAddress!,
    });
    console.log(`🎉 Ink created successfully in https://testnet.zora.co/collect/bsep:${contractAddress}/1`);

    await writeContract(parameters);
    setIsCreating(false);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    console.log("Ink Name:", inkName);
    createInkZora();
  };

  return (
    <form className="flex justify-center form-control w-full max-w-xs" onSubmit={handleSubmit}>
      <div className="flex gap-2">
        <div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Contract Name</span>
            </label>
            <input
              type="text"
              placeholder="name"
              className="input input-sm input-bordered w-full max-w-xs"
              value={contractName}
              onChange={e => setContractName(e.target.value)}
              required
            />
          </div>
        </div>
        <div>
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
              <span className="label-text">Ink Description</span>
            </label>
            <textarea
              placeholder="description"
              className="textarea textarea-md textarea-bordered w-full max-w-xs"
              value={inkDescription}
              onChange={e => setInkDescription(e.target.value)}
              required
            />
          </div>
        </div>
      </div>
      <div className="form-control mt-6">
        <button className="btn btn-primary" disabled={isCreating} type="submit">
          Ink!
        </button>
      </div>
    </form>
  );
};
