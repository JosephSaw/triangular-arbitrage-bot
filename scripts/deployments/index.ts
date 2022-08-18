
import * as fs from "fs";

export default function (networkName: string) {
  return JSON.parse(fs.readFileSync(`./scripts/deployments/${networkName}.json`) as any);
}
