const { randomUUID } = require("crypto");
const {
    CommonCreateCall,
    CommonUpdateCall,
    CommonDeleteCall,
    CommonReadWithFilters
} = require("./CommonController");


async function getHM_BedType(req, res, next) {
    try {
        req.body.filters = {};
        req.body.tableName = "HM_BedType";

        if (req.query.ID) req.body.filters.ID = req.query.ID;
        if (req.query.Name) req.body.filters.Name = req.query.Name;
        if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
        if (req.query.ACType) req.body.filters.ACType = req.query.ACType;
        if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({
            success: true,
            data: []
        })
        delete req.query.Role;

        const bedTypes = await CommonReadWithFilters(req, res, next);

        if (!req.query.ID && !req.query.BranchCode) return res.send({
            success: true,
            data: bedTypes
        });

        if (req.query.BranchCode && !req.query.ID) return res.send({
            success: true,
            data: bedTypes
        });

        req.body.tableName = "HM_BedTypeDetails";
        req.body.filters = {
            ID: req.query.ID
        };

        const bedDetails = await CommonReadWithFilters(req, res, next);
        bedDetails.forEach((row) => {
            Object.keys(row).forEach((key) => {
                if (key.startsWith("Photo") && !key.endsWith("Name") && !key.endsWith("Type") && Buffer.isBuffer(row[key])) {
                    row[key] = row[key].toString("base64");
                }
            });
        });

        // Merge photos into bedTypes
        const merged = bedTypes.map((bed) => {
            const detail = bedDetails.find((d) => d.ID === bed.ID);
            return detail ? {
                ...bed,
                ...detail
            } : bed;
        });

        return res.send({
            success: true,
            data: merged
        });
    } catch (err) {
        res.status(500).send({
            success: false,
            message: err.message || "Technical error, please contact administrator"
        });
    }
}

async function postHM_BedType(req, res, next) {
    try {
        let data = req.body.data.data;
        var attachment = req.body.data.Attachment;
        delete req.body.data.Attachment;
        req.body.tableName = "HM_BedType";
        var IDBed = randomUUID();
        req.body.data = {
            ...data,
            ID: IDBed,
        };
        await CommonCreateCall(req, res, next);

        req.body.tableName = "HM_BedTypeDetails";
        var data1 = attachment;
        Object.keys(data1).forEach((key) => {
            if (
                typeof data1[key] === "string" &&
                key.startsWith("Photo") &&
                !key.endsWith("Name") &&
                !key.endsWith("Type")
            ) {
                data1[key] = Buffer.from(data1[key], "base64");
            }
        });
        req.body.data = {
            ID: IDBed,
            ...data1,
        };
        await CommonCreateCall(req, res, next);
        res.status(200).send({
            success: true,
            message: "BedType saved successfully!",
            RoomID: data.ID,
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message || "Technical error, please contact the administrator",
        });
    }
}

async function putHM_BedType(req, res, next) {
    try {
        req.body.tableName = "HM_BedType";
        var data = req.body.data.data;
        var attachment = req.body.data.Attachment;
        delete req.body.data.Attachment;
        req.body.data = {
            ...data
        };
        await CommonUpdateCall(req, res, next);

        req.body.tableName = "HM_BedTypeDetails";
        Object.keys(attachment).forEach((key) => {
            if (
                typeof attachment[key] === "string" &&
                key.startsWith("Photo") &&
                !key.endsWith("Name") &&
                !key.endsWith("Type")
            ) {
                attachment[key] = Buffer.from(attachment[key], "base64");
            }
        });
        req.body.data = {
            ...attachment
        };
        await CommonUpdateCall(req, res, next);

        res.send({
            success: true,
            message: "Updated successfully"
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error || "Technical error, please contact the administrator",
        });
    }
}

async function deleteHM_BedType(req, res, next) {
    try {
        req.body.tableName = "HM_BedType";
        const data = await CommonDeleteCall(req, res, next);
        req.body.tableName = "HM_BedTypeDetails";
        await CommonDeleteCall(req, res, next);
        res.send({
            success: true,
            data
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message || "Technical error, please contact the administrator",
        });
    }
}

exports.HM_BedType = {
    getHM_BedType,
    postHM_BedType,
    putHM_BedType,
    deleteHM_BedType,
};