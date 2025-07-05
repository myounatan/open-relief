import type { NextApiRequest, NextApiResponse } from "next";
import axios from "axios";
import { createWalletClient, createPublicClient, http, decodeEventLog, keccak256, decodeAbiParameters, toHex } from "viem";
import { baseSepolia, sepolia, arbitrumSepolia, optimismSepolia, polygonAmoy } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

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
] as const;

/**
 * Decode DepositForBurn event data
 */
function decodeDepositForBurnEvent(log: { account: { address: string; }; topics: string[]; data: string }) {
  try {
    const decoded = decodeEventLog({
      abi: DEPOSIT_FOR_BURN_ABI,
      data: log.data as `0x${string}`,
      topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
    });
    
    return decoded.args;
  } catch (error) {
    console.error('Failed to decode DepositForBurn event:', error);
    throw new Error('Invalid DepositForBurn event data');
  }
}

const USDC_TOKENS: any = {
  'ETH_SEPOLIA': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
  'ARB_SEPOLIA': '0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d',
  'OP_SEPOLIA': '0x5fd84259d66Cd46123540766Be93DFE6D43130D7',
  'POL_AMOR': '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
  'BASE_SEPOLIA': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
}

const alchemyNetworkToDomain: any = {
  'ETH_SEPOLIA': 0,
  'ARB_SEPOLIA': 3,
  'OP_SEPOLIA': 2,
  'POL_AMOR': 7,
  'BASE_SEPOLIA': 6,
}

const alchemyNetworkToChain: any = {
  'ETH_SEPOLIA': sepolia,
  'ARB_SEPOLIA': arbitrumSepolia,
  'OP_SEPOLIA': optimismSepolia,
  'POL_AMOR': polygonAmoy,
  'BASE_SEPOLIA': baseSepolia,
}

const alchemyNetworkToRPC: any = {
  'ETH_SEPOLIA': 'https://eth-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET',
  'ARB_SEPOLIA': 'https://arb-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET',
  'OP_SEPOLIA': 'https://opt-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET',
  'POL_AMOR': 'https://polygon-amoy.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET',
  'BASE_SEPOLIA': 'https://base-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET',
}

/**
 * Check if transaction is a valid relief pool donation
 */
function isReliefPoolTransaction(
  decodedEvent: any,
  usdcToken: string
): boolean {
  const reliefPoolsContract = process.env.NEXT_PUBLIC_POOL_CONTRACT_ADDRESS;
  
  if (!reliefPoolsContract) {
    console.error('NEXT_PUBLIC_POOL_CONTRACT_ADDRESS not configured');
    return false;
  }

  // Filter 1: mintRecipient must be ReliefPools contract
  const mintRecipientAddress = `0x${decodedEvent.mintRecipient.slice(26)}`; // Convert bytes32 to address
  if (mintRecipientAddress.toLowerCase() !== reliefPoolsContract.toLowerCase()) {
    console.log(`mintRecipient ${mintRecipientAddress} != ${reliefPoolsContract}`);
    return false;
  }

  // Filter 2: destinationDomain must be 6 (Base Sepolia)
  if (Number(decodedEvent.destinationDomain) !== 6) {
    console.log(`destinationDomain ${decodedEvent.destinationDomain} != 6`);
    return false;
  }

  // Filter 3: Must have hookData (indicates relief pool donation)
  if (!decodedEvent.hookData || decodedEvent.hookData === '0x') {
    console.log('No hookData found');
    return false;
  }

  // Filter 4: burnToken must be USDC for this chain
  if (!usdcToken || decodedEvent.burnToken.toLowerCase() !== usdcToken.toLowerCase()) {
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

  let attempts = 0;
  const maxAttempts = 60; // 5 minutes with 5-second intervals

  while (attempts < maxAttempts) {
    try {
      const response = await axios.get(url);

      if (response.status === 404) {
        console.log(`⏳ Waiting for attestation... (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        attempts++;
        continue;
      }

      if (response.data?.messages?.[0]?.status === "complete") {
        console.log("✅ Attestation retrieved successfully");
        return response.data.messages[0];
      }

      console.log(
        `⏳ Attestation status: ${
          response.data?.messages?.[0]?.status || "pending"
        } (attempt ${attempts + 1}/${maxAttempts})`
      );
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    } catch (error: any) {
      console.error(`❌ Error fetching attestation (attempt ${attempts + 1}/${maxAttempts}):`, error.message);
      await new Promise((resolve) => setTimeout(resolve, 5000));
      attempts++;
    }
  }

  throw new Error("Attestation timeout - transfer may still be processing");
}

/**
 * Process cross-chain donation by calling receiveMessage
 */
async function processCrossChainDonation(
  transactionHash: string,
  alchemyNetwork: string
): Promise<string> {
  console.log(`🚀 Processing cross-chain donation: ${transactionHash} from ${alchemyNetwork}`);

  // Step 1: Retrieve attestation
  console.log("📡 Retrieving attestation from Circle...");
  const attestation = await retrieveAttestation(transactionHash, alchemyNetwork);
  console.log(attestation)

  // Step 2: Set up admin wallet
  const adminPrivateKey = `${process.env.ADMIN_PRIVATE_KEY}`;
  const messageTransmitterAddress = `${process.env.MESSAGE_TRANSMITTER_V2}`;

  if (!adminPrivateKey || !messageTransmitterAddress) {
    throw new Error("Missing required environment variables: ADMIN_PRIVATE_KEY or MESSAGE_TRANSMITTER_V2");
  }

  const account = privateKeyToAccount(adminPrivateKey as `0x${string}`);
  
  // Create wallet client for Base Sepolia (destination chain)
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http("https://base-sepolia.g.alchemy.com/v2/gnEEOpfvZaF3wgNmaaDN_7u00kUCctET"),
  });

  // // get messageBytes from EVM logs using txHash of the transaction.
  // const sourceChain = alchemyNetworkToChain[alchemyNetwork];
  // const sourceRPC = alchemyNetworkToRPC[alchemyNetwork];
  
  // const publicClient = createPublicClient({
  //   chain: sourceChain,
  //   transport: http(sourceRPC),
  // });

  // const transactionReceipt = await publicClient.getTransactionReceipt({
  //   hash: transactionHash as `0x${string}`,
  // });
  
  // const eventTopic = keccak256(toHex('MessageSent(bytes)'));
  // const log = transactionReceipt.logs.find((l: any) => l.topics[0] === eventTopic);
  
  // if (!log) {
  //   throw new Error('MessageSent event not found in transaction logs');
  // }
  
  // const messageBytes = decodeAbiParameters(
  //   [{ type: 'bytes' }],
  //   log.data
  // )[0];
  
  // const messageHash = keccak256(messageBytes as `0x${string}`);

  const messageHex = attestation.message;
  const attestationHex = attestation.attestation;

  // Step 3: Call receiveMessage on MessageTransmitterV2
  console.log("📋 Calling receiveMessage on MessageTransmitterV2...");
  const receiveMessageTx = await walletClient.writeContract({
    address: messageTransmitterAddress as `0x${string}`,
    abi: MESSAGE_TRANSMITTER_ABI,
    functionName: "receiveMessage",
    args: [
      messageHex,
      attestationHex,
    ],
  });

  console.log(`✅ receiveMessage transaction successful: ${receiveMessageTx}`);
  return receiveMessageTx;
}

/**
 * Webhook handler
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
    
  const payload: any = req.body;

  try {
    console.log('🎣 Received CCTP webhook');
    
    // Validate payload structure
    if (!payload.event?.data) {
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    if (processedTransactions.has(payload.webhookId)) {
      console.log(`⏭️⏭️⏭️ Skipping already processed transaction: ${payload.webhookId}`);
      return res.status(200).json({
        success: true
      });
    }
    processedTransactions.add(payload.webhookId);

    console.log(payload);

    // Get source chain from URL parameter
    const alchemyNetwork = payload.event.network; // ETH_SEPOLIA, ETH_ARBITRUM, ETH_OPTIMISM, ETH_POLYGON
    const usdcToken = USDC_TOKENS[alchemyNetwork];

    console.log(`📡 Webhook from alchemyNetwork: ${alchemyNetwork}`);
    console.log(`📡 Webhook from usdcToken: ${usdcToken}`);

    console.log(payload.event.data.block.logs)

    // Process each activity in the webhook
    for (const log of payload.event.data.block.logs) {
      try {

        // Decode the DepositForBurn event
        const decodedEvent = decodeDepositForBurnEvent(log);
        
        // Check if this is a relief pool transaction
        if (!isReliefPoolTransaction(decodedEvent, usdcToken)) {
          console.log(`⏭️  Skipping non-relief-pool transaction: ${log.transaction.hash}`);
          continue;
        }

        console.log(`✅ Valid relief pool donation detected: ${log.transaction.hash}`);
        
        // Process the cross-chain donation
        console.log('🔄 Starting cross-chain processing...');
        const receiveMessageTx = await processCrossChainDonation(
          log.transaction.hash,
          alchemyNetwork
        );
        
        console.log(`🎉 Successfully processed donation: ${receiveMessageTx}`);

      } catch (error: any) {
        console.error(`❌ Failed to process transaction ${log.transaction.hash}:`, error.message);
        // Continue processing other transactions even if one fails
      }
    }

    return res.status(200).json({
      success: true
    });

  } catch (error: any) {
    console.error('❌ Webhook processing failed:', error.message);

    // remove webhookId from processedTransactions
    processedTransactions.delete(payload.webhookId);

    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
} 