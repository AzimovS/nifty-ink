import { useEffect, useState } from "react";
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
  const NEW_CONTRACT_VAL = "newcontract";
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [contractName, setContractName] = useState<string>("");
  const [inkName, setInkName] = useState<string>("");
  const [inkDescription, setInkDescription] = useState<string>("");
  const [contracts, setContracts] = useState<any[]>([]);
  const [selectedContract, setSelectedContract] = useState<string>(NEW_CONTRACT_VAL);
  const publicClient = usePublicClient()!;

  const creatorClient = createCreatorClient({ chainId, publicClient });
  const { writeContract } = useWriteContract();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch data from the API
      const response = await fetch(`https://api.indexsupply.net/query?chain=${chainId}`, {
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            event_signatures: [
              "SetupNewContract(address indexed newContract, address indexed creator, address indexed defaultAdmin, string contractURI, string name, (uint32,uint32,address) defaultRoyaltyConfiguration)",
            ],
            query: `select newcontract, name
                    from setupnewcontract
                    where creator = ${connectedAddress}`,
          },
        ]),
        method: "POST",
      });

      const apiResult = await response.json();
      setContracts(apiResult?.result?.[0]);
    };

    fetchData();
  }, []);

  const createInkZora = async () => {
    console.log("Inking:");

    setIsCreating(true);

    const imageData = drawingCanvas?.current?.canvas.drawing.toDataURL("image/png");

    const saveData = drawingCanvas?.current?.getSaveData();
    if (!saveData) {
      throw new Error("Failed to get save data from the drawing canvas");
    }
    const compressedArray = LZ.compressToUint8Array(saveData);

    const drawingBuffer = Buffer.from(compressedArray);
    const imageBuffer = Buffer.from(imageData.split(",")[1], "base64");

    const imageFile = dataURLToFile(imageData, "drawing.png");
    const imageResult = await handleFileUpload(imageFile);

    const drawingBlob = new Blob([drawingBuffer], { type: "application/octet-stream" });
    const drawingFile = new File([drawingBlob], "drawing.lz", { type: "application/octet-stream" });

    const drawingResult = await handleFileUpload(drawingFile);

    const inkMetadataJson = {
      name: inkName,
      description: inkDescription,
      content: {
        mime: "text/html",
        uri: `https://nifty-view.vercel.app/ink/${drawingResult}`,
      },
      image: `https://azure-qualified-blackbird-912.mypinata.cloud/ipfs/${imageResult}`,
      animation_url: `https://nifty-view.vercel.app/ink/${drawingResult}`,
    };

    const contractMetadataJson = {
      name: inkName,
      description: inkDescription,
      image: `https://azure-qualified-blackbird-912.mypinata.cloud/ipfs/${imageResult}`,
    };

    const contractMetadataUri = await handleJsonUpload(contractMetadataJson);
    const inkMetadataUri = await handleJsonUpload(inkMetadataJson);

    // const { IpfsHash } = await pinFileWithPinata(file);

    const { parameters, contractAddress } = await creatorClient.create1155({
      contract: {
        name: contractName,
        uri: `https://azure-qualified-blackbird-912.mypinata.cloud/ipfs/${contractMetadataUri}`,
      },
      token: {
        tokenMetadataURI: `https://azure-qualified-blackbird-912.mypinata.cloud/ipfs/${inkMetadataUri}`,
      },
      // account to execute the transaction (the creator)
      account: connectedAddress,
    });
    console.log(`🎉 Ink created successfully in https://testnet.zora.co/collect/bsep:${contractAddress}/1`);

    await writeContract(parameters);
    setIsCreating(false);
    setContractName("");
    setInkName("");
    setInkDescription("");
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
              <span className="label-text">Select Contract</span>
            </label>
            <select
              className="select select-sm select-bordered rounded-xl w-full max-w-xs"
              value={selectedContract}
              onChange={e => setSelectedContract(e.target.value)}
              disabled={!contracts}
              required
            >
              <option value={NEW_CONTRACT_VAL}>New Contract</option>
              {contracts?.map(contract => (
                <option key={contract[0]} value={contract}>
                  {contract[1]} {contract[0].slice(0, 4)}...{contract[0].slice(-4)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Contract Name</span>
            </label>
            <input
              type="text"
              placeholder="name"
              className="input input-sm input-bordered rounded-xl w-full max-w-xs"
              value={selectedContract !== NEW_CONTRACT_VAL ? selectedContract?.split(",")[1] : contractName}
              onChange={e => setContractName(e.target.value)}
              disabled={selectedContract !== NEW_CONTRACT_VAL}
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
              className="input input-sm input-bordered rounded-xl w-full max-w-xs"
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
              className="textarea textarea-md textarea-bordered rounded-xl w-full max-w-xs"
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
