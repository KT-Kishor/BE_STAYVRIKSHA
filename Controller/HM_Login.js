const bcrypt = require("bcrypt");
const { randomUUID } = require("crypto");
const saltRounds = 10;
const {
  CommonReadCall,
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall,
  CommonSendEmail,
  CommonReadWithFilters
} = require("./CommonController");


async function getHM_Login(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Login";

    if (req.query.UserID) req.body.filters.UserID = req.query.UserID;

    if (req.query.UserName) req.body.filters.UserName = req.query.UserName;

    if (req.query.EmailID) req.body.filters.EmailID = req.query.EmailID;

    var data = await CommonReadCall(req, res, next);

    if (data.length === 0) return res.status(400).send({ success: false, message: "Invalid credentials. Please try again", });

    const user = data[0];
    data.forEach(item => {
      if (item.FileContent && Buffer.isBuffer(item.FileContent)) {
        item.FileContent = item.FileContent.toString('base64');
      }
    });

    if (!req.query.OTP && !req.query.Password) {
      return res.send({ success: true, data: user });
    }

    if (req.query.OTP) {
      const isOTPValid = await bcrypt.compare(req.query.OTP, user.OTP);
      if (isOTPValid) {
        data[0]._x9A1p = await bcrypt.hash(data[0].UserID, saltRounds);
        data[0]._k7LmQ = await bcrypt.hash(data[0].UserName, saltRounds);
        return res.send({ success: true, message: "OTP verified", data });
      } else {
        return res.status(400).send({ success: false, message: "Incorrect OTP" });
      }
    } else if (req.query.Password) {
      const isPasswordValid = await bcrypt.compare(atob(req.query.Password), user.Password);
      if (isPasswordValid) {
        data[0]._x9A1p = await bcrypt.hash(data[0].UserID, saltRounds);
        data[0]._k7LmQ = await bcrypt.hash(data[0].UserName, saltRounds);
        return res.send({ success: true, message: "Password verified", data });
      } else {
        return res.status(400).send({ success: false, message: "Incorrect Password" });
      }
    } else {
      return res.status(400).send({ success: false, message: "OTP or Password is required", });
    }
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Internal server error",
    });
  }
}

async function postHM_Login(req, res, next) {
  try {
    let data = req.body.data;
    const branchNameForMail = data.BranchName || "";
    delete data.BranchName;
    var VenderDocuments = data.Documents || [];
    delete data.Documents;
    req.body.tableName = "HM_Login";
    req.body.filters = {};

    if (data.EmailID) req.body.filters.EmailID = data.EmailID;

    var LoginData = await CommonReadCall(req, res, next);
    delete req.body.filters.EmailID
    delete req.body.filters.MobileNo
    if (LoginData.length > 0) return res.status(400).send({ success: false, message: "You already have an account with this Email ID", });

    if (data.FileContent) data.FileContent = Buffer.from(data.FileContent, 'base64');

    // Fetch existing data
    const allData = await CommonReadCall(req, res, next);
    if (!Array.isArray(allData)) {
      throw new Error("Failed to fetch login data.");
    }
    // Get last numeric UserID
    const lastUserID = Math.max(
      ...allData.map(emp => {
        const numPart = parseInt(emp.UserID, 10);
        return isNaN(numPart) ? 0 : numPart;
      })
    );

    // Generate next UserID
    const nextNum = (isFinite(lastUserID) ? lastUserID : 0) + 1;

    // Always 5 digits: 00001, 00002...
    const dataUserID = nextNum.toString().padStart(5, "0");

    // Assign to data
    data.UserID = dataUserID;
    // Step 4: Create main Allowance record

    if (data.OTP) data.OTP = await bcrypt.hash(data.OTP, saltRounds);

    if (data.Password) data.Password = await bcrypt.hash(atob(data.Password), saltRounds);

    const createResult = await CommonCreateCall(req, res, next);
    if (createResult.success !== true) throw new Error("Failed to create login record.");

    if (data.Role === "Customer") {
      {
        req.body.data = {
          MemberID: data.UserID,
          UserID: data.UserID,
          Salutation: data.Salutation,
          Name: data.UserName,
          Relation: "Self",
          Gender: data.Gender,
          DateOfBirth: data.DateOfBirth
        }

        req.body.tableName = "HM_Members";
        await CommonCreateCall(req, res, next);
      }
    }

    if (VenderDocuments.length > 0) {
      VenderDocuments.forEach(doc => {
        doc.UserID = data.UserID;
        doc.MemberID = data.UserID;
        doc.DocumentID = randomUUID();
        if (doc.File && typeof doc.File === "string") {
          doc.File = Buffer.from(doc.File, "base64");
        }
      });
      req.body.tableName = "HM_CustomerDocument";
      req.body.data = VenderDocuments;
      await CommonCreateCall(req, res, next);
    }

    req.body = {
      UserID: data.UserID || "",
      UserName: data.UserName || "",
      toEmailID: data.EmailID || "",
      BranchName: branchNameForMail
    }

    if (data.Type !== "Vendor" && data.Role !== "Customer") await HostelSignupEmail(req, res, next);
    if (data.Role === "Customer") await CustomerSignupEmail(req, res, next);
    if (data.Type === "Vendor") await VendorRegistrationMail(req, res, next);

    res.status(200).send({ success: true, message: "Login saved successfully!", RoomID: data.ID, });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || error.message || "Technical error, please contact the administrator",
    });
  }
}

async function VendorRegistrationMail(req, res, next) {
  try {
    req.body.tableName = "EmailContent";
    req.body.filters = { Type: "HM_VendorRegistration" };

    var emailContentData = await CommonReadCall(req, res, next);
    if (!emailContentData || emailContentData.length === 0) {
      return res.status(404).send({ success: false, message: "Email content not found" });
    }

    var emailContent = emailContentData[0];

    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;

    const to = [req.body.toEmailID];
    const toName = req.body.UserName;

    const subject = emailContent.Subject;

    // Ensure replacements are applied
    let body = `<p>Dear ${req.body.UserName},</p>
                    <p>${emailContent.Body}</p>`;

    const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
    const replyTo = emailContent.ReplyToEmailId;

    await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo);

  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal server error" });
  }
}

async function HostelSignupEmail(req, res, next) {
  try {
    req.body.tableName = "EmailContent";
    req.body.filters = { Type: "HostelSignup" };

    var emailContentData = await CommonReadCall(req, res, next);
    if (!emailContentData || emailContentData.length === 0) {
      return res.status(404).send({ success: false, message: "Email content not found" });
    }

    var emailContent = emailContentData[0];

    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;

    const to = [req.body.toEmailID];
    const toName = req.body.UserName;

    const subject = emailContent.Subject;

    const formattedBranch = req.body.BranchName
      ? req.body.BranchName.split(",").map(b => b.trim()).join(", ")
      : "";

    // Ensure replacements are applied
    let body = `<p>Dear ${req.body.UserName},</p>
                    <p>${emailContent.Body}</p>`;

    body = body
      .replaceAll("<EmailID>", req.body.toEmailID)
      .replaceAll("<UserName>", req.body.UserName)
      .replaceAll("<BranchName>", formattedBranch);

    const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
    const replyTo = emailContent.ReplyToEmailId;

    await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo);

  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal server error" });
  }
}

async function CustomerSignupEmail(req, res, next) {
  try {
    req.body.tableName = "EmailContent";
    req.body.filters = { Type: "CustomerSignup" };

    var emailContentData = await CommonReadCall(req, res, next);
    if (!emailContentData || emailContentData.length === 0) {
      return res.status(404).send({ success: false, message: "Email content not found" });
    }

    var emailContent = emailContentData[0];

    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;

    const to = [req.body.toEmailID];
    const toName = req.body.UserName;

    const subject = emailContent.Subject;

    // Ensure replacements are applied
    let body = `<p>Dear ${req.body.UserName},</p>
                    <p>${emailContent.Body}</p>`;

    body = body
      .replaceAll("<EmailID>", req.body.toEmailID)
      .replaceAll("<UserName>", req.body.UserName)

    const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
    const replyTo = emailContent.ReplyToEmailId;

    await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo);

  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal server error" });
  }
}

async function putHM_Login(req, res, next) {
  try {
    req.body.tableName = "HM_Login";

    const data = req.body.data;
    const filters = req.body.filters;

    let isCredentialUpdated = false;
    if (data.FileContent) {
      data.FileContent = Buffer.from(data.FileContent, 'base64');
    }

    if (data.OTP) {
      data.OTP = await bcrypt.hash(data.OTP, saltRounds);
      isCredentialUpdated = true;
    } else {
      delete data.OTP;
    }

    if (data.Password) {
      data.Password = await bcrypt.hash(atob(data.Password), saltRounds);
      isCredentialUpdated = true;
    } else {
      delete data.Password;
    }

    if (isCredentialUpdated) {
      data.Status = "Active";
    }

    if (!data || Object.keys(data).length === 0) return res.status(400).send({ success: false, message: "Data for update is required" });

    if (!filters || Object.keys(filters).length === 0) return res.status(400).send({ success: false, message: "Filters for update are required" });

    req.body.data = data;
    req.body.filters = filters;

    await CommonUpdateCall(req, res, next);

    if (data.Status === "Approved" || data.Status === "Send Back") {
      try {
        await VendorApprovalEmail(req, res, next);
      } catch (emailError) {
        console.error("Vendor approval email failed:", emailError.message);
      }
    }
    res.status(200).send({ success: true, message: "Login Details Updated!" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "An error occurred during update"
    });
  }
}

async function VendorApprovalEmail(req, res, next) {
  try {
    const status = req.body.data.Status;

    // 1️⃣ Decide Email Type
    let emailType = "";
    if (status === "Approved") {
      emailType = "HM_VendorApprove";
    } else if (status === "Send Back") {
      emailType = "HM_VendorSendBack";
    } else {
      return; // No mail for other statuses
    }

    // 2️⃣ Read Email Template
    req.body.tableName = "EmailContent";
    req.body.filters = { Type: emailType };
    const emailContentData = await CommonReadCall(req, res, next);

    if (!emailContentData || emailContentData.length === 0) {
      throw new Error(`Email template not found for ${emailType}`);
    }

    const emailContent = emailContentData[0];

    // 3️⃣ Read Vendor Details
    req.body.tableName = "HM_Login";
    req.body.filters = { UserID: req.body.data.UserID };
    const vendorData = await CommonReadCall(req, res, next);

    if (!vendorData || vendorData.length === 0) {
      throw new Error("Vendor not found");
    }

    const vendor = vendorData[0];

    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;
    const to = [vendor.EmailID];
    const toName = req.body.data.UserName;
    const encodedUserID = Buffer.from(String(req.body.data.UserID)).toString("base64");

    // 4️⃣ Subject
    let subject = emailContent.Subject
      .replaceAll("<VendorName>", req.body.data.UserName);

    // 5️⃣ Body

    let body = `<p>Dear ${req.body.data.UserName},</p>
                    <p>${emailContent.Body}</p>`;

    body = body
      .replaceAll("<UserName>", req.body.data.UserName || "")
      .replaceAll("<EmailID>", req.body.data.EmailID || "")
      .replaceAll("<UserID>", encodedUserID || "")
      .replaceAll("<AdminComments>", req.body.data.AdminComment || "—");


    const CC = [];
    const replyTo = emailContent.ReplyToEmailId || "";

    await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo);
  } catch (error) {
    console.error("VendorApprovalEmail error:", error.message);
  }
}

async function deleteHM_Login(req, res, next) {
  try {
    req.body.tableName = "HM_Login";
    var data = await CommonDeleteCall(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({ success: false, message: error || "Technical error, please contact the administrator", });
  }
}

async function HostelSendOTPEmail(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Login";
    if (req.body.UserID) req.body.filters.UserID = req.body.UserID;
    if (req.body.UserName) req.body.filters.UserName = req.body.UserName;
    if (req.body.EmailID) req.body.filters.EmailID = req.body.EmailID;
    var LoginData = await CommonReadCall(req, res, next);

    if (LoginData.length > 0) {
      if (!LoginData[0].EmailID) {
        return res.status(400).send({ success: false, message: "Email ID is required. Please provide a valid email address." });
      }
      // ✅ Vendor approval validation
      if (LoginData[0].Type === "Vendor" && LoginData[0].Status !== "Approved" && LoginData[0].Status !== "Active") {
        return res.status(403).send({
          success: false,
          message: "Vendor account approval is pending. Please contact the administrator"
        });
      }
      // if (req.body.UserID === LoginData[0].UserID && req.body.UserName === LoginData[0].UserName) {
      // Fetch EmailContent for OTP email body
      req.body.tableName = "EmailContent";
      if (req.body.Type) {
        req.body.filters = { Type: req.body.Type };
      }
      var emailContentData = await CommonReadCall(req, res, next);

      // Generate OTP
      var OTP = Math.floor(100000 + Math.random() * 900000).toString();

      // Update LoginDetails with OTP and timestamp
      req.body.data = {
        OTP: await bcrypt.hash(OTP, saltRounds),
        TimeDate: new Date().getTime(),
      };
      req.body.filters = { EmailID: LoginData[0].EmailID };
      req.body.tableName = "HM_Login";
      await CommonUpdateCall(req, res, next);
      // Prepare email details
      var emailContent = emailContentData[0];
      const from = emailContent.FormEmailId;
      const fromName = emailContent.FormName;
      const to = [LoginData[0].EmailID, emailContent.CCEmailId];
      const toName = LoginData[0].UserName;
      const subject = emailContent.Subject;
      var body = `<p>Dear ${LoginData[0].UserName || ''},</p>
                      <p>${emailContent.Body.replaceAll("<OTPCODE>", OTP)}</p>`;

      await CommonSendEmail(req, from, fromName, to, toName, subject, body);
      res.send({ success: true, message: "Email sent successfully", OTP: OTP });
      // } 
      // else {
      //   res.status(400).send({ success: false, message: "Invalid credentials. Please try again.", });
      // }
    } else {
      res.status(400).send({ success: false, message: "Invalid credentials. Please try again.", });
    }
  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal server error" });
  }
}

async function HM_CustomerContact(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Login";
    if (req.query.Role) req.body.filters.Role = req.query.Role;
    if (req.query.UserID) req.body.filters.UserID = req.query.UserID;
    if (req.query.UserName) req.body.filters.UserName = req.query.UserName;
    if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
    if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({ success: true, data: [] })
    delete req.query.Role;

    const data = await CommonReadWithFilters(req, res, next);
    const filteredData = data.map((employee) => ({
      Salutation: employee.Salutation,
      UserName: employee.UserName,
      Role: employee.Role,
      BranchCode: employee.BranchCode,
      EmailID: employee.EmailID,
      MobileNo: employee.MobileNo
    }));
    res.send({ success: true, data: filteredData });
  } catch (err) {
    res.status(500).send({ success: false, message: err || "Technical error, please contact the administrator", });
  }
}

async function HM_StaffContact(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Login";
    if (req.query.Role) req.body.filters.Role = req.query.Role;
    if (req.query.UserID) req.body.filters.UserID = req.query.UserID;
    if (req.query.UserName) req.body.filters.UserName = req.query.UserName;
    if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
    if (req.query.Type) req.body.filters.Type = req.query.Type;
    if (req.query.Status) req.body.filters.Status = req.query.Status;
    if (req.query.City) req.body.filters.City = req.query.City;
    if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({ success: true, data: [] })
    delete req.query.Role;

    const data = await CommonReadWithFilters(req, res, next);
    const filteredData = data.map((employee) => ({
      UserID: employee.UserID,
      Salutation: employee.Salutation,
      UserName: employee.UserName,
      Role: employee.Role,
      BranchCode: employee.BranchCode,
      EmailID: employee.EmailID,
      Gender: employee.Gender,
      STDCode: employee.STDCode,
      MobileNo: employee.MobileNo,
      Address: employee.Address,
      Country: employee.Country,
      State: employee.State,
      City: employee.City,
      BranchCode: employee.BranchCode,
      DateOfBirth: employee.DateOfBirth,
      Status: employee.Status,
      Type: employee.Type
    }));
    res.send({ success: true, data: filteredData });
  } catch (err) {
    res.status(500).send({ success: false, message: err || "Technical error, please contact the administrator", });
  }
}

async function HM_LoginReadCall(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Login";

    if (req.query.Role) req.body.filters.Role = req.query.Role;
    if (req.query.UserID) req.body.filters.UserID = req.query.UserID;
    if (req.query.UserName) req.body.filters.UserName = req.query.UserName;
    if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
    if (req.query.Type) req.body.filters.Type = req.query.Type;
    if (req.query.Status) req.body.filters.Status = req.query.Status;
    if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({ success: true, data: [] })
    delete req.query.Role;

    const loginData = await CommonReadWithFilters(req, res, next);
    const loginArray = Array.isArray(loginData) ? loginData : [];

    /* ---------------- HM_CustomerDocument ---------------- */
    req.body.filters = {};
    req.body.tableName = "HM_CustomerDocument";

    if (req.query.UserID) {
      req.body.filters.UserID = req.query.UserID;
    }

    let documentData = await CommonReadWithFilters(req, res, next);
    documentData = Array.isArray(documentData) ? documentData : [];

    documentData.forEach(item => {
      if (item.File && Buffer.isBuffer(item.File)) {
        item.File = item.File.toString('base64');
      }
    });

    const documentMap = new Map();
    documentData.forEach(doc => {
      if (!documentMap.has(doc.UserID)) {
        documentMap.set(doc.UserID, []);
      }
      documentMap.get(doc.UserID).push(doc);
    });

    const mergedData = loginArray.map(user => ({
      UserID: user.UserID,
      Salutation: user.Salutation,
      UserName: user.UserName,
      Role: user.Role,
      BranchCode: user.BranchCode,
      EmailID: user.EmailID,
      Gender: user.Gender,
      STDCode: user.STDCode,
      MobileNo: user.MobileNo,
      Address: user.Address,
      Country: user.Country,
      State: user.State,
      City: user.City,
      DateOfBirth: user.DateOfBirth,
      Status: user.Status,
      AdminComment: user.AdminComment,
      Documents: documentMap.get(user.UserID) || []
    }));

    res.send({
      success: true,
      data: mergedData
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Technical error, please contact the administrator"
    });
  }
}

async function OTPEmail(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Customer";
    if (req.body.BookingID) req.body.filters.BookingID = req.body.BookingID;
    if (req.body.CustomerEmail) req.body.filters.CustomerEmail = req.body.CustomerEmail;

    var LoginData = await CommonReadCall(req, res, next);

    // if (LoginData.length > 0) {
    // Fetch EmailContent for OTP email body
    req.body.tableName = "EmailContent";
    if (req.body.Type) {
      req.body.filters = { Type: req.body.Type };
    }
    var emailContentData = await CommonReadCall(req, res, next);

    // Generate OTP
    var OTP = Math.floor(100000 + Math.random() * 900000).toString();

    // Update LoginDetails with OTP and timestamp
    req.body.data = {
      OTP: await bcrypt.hash(OTP, saltRounds),
      TimeDate: new Date().getTime(),
    };
    req.body.filters = { CustomerEmail: LoginData[0].CustomerEmail, BookingID: LoginData[0].BookingID };
    req.body.tableName = "HM_Customer";
    await CommonUpdateCall(req, res, next);

    // Prepare email details
    var emailContent = emailContentData[0];
    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;
    const to = [LoginData[0].CustomerEmail];
    const toName = LoginData[0].CustomerName;
    const subject = emailContent.Subject;
    var body = `<p>Dear ${LoginData[0].CustomerName || ''},</p>
                      <p>${emailContent.Body.replaceAll("<OTPCODE>", OTP)}</p>`;


    await CommonSendEmail(req, from, fromName, to, toName, subject, body);
    res.send({ success: true, message: "Email sent successfully"});
    // } else {
    //   res.status(400).send({ success: false, message: "Invalid credentials. Please try again.", });
    // }
  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal server error" });
  }
}

async function VerifyCustomerOTP(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Customer";

    if (req.query.BookingID) {
      req.body.filters.BookingID = req.query.BookingID;
    }

    if (req.query.CustomerEmail) {
      req.body.filters.CustomerEmail = req.query.CustomerEmail;
    }

    const data = await CommonReadCall(req, res, next);

    if (!data || data.length === 0) {
      return res.status(400).send({
        success: false,
        message: "Customer not found"
      });
    }

    const customer = data[0];

    if (!req.query.OTP) {
      return res.status(400).send({
        success: false,
        message: "OTP is required"
      });
    }

    // Verify OTP
    const isOTPValid = await bcrypt.compare(
      req.query.OTP.trim(),
      customer.OTP
    );

    if (!isOTPValid) {
      return res.status(400).send({
        success: false,
        message: "Incorrect OTP"
      });
    }

    // OTP Expiry Check (10 minutes)
    const currentTime = Date.now();
    const otpAge = currentTime - Number(customer.TimeDate);

    if (otpAge > 10 * 60 * 1000) {
      return res.status(400).send({
        success: false,
        message: "OTP has expired"
      });
    }

    // Remove OTP from response
    delete data[0].OTP;

    // Generate tokens
    data[0]._x9A1p = await bcrypt.hash(
      String(data[0].UserID),
      saltRounds
    );

    data[0]._k7LmQ = await bcrypt.hash(
      String(data[0].CustomerName),
      saltRounds
    );

    return res.send({
      success: true,
      message: "OTP verified",
      data
    });

  } catch (error) {
    console.error(error);

    return res.status(500).send({
      success: false,
      message: "Internal server error"
    });
  }
}

exports.HM_Login = {
  getHM_Login,
  postHM_Login,
  putHM_Login,
  deleteHM_Login,
  HostelSendOTPEmail,
  HM_CustomerContact,
  HM_StaffContact,
  HM_LoginReadCall,
  OTPEmail,
  VerifyCustomerOTP
};