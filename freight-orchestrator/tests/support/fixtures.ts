import { InMemoryConfigStore } from "@/config/store";
import { rule, user, model } from "@/governance/actor";
import { Policy } from "@/governance/policy";

export const ORG = {
  desk: "desk-gulfline",
  otherDesk: "desk-meridian",
  shipper: "shp-sandcastle",
  otherShipper: "shp-palmgrove",
  carrierA: "car-azure",
  carrierB: "car-boreal",
  partner: "ptn-customs-one",
} as const;

export const ACTOR = {
  deskAdmin: user("u-desk-admin", "desk_admin", ORG.desk),
  deskAgent: user("u-desk-agent", "desk_agent", ORG.desk),
  otherDeskAgent: user("u-other-agent", "desk_agent", ORG.otherDesk),
  shipper: user("u-shipper", "shipper_user", ORG.shipper),
  otherShipper: user("u-other-shipper", "shipper_user", ORG.otherShipper),
  carrierA: user("u-carrier-a", "carrier_user", ORG.carrierA),
  carrierB: user("u-carrier-b", "carrier_user", ORG.carrierB),
  partner: user("u-partner", "partner_user", ORG.partner),
  platformAdmin: user("u-platform", "platform_admin", "platform"),
  engine: rule("4.4/feasibility", "1"),
  extractor: model("4.3/extraction", "mock@prompt-v1"),
};

export async function defaultPolicy() {
  const config = InMemoryConfigStore.withDefaults();
  return { config, policy: new Policy(await config.active("permissions")) };
}
