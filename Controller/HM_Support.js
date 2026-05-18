const {
  CommonReadCall,
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall,
  CommonReadWithFilters,
  CommonSendEmail
} = require("./CommonController");


async function getHM_Support(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Support";
    req.body.selectedFields = ["TicketID", "IssueName", "IssueType", "IssueDescription", "RaisedBy", "Email", "CreatedDate", "Status", "ResolvedDate", "ResolvedDescription"];
    if (req.query.TicketID) req.body.filters.TicketID  = req.query.TicketID;
    if (req.query.Status) req.body.filters.Status = req.query.Status;
    if (req.query.StartDate && req.query.EndDate) req.body.filters.CreatedDate = [req.query.StartDate, req.query.EndDate]
    if (req.query.IssueName) req.body.filters.IssueName = req.query.IssueName;
    if (req.query.IssueType) req.body.filters.IssueType = req.query.IssueType;
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

async function getSupportData(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Support";
    if (req.query.TicketID) {
      req.body.filters.TicketID = req.query.TicketID;
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

async function postHM_Support(req, res, next) {
  try {

    req.body.tableName = "HM_Support";

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
    inv.TicketID?.startsWith(`TCK-${financialYear}-`)
    );

    let nextNumber = "001";

    if (financialYearInvoices.length > 0) {
      const lastNumbers = financialYearInvoices.map((inv) => {
        const match = inv.TicketID.match(/-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });

      const lastInvoiceNum = Math.max(...lastNumbers);
      nextNumber = String(lastInvoiceNum + 1).padStart(3, "0");
    }

    const newTicketID = `TCK-${financialYear}-${nextNumber}`;

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
      TicketID: newTicketID,
    };

    req.body = {
      tableName: "HM_Support",
      data: [invoiceRecord],
    };

    const invoiceResponse = await CommonCreateCall(req, res, next);
    if (!invoiceResponse || invoiceResponse.error) {
      return res.status(500).send({
        success: false,
        message: invoiceResponse?.error || "Failed to create Support Ticket",
      });
    }

    await HM_SupportTicketRaised(req, res, next);

    res.status(200).send({
      success: true,
      message: "Support Ticket Created Successfully!",
      TicketID: newTicketID,
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: error?.message || "Technical error, please contact the administrator",
    });
  }
}

async function HM_SupportTicketRaised(req, res, next) {
    try {
        req.body.tableName = "EmailContent";
        req.body.filters = { Type: "HM_SupportRaised" };

        const emailContentData = await CommonReadCall(req, res, next);

        if (!emailContentData || emailContentData.length === 0) return res.status(404).send({ success: false, message: "Email content not found" });

        const emailContent = emailContentData[0];

        const from = emailContent.FormEmailId;
        const fromName = emailContent.FormName;
        const to = [process.env.To_Email_ID];
        const toName = "";
        const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
        const replyTo = emailContent.ReplyToEmailId || "";

        let subject = emailContent.Subject;
        let body = emailContent.Body;

        body = body
            .replaceAll("<TicketID>", req.body.data[0].TicketID || "")
            .replaceAll("<IssueType>", req.body.data[0].IssueType || "")
            .replaceAll("<RaisedBy>", req.body.data[0].RaisedBy || "")
            .replaceAll("<CreatedDate>", req.body.data[0].CreatedDate || "")
            .replaceAll("<IssueDescription>", req.body.data[0].IssueDescription || "");

        await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo);
    } catch (error) {
        return res.status(500).send({ success: false, message: "Internal server error" });
    }
}

async function putHM_Support(req, res, next) {
  try {

    req.body.tableName = "HM_Support";

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

    await HM_SupportTicketResolved(req, res, next);

    res.send({
      success: true,
      message: "Support resolved successfully",
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: error?.message || "Technical error, please contact the administrator",
    });
  }
}

async function HM_SupportTicketResolved(req, res, next) {
    try {
        req.body.tableName = "EmailContent";
        req.body.filters = { Type: "HM_SupportResolved" };

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

        let subject = emailContent.Subject;
        subject = subject.replaceAll("<TicketID>", req.body.data.TicketID || "");

        let body = emailContent.Body;

        body = body
            .replaceAll("<TicketID>", req.body.data.TicketID || "")
            .replaceAll("<IssueType>", req.body.data.IssueType || "")
            .replaceAll("<ResolvedDate>", req.body.data.ResolvedDate || "")
            .replaceAll("<ResolvedDescription>", req.body.data.ResolvedDescription || "");

        await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo);

    } catch (error) {
        return res.status(500).send({ success: false, message: "Internal server error" });
    }
}

async function deleteHM_Support(req, res, next) {
  try {
    req.body.tableName = "HM_Support";
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


exports.HM_Support = {
  getHM_Support,
  getSupportData,
  postHM_Support,
  putHM_Support,
  deleteHM_Support
};