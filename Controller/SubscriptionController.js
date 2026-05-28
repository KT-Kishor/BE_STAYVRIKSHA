const { randomUUID } = require("crypto");

const {
    CommonCreateCall,
    CommonUpdateCall,
    CommonDeleteCall,
    CommonReadWithFilters
} = require("./CommonController");


// =============================
// PACKAGE CRUD
// =============================

async function getPackage(req, res, next) {
    try {
        req.body.tableName = "Package";
        req.body.filters = {};

        if (req.query.PackageID) req.body.filters.PackageID = req.query.PackageID;
        if (req.query.PackageName) req.body.filters.PackageName = req.query.PackageName;
        if (req.query.IsActive) req.body.filters.IsActive = req.query.IsActive;

        const data = await CommonReadWithFilters(req, res, next);

        res.send({ success: true, data });

    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
}

async function postPackage(req, res, next) {
    try {
        req.body.tableName = "Package";
        req.body.data.PackageID = randomUUID()

        await CommonCreateCall(req, res, next);

        res.send({ success: true, message: "Package created successfully" });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
}

async function putPackage(req, res, next) {
    try {
        req.body.tableName = "Package";
        await CommonUpdateCall(req, res, next);
        res.send({ success: true, message: "Package updated successfully" });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
}

async function deletePackage(req, res, next) {
    try {
        req.body.tableName = "Package";
        const data = await CommonDeleteCall(req, res, next);
        res.send({ success: true, data });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
}



// =============================
// SUBSCRIPTION CRUD
// =============================

async function getSubscription(req, res, next) {
    try {

        req.body.tableName = "Subscription";
        req.body.filters = {};

        if (req.query.SubscriptionID) req.body.filters.SubscriptionID = req.query.SubscriptionID;
        if (req.query.UserID) req.body.filters.UserID = req.query.UserID;
        if (req.query.PackageID) req.body.filters.PackageID = req.query.PackageID;
        if (req.query.SubscriptionStatus) req.body.filters.SubscriptionStatus = req.query.SubscriptionStatus;

        const data = await CommonReadWithFilters(req, res, next);

        res.send({ success: true, data });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
}

async function postSubscription(req, res, next) {
    try {
        req.body.tableName = "Subscription";
        var SubscriptionID = randomUUID();
        req.body.data.SubscriptionID = SubscriptionID;
        await CommonCreateCall(req, res, next);

        res.send({ success: true, message: "Subscription created successfully", SubscriptionID });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
}

async function putSubscription(req, res, next) {
    try {
        req.body.tableName = "Subscription";
        await CommonUpdateCall(req, res, next);

        res.send({
            success: true,
            message: "Subscription updated successfully"
        });

    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message
        });
    }
}

async function deleteSubscription(req, res, next) {
    try {

        req.body.tableName = "Subscription";

        const data = await CommonDeleteCall(req, res, next);

        res.send({
            success: true,
            data
        });

    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message
        });
    }
}

// =============================
// PAYMENT CRUD
// =============================

async function getSubscriptionPayment(req, res, next) {
    try {

        req.body.tableName = "Subscription_Payment";
        req.body.filters = {};

        if (req.query.PaymentID) req.body.filters.PaymentID = req.query.PaymentID;
        if (req.query.SubscriptionID) req.body.filters.SubscriptionID = req.query.SubscriptionID;
        if (req.query.PaymentStatus) req.body.filters.PaymentStatus = req.query.PaymentStatus;

        const data = await CommonReadWithFilters(req, res, next);

        res.send({success: true,data});
    } catch (error) {
        res.status(500).send({success: false,message: error.message});
    }
}

async function postSubscriptionPayment(req, res, next) {
    try {
        req.body.tableName = "Subscription_Payment";
        var data = req.body.data;

        await CommonCreateCall(req, res, next);

        // Update Subscription Status
        req.body.tableName = "Subscription";
        req.body.filters = {
            SubscriptionID: data.SubscriptionID
        };

        req.body.data = {
            SubscriptionID: data.SubscriptionID,
            PaymentStatus: data.PaymentStatus,
            SubscriptionStatus: data.PaymentStatus === "Success" ? "Active" : "Pending"
        };

        await CommonUpdateCall(req, res, next);
        res.send({ success: true, message: "Payment saved successfully" });
    } catch (error) {
        res.status(500).send({ success: false, message: error.message });
    }
}

async function putSubscriptionPayment(req, res, next) {
    try {

        req.body.tableName = "Subscription_Payment";

        await CommonUpdateCall(req, res, next);

        res.send({
            success: true,
            message: "Payment updated successfully"
        });

    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message
        });
    }
}

async function deleteSubscriptionPayment(req, res, next) {
    try {

        req.body.tableName = "Subscription_Payment";

        const data = await CommonDeleteCall(req, res, next);

        res.send({
            success: true,
            data
        });

    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message
        });
    }
}



exports.Subscription = {
    getSubscription,
    postSubscription,
    putSubscription,
    deleteSubscription,
    getPackage,
    postPackage,
    putPackage,
    deletePackage,
    getSubscriptionPayment,
    postSubscriptionPayment,
    putSubscriptionPayment,
    deleteSubscriptionPayment
};
