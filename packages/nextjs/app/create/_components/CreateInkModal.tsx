import { useState } from "react";
import { Chain } from "viem";
import { isGnosisChain } from "~~/utils/helpers";

type CreateInkModalProps = {
  modalId: string;
  chain: Chain;
};

export const CreateInkModal = ({ modalId, chain }: CreateInkModalProps) => {
  const isGnosis = isGnosisChain(chain.id);

  const [inkName, setInkName] = useState<string>("");
  const [contractName, setContractName] = useState<string>("");
  const [inkNumber, setInkNumber] = useState<number>(0);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    console.log("Contract Name:", contractName);
    console.log("Ink Number:", inkNumber);
  };

  return (
    <>
      <div>
        <input type="checkbox" id={`${modalId}`} className="modal-toggle" />
        <label htmlFor={`${modalId}`} className="modal cursor-pointer">
          <label className="modal-box relative">
            {/* dummy input to capture event onclick on modal box */}
            <input className="h-0 w-0 absolute top-0 left-0" />
            <label htmlFor={`${modalId}`} className="btn btn-ghost btn-sm btn-circle absolute right-3 top-3">
              ✕
            </label>
            <div className="space-y-3 py-6">
              <div className="flex flex-col items-center gap-2">
                <div>
                  <h2 className="text-2xl font-bold m-0">Create Ink</h2>
                  <span className="text-xs">You are about to deploy on {chain.name}</span>
                </div>
                <div className="flex justify-center">
                  <form className="form-control w-full max-w-xs" onSubmit={handleSubmit}>
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

                    {isGnosis && (
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
                          min="0" // check if minimum works
                          required
                        />
                      </div>
                    )}

                    <div className="form-control mt-6">
                      <button className="btn btn-primary" type="submit">
                        Ink!
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </label>
        </label>
      </div>
    </>
  );
};
