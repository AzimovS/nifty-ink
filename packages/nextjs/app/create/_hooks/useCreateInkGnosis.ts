import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import * as Hash from "ipfs-only-hash";
import LZ from "lz-string";
import { useScaffoldWriteContract } from "~~/hooks/scaffold-eth";
import { checkAddressAndFund } from "~~/utils/checkAddressAndFund";
import { addToIPFS } from "~~/utils/ipfs";
import { notification } from "~~/utils/scaffold-eth";

export const useCreateInkGnosis = (drawingCanvas: any, connectedAddress: string) => {
  const router = useRouter();
  const [sending, setSending] = useState<boolean>(false);
  const { writeContractAsync: writeYourContractAsync } = useScaffoldWriteContract("NiftyInk");

  const createInkGnosis = useCallback(
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
        setSending(false);
        notification.error(`📛 Ink upload failed. Please wait a moment and try again ${(e as Error).message}`);
        return;
      }

      try {
        await writeYourContractAsync({
          functionName: "createInk",
          args: [drawingHash, jsonHash, values.limit.toString()],
        });

        Promise.all([drawingResultInfura, imageResultInfura, inkResultInfura]).then(values => {
          console.log("INFURA FINISHED UPLOADING!", values);
        });

        router.push("/ink/" + drawingHash);
      } catch (e) {
        console.log(e);
      } finally {
        setSending(false);
      }
    },
    [drawingCanvas, writeYourContractAsync],
  );

  return { createInkGnosis, sending };
};
