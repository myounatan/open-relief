import type { NextApiRequest, NextApiResponse } from "next";
import { createWalletClient, decodeEventLog, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// Note: The reliefPoolId in the UserVerified event is already a decoded string,
// so no hex-to-string conversion is needed in this webhook.

// UserVerified event ABI for decoding
const USER_VERIFIED_ABI = [
  {
    type: "event",
    name: "UserVerified",
    inputs: [
      { name: "nullifier", type: "uint256", indexed: true },
      { name: "userIdentifier", type: "uint256", indexed: true },
      { name: "nationality", type: "string", indexed: false },
      { name: "userAddress", type: "address", indexed: false },
      { name: "reliefPoolId", type: "string", indexed: false },
      { name: "timestamp", type: "uint256", indexed: false },
    ],
  },
] as const;

// ReliefPools contract ABI for claimRelief function
const RELIEF_POOLS_ABI = [
  {
    type: "function",
    name: "claimRelief",
    inputs: [
      { name: "poolId", type: "string" },
      { name: "nullifier", type: "uint256" },
      { name: "userIdentifier", type: "uint256" },
      { name: "nationality", type: "string" },
      { name: "timestamp", type: "uint256" },
      { name: "recipient", type: "address" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
] as const;

// Track processed events to avoid duplicates
const processedEvents = new Set<string>();

/**
 * Decode UserVerified event data
 */
function decodeUserVerifiedEvent(log: { topics: string[]; data: string }) {
  try {
    const decoded = decodeEventLog({
      abi: USER_VERIFIED_ABI,
      data: log.data as `0x${string}`,
      topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
    });

    return decoded.args;
  } catch (error) {
    console.error("Failed to decode UserVerified event:", error);
    throw new Error("Invalid UserVerified event data");
  }
}

/**
 * Process identity verification by calling claimRelief
 */
async function processIdentityVerification(eventData: {
  nullifier: bigint;
  userIdentifier: bigint;
  nationality: string;
  userAddress: string;
  reliefPoolId: string;
  timestamp: bigint;
}): Promise<string> {
  console.log(
    `🚀 Processing identity verification for user: ${eventData.userAddress}`
  );
  console.log(`📋 Pool ID: ${eventData.reliefPoolId}`);
  console.log(`🌍 Nationality: ${eventData.nationality}`);

  // Set up admin wallet
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  const reliefPoolsAddress = process.env.NEXT_PUBLIC_POOL_CONTRACT_ADDRESS;

  if (!adminPrivateKey || !reliefPoolsAddress) {
    throw new Error(
      "Missing required environment variables: ADMIN_PRIVATE_KEY or NEXT_PUBLIC_POOL_CONTRACT_ADDRESS"
    );
  }

  const account = privateKeyToAccount(adminPrivateKey as `0x${string}`);

  // Create wallet client for Base Sepolia
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(
      "https://base-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET"
    ),
  });

  const reliefPoolId = decodePoolId(eventData.reliefPoolId);

  // Call claimRelief on ReliefPools contract
  console.log("📋 Calling claimRelief on ReliefPools contract...");
  const claimReliefTx = await walletClient.writeContract({
    address: reliefPoolsAddress as `0x${string}`,
    abi: RELIEF_POOLS_ABI,
    functionName: "claimRelief",
    args: [
      reliefPoolId,
      eventData.nullifier,
      eventData.userIdentifier,
      eventData.nationality,
      eventData.timestamp,
      eventData.userAddress as `0x${string}`,
    ],
  });

  console.log(`✅ claimRelief transaction successful: ${claimReliefTx}`);
  return claimReliefTx;
}

function decodePoolId(hexString: string) {
  const cleanHex = hexString.startsWith("0x") ? hexString.slice(2) : hexString;
  const buffer = Buffer.from(cleanHex, "hex");
  return buffer.toString("utf8").replace(/\0+$/, "");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const payload: any = req.body;

  try {
    console.log("🎣 Received Identity Verification webhook");

    // Validate payload structure
    if (!payload.event?.data) {
      return res.status(400).json({ error: "Invalid webhook payload" });
    }

    if (processedEvents.has(payload.webhookId)) {
      console.log(
        `⏭️⏭️⏭️ Skipping already processed transaction: ${payload.webhookId}`
      );
      return res.status(200).json({
        success: true,
      });
    }
    processedEvents.add(payload.webhookId);

    console.log("📨 Processing webhook payload...");

    // Process each log in the webhook
    for (const log of payload.event.data.block.logs) {
      try {
        console.log(`✅ UserVerified event detected: ${log.transaction.hash}`);

        // Check if we've already processed this specific transaction
        if (processedEvents.has(log.transaction.hash)) {
          console.log(
            `⚠️  Transaction already processed: ${log.transaction.hash}`
          );
          continue;
        }

        // Decode the UserVerified event
        const eventData = decodeUserVerifiedEvent(log);

        // Process the identity verification
        const txHash = await processIdentityVerification({
          nullifier: eventData.nullifier,
          userIdentifier: eventData.userIdentifier,
          nationality: eventData.nationality,
          userAddress: eventData.userAddress,
          reliefPoolId: eventData.reliefPoolId,
          timestamp: eventData.timestamp,
        });

        // Mark as processed
        processedEvents.add(log.transaction.hash);

        console.log(
          `🎉 Identity verification processed successfully: ${txHash}`
        );
      } catch (error: any) {
        console.error(
          `❌ Failed to process transaction ${log.transaction.hash}:`,
          error.message
        );
        // Continue processing other transactions even if one fails
      }
    }

    return res.status(200).json({
      success: true,
    });
  } catch (error: any) {
    console.error("❌ Webhook processing failed:", error.message);

    // remove webhookId from processedEvents
    processedEvents.delete(payload.webhookId);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
