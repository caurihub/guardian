import { Transactions, Utils } from "@cauriland/crypto";
import { Asserts } from "@caurihub/utils";
import ByteBuffer from "bytebuffer";

import { defaults } from "../defaults";
import { GuardianStaticFees, GuardianTransactionGroup, GuardianTransactionTypes } from "../enums";
import { IGuardianGroupPermissionsAsset } from "../interfaces";
import { amountSchema, groupNameSchema, permissionsSchema, vendorFieldSchema } from "./utils/guardian-schemas";
import { calculatePermissionsLength, deserializePermissions, serializePermissions } from "./utils/serde";

const { schemas } = Transactions;

export class GuardianGroupPermissionsTransaction extends Transactions.Transaction {
    public static override typeGroup: number = GuardianTransactionGroup;
    public static override type = GuardianTransactionTypes.GuardianSetGroupPermissions;
    public static override key = "GuardianGroupPermissions";
    public static override version: number = defaults.version;

    protected static override defaultStaticFee = Utils.BigNumber.make(GuardianStaticFees.GuardianSetGroupPermissions);

    public static override getSchema(): Transactions.schemas.TransactionSchema {
        return schemas.extend(schemas.transactionBaseSchema, {
            $id: this.key,
            required: ["asset", "typeGroup"],
            properties: {
                type: { transactionType: this.type },
                typeGroup: { const: this.typeGroup },
                amount: amountSchema,
                vendorField: vendorFieldSchema,
                asset: {
                    type: "object",
                    required: ["setGroupPermissions"],
                    properties: {
                        setGroupPermissions: {
                            type: "object",
                            required: ["name", "priority", "active", "default"],
                            uniqueAllowDeny: true,
                            properties: {
                                name: groupNameSchema,
                                priority: {
                                    type: "integer",
                                    minimum: defaults.guardianGroupPriority.min,
                                    maximum: defaults.guardianGroupPriority.max,
                                },
                                active: { type: "boolean" },
                                default: { type: "boolean" },
                                allow: permissionsSchema,
                                deny: permissionsSchema,
                            },
                        },
                    },
                },
            },
        });
    }

    public serialize(): ByteBuffer {
        const { data } = this;

        Asserts.assert.defined<IGuardianGroupPermissionsAsset>(data.asset?.setGroupPermissions);
        const setGroupPermissionAsset: IGuardianGroupPermissionsAsset = data.asset.setGroupPermissions;

        const nameBuffer: Buffer = Buffer.from(setGroupPermissionAsset.name);
        const buffer: ByteBuffer = new ByteBuffer(
            nameBuffer.length +
                4 + // priority
                1 + // active
                1 + // default
                calculatePermissionsLength(setGroupPermissionAsset.allow) +
                calculatePermissionsLength(setGroupPermissionAsset.deny),
            true,
        );

        // name
        buffer.writeByte(nameBuffer.length);
        buffer.append(nameBuffer, "hex");

        // priority
        buffer.writeUint32(setGroupPermissionAsset.priority);

        // active
        buffer.writeByte(+setGroupPermissionAsset.active);

        // default
        buffer.writeByte(+setGroupPermissionAsset.default);

        // allow permissions
        serializePermissions(buffer, setGroupPermissionAsset.allow);

        // deny permissions
        serializePermissions(buffer, setGroupPermissionAsset.deny);

        return buffer;
    }

    public deserialize(buf: ByteBuffer): void {
        const { data } = this;

        const nameLength: number = buf.readUint8();
        const name: string = buf.readBytes(nameLength).toBuffer().toString("utf8");
        const priority = buf.readUInt32();
        const active = Boolean(buf.readUint8());
        const isDefault = Boolean(buf.readUint8());

        const setGroupPermissions: IGuardianGroupPermissionsAsset = {
            name,
            priority,
            active,
            default: isDefault,
        };

        // allow permissions
        const allow = deserializePermissions(buf);
        if (allow) {
            setGroupPermissions.allow = allow;
        }

        // deny permissions
        const deny = deserializePermissions(buf);
        if (deny) {
            setGroupPermissions.deny = deny;
        }

        data.asset = {
            setGroupPermissions,
        };
    }

    public override hasVendorField(): boolean {
        return true;
    }
}
