import { Identifiers as ApiIdentifiers, Server } from "@cauriland/core-api";
import { Container, Contracts, Providers } from "@cauriland/core-kernel";

import { Handler } from "./handlers";
import { Identifiers } from "./identifiers";
import { GroupSearchService, UserSearchService } from "./services";

const plugin = require("../package.json");

export class ServiceProvider extends Providers.ServiceProvider {
	public async register(): Promise<void> {
		const logger: Contracts.Kernel.Logger = this.app.get(Container.Identifiers.LogService);
		logger.info(`Loading plugin: ${plugin.name} with version ${plugin.version}.`);

		this.app.bind(Identifiers.GroupSearchService).to(GroupSearchService);
		this.app.bind(Identifiers.UserSearchService).to(UserSearchService);

		for (const identifier of [ApiIdentifiers.HTTP, ApiIdentifiers.HTTPS]) {
			if (this.app.isBound<Server>(identifier)) {
				const server = this.app.get<Server>(identifier);
				await server.register({
					plugin: Handler,
					routes: { prefix: "/api/guardian" },
				});
			}
		}
	}
}
