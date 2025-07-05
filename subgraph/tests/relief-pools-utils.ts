import { newMockEvent } from "matchstick-as"
import { ethereum, BigInt, Address } from "@graphprotocol/graph-ts"
import {
  DonationMade,
  FundsClaimed,
  OwnershipTransferred,
  PoolStatusChanged,
  ReliefPoolCreated
} from "../generated/ReliefPools/ReliefPools"

export function createDonationMadeEvent(
  poolId: BigInt,
  donor: Address,
  sourceDomain: BigInt,
  amount: BigInt,
  timestamp: BigInt,
  location: string
): DonationMade {
  let donationMadeEvent = changetype<DonationMade>(newMockEvent())

  donationMadeEvent.parameters = new Array()

  donationMadeEvent.parameters.push(
    new ethereum.EventParam("poolId", ethereum.Value.fromUnsignedBigInt(poolId))
  )
  donationMadeEvent.parameters.push(
    new ethereum.EventParam("donor", ethereum.Value.fromAddress(donor))
  )
  donationMadeEvent.parameters.push(
    new ethereum.EventParam(
      "sourceDomain",
      ethereum.Value.fromUnsignedBigInt(sourceDomain)
    )
  )
  donationMadeEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  donationMadeEvent.parameters.push(
    new ethereum.EventParam(
      "timestamp",
      ethereum.Value.fromUnsignedBigInt(timestamp)
    )
  )
  donationMadeEvent.parameters.push(
    new ethereum.EventParam("location", ethereum.Value.fromString(location))
  )

  return donationMadeEvent
}

export function createFundsClaimedEvent(
  poolId: BigInt,
  claimer: Address,
  recipient: Address,
  nullifier: BigInt,
  userIdentifier: BigInt,
  nationality: string,
  amount: BigInt,
  timestamp: BigInt
): FundsClaimed {
  let fundsClaimedEvent = changetype<FundsClaimed>(newMockEvent())

  fundsClaimedEvent.parameters = new Array()

  fundsClaimedEvent.parameters.push(
    new ethereum.EventParam("poolId", ethereum.Value.fromUnsignedBigInt(poolId))
  )
  fundsClaimedEvent.parameters.push(
    new ethereum.EventParam("claimer", ethereum.Value.fromAddress(claimer))
  )
  fundsClaimedEvent.parameters.push(
    new ethereum.EventParam("recipient", ethereum.Value.fromAddress(recipient))
  )
  fundsClaimedEvent.parameters.push(
    new ethereum.EventParam(
      "nullifier",
      ethereum.Value.fromUnsignedBigInt(nullifier)
    )
  )
  fundsClaimedEvent.parameters.push(
    new ethereum.EventParam(
      "userIdentifier",
      ethereum.Value.fromUnsignedBigInt(userIdentifier)
    )
  )
  fundsClaimedEvent.parameters.push(
    new ethereum.EventParam(
      "nationality",
      ethereum.Value.fromString(nationality)
    )
  )
  fundsClaimedEvent.parameters.push(
    new ethereum.EventParam("amount", ethereum.Value.fromUnsignedBigInt(amount))
  )
  fundsClaimedEvent.parameters.push(
    new ethereum.EventParam(
      "timestamp",
      ethereum.Value.fromUnsignedBigInt(timestamp)
    )
  )

  return fundsClaimedEvent
}

export function createOwnershipTransferredEvent(
  previousOwner: Address,
  newOwner: Address
): OwnershipTransferred {
  let ownershipTransferredEvent =
    changetype<OwnershipTransferred>(newMockEvent())

  ownershipTransferredEvent.parameters = new Array()

  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam(
      "previousOwner",
      ethereum.Value.fromAddress(previousOwner)
    )
  )
  ownershipTransferredEvent.parameters.push(
    new ethereum.EventParam("newOwner", ethereum.Value.fromAddress(newOwner))
  )

  return ownershipTransferredEvent
}

export function createPoolStatusChangedEvent(
  poolId: BigInt,
  isActive: boolean
): PoolStatusChanged {
  let poolStatusChangedEvent = changetype<PoolStatusChanged>(newMockEvent())

  poolStatusChangedEvent.parameters = new Array()

  poolStatusChangedEvent.parameters.push(
    new ethereum.EventParam("poolId", ethereum.Value.fromUnsignedBigInt(poolId))
  )
  poolStatusChangedEvent.parameters.push(
    new ethereum.EventParam("isActive", ethereum.Value.fromBoolean(isActive))
  )

  return poolStatusChangedEvent
}

export function createReliefPoolCreatedEvent(
  poolId: BigInt,
  disasterType: i32,
  classification: i32,
  nationalityRequired: string,
  allocatedFundsPerPerson: BigInt
): ReliefPoolCreated {
  let reliefPoolCreatedEvent = changetype<ReliefPoolCreated>(newMockEvent())

  reliefPoolCreatedEvent.parameters = new Array()

  reliefPoolCreatedEvent.parameters.push(
    new ethereum.EventParam("poolId", ethereum.Value.fromUnsignedBigInt(poolId))
  )
  reliefPoolCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "disasterType",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(disasterType))
    )
  )
  reliefPoolCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "classification",
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(classification))
    )
  )
  reliefPoolCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "nationalityRequired",
      ethereum.Value.fromString(nationalityRequired)
    )
  )
  reliefPoolCreatedEvent.parameters.push(
    new ethereum.EventParam(
      "allocatedFundsPerPerson",
      ethereum.Value.fromUnsignedBigInt(allocatedFundsPerPerson)
    )
  )

  return reliefPoolCreatedEvent
}
