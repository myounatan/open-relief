import type { NextApiRequest, NextApiResponse } from "next";
import { createWalletClient, http, decodeEventLog, keccak256, toHex } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

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
    console.error('Failed to decode UserVerified event:', error);
    throw new Error('Invalid UserVerified event data');
  }
}

/**
 * Process identity verification by calling claimRelief
 */
async function processIdentityVerification(
  eventData: {
    nullifier: bigint;
    userIdentifier: bigint;
    nationality: string;
    userAddress: string;
    reliefPoolId: string;
    timestamp: bigint;
  }
): Promise<string> {
  console.log(`🚀 Processing identity verification for user: ${eventData.userAddress}`);
  console.log(`📋 Pool ID: ${eventData.reliefPoolId}`);
  console.log(`🌍 Nationality: ${eventData.nationality}`);

  // Set up admin wallet
  const adminPrivateKey = process.env.ADMIN_PRIVATE_KEY;
  const reliefPoolsAddress = process.env.NEXT_PUBLIC_POOL_CONTRACT_ADDRESS;

  if (!adminPrivateKey || !reliefPoolsAddress) {
    throw new Error("Missing required environment variables: ADMIN_PRIVATE_KEY or NEXT_PUBLIC_POOL_CONTRACT_ADDRESS");
  }

  const account = privateKeyToAccount(adminPrivateKey as `0x${string}`);
  
  // Create wallet client for Base Sepolia
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http("https://base-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET"),
  });

  // Call claimRelief on ReliefPools contract
  console.log("📋 Calling claimRelief on ReliefPools contract...");
  const claimReliefTx = await walletClient.writeContract({
    address: reliefPoolsAddress as `0x${string}`,
    abi: RELIEF_POOLS_ABI,
    functionName: "claimRelief",
    args: [
      eventData.reliefPoolId,
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

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📨 Received webhook payload:', JSON.stringify(req.body, null, 2));

    const { type, event } = req.body;

    // Validate webhook type
    if (type !== 'ADDRESS_ACTIVITY') {
      console.log(`⚠️  Ignoring webhook type: ${type}`);
      return res.status(200).json({ message: 'Webhook received but not processed' });
    }

    // Validate activity type
    if (event?.activity?.[0]?.category !== 'external') {
      console.log('⚠️  Ignoring non-external activity');
      return res.status(200).json({ message: 'Webhook received but not processed' });
    }

    const activity = event.activity[0];
    const transactionHash = activity.hash;

    // Check if we've already processed this transaction
    if (processedEvents.has(transactionHash)) {
      console.log(`⚠️  Transaction already processed: ${transactionHash}`);
      return res.status(200).json({ message: 'Transaction already processed' });
    }

    // Find UserVerified event in the logs
    const userVerifiedEventSignature = keccak256(toHex('UserVerified(uint256,uint256,string,address,string,uint256)'));
    const userVerifiedLog = activity.log?.find((log: any) => 
      log.topics && log.topics[0] === userVerifiedEventSignature
    );

    if (!userVerifiedLog) {
      console.log('⚠️  UserVerified event not found in transaction logs');
      return res.status(200).json({ message: 'UserVerified event not found' });
    }

    // Decode the UserVerified event
    const eventData = decodeUserVerifiedEvent(userVerifiedLog);
    
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
    processedEvents.add(transactionHash);

    console.log(`🎉 Identity verification processed successfully: ${txHash}`);
    
    return res.status(200).json({
      message: 'Identity verification processed successfully',
      claimReliefTx: txHash,
    });

  } catch (error) {
    console.error('❌ Error processing identity verification webhook:', error);
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
} 