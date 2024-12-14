// pages/api/pinJsonWithPinata.ts
import type { NextApiRequest, NextApiResponse } from "next";

const PINATA_JWT = process.env.PINATA_JWT;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const json = req.body;

    const data = JSON.stringify({
      pinataContent: json,
      pinataMetadata: {
        name: "metadata.json",
      },
    });

    const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${PINATA_JWT}`,
      },
      body: data,
    });

    if (!response.ok) {
      throw new Error("Failed to pin JSON to IPFS");
    }

    const result = (await response.json()) as { IpfsHash: string };

    res.status(200).json({ ipfsUrl: `ipfs://${result.IpfsHash}` });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    res.status(500).json({ error: errorMessage });
  }
}
