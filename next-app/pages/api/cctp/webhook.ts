import axios from "axios";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  keccak256,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  arbitrumSepolia,
  baseSepolia,
  optimismSepolia,
  polygonAmoy,
  sepolia,
} from "viem/chains";

const processedTransactions = new Set<string>();

// DepositForBurn event ABI for decoding
const DEPOSIT_FOR_BURN_ABI = [
  {
    type: "event",
    name: "DepositForBurn",
    inputs: [
      { name: "burnToken", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "depositor", type: "address", indexed: true },
      { name: "mintRecipient", type: "bytes32", indexed: false },
      { name: "destinationDomain", type: "uint32", indexed: false },
      { name: "destinationTokenMessenger", type: "bytes32", indexed: false },
      { name: "destinationCaller", type: "bytes32", indexed: false },
      { name: "maxFee", type: "uint256", indexed: false },
      { name: "minFinalityThreshold", type: "uint32", indexed: true },
      { name: "hookData", type: "bytes", indexed: false },
    ],
  },
] as const;

const MESSAGE_TRANSMITTER_ABI = [
  {
    type: "function",
    name: "receiveMessage",
    inputs: [
      { name: "message", type: "bytes" },
      { name: "attestation", type: "bytes" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "usedNonces",
    inputs: [{ name: "nonce", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
] as const;

/**
 * Decode DepositForBurn event data
 */
function decodeDepositForBurnEvent(log: {
  account: { address: string };
  topics: string[];
  data: string;
}) {
  try {
    const decoded = decodeEventLog({
      abi: DEPOSIT_FOR_BURN_ABI,
      data: log.data as `0x${string}`,
      topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
    });

    return decoded.args;
  } catch (error) {
    console.error("Failed to decode DepositForBurn event:", error);
    throw new Error("Invalid DepositForBurn event data");
  }
}

const USDC_TOKENS: any = {
  ETH_SEPOLIA: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
  ARB_SEPOLIA: "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d",
  OP_SEPOLIA: "0x5fd84259d66Cd46123540766Be93DFE6D43130D7",
  POL_AMOR: "0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582",
  BASE_SEPOLIA: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

const alchemyNetworkToDomain: any = {
  ETH_SEPOLIA: 0,
  ARB_SEPOLIA: 3,
  OP_SEPOLIA: 2,
  POL_AMOR: 7,
  BASE_SEPOLIA: 6,
};

const _alchemyNetworkToChain: any = {
  ETH_SEPOLIA: sepolia,
  ARB_SEPOLIA: arbitrumSepolia,
  OP_SEPOLIA: optimismSepolia,
  POL_AMOR: polygonAmoy,
  BASE_SEPOLIA: baseSepolia,
};

const _alchemyNetworkToRPC: any = {
  ETH_SEPOLIA:
    "https://eth-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET",
  ARB_SEPOLIA:
    "https://arb-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET",
  OP_SEPOLIA:
    "https://opt-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET",
  POL_AMOR:
    "https://polygon-amoy.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET",
  BASE_SEPOLIA:
    "https://base-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET",
};

/**
 * Check if transaction is a valid relief pool donation
 */
function isReliefPoolTransaction(
  decodedEvent: any,
  usdcToken: string
): boolean {
  const reliefPoolsContract = process.env.NEXT_PUBLIC_POOL_CONTRACT_ADDRESS;

  if (!reliefPoolsContract) {
    console.error("NEXT_PUBLIC_POOL_CONTRACT_ADDRESS not configured");
    return false;
  }

  // Filter 1: mintRecipient must be ReliefPools contract
  const mintRecipientAddress = `0x${decodedEvent.mintRecipient.slice(26)}`; // Convert bytes32 to address
  if (
    mintRecipientAddress.toLowerCase() !== reliefPoolsContract.toLowerCase()
  ) {
    console.log(
      `mintRecipient ${mintRecipientAddress} != ${reliefPoolsContract}`
    );
    return false;
  }

  // Filter 2: destinationDomain must be 6 (Base Sepolia)
  if (Number(decodedEvent.destinationDomain) !== 6) {
    console.log(`destinationDomain ${decodedEvent.destinationDomain} != 6`);
    return false;
  }

  // Filter 3: Must have hookData (indicates relief pool donation)
  if (!decodedEvent.hookData || decodedEvent.hookData === "0x") {
    console.log("No hookData found");
    return false;
  }

  // Filter 4: burnToken must be USDC for this chain
  if (
    !usdcToken ||
    decodedEvent.burnToken.toLowerCase() !== usdcToken.toLowerCase()
  ) {
    console.log(`burnToken ${decodedEvent.burnToken} != ${usdcToken}`);
    return false;
  }

  return true;
}

/**
 * Retrieve attestation from Circle's API
 */
async function retrieveAttestation(
  transactionHash: string,
  alchemyNetwork: string
): Promise<any> {
  const sourceDomain = alchemyNetworkToDomain[alchemyNetwork];
  const url = `https://iris-api-sandbox.circle.com/v2/messages/${sourceDomain}?transactionHash=${transactionHash}`;

  console.log(`🔍 Fetching attestation from: ${url}`);
  console.log(`📊 Source domain: ${sourceDomain}`);
  console.log(`🏷️ Transaction hash: ${transactionHash}`);

  let attempts = 0;
  const maxAttempts = 60; // 5 minutes with 5-second intervals
  const startTime = Date.now();

  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(url);
      const elapsedTime = Math.round((Date.now() - startTime) / 1000);

      if (response.status === 404) {
        console.log(
          `⏳ Attestation not found yet... (attempt ${attempts + 1}/${maxAttempts}, elapsed: ${elapsedTime}s)`
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
        continue;
      }

      const messageData = response.data?.messages?.[0];
      if (!messageData) {
        console.log(
          `⏳ No message data yet... (attempt ${attempts + 1}/${maxAttempts}, elapsed: ${elapsedTime}s)`
        );
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
        continue;
      }

      const status = messageData.status;
      console.log(
        `📊 Attestation status: ${status} (attempt ${attempts + 1}/${maxAttempts}, elapsed: ${elapsedTime}s)`
      );

      if (status === "complete") {
        console.log(
          `✅ Attestation retrieved successfully after ${elapsedTime}s`
        );
        console.log(`📋 Message length: ${messageData.message?.length || 0}`);
        console.log(
          `📋 Attestation length: ${messageData.attestation?.length || 0}`
        );

        // Validate the attestation data
        if (!messageData.message || !messageData.attestation) {
          throw new Error(
            "Complete attestation is missing message or attestation data"
          );
        }

        return messageData;
      }

      // Handle other statuses
      if (
        status === "pending" ||
        status === "processing" ||
        status === "pending_confirmations"
      ) {
        console.log(
          `⏳ Attestation still ${status}... (attempt ${attempts + 1}/${maxAttempts}, elapsed: ${elapsedTime}s)`
        );
      } else {
        console.log(
          `⚠️ Unexpected status: ${status} (attempt ${attempts + 1}/${maxAttempts}, elapsed: ${elapsedTime}s)`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    } catch (error: any) {
      const elapsedTime = Math.round((Date.now() - startTime) / 1000);
      console.error(
        `❌ Error fetching attestation (attempt ${attempts + 1}/${maxAttempts}, elapsed: ${elapsedTime}s):`,
        error.message
      );

      if (error.response) {
        console.error(`🔴 Response status: ${error.response.status}`);
        console.error(`🔴 Response data:`, error.response.data);
      }

      // Check if it's a rate limit error
      if (error.response?.status === 429) {
        console.log("⏳ Rate limited, waiting longer...");
        await new Promise((resolve) => setTimeout(resolve, 10000)); // Wait 10 seconds for rate limit
      } else {
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }

      attempts++;
    }
  }

  const totalTime = Math.round((Date.now() - startTime) / 1000);
  throw new Error(
    `Attestation timeout after ${totalTime}s - transfer may still be processing`
  );
}

/**
 * Check if message has already been processed
 */
async function isMessageAlreadyProcessed(
  messageBytes: string,
  messageTransmitterAddress: string
): Promise<boolean> {
  try {
    console.log("🔍 Checking if message has already been processed...");

    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(
        "https://base-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET"
      ),
    });

    // Get message hash from message bytes
    const messageHash = keccak256(messageBytes as `0x${string}`);
    console.log(`📋 Message hash: ${messageHash}`);

    const isUsed = await publicClient.readContract({
      address: messageTransmitterAddress as `0x${string}`,
      abi: MESSAGE_TRANSMITTER_ABI,
      functionName: "usedNonces",
      args: [messageHash],
    });

    console.log(`📊 Message already processed: ${isUsed}`);
    return isUsed as boolean;
  } catch (error: any) {
    console.error("❌ Error checking if message is processed:", error.message);
    return false; // If we can't check, assume it's not processed
  }
}

/**
 * Estimate gas for receiveMessage to catch revert reasons early
 */
async function estimateReceiveMessageGas(
  messageTransmitterAddress: string,
  messageHex: string,
  attestationHex: string,
  adminPrivateKey: string
): Promise<void> {
  try {
    console.log("⛽ Estimating gas for receiveMessage...");

    // Create a separate public client for gas estimation (following the working example pattern)
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(
        "https://base-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET"
      ),
    });

    // Estimate gas using the public client with the admin account
    const gas = await publicClient.estimateContractGas({
      address: messageTransmitterAddress as `0x${string}`,
      abi: MESSAGE_TRANSMITTER_ABI,
      functionName: "receiveMessage",
      args: [messageHex as `0x${string}`, attestationHex as `0x${string}`],
      account: privateKeyToAccount(adminPrivateKey as `0x${string}`),
    });

    console.log(`✅ Gas estimate successful: ${gas}`);
  } catch (error: any) {
    console.error("❌ Gas estimation failed:", error.message);

    // Check for race condition errors (message already processed by another service)
    if (
      error.message.includes("Invalid signature") ||
      error.message.includes("not attester")
    ) {
      console.log(
        "🔄 Gas estimation failed with attestation error - checking if message was processed by another service..."
      );

      // Check if the message was processed while we were attempting gas estimation
      const isProcessedNow = await isMessageAlreadyProcessed(
        messageHex,
        messageTransmitterAddress
      );

      if (isProcessedNow) {
        console.log(
          "✅ Message was processed by another service during gas estimation - this is a race condition, not an error"
        );
        // Throw a special error that indicates race condition, not a real error
        throw new Error("RACE_CONDITION_PROCESSED");
      }

      // If message is still not processed, this is a genuine attestation error
      console.log(
        "❌ Message still not processed, this appears to be a genuine attestation error"
      );

      if (error.message.includes("Invalid signature")) {
        throw new Error(
          "Invalid attestation signature - the message may have already been processed or the attestation is invalid"
        );
      }
      if (error.message.includes("not attester")) {
        throw new Error(
          "Attestation not signed by valid attester - this usually means the message has already been processed"
        );
      }
    }

    if (error.message.includes("execution reverted")) {
      throw new Error(`Transaction would revert: ${error.message}`);
    }

    throw error;
  }
}

/**
 * Process cross-chain donation by calling receiveMessage
 */
async function processCrossChainDonation(
  transactionHash: string,
  alchemyNetwork: string
): Promise<string> {
  console.log(
    `🚀 Processing cross-chain donation: ${transactionHash} from ${alchemyNetwork}`
  );

  // Step 1: Retrieve attestation
  console.log("📡 Retrieving attestation from Circle...");
  const attestation = await retrieveAttestation(
    transactionHash,
    alchemyNetwork
  );
  console.log("✅ Attestation retrieved:", {
    messageLength: attestation.message?.length,
    attestationLength: attestation.attestation?.length,
    hasMessage: !!attestation.message,
    hasAttestation: !!attestation.attestation,
  });

  // Step 2: Validate attestation data
  if (!attestation.message || !attestation.attestation) {
    throw new Error("Invalid attestation data: missing message or attestation");
  }

  const messageHex = attestation.message;
  const attestationHex = attestation.attestation;

  // Step 3: Set up admin wallet
  const adminPrivateKey = `${process.env.ADMIN_PRIVATE_KEY}`;
  const messageTransmitterAddress = `${process.env.MESSAGE_TRANSMITTER_V2}`;

  if (!adminPrivateKey || !messageTransmitterAddress) {
    throw new Error(
      "Missing required environment variables: ADMIN_PRIVATE_KEY or MESSAGE_TRANSMITTER_V2"
    );
  }

  console.log(`🔧 Using MessageTransmitter: ${messageTransmitterAddress}`);

  // Step 4: Check if message has already been processed
  const isProcessed = await isMessageAlreadyProcessed(
    messageHex,
    messageTransmitterAddress
  );

  if (isProcessed) {
    console.log("⏭️ Message has already been processed, skipping...");
    return "already_processed";
  }

  // Step 5: Set up wallet client
  const account = privateKeyToAccount(adminPrivateKey as `0x${string}`);

  // Create wallet client for Base Sepolia (destination chain)
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(
      "https://base-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET"
    ),
  });

  console.log(`👤 Using admin wallet: ${account.address}`);

  // Step 6: Estimate gas to catch revert reasons early
  try {
    await estimateReceiveMessageGas(
      messageTransmitterAddress,
      messageHex,
      attestationHex,
      adminPrivateKey
    );
  } catch (error: any) {
    // Handle race condition detected during gas estimation
    if (error.message === "RACE_CONDITION_PROCESSED") {
      console.log(
        "✅ Message was processed by another service during gas estimation, skipping..."
      );
      return "processed_by_another_service";
    }

    // Re-throw other errors
    throw error;
  }

  // Step 7: Final check before transaction to handle race conditions
  console.log("🔍 Final check - ensuring message is still unprocessed...");
  const isFinallyProcessed = await isMessageAlreadyProcessed(
    messageHex,
    messageTransmitterAddress
  );

  if (isFinallyProcessed) {
    console.log(
      "✅ Message was processed by another service during gas estimation, skipping transaction..."
    );
    return "processed_during_estimation";
  }

  // Step 8: Call receiveMessage on MessageTransmitterV2
  console.log("📋 Calling receiveMessage on MessageTransmitterV2...");
  console.log(`📤 Message: ${messageHex.slice(0, 100)}...`);
  console.log(`📤 Attestation: ${attestationHex.slice(0, 100)}...`);

  try {
    const receiveMessageTx = await walletClient.writeContract({
      address: messageTransmitterAddress as `0x${string}`,
      abi: MESSAGE_TRANSMITTER_ABI,
      functionName: "receiveMessage",
      args: [messageHex, attestationHex],
      gas: 500000n, // Set reasonable gas limit
    });

    console.log(
      `✅ receiveMessage transaction successful: ${receiveMessageTx}`
    );
    console.log(
      `🔗 Transaction URL: https://base-sepolia.blockscout.com/tx/${receiveMessageTx}`
    );

    return receiveMessageTx;
  } catch (error: any) {
    // Handle transaction-level race conditions
    if (
      error.message.includes("not attester") ||
      error.message.includes("Invalid signature")
    ) {
      console.log(
        "🔄 Transaction failed with 'not attester' - checking if message was processed during transaction..."
      );

      const isProcessedDuringTx = await isMessageAlreadyProcessed(
        messageHex,
        messageTransmitterAddress
      );

      if (isProcessedDuringTx) {
        console.log(
          "✅ Message was processed by another service during transaction, this is expected..."
        );
        return "processed_during_transaction";
      }
    }

    // Re-throw other errors
    throw error;
  }
}

/**
 * Webhook handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload: any = req.body;
  const startTime = Date.now();

  try {
    console.log("🎣 Received CCTP webhook");
    console.log(`📊 Webhook ID: ${payload.webhookId}`);
    console.log(`📊 Event type: ${payload.type}`);
    console.log(`📊 Event network: ${payload.event?.network}`);

    // Validate payload structure
    if (!payload.event?.data) {
      console.error("❌ Invalid webhook payload: missing event data");
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    if (processedTransactions.has(payload.webhookId)) {
      console.log(
        `⏭️⏭️⏭️ Skipping already processed transaction: ${payload.webhookId}`
      );
      return res.status(200).json({
        success: true,
        message: "Already processed",
      });
    }
    processedTransactions.add(payload.webhookId);

    // Get source chain from URL parameter
    const alchemyNetwork = payload.event.network; // ETH_SEPOLIA, ARB_SEPOLIA, etc.
    const usdcToken = USDC_TOKENS[alchemyNetwork];

    console.log(`📡 Processing webhook from network: ${alchemyNetwork}`);
    console.log(`📡 USDC token address: ${usdcToken}`);
    console.log(
      `📡 Number of logs: ${payload.event.data.block.logs?.length || 0}`
    );

    if (!usdcToken) {
      console.error(`❌ Unsupported network: ${alchemyNetwork}`);
      return res
        .status(400)
        .json({ error: `Unsupported network: ${alchemyNetwork}` });
    }

    let processedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Process each log in the webhook
    for (const log of payload.event.data.block.logs) {
      const logStartTime = Date.now();
      try {
        console.log(`\n🔍 Processing log from tx: ${log.transaction.hash}`);

        // Decode the DepositForBurn event
        const decodedEvent = decodeDepositForBurnEvent(log);
        console.log(
          `📋 Decoded event - Amount: ${decodedEvent.amount}, Domain: ${decodedEvent.destinationDomain}`
        );

        // Check if this is a relief pool transaction
        if (!isReliefPoolTransaction(decodedEvent, usdcToken)) {
          console.log(
            `⏭️ Skipping non-relief-pool transaction: ${log.transaction.hash}`
          );
          skippedCount++;
          continue;
        }

        console.log(
          `✅ Valid relief pool donation detected: ${log.transaction.hash}`
        );
        console.log(`💰 Amount: ${decodedEvent.amount}`);
        console.log(`🎯 Destination domain: ${decodedEvent.destinationDomain}`);
        console.log(`📍 Mint recipient: ${decodedEvent.mintRecipient}`);

        // Process the cross-chain donation
        console.log("🔄 Starting cross-chain processing...");
        const receiveMessageTx = await processCrossChainDonation(
          log.transaction.hash,
          alchemyNetwork
        );

        const logElapsedTime = Math.round((Date.now() - logStartTime) / 1000);

        // Handle different success cases
        if (receiveMessageTx.startsWith("0x")) {
          console.log(
            `🎉 Successfully processed donation in ${logElapsedTime}s: ${receiveMessageTx}`
          );
          processedCount++;
        } else {
          // Race condition cases (already_processed, processed_by_another_service, etc.)
          console.log(
            `✅ Donation handled in ${logElapsedTime}s: ${receiveMessageTx}`
          );
          processedCount++; // Still count as successful, just handled differently
        }
      } catch (error: any) {
        const logElapsedTime = Math.round((Date.now() - logStartTime) / 1000);
        console.error(
          `❌ Failed to process transaction ${log.transaction.hash} after ${logElapsedTime}s:`,
          error.message
        );
        console.error(`🔴 Error details:`, error.stack);
        errorCount++;
        // Continue processing other transactions even if one fails
      }
    }

    const totalElapsedTime = Math.round((Date.now() - startTime) / 1000);
    console.log(`\n📊 Webhook processing complete in ${totalElapsedTime}s:`);
    console.log(`✅ Processed: ${processedCount}`);
    console.log(`⏭️ Skipped: ${skippedCount}`);
    console.log(`❌ Errors: ${errorCount}`);

    return res.status(200).json({
      success: true,
      processed: processedCount,
      skipped: skippedCount,
      errors: errorCount,
      processingTime: totalElapsedTime,
    });
  } catch (error: any) {
    const totalElapsedTime = Math.round((Date.now() - startTime) / 1000);
    console.error(
      `❌ Webhook processing failed after ${totalElapsedTime}s:`,
      error.message
    );
    console.error(`🔴 Error details:`, error.stack);

    // remove webhookId from processedTransactions on failure
    processedTransactions.delete(payload.webhookId);

    return res.status(500).json({
      success: false,
      error: error.message,
      processingTime: totalElapsedTime,
    });
  }
}
