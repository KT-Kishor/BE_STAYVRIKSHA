const {
  CommonReadCall,
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall,
  CommonReadWithFilters,
  CommonSendEmail
} = require("./CommonController");


async function getHM_Bug(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_RaiseBug";
    req.body.selectedFields = ["BugID", "AppName", "BugDescription", "RaisedBy", "Email", "CreatedDate", "Status", "ResolvedDescription", "ResolvedDate"];
    if (req.query.BugID) req.body.filters.BugID = req.query.BugID;
    if (req.query.Status) req.body.filters.Status = req.query.Status;
    if (req.query.StartDate && req.query.EndDate) req.body.filters.CreatedDate = [req.query.StartDate, req.query.EndDate]
    if (req.query.AppName) req.body.filters.AppName = req.query.AppName;
    if (req.query.RaisedBy) req.body.filters.RaisedBy = req.query.RaisedBy;
    if (req.query.Email) req.body.filters.Email = req.query.Email;
    if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
    if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({
      success: true,
      data: []
    })
    const data = await CommonReadWithFilters(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({
      success: false, message: error || "Technical error, please contact the administrator",
    });
  }
}

async function getBugData(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_RaiseBug";
    if (req.query.BugID) {
      req.body.filters.BugID = req.query.BugID;
    }
    const data = await CommonReadCall(req, res, next);
    data.forEach((doc) => {
      Object.keys(doc).forEach((key) => {
        if (key.startsWith("Photo") && Buffer.isBuffer(doc[key])) {
          doc[key] = doc[key].toString("base64");
        }
      });
    });
    res.send({ success: true, data });
  } catch (err) {
    res.status(500).send({
      success: false,
      message: err || "Technical error, please contact the administrator",
    });
  }
}

async function postHM_Bug(req, res, next) {
  try {

    req.body.tableName = "HM_RaiseBug";

    const existingInvoices = await CommonReadCall(req, res, next);

    let data = req.body.data;

    // Generate Financial Year
    const createdDate = new Date(data.CreatedDate);
    let currentYear = createdDate.getFullYear();
    let nextYear = currentYear + 1;

    if (createdDate.getMonth() <= 2) {
      currentYear -= 1;
      nextYear -= 1;
    }

    const financialYear = `${currentYear}/${nextYear.toString().slice(-2)}`;

    // Generate Ticket ID
    const financialYearInvoices = existingInvoices.filter((inv) =>
      inv.BugID?.startsWith(`BUG-${financialYear}-`)
    );

    let nextNumber = "001";

    if (financialYearInvoices.length > 0) {
      const lastNumbers = financialYearInvoices.map((inv) => {
        const match = inv.BugID.match(/-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });

      const lastInvoiceNum = Math.max(...lastNumbers);
      nextNumber = String(lastInvoiceNum + 1).padStart(3, "0");
    }

    const newBugID = `BUG-${financialYear}-${nextNumber}`;

    // Convert Base64 images to Buffer
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

    const invoiceRecord = {
      ...data,
      BugID: newBugID,
    };

    req.body = {
      tableName: "HM_RaiseBug",
      data: [invoiceRecord],
    };

    const invoiceResponse = await CommonCreateCall(req, res, next);
    if (!invoiceResponse || invoiceResponse.error) {
      return res.status(500).send({
        success: false,
        message: invoiceResponse?.error || "Failed to create Support Ticket",
      });
    }

    await HM_BugTicketRaised(req, res, next);

    res.status(200).send({
      success: true,
      message: "Application bug raised Successfully!",
      BugID: newBugID,
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: error?.message || "Technical error, please contact the administrator",
    });
  }
}

async function HM_BugTicketRaised(req, res, next) {
  try {
    req.body.tableName = "EmailContent";
    req.body.filters = { Type: "HM_BugRaised" };

    const emailContentData = await CommonReadCall(req, res, next);

    if (!emailContentData || emailContentData.length === 0) return res.status(404).send({ success: false, message: "Email content not found" });

    const emailContent = emailContentData[0];

    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;
    const to = [process.env.To_Email_ID];
    const toName = "";
    const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
    const replyTo = emailContent.ReplyToEmailId || "";

    let subject = emailContent.Subject || "";

    subject = subject
      .replaceAll("<BugID>", req.body.data[0].BugID || "")
      .replaceAll("<AppName>", req.body.data[0].AppName || "");
    let body = emailContent.Body;

    body = body
      .replaceAll("<BugID>", req.body.data[0].BugID || "")
      .replaceAll("<AppName>", req.body.data[0].AppName || "")
      .replaceAll("<RaisedBy>", req.body.data[0].RaisedBy || "")
      .replaceAll("<CreatedDate>", req.body.data[0].CreatedDate || "")
      .replaceAll("<BugDescription>", req.body.data[0].BugDescription || "");

    await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo);
  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal server error" });
  }
}

async function putHM_Bug(req, res, next) {
  try {

    req.body.tableName = "HM_RaiseBug";

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

    const invoiceUpdateResponse = await CommonUpdateCall(req, res, next);

    if (!invoiceUpdateResponse || invoiceUpdateResponse.error) {
      return res.status(500).send({
        success: false,
        message: invoiceUpdateResponse?.error || "Failed to update support ticket",
      });
    }

    await HM_BugTicketResolved(req, res, next);

    res.send({
      success: true,
      message: "Bug resolved successfully",
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: error?.message || "Technical error, please contact the administrator",
    });
  }
}

async function HM_BugTicketResolved(req, res, next) {
  try {
    req.body.tableName = "EmailContent";
    req.body.filters = { Type: "HM_BugResolved" };

    const emailContentData = await CommonReadCall(req, res, next);

    if (!emailContentData || emailContentData.length === 0) {
      return res.status(404).send({ success: false, message: "Email content not found" });
    }

    const emailContent = emailContentData[0];

    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;
    const to = [req.body.data.Email];
    const toName = "";
    const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
    const replyTo = emailContent.ReplyToEmailId || "";

    let subject = emailContent.Subject || "";

    subject = subject
      .replaceAll("<BugID>", req.body.data.BugID || "")
      .replaceAll("<AppName>", req.body.data.AppName || "");
    let body = emailContent.Body;

    body = body
      .replaceAll("<BugID>", req.body.data.BugID || "")
      .replaceAll("<AppName>", req.body.data.AppName || "")
      .replaceAll("<ResolvedDate>", req.body.data.ResolvedDate || "")
      .replaceAll("<ResolvedDescription>", req.body.data.ResolvedDescription || "");

    await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo);

  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal server error" });
  }
}

async function deleteHM_Bug(req, res, next) {
  try {
    req.body.tableName = "HM_RaiseBug";
    await CommonDeleteCall(req, res, next);

    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error || "Technical error, please contact the administrator",
    });
  }
}


exports.HM_Bug = {
  getHM_Bug,
  getBugData,
  postHM_Bug,
  putHM_Bug,
  deleteHM_Bug
};