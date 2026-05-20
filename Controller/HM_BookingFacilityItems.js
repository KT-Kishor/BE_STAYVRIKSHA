const {randomUUID} = require("crypto");
const {
    CommonReadWithFilters,
    CommonCreateCall,
    CommonUpdateCall,
    CommonDeleteCall
} = require("./CommonController");

async function getHM_BookingFacilityItems(req, res, next) {
    try {
        req.body.filters = {};
        req.body.tableName = "HM_BookingFacilityItems";
        if (req.query.BookingID) req.body.filters.BookingID = req.query.BookingID;
        if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
        const commentData = await CommonReadWithFilters(req, res, next);
        res.send({
            success: true,
            commentData
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error || "Technical error, please contact the administrator",
        });
    }
}

async function postHM_BookingFacilityItems(req, res, next) {
    try {
        req.body.tableName = "HM_BookingFacilityItems";
        await CommonCreateCall(req, res, next);
        res.status(200).send({
            success: true,
            message: "Booking Facility Items saved successfully!",
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message || "Technical error, please contact the administrator",
        });
    }
}

async function putHM_BookingFacilityItems(req, res, next) {
    try {
        req.body.tableName = "HM_BookingFacilityItems";
        await CommonUpdateCall(req, res, next);
        res.status(200).send({
            success: true,
            message: "Booking Facility Items details updated!"
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error || "Technical error, please contact the administrator",
        });
    }
}

async function deleteHM_BookingFacilityItems(req, res, next) {
    try {
        req.body.tableName = "HM_BookingFacilityItems";
        var data = await CommonDeleteCall(req, res, next);
        res.send({
            success: true,
            data,
             message: "Booking Facility Items deleted successfully!"
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error || "Technical error, please contact the administrator",
        });
    }
}

exports.HM_BookingFacilityItems = {
    getHM_BookingFacilityItems,
    postHM_BookingFacilityItems,
    putHM_BookingFacilityItems,
    deleteHM_BookingFacilityItems
};