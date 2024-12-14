import { useCallback, useState } from "react";
import { createCreatorClient, makeMediaTokenMetadata } from "@zoralabs/protocol-sdk";
import { message } from "antd";
import * as Hash from "ipfs-only-hash";
import LZ from "lz-string";
import { useChainId, usePublicClient, useWriteContract } from "wagmi";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { checkAddressAndFund } from "~~/utils/checkAddressAndFund";
import { addToIPFS } from "~~/utils/ipfs";
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

export const useCreateInk = (
  drawingCanvas: any,
  connectedAddress: string | undefined,
  router: any,
  saveDrawing: (newDrawing: any, saveOverride: boolean) => void,
  handleChangeDrawing: (newDrawing: string) => void,
) => {
  const [sending, setSending] = useState<boolean>(false);
  const publicClient = usePublicClient()!;
  const chainId = useChainId();

  const { writeContractAsync: writeYourContractAsync } = useScaffoldWriteContract("NiftyInk");

  const handleFileUpload = async (file: File) => {
    // setLoading(true);
    // setError(null);

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
      // setError(error.message);
    } finally {
      // setLoading(false);
    }
  };

  const handleJsonUpload = async (json: object) => {
    try {
      const res = await fetch("/api/pinJsonWithPinata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(json),
      });

      if (!res.ok) {
        throw new Error("Failed to upload the JSON data");
      }

      const { ipfsUrl } = await res.json();
      return ipfsUrl;
    } catch (error) {
      console.log(error);
      // setError(error.message);
    } finally {
      // setLoading(false);
    }
  };

  const creatorClient = createCreatorClient({ chainId, publicClient });
  const { writeContract } = useWriteContract();

  const createInk = useCallback(
    async (values: any) => {
      // ... (move the createInk function logic here)
      if (!drawingCanvas?.current) {
        notification.error("Your canvas is empty");
        return;
      }
      console.log("Inking:", values);

      setSending(true);

      const imageData = drawingCanvas?.current?.canvas.drawing.toDataURL("image/png");

      saveDrawing(drawingCanvas.current, true);

      const compressedArray = LZ.compressToUint8Array(drawingCanvas?.current?.getSaveData());

      const drawingBuffer = Buffer.from(compressedArray);
      const imageBuffer = Buffer.from(imageData.split(",")[1], "base64");

      if (chainId === 84532) {
        const file = dataURLToFile(imageData, "drawing.png");
        const fileResult = await handleFileUpload(file);

        const drawingBlob = new Blob([drawingBuffer], { type: "application/octet-stream" });
        const drawingFile = new File([drawingBlob], "drawing.lz", { type: "application/octet-stream" });

        const drawingResult = await handleFileUpload(drawingFile);

        const metadataJson = makeMediaTokenMetadata({
          mediaUrl: drawingResult,
          thumbnailUrl: drawingResult,
          name: "HI Pinata",
          description: "HI Pinata",
        });

        const jsonMetadataUri = await handleJsonUpload(metadataJson);

        // const { IpfsHash } = await pinFileWithPinata(file);

        const { parameters, contractAddress } = await creatorClient.create1155({
          contract: {
            name: "Nifty Ink",
            uri: jsonMetadataUri,
          },
          token: {
            tokenMetadataURI: jsonMetadataUri,
          },
          // account to execute the transaction (the creator)
          account: connectedAddress!,
        });
        alert(contractAddress);

        writeContract(parameters);
        setSending(false);
        return;
      }

      const drawingHash = await Hash.of(drawingBuffer);
      console.log("drawingHash", drawingHash);

      const imageHash = await Hash.of(imageBuffer);
      console.log("imageHash", imageHash);

      const timeInMs = new Date();

      const currentInk = {
        // ...ink,
        attributes: [
          {
            trait_type: "Limit",
            value: values.limit.toString(),
          },
        ],
        name: values.title,
        description: `A Nifty Ink by ${connectedAddress} on ${timeInMs}`,
        drawing: drawingHash,
        image: `https://ipfs.io/ipfs/${imageHash}`,
        external_url: `https://nifty.ink/${drawingHash}`,
      };

      const inkStr = JSON.stringify(currentInk);
      const inkBuffer = Buffer.from(inkStr);

      const jsonHash = await Hash.of(inkBuffer);
      console.log("jsonHash", jsonHash);

      let drawingResultInfura;
      let imageResultInfura;
      let inkResultInfura;

      try {
        const drawingResult = addToIPFS(drawingBuffer);
        const imageResult = addToIPFS(imageBuffer);
        const inkResult = addToIPFS(inkBuffer);

        // drawingResultInfura = addToIPFS(drawingBuffer, props.ipfsConfigInfura);
        // imageResultInfura = addToIPFS(imageBuffer, props.ipfsConfigInfura);
        // inkResultInfura = addToIPFS(inkBuffer, props.ipfsConfigInfura);

        await Promise.all([drawingResult, imageResult, inkResult]).then(values => {
          console.log("FINISHED UPLOADING TO PINNER", values);
          message.destroy();
        });
      } catch (e) {
        console.log(e);
        setSending(false);
        notification.error("📛 Ink upload failed. Please wait a moment and try again ${e.message}");

        return;
      }

      await checkAddressAndFund(connectedAddress);

      try {
        await writeYourContractAsync({
          functionName: "createInk",
          args: [drawingHash, jsonHash, values.limit.toString()],
        });

        Promise.all([drawingResultInfura, imageResultInfura, inkResultInfura]).then(values => {
          console.log("INFURA FINISHED UPLOADING!", values);
        });

        router.push("/ink/" + drawingHash);
        setSending(false);
        handleChangeDrawing("");
      } catch (e) {
        console.log(e);
        setSending(false);
      }
    },
    [drawingCanvas, connectedAddress, router, writeYourContractAsync],
  );

  return { createInk, sending, setSending };
};
