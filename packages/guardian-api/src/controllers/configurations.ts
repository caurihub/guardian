import { Controller } from "@cauriland/core-api";
import { Container } from "@cauriland/core-kernel";
import Hapi from "@hapi/hapi";
import { Defaults as CryptoDefaults } from "@caurihub/guardian-crypto";
import { Defaults as TransactionDefaults } from "@caurihub/guardian-transactions";
import latestVersion from "latest-version";

import { ConfigurationResource } from "../resources";

const packageName = require("../../package.json").name;
const currentVersion = require("../../package.json").version;

@Container.injectable()
export class ConfigurationController extends Controller {
	public async index(request: Hapi.Request, h: Hapi.ResponseToolkit) {
		return this.respondWithResource(
			{
				packageName,
				currentVersion,
				latestVersion: await latestVersion(packageName),
				crypto: CryptoDefaults,
				transactions: TransactionDefaults,
			},
			ConfigurationResource,
		);
	}
}
