import React, { createContext, useContext, useEffect, useState } from "react";

// Define the types based on the schema
interface DonationMade {
  id: string;
  poolId: string;
  donor: string;
  sourceDomain: string;
  amount: string;
  timestamp: string;
  location: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface FundsClaimed {
  id: string;
  poolId: string;
  claimer: string;
  recipient: string;
  nullifier: string;
  userIdentifier: string;
  nationality: string;
  amount: string;
  timestamp: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface OwnershipTransferred {
  id: string;
  previousOwner: string;
  newOwner: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface PoolStatusChanged {
  id: string;
  poolId: string;
  isActive: boolean;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface ReliefPoolCreated {
  id: string;
  poolId: string;
  disasterType: number;
  classification: number;
  nationalityRequired: string;
  allocatedFundsPerPerson: string;
  blockNumber: string;
  blockTimestamp: string;
  transactionHash: string;
}

interface GraphQLData {
  donationMades: DonationMade[];
  fundsClaimeds: FundsClaimed[];
  ownershipTransferreds: OwnershipTransferred[];
  poolStatusChangeds: PoolStatusChanged[];
  reliefPoolCreateds: ReliefPoolCreated[];
}

interface GraphQLContextType {
  data: GraphQLData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const GraphQLContext = createContext<GraphQLContextType | undefined>(undefined);

// GraphQL query to fetch all data
const ALL_DATA_QUERY = `
  query GetAllData {
    donationMades(orderBy: blockTimestamp, orderDirection: desc) {
      id
      poolId
      donor
      sourceDomain
      amount
      timestamp
      location
      blockNumber
      blockTimestamp
      transactionHash
    }
    fundsClaimeds(orderBy: blockTimestamp, orderDirection: desc) {
      id
      poolId
      claimer
      recipient
      nullifier
      userIdentifier
      nationality
      amount
      timestamp
      blockNumber
      blockTimestamp
      transactionHash
    }
    reliefPoolCreateds(orderBy: blockTimestamp, orderDirection: desc) {
      id
      poolId
      disasterType
      classification
      nationalityRequired
      allocatedFundsPerPerson
      blockNumber
      blockTimestamp
      transactionHash
    }
  }
`;

export const GraphQLProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [data, setData] = useState<GraphQLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_GRAPH_URL || "", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: ALL_DATA_QUERY,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.errors) {
        throw new Error(result.errors[0].message);
      }

      setData(result.data);
      setError(null);
    } catch (err) {
      console.error("GraphQL fetch error:", err);
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
    } finally {
      setLoading(false);
    }
  };

  const refetch = () => {
    setLoading(true);
    fetchData();
  };

  useEffect(() => {
    // Initial fetch
    fetchData();

    // Remove periodic polling - we'll refetch manually on QR code success
    // const interval = setInterval(fetchData, 10000);
    // return () => clearInterval(interval);
  }, []);

  const contextValue: GraphQLContextType = {
    data,
    loading,
    error,
    refetch,
  };

  return (
    <GraphQLContext.Provider value={contextValue}>
      {children}
    </GraphQLContext.Provider>
  );
};

// Custom hook to use the GraphQL context
export const useGraphQLData = () => {
  const context = useContext(GraphQLContext);
  if (context === undefined) {
    throw new Error("useGraphQLData must be used within a GraphQLProvider");
  }
  return context;
};

export default GraphQLProvider;
