import {
  assert,
  describe,
  test,
  clearStore,
  beforeAll,
  afterAll
} from "matchstick-as/assembly/index"
import { BigInt, Address } from "@graphprotocol/graph-ts"
import { DonationMade } from "../generated/schema"
import { DonationMade as DonationMadeEvent } from "../generated/ReliefPools/ReliefPools"
import { handleDonationMade } from "../src/relief-pools"
import { createDonationMadeEvent } from "./relief-pools-utils"

// Tests structure (matchstick-as >=0.5.0)
// https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#tests-structure

describe("Describe entity assertions", () => {
  beforeAll(() => {
    let poolId = BigInt.fromI32(234)
    let donor = Address.fromString("0x0000000000000000000000000000000000000001")
    let sourceDomain = BigInt.fromI32(234)
    let amount = BigInt.fromI32(234)
    let timestamp = BigInt.fromI32(234)
    let location = "Example string value"
    let newDonationMadeEvent = createDonationMadeEvent(
      poolId,
      donor,
      sourceDomain,
      amount,
      timestamp,
      location
    )
    handleDonationMade(newDonationMadeEvent)
  })

  afterAll(() => {
    clearStore()
  })

  // For more test scenarios, see:
  // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#write-a-unit-test

  test("DonationMade created and stored", () => {
    assert.entityCount("DonationMade", 1)

    // 0xa16081f360e3847006db660bae1c6d1b2e17ec2a is the default address used in newMockEvent() function
    assert.fieldEquals(
      "DonationMade",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "poolId",
      "234"
    )
    assert.fieldEquals(
      "DonationMade",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "donor",
      "0x0000000000000000000000000000000000000001"
    )
    assert.fieldEquals(
      "DonationMade",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "sourceDomain",
      "234"
    )
    assert.fieldEquals(
      "DonationMade",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "amount",
      "234"
    )
    assert.fieldEquals(
      "DonationMade",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "timestamp",
      "234"
    )
    assert.fieldEquals(
      "DonationMade",
      "0xa16081f360e3847006db660bae1c6d1b2e17ec2a-1",
      "location",
      "Example string value"
    )

    // More assert options:
    // https://thegraph.com/docs/en/subgraphs/developing/creating/unit-testing-framework/#asserts
  })
})
