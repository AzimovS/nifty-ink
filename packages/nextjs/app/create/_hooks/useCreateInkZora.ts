import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createCreatorClient } from "@zoralabs/protocol-sdk";
import LZ from "lz-string";
import { useChainId, usePublicClient, useWriteContract } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
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

export const useCreateInkZora = (drawingCanvas: any, connectedAddress: string) => {
  const router = useRouter();
  const [sending, setSending] = useState<boolean>(false);
  const publicClient = usePublicClient()!;
  const chainId = useChainId();

  const { writeContractAsync: writeYourContractAsync } = useScaffoldWriteContract("NiftyInk");

  const creatorClient = createCreatorClient({ chainId, publicClient });
  const { writeContract } = useWriteContract();

  const createInkZora = useCallback(
    async (values: any) => {
      if (!drawingCanvas?.current) {
        notification.error("Your canvas is empty");
        return;
      }
      console.log("Inking:", values);

      setSending(true);

      const imageData = drawingCanvas?.current?.canvas.drawing.toDataURL("image/png");

      const compressedArray = LZ.compressToUint8Array(drawingCanvas?.current?.getSaveData());

      const drawingBuffer = Buffer.from(compressedArray);
      const imageBuffer = Buffer.from(imageData.split(",")[1], "base64");

      if (chainId === 84532) {
        const imageFile = dataURLToFile(imageData, "drawing.png");
        const imageResult = await handleFileUpload(imageFile);

        const drawingBlob = new Blob([drawingBuffer], { type: "application/octet-stream" });
        const drawingFile = new File([drawingBlob], "drawing.lz", { type: "application/octet-stream" });

        const drawingResult = await handleFileUpload(drawingFile);

        const metadataJson = {
          name: values.name || "Nifty Ink!!!",
          description: "Hi from Nifty Ink!!!",
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
            name: "Nifty Ink on Zora!!!",
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
        setSending(false);
        return;
      }
    },
    [drawingCanvas, connectedAddress, router, writeYourContractAsync],
  );

  return { createInkZora, sending };
};
