import React, { useState, useEffect } from "react";
import { ethers } from "ethers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Wallet, Send, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function transfer(address to, uint amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "event Transfer(address indexed from, address indexed to, uint amount)",
];

const TransactionStatus = {
  NONE: "none",
  PENDING: "pending",
  CONFIRMED: "confirmed",
  FAILED: "failed",
};

export default function TokenTransfer() {
  const [account, setAccount] = useState("");
  const [tokenContract, setTokenContract] = useState(null);
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [balance, setBalance] = useState("0");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [txStatus, setTxStatus] = useState(TransactionStatus.NONE);
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [estimatedTime, setEstimatedTime] = useState(null);

  useEffect(() => {
    const loadSavedTxState = () => {
      const savedTx = localStorage.getItem("currentTransaction");
      if (savedTx) {
        const txData = JSON.parse(savedTx);
        setTxHash(txData.hash);
        setTxStatus(txData.status);
        monitorTransaction(txData.hash);
      }
    };

    loadSavedTxState();

    window.addEventListener("storage", (e) => {
      if (e.key === "currentTransaction") {
        const txData = JSON.parse(e.newValue);
        setTxHash(txData.hash);
        setTxStatus(txData.status);
      }
    });
  }, []);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        throw new Error("Please install MetaMask to use this app");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);

      const tokenAddress = "0x6B175474E89094C44Da98b954EedeAC495271d0F";
      const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      setTokenContract(contract);

      const symbol = await contract.symbol();
      setTokenSymbol(symbol);

      const balance = await contract.balanceOf(accounts[0]);
      const decimals = await contract.decimals();
      setBalance(ethers.formatUnits(balance, decimals));
    } catch (err) {
      setError(err.message);
    }
  };

  const monitorTransaction = async (hash) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const tx = await provider.getTransaction(hash);

      const gasPrice = await provider.getGasPrice();
      const estimatedMins = Math.ceil((Number(gasPrice) / 1e9) * 2);
      setEstimatedTime(estimatedMins);

      const receipt = await tx.wait();

      if (receipt.status === 1) {
        setTxStatus(TransactionStatus.CONFIRMED);
        updateLocalStorage(hash, TransactionStatus.CONFIRMED);
      } else {
        setTxStatus(TransactionStatus.FAILED);
        updateLocalStorage(hash, TransactionStatus.FAILED);
      }
    } catch (err) {
      setTxStatus(TransactionStatus.FAILED);
      updateLocalStorage(hash, TransactionStatus.FAILED);
      setError(err.message);
    }
  };

  const updateLocalStorage = (hash, status) => {
    const txData = { hash, status };
    localStorage.setItem("currentTransaction", JSON.stringify(txData));
  };

  const sendTokens = async () => {
    try {
      if (!tokenContract || !recipient || !amount) {
        throw new Error("Please fill in all fields");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = tokenContract.connect(signer);

      const decimals = await contract.decimals();
      const amountInWei = ethers.parseUnits(amount, decimals);

      const tx = await contract.transfer(recipient, amountInWei);
      setTxHash(tx.hash);
      setTxStatus(TransactionStatus.PENDING);
      updateLocalStorage(tx.hash, TransactionStatus.PENDING);

      monitorTransaction(tx.hash);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg backdrop-blur-lg bg-white/10 border-0 shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent">
            Send {tokenSymbol || "ERC20"} Tokens
          </CardTitle>
          <p className="text-gray-400">
            Transfer tokens securely to any address
          </p>
        </CardHeader>
        <CardContent>
          {!account ? (
            <Button
              onClick={connectWallet}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] text-white font-medium py-6"
            >
              <Wallet className="mr-2 h-5 w-5" />
              Connect Wallet
            </Button>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-800/50 rounded-lg p-4 backdrop-blur-sm">
                <p className="text-gray-400">Connected Account</p>
                <p className="text-lg font-mono text-gray-200">
                  {account.slice(0, 6)}...{account.slice(-4)}
                </p>
                <div className="mt-2 flex items-center">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse mr-2" />
                  <p className="text-xl font-semibold text-gray-200">
                    {balance}{" "}
                    <span className="text-blue-400">{tokenSymbol}</span>
                  </p>
                </div>
              </div>

              <Input
                placeholder="Recipient Address"
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="bg-gray-800/30 border-gray-700 text-gray-200 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"
              />

              <Input
                placeholder="Amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-gray-800/30 border-gray-700 text-gray-200 placeholder-gray-500 focus:ring-blue-500 focus:border-blue-500"
              />

              <Button
                onClick={sendTokens}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none py-6"
                disabled={txStatus === TransactionStatus.PENDING}
              >
                {txStatus === TransactionStatus.PENDING ? (
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Send className="mr-2 h-5 w-5" />
                )}
                {txStatus === TransactionStatus.PENDING
                  ? "Processing..."
                  : "Send Tokens"}
              </Button>

              {txStatus !== TransactionStatus.NONE && (
                <div
                  className={`rounded-lg p-4 backdrop-blur-sm transition-all duration-300 ${
                    txStatus === TransactionStatus.CONFIRMED
                      ? "bg-green-500/20 border border-green-500/30"
                      : txStatus === TransactionStatus.FAILED
                      ? "bg-red-500/20 border border-red-500/30"
                      : "bg-blue-500/20 border border-blue-500/30"
                  }`}
                >
                  <div className="flex items-center">
                    {txStatus === TransactionStatus.CONFIRMED && (
                      <CheckCircle2 className="h-5 w-5 text-green-400 mr-2" />
                    )}
                    {txStatus === TransactionStatus.PENDING && (
                      <Loader2 className="h-5 w-5 text-blue-400 animate-spin mr-2" />
                    )}
                    {txStatus === TransactionStatus.FAILED && (
                      <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    )}
                    <p className="font-medium text-gray-200">
                      {txStatus === TransactionStatus.PENDING &&
                        "Transaction Pending"}
                      {txStatus === TransactionStatus.CONFIRMED &&
                        "Transaction Confirmed"}
                      {txStatus === TransactionStatus.FAILED &&
                        "Transaction Failed"}
                    </p>
                  </div>
                  <div className="mt-2 text-sm text-gray-400">
                    {txStatus === TransactionStatus.PENDING &&
                      estimatedTime &&
                      `Estimated confirmation time: ~${estimatedTime} minutes`}
                    {txHash && (
                      <a
                        href={`https://etherscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block mt-2 text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        View on Etherscan →
                      </a>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 backdrop-blur-sm">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                    <p className="font-medium text-gray-200">Error</p>
                  </div>
                  <p className="mt-2 text-sm text-gray-400">{error}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
