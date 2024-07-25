"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { InkCanvas } from "./InkCanvas";
import { InkDetails } from "./InkDetails";
import { InkHistory } from "./InkHistory";
import { useQuery } from "@apollo/client";
import { Tabs, Typography } from "antd";
import * as uint8arrays from "uint8arrays";
import { useAccount } from "wagmi";
import { INK_QUERY } from "~~/apollo/queries";
import { Address } from "~~/components/scaffold-eth";
import { getFromIPFS } from "~~/utils/ipfs";

const { TabPane } = Tabs;

const ViewInk = ({ params }: { params: { inkId: string } }) => {
  const inkId = params?.inkId;
  const { address: connectedAddress } = useAccount();
  const [blockNumber, setBlockNumber] = useState(0);
  const [inkJson, setInkJson] = useState({});

  const {
    loading,
    error,
    data: dataRaw,
  } = useQuery(INK_QUERY, {
    variables: {
      inkUrl: inkId,
      liker: connectedAddress ? connectedAddress.toLowerCase() : "",
    },
    pollInterval: 5000,
  });

  useEffect(() => {
    const getInk = async (_data: any) => {
      const _blockNumber = parseInt(_data.metaData.value);
      if (_blockNumber >= blockNumber) {
        const timeout = 10000;
        const newInkJson = await getFromIPFS(_data.ink.jsonUrl, timeout);

        setBlockNumber(_blockNumber);
        setInkJson(JSON.parse(uint8arrays.toString(newInkJson)));
      }
    };

    dataRaw && dataRaw.ink ? getInk(dataRaw) : console.log("loading");
  }, [dataRaw]);

  return (
    <div className="flex justify-center">
      <div className="max-w-3xl flex flex-col mt-2">
        {connectedAddress && dataRaw?.ink && (
          <InkCanvas ink={dataRaw?.ink} inkJson={inkJson} connectedAddress={connectedAddress} inkId={inkId} />
        )}

        <div className="flex flex-col items-center text-center mb-5 mt-3">
          <Typography>
            <span style={{ verticalAlign: "middle", fontSize: 16 }}>{" artist: "}</span>
          </Typography>
          <Link href={`/artist/${dataRaw?.ink?.artist?.id}`}>
            <Address address={dataRaw?.ink?.artist?.id} size="2xl" disableAddressLink />
          </Link>
          <Typography>
            <span className="text-base">
              {dataRaw?.ink?.createdAt &&
                new Date(parseInt(dataRaw?.ink?.createdAt) * 1000).toLocaleString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
            </span>
          </Typography>
        </div>

        <Tabs centered defaultActiveKey="1" size="large" type="card">
          <TabPane tab="Details" key="1">
            {connectedAddress && dataRaw?.ink && (
              <InkDetails ink={dataRaw?.ink} inkId={inkId} connectedAddress={connectedAddress} inkJson={inkJson} />
            )}
          </TabPane>
          <TabPane tab="History" key="2" className="w-full">
            <InkHistory inkTokenTransfers={dataRaw?.ink?.tokenTransfers} />
          </TabPane>
        </Tabs>
      </div>
    </div>
  );
};

export default ViewInk;
