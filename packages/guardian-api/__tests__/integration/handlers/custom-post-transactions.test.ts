import "@cauriland/core-test-framework/dist/matchers";

import { Contracts } from "@cauriland/core-kernel";
import { ApiHelpers, passphrases } from "@cauriland/core-test-framework";
import { Builders } from "@caurihub/guardian-crypto";
import { Interfaces } from "@caurihub/guardian-transactions";

import { setUp, tearDown } from "../__support__/setup";

jest.setTimeout(30000);

let app: Contracts.Kernel.Application;
let api: ApiHelpers;

beforeAll(async () => {
	app = await setUp();
	api = new ApiHelpers(app);
});

afterAll(async () => await tearDown());

describe("API - Post transaction", () => {
	it("should return Forbidden if wallet doesn't have permissions to POST transactions", async () => {
		// change permission resolver to reject all transactions
		app.get<any>(Interfaces.Identifiers.PermissionsResolver).resolve = () => Promise.resolve(false);

		const actual = new Builders.GuardianUserPermissionsBuilder()
			.GuardianUserPermissions({
				publicKey: "02def27da9336e7fbf63131b8d7e5c9f45b296235db035f1f4242c507398f0f21d",
			})
			.nonce("3")
			.sign(passphrases[0]!)
			.build();

		const response = await api.request("POST", "transactions", {
			transactions: [actual.data],
		});

		expect(response.statusCode).toBe(200);
		expect(response.data.data.invalid[0]).toStrictEqual(actual.id);
	});
});
