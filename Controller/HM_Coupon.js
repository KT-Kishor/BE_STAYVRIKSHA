const { randomUUID } = require("crypto");
const {
    CommonReadCall,
    CommonCreateCall,
    CommonUpdateCall,
    CommonDeleteCall,
    CommounMultipalUpdate,
    CommonSendEmail,
    CommonReadWithFilters
} = require("./CommonController");


async function getHM_Coupon(req, res, next) {
    try {
        req.body.filters = {};
        req.body.tableName = "HM_Coupon";
        if (req.query.CouponId) { req.body.filters.CouponId = req.query.CouponId }
        if (req.query.Status) { req.body.filters.Status = req.query.Status }
        if (req.query.DiscountType) { req.body.filters.DiscountType = req.query.DiscountType }
        if (req.query.CouponCode) { req.body.filters.CouponCode = req.query.CouponCode }
        if (req.query.StartDate && req.query.EndDate) {
            req.body.filters.StartDate = [req.query.StartDate, req.query.EndDate]
            req.body.filters.EndDate = [req.query.StartDate, req.query.EndDate]
        }
        if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
        if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({ success: true, data: [] })
        delete req.query.Role;
        const data = await CommonReadWithFilters(req, res, next);
        res.send({ success: true, data });
    } catch (error) {
        res.status(500).send({ success: false, message: error || "Technical error, please contact the administrator", });
    }
}

async function postHM_Coupon(req, res, next) {
    try {
        let data = req.body.data;
        if (!data) data = {};

        if (!data.CouponCode || data.CouponCode.trim() === "") {
            return res.status(400).send({
                success: false,
                message: "Coupon code is required"
            });
        }
       
        data.CouponCode = data.CouponCode;
        req.body.filters = {};
        req.body.tableName = "HM_Coupon";
        req.body.data = data;

        await CommonCreateCall(req, res, next);

        res.status(200).send({
            success: true,
            message: "Coupon created successfully!",
            couponCode: data.CouponCode
        });
    } catch (err) {
        res.status(500).send({
            success: false,
            message: err.message || "Technical error, please contact the administrator"
        });
    }
}

async function putHM_Coupon(req, res, next) {
    try {
        req.body.tableName = "HM_Coupon";
        await CommonUpdateCall(req, res, next);
        res.send({ success: true, message: "Coupon updated successfully" });
    } catch (error) {
        res.status(500).send({ success: false, message: error || "Technical error, please contact the administrator" });
    }
}

async function deleteHM_Coupon(req, res, next) {
    try {
        req.body.tableName = "HM_Coupon";
        var data = await CommonDeleteCall(req, res, next);
        res.send({ success: true, data ,message:"Coupon deleted successfully!"});
    } catch (error) {
        res.status(500).send({ success: false, message: error || "Technical error, please contact the administrator", });
    }
}

async function CouponCodeEmail(req, res, next) {
    try {

        req.body.tableName = "EmailContent";
        req.body.filters = { Type: "CouponCode" };

        const emailContentData = await CommonReadCall(req, res, next);

        if (!emailContentData || emailContentData.length === 0) {
            return res.status(404).send({
                success: false,
                message: "Email content not found"
            });
        }

        const emailContent = emailContentData[0];

        const from = emailContent.FormEmailId;
        const fromName = emailContent.FormName;
        const subject = emailContent.Subject;
        const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
        const replyTo = emailContent.ReplyToEmailId;

        for (let user of req.body.users) {

            // FULL TEMPLATE (No duplication)
            let body = emailContent.Body;

            // Replace {{PLACEHOLDERS}}
            body = body.replaceAll("<UserName>", user.UserName)
                .replaceAll("<COUPONNUMBER>", user.COUPONNUMBER)
                .replaceAll("<StartDate>", formatDateLocal(new Date(user.StartDate)))
                .replaceAll("<EndDate>", formatDateLocal(new Date(user.EndDate)))
                .replaceAll("<MinOrderValue>", user.MinOrderValue)
                .replaceAll("<BranchName>", user.BranchName)
                .replaceAll("<PerUserLimit>", user.PerUserLimit);

            // Now wrap with Dear Name
            body = `<p>Dear ${user.UserName},</p>` + body;

            await CommonSendEmail(req, from, fromName, [user.toEmailID], user.UserName, subject, body, CC, replyTo);
        }

        return res.status(200).send({ success: true, message: "Emails sent successfully" });
    } catch (error) {
        return res.status(500).send({ success: false, message: "Internal server error" });
    }
}

function formatDateLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${day}/${month}/${year}`;
}

async function getHM_CouponMaxUsesFacilityCheck(req, res, next) {
    try {
        req.body = { tableName: "HM_Coupon", filters: {} };
        if (req.query.CouponCode)  req.body.filters.CouponCode = req.query.CouponCode;
        if (req.query.Status)  req.body.filters.Status = req.query.Status;
        const couponData = await CommonReadWithFilters(req, res, next);

        req.body = { tableName: "HM_BookingFacilityItems", filters: {} };
        if (req.query.CouponCode)  req.body.filters.CouponCode = req.query.CouponCode;
        const facilityData = await CommonReadWithFilters(req, res, next);

        /* ---------- Merge Data ---------- */
        const responseData = Array.isArray(couponData)
            ? couponData.map(coupon => ({
                  ...coupon,
                  couponUsedCount: facilityData.length
              }))
            : {
                  ...couponData,
                  couponUsedCount: facilityData.length
              };

        res.send({success: true, data: responseData});
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error || "Technical error, please contact the administrator"
        });
    }
}

async function getHM_CouponMaxUsesBookingCheck(req, res, next) {
    try {
        req.body = { tableName: "HM_Coupon", filters: {} };
        if (req.query.CouponCode)  req.body.filters.CouponCode = req.query.CouponCode;
        if (req.query.Status)  req.body.filters.Status = req.query.Status;
        const couponData = await CommonReadWithFilters(req, res, next);

        req.body = { tableName: "HM_Booking", filters: {} };
        if (req.query.CouponCode)  req.body.filters.CouponCode = req.query.CouponCode;
        const facilityData = await CommonReadWithFilters(req, res, next);

        /* ---------- Merge Data ---------- */
        const responseData = Array.isArray(couponData)
            ? couponData.map(coupon => ({
                  ...coupon,
                  couponUsedCount: facilityData.length
              }))
            : {
                  ...couponData,
                  couponUsedCount: facilityData.length
              };

        res.send({success: true, data: responseData});
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error || "Technical error, please contact the administrator"
        });
    }
}

exports.HM_Coupon = {
    getHM_Coupon,
    postHM_Coupon,
    putHM_Coupon,
    deleteHM_Coupon,
    CouponCodeEmail,
    getHM_CouponMaxUsesFacilityCheck,
    getHM_CouponMaxUsesBookingCheck
};
