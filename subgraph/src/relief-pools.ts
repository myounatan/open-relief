import {
  DonationMade as DonationMadeEvent,
  FundsClaimed as FundsClaimedEvent,
  OwnershipTransferred as OwnershipTransferredEvent,
  PoolStatusChanged as PoolStatusChangedEvent,
  ReliefPoolCreated as ReliefPoolCreatedEvent
} from "../generated/ReliefPools/ReliefPools"
import {
  DonationMade,
  FundsClaimed,
  OwnershipTransferred,
  PoolStatusChanged,
  ReliefPoolCreated
} from "../generated/schema"

export function handleDonationMade(event: DonationMadeEvent): void {
  let entity = new DonationMade(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.poolId = event.params.poolId
  entity.donor = event.params.donor
  entity.sourceDomain = event.params.sourceDomain
  entity.amount = event.params.amount
  entity.timestamp = event.params.timestamp
  entity.location = event.params.location

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleFundsClaimed(event: FundsClaimedEvent): void {
  let entity = new FundsClaimed(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.poolId = event.params.poolId
  entity.claimer = event.params.claimer
  entity.recipient = event.params.recipient
  entity.nullifier = event.params.nullifier
  entity.userIdentifier = event.params.userIdentifier
  entity.nationality = event.params.nationality
  entity.amount = event.params.amount
  entity.timestamp = event.params.timestamp

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleOwnershipTransferred(
  event: OwnershipTransferredEvent
): void {
  let entity = new OwnershipTransferred(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.previousOwner = event.params.previousOwner
  entity.newOwner = event.params.newOwner

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handlePoolStatusChanged(event: PoolStatusChangedEvent): void {
  let entity = new PoolStatusChanged(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.poolId = event.params.poolId
  entity.isActive = event.params.isActive

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}

export function handleReliefPoolCreated(event: ReliefPoolCreatedEvent): void {
  let entity = new ReliefPoolCreated(
    event.transaction.hash.concatI32(event.logIndex.toI32())
  )
  entity.poolId = event.params.poolId
  entity.disasterType = event.params.disasterType
  entity.classification = event.params.classification
  entity.nationalityRequired = event.params.nationalityRequired
  entity.allocatedFundsPerPerson = event.params.allocatedFundsPerPerson

  entity.blockNumber = event.block.number
  entity.blockTimestamp = event.block.timestamp
  entity.transactionHash = event.transaction.hash

  entity.save()
}
