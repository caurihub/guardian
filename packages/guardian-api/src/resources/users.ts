import { Contracts } from "@cauriland/core-kernel";
import { Interfaces } from "@caurihub/guardian-transactions";
import Joi from "joi";

export type UserResource = Interfaces.IUserPermissions & {
	publicKey: string;
};

export type UserCriteria = Contracts.Search.StandardCriteriaOf<UserResource>;

export const userCriteriaSchemaObject = {
	publicKey: Joi.string(),
};

export const userCriteriaQuerySchema = Joi.object(userCriteriaSchemaObject);
