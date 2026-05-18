const {
    randomUUID
} = require("crypto");
const {
    CommonReadCall,
    CommonCreateCall,
    CommonUpdateCall,
    CommonDeleteCall
} = require("./CommonController");

async function getHM_BedTypeDetails(req, res, next) {
    try {
        req.body.filters = {};
        req.body.tableName = "HM_BedTypeDetails";

        if (req.query.Name)
            req.body.filters.Name = req.query.Name;
        if (req.query.BranchCode)
            req.body.filters.BranchCode = req.query.BranchCode;
        if (req.query.ACType)
            req.body.filters.ACType = req.query.ACType;
        const data = await CommonReadCall(req, res, next);
        data.forEach((doc) => {
            Object.keys(doc).forEach((key) => {
                if (key.startsWith("Photo") && Buffer.isBuffer(doc[key])) {
                    doc[key] = doc[key].toString("base64");
                }
            });
        });

        res.send({
            success: true,
            data: data
        });
    } catch (err) {
        res.status(500).send({
            success: false,
            message: err || "Technical error, please contact the administrator",
        });
    }
}

async function postHM_BedTypeDetails(req, res, next) {
    try {
        let data = req.body.data;
        req.body.tableName = "HM_BedTypeDetails";

        Object.keys(data).forEach((key) => {
            if (
                typeof data[key] === "string" &&
                key.startsWith("Photo") &&
                !key.endsWith("Name") &&
                !key.endsWith("Type")
            ) {
                data[key] = Buffer.from(data[key], "base64");
            }
        });

        req.body.data = {
            ...data
        };
        await CommonCreateCall(req, res, next);
        res.status(200).send({
            success: true,
            message: "Facility saved successfully!",
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message || "Technical error, please contact the administrator",
        });
    }
}

async function putHM_BedTypeDetails(req, res, next) {
    try {
        req.body.tableName = "HM_BedTypeDetails";
        Object.keys(req.body.data).forEach((key) => {
            if (
                key.startsWith("Photo") &&
                typeof req.body.data[key] === "string" &&
                !key.endsWith("Name") &&
                !key.endsWith("Type")
            ) {
                req.body.data[key] = Buffer.from(req.body.data[key], "base64");
            }
        });

        await CommonUpdateCall(req, res, next);
        res.send({
            success: true,
            message: "Updated successfully"
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message || "Technical error, please contact the administrator",
        });
    }
}

async function deleteHM_BedTypeDetails(req, res, next) {
    try {
        req.body.tableName = "HM_BedTypeDetails";

        if (!req.query.ID) {
            return res.status(400).send({
                success: false,
                message: "ID is required to delete image details.",
            });
        }

        if (!req.query.PhotoName) {
            return res.status(400).send({
                success: false,
                message: "PhotoName is required.",
            });
        }

        // Step 1: Read existing data
        req.body.filters = {
            ID: req.query.ID
        };
        const readResult = await CommonReadCall(req, res, next);

        if (!readResult || readResult.length === 0) {
            return res.status(404).send({
                success: false,
                message: "No record found with the given ID.",
            });
        }

        let record = readResult[0];
        const photoNameToDelete = req.query.PhotoName;

        // Step 2: Find which PhotoName matches and clear its related fields
        for (let i = 1; i <= 5; i++) { // assuming up to Photo5 fields exist
            const nameKey = `Photo${i}Name`;
            const fileKey = `Photo${i}`;
            const typeKey = `Photo${i}Type`;

            if (record[nameKey] && record[nameKey] === photoNameToDelete) {
                record[nameKey] = "";
                record[fileKey] = "";
                record[typeKey] = "";
            }
        }

        // Step 3: Prepare the update payload
        req.body.data = record;

        // Step 4: Update the record
        const updatedData = await CommonUpdateCall(req, res, next);

        res.send({
            success: true,
            message: "Photo details removed successfully.",
            data: updatedData,
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message || "Technical error, please contact the administrator.",
        });
    }
}

exports.HM_BedTypeDetails = {
    getHM_BedTypeDetails,
    postHM_BedTypeDetails,
    putHM_BedTypeDetails,
    deleteHM_BedTypeDetails,
};