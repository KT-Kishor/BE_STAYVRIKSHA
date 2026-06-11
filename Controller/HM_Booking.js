const { randomUUID } = require("crypto");
const {
  CommonReadCall,
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall,
  CommonReadWithFilters,
  CommonSendEmail,
} = require("./CommonController");

async function getHM_Booking(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Booking";
    if (req.query.Status) req.body.filters.Status = req.query.Status;
    if (req.query.BookingID) req.body.filters.BookingID = req.query.BookingID;
    if (req.query.RoomNo) req.body.filters.RoomNo = req.query.RoomNo;
    if (req.query.UserID) req.body.filters.UserID = req.query.UserID;
    if (req.query.BranchCode)
      req.body.filters.BranchCode = req.query.BranchCode.split(",");
    const commentData = await CommonReadWithFilters(req, res, next);
    res.send({
      success: true,
      commentData,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

async function postHM_Booking(req, res, next) {
  try {
    let data = req.body.data;
    data.BookingID = randomUUID();
    req.body.tableName = "HM_Booking";
    req.body.data = {
      ...data,
    };
    // Step 4: Create main Allowance record
    await CommonCreateCall(req, res, next);
    res.status(200).send({
      success: true,
      message: "Booking details saved successfully!",
      BookingID: data.BookingID,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function putHM_Booking(req, res, next) {
  try {
    const data = req.body.data;

    const customerEmail = data.CustomerEmail || "";
    const guests = data.Guests || "";
    const pdfAttachment = data.pdfAttachment;
    const propertyName = data.PropertyName || "";
    const propertyMobileNo = `${data.PropertySTD || ""} ${data.PropertyMobileNo || ""}`;
    const propertyEmail = data.PropertyEmail 

    // Remove Non-DB Fields Before Update
    delete data.CustomerEmail;
    delete data.Guests;
    delete data.pdfAttachment;
    delete data.PropertyName;
    delete data.PropertySTD;
    delete data.PropertyMobileNo;
    delete data.PropertyEmail;

    // Prepare Email Payload
    const emailPayload = {
      CustomerName: data.CustomerName,
      BookingID: data.BookingID,
      CustomerEmail: customerEmail,
      BedType: data.BedType,
      RentPrice: formatAmount(data.RentPrice),
      BookingDate: formatDate(data.BookingDate),
      StartDate: data.StartDate,
      EndDate: data.EndDate,
      Guests: guests,
      MemberID: data.MemberID,
      RejectDesc: data.RejectDesc || "",
      PropertyName: propertyName,
      PropertyMobileNo: propertyMobileNo || "",
      PropertyEmail: propertyEmail || "",
      PropertyType : data.PropertyType
    };

    // Update Booking Table First
    req.body.tableName = "HM_Booking";

    req.body.data = data;
    req.body.filters = {
      BookingID: data.BookingID
    };

    const updateResponse = await CommonUpdateCall(req, res, next, pdfAttachment);

    // Send Email Only After Successful Update
    if (updateResponse && updateResponse.success !== false) {

      req.body = emailPayload;

      if (data.Status === "Confirmed") {

        await BookingConfirmEmail(req, res, next, pdfAttachment);

      } else if (data.Status === "Rejected") {

        await BookingRejectEmail(req, res, next);
      }
    }

    return res.status(200).send({
      success: true,
      message: "Booking details updated successfully!"
    });

  } catch (error) {

    return res.status(500).send({
      success: false,
      message:
        error.message ||
        "Technical error, please contact the administrator"
    });
  }
}

async function BookingConfirmEmail(req, res, next, pdfAttachment) {
  try {
    req.body.tableName = "EmailContent";
    req.body.filters = { Type: "BookingConfirm" };

    var emailContentData = await CommonReadCall(req, res, next);
    if (!emailContentData || emailContentData.length === 0) {
      return res.status(404).send({ success: false, message: "Email content not found" });
    }

    var emailContent = emailContentData[0];

    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;

    const to = [req.body.CustomerEmail];
    const toName = req.body.CustomerName;
    let subject = emailContent.Subject;

    subject = subject
        .replaceAll("<PropertyName>", req.body.PropertyName || "")
        .replaceAll("<PropertyType>", req.body.PropertyType || "");

    const encodedCustomerID = Buffer.from(String(req.body.BookingID)).toString("base64");
    const encodedMemberID  = Buffer.from(String(req.body.MemberID)).toString("base64");

    let attachments = [];

    if (pdfAttachment && pdfAttachment.content) {
      attachments.push({
        filename: pdfAttachment.fileName || "BookingVoucher.pdf",
        content: Buffer.from(pdfAttachment.content, "base64"),
        contentType: pdfAttachment.mimeType || "application/pdf",
      });
    }

    let propertyMobileNo = req.body.PropertyMobileNo || "";

    // Ensure replacements are applied
    let body = `<p>Dear ${req.body.CustomerName},</p>
                    <p>${emailContent.Body}</p>`;

    body = body
      .replaceAll("<BookingID>", req.body.BookingID)
      .replaceAll("<CustomerName>", req.body.CustomerName)
      .replaceAll("<BookingDate>", req.body.BookingDate)
      .replaceAll("<StartDate>", req.body.StartDate)
      .replaceAll("<EndDate>", req.body.EndDate)
      .replaceAll("<RentPrice>", req.body.RentPrice)
      .replaceAll("<BedType>", req.body.BedType)
      .replaceAll("<Guests>", req.body.Guests)
      .replaceAll("<PropertyName>", req.body.PropertyName || "")
      .replaceAll("<PropertyType>", req.body.PropertyType || "")
      .replaceAll("<PropertyMobileNo>", propertyMobileNo || "")
      .replaceAll("<PropertyEmail>", req.body.PropertyEmail || "")
      .replaceAll("<EncodedMemberID>", encodedMemberID)
      .replaceAll("<EncodedCustomerID>", encodedCustomerID);

    const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
    const replyTo = emailContent.ReplyToEmailId;

    await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo, attachments);
  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal server error" });
  }
}

async function BookingRejectEmail(req, res, next) {
  try {
    req.body.tableName = "EmailContent";
    req.body.filters = { Type: "BookingReject" };

    var emailContentData = await CommonReadCall(req, res, next);
    if (!emailContentData || emailContentData.length === 0) {
      return res.status(404).send({ success: false, message: "Email content not found" });
    }

    var emailContent = emailContentData[0];

    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;

    const to = [req.body.CustomerEmail];
    const toName = req.body.CustomerName;

    let subject = emailContent.Subject;

    subject = subject
        .replaceAll("<PropertyName>", req.body.PropertyName || "")
        .replaceAll("<PropertyType>", req.body.PropertyType || "");
        
    let propertyMobileNo = req.body.PropertyMobileNo || "";

    // Ensure replacements are applied
    let body = `<p>Dear ${req.body.CustomerName},</p>
                    <p>${emailContent.Body}</p>`;

    body = body
      .replaceAll("<BookingID>", req.body.BookingID)
      .replaceAll("<CustomerName>", req.body.CustomerName)
      .replaceAll("<BookingDate>", req.body.BookingDate)
      .replaceAll("<StartDate>", req.body.StartDate)
      .replaceAll("<EndDate>", req.body.EndDate)
      .replaceAll("<PropertyName>", req.body.PropertyName || "")
      .replaceAll("<PropertyType>", req.body.PropertyType || "")
      .replaceAll("<PropertyMobileNo>", propertyMobileNo || "")
      .replaceAll("<PropertyEmail>", req.body.PropertyEmail || "")
      .replaceAll("<RejectDesc>", req.body.RejectDesc || "");

    const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
    const replyTo = emailContent.ReplyToEmailId;

    await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo);
  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal server error" });
  }
}

function formatAmount(amount) {
  if (!amount) return "0.00";

  return Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (isNaN(date)) return ""; // return empty if invalid date

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

// async function BookingAssignedEmail(req, res, next) {
//   try {
//     req.body.tableName = "EmailContent";
//     req.body.filters = { Type: "BookingAssigned" };

//     const emailContentData = await CommonReadCall(req, res, next);
//     if (!emailContentData || emailContentData.length === 0) return;

//     const emailContent = emailContentData[0];

//     const from = emailContent.FormEmailId;
//     const fromName = emailContent.FormName;
//     const to = [req.body.toEmailID];
//     const toName = req.body.UserName;
//     const subject = emailContent.Subject;

//     let body = `<p>Dear ${req.body.UserName},</p>
//                 <p>${emailContent.Body}</p>`;

//     body = body
//       .replaceAll("<RoomNumber>", req.body.RoomNumber || "")
//       .replaceAll("<BookingDate>", req.body.BookingDate || "")
//       .replaceAll("<StartDate>", req.body.StartDate || "")
//       .replaceAll("<EndDate>", req.body.EndDate || "")
//       .replaceAll("<RoomNo>", req.body.RoomNo || "")
//       .replaceAll("<BedType>", req.body.BedType || "")
//       .replaceAll("<Guests>", req.body.Guests || "1");

//     const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
//     const replyTo = emailContent.ReplyToEmailId;

//     await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo);

//   } catch (error) {
//     return res.status(500).send({ success: false, message: "Internal server error" });
//   }
// }

async function deleteHM_Booking(req, res, next) {
  try {
    req.body.tableName = "HM_Booking";
    var data = await CommonDeleteCall(req, res, next);
    res.send({
      success: true,
      data,
      message: "Booking deleted successfully!",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

// async function CustomerAndPayment(req, res, next) {
//     try {
//         req.body.filters = {};

//         if (req.query.UserID) req.body.filters.UserID = req.query.UserID;

//         /* -------------------- Booking Data -------------------- */
//         req.body.tableName = "HM_Booking";
//         const BookingData = await CommonReadCall(req, res, next);

//         if (!BookingData || BookingData.length === 0) {
//             return res.send({
//                 success: true,
//                 BookingData: [],
//                 PaymentData: []
//             });
//         }

//         const aBookingIDs = BookingData.map(b => b.BookingID);
//         const aCustomerIDs = [
//             ...new Set(BookingData.map(b => b.CustomerID).filter(Boolean))
//         ];

//         /* -------------------- Facility Data -------------------- */
//         req.body.tableName = "HM_BookingFacilityItems";
//         req.body.filters = {};

//         const FacilityData = await CommonReadCall(req, res, next);

//         const oFacilityPriceMap = {};
//         FacilityData.forEach(item => {
//             if (aBookingIDs.includes(item.BookingID)) {
//                 oFacilityPriceMap[item.BookingID] =
//                     (oFacilityPriceMap[item.BookingID] || 0) + (item.FacilitiPrice || 0);
//             }
//         });

//         /* -------------------- Customer Data -------------------- */
//         req.body.tableName = "HM_Customer";
//         req.body.filters = {}; // fetch all customers once

//         const CustomerData = await CommonReadCall(req, res, next);

//         // Map Customer by CustomerID
//         const oCustomerMap = {};
//         CustomerData.forEach(c => {
//             if (aCustomerIDs.includes(c.CustomerID)) {
//                 oCustomerMap[c.CustomerID] = {
//                     CustomerName: c.CustomerName,
//                     Salutation: c.Salutation
//                 };
//             }
//         });

//         /* -------------------- Enrich Booking Data -------------------- */
//         const EnrichedBookingData = BookingData.map(b => ({
//             ...b,
//             CustomerName: oCustomerMap[b.CustomerID]?.CustomerName || "",
//             Salutation: oCustomerMap[b.CustomerID]?.Salutation || "",
//             FacilityPrice: oFacilityPriceMap[b.BookingID] || 0
//         }));

//         /* -------------------- Payment Data -------------------- */
//         req.body.tableName = "HM_ManageInvoice";
//         req.body.filters = {};

//         if (req.query.UserID) req.body.filters.UserID = req.query.UserID;

//         const PaymentRawData = await CommonReadCall(req, res, next);

//         const PaymentData = PaymentRawData.map(item => ({
//             InvNo: item.InvNo,
//             CustomerName: item.CustomerName,
//             TotalAmount: item.TotalAmount,
//             DueAmount: item.DueAmount,
//             Currency: item.Currency,
//             InvoiceDate: item.InvoiceDate,
//             Status: item.Status,
//             BookingID: item.BookingID
//         }));

//         /* -------------------- Complaint Data -------------------- */
//         req.body.tableName = "HM_Complaint";
//         req.body.filters = {};

//         if (req.query.UserID) req.body.filters.UserID = req.query.UserID;

//         const ComplaintData = await CommonReadCall(req, res, next);

//         /* -------------------- Damage Data -------------------- */
//         req.body.tableName = "HM_Damage";
//         req.body.filters = {};

//         if (req.query.UserID) req.body.filters.UserID = req.query.UserID;

//         const DamageData = await CommonReadCall(req, res, next);

//         /* -------------------- Final Response -------------------- */
//         res.send({
//             success: true,
//             BookingData: EnrichedBookingData,
//             PaymentData, ComplaintData, DamageData
//         });

//     } catch (error) {
//         res.status(500).send({
//             success: false,
//             message: error?.message || "Technical error, please contact the administrator"
//         });
//     }
// }

async function BookingBedTypeRoomReadCall(req, res, next) {
  try {
    const top = req.query.top;
    const skip = req.query.skip;
    const BranchCodes = req.query.BranchCode
      ? req.query.BranchCode.split(",")
      : [];
    const ACType = req.query.ACType;

    const createSubRequest = (customBody) => {
      return Object.assign(Object.create(Object.getPrototypeOf(req)), req, {
        body: customBody,
      });
    };

    // 1. Fetch Bed Types
    req.body.tableName = "HM_BedType";
    req.body.top = top;
    req.body.skip = skip;
    req.body.filters = {};
    if (BranchCodes.length > 0) req.body.filters.BranchCode = BranchCodes;
    if (ACType) req.body.filters.ACType = ACType;

    const HM_BedTypeData = await CommonReadWithFilters(req, res, next);

    if (!HM_BedTypeData || HM_BedTypeData.length === 0) {
      return res.send({
        success: true,
        data: { HM_BedType: [], HM_Rooms: [], HM_RoomCount: 0 },
      });
    }

    const bedTypeIDs = HM_BedTypeData.map((item) => item.ID);

    // 2. Parallel fetch (only 2 tables now)
    const fetchTasks = [
      CommonReadWithFilters(
        createSubRequest({
          tableName: "HM_BedTypeDetails",
          filters: { ID: bedTypeIDs },
        }),
        res,
        next,
      ),

      CommonReadWithFilters(
        createSubRequest({
          tableName: "HM_Rooms",
          filters: { BranchCode: BranchCodes },
        }),
        res,
        next,
      ),
    ];

    const [HM_BedTypeDetailsData, HM_RoomsData] = await Promise.all(fetchTasks);

    // 3. Map Details
    const detailsMap = {};
    (HM_BedTypeDetailsData || []).forEach((d) =>
      (detailsMap[d.ID] ||= []).push(d),
    );

    // 4. Merge BedType + Details + Photo Conversion
    const photoFields = ["Photo1", "Photo2", "Photo3", "Photo4", "Photo5"];
    let mergedData = HM_BedTypeData.flatMap((b) =>
      (detailsMap[b.ID] || []).map((d) => {
        const item = { ...b, ...d };
        photoFields.forEach((f) => {
          if (item[f] && Buffer.isBuffer(item[f])) {
            item[f] = item[f].toString("base64");
          }
        });
        return item;
      }),
    );

    // 5. Match Rooms (without feedback)
    const matchedRooms = mergedData.flatMap((bedType) => {
      const bedTypeName = `${bedType.Name} - ${bedType.ACType}`;
      return (HM_RoomsData || [])
        .filter(
          (r) =>
            r.BedTypeName === bedTypeName &&
            r.BranchCode === bedType.BranchCode,
        )
        .map((room) => ({
          ...room,
        }));
    });

    // 6. Room Count Calculation
    const hasACTypeFilter =
      typeof req.query.ACType === "string" && req.query.ACType.trim() !== "";
    const roomsForCount = hasACTypeFilter
      ? (HM_RoomsData || []).filter(
        (room) =>
          room.BedTypeName &&
          room.BedTypeName.endsWith(`- ${req.query.ACType}`),
      )
      : HM_RoomsData || [];

    const roomCountMap = {};
    roomsForCount.forEach((room) => {
      const key = `${room.BedTypeName}__${room.BranchCode}`;
      roomCountMap[key] = (roomCountMap[key] || 0) + 1;
    });

    return res.send({
      success: true,
      data: {
        HM_BedType: mergedData,
        HM_Rooms: matchedRooms,
        HM_RoomCount: Object.keys(roomCountMap).length,
      },
    });
  } catch (err) {
    return res.status(500).send({
      success: false,
      message: err.message || "Technical error",
    });
  }
}

async function HM_RoomsReadCall(req, res, next) {
  try {
    req.body.filters = {};
    if (req.query.BranchCode)
      req.body.filters.BranchCode = req.query.BranchCode.split(",");

    req.body.tableName = "HM_BedTypeDetails";
    let HM_BedTypeData = await CommonReadWithFilters(req, res, next);

    req.body.tableName = "HM_Rooms";
    let HM_Rooms = await CommonReadWithFilters(req, res, next);

    res.send({
      success: true,
      data: {
        HM_BedTypeData,
        HM_Rooms,
      },
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

async function HM_CustomerReadCall(req, res, next) {
  try {
    req.body.filters = {};
    if (req.query.BranchCode) {
      req.body.filters.BranchCode = req.query.BranchCode.split(",");
    }
    if (req.query.Status) req.body.filters.Status = req.query.Status;
    if (req.query.BookingID) req.body.filters.BookingID = req.query.BookingID;
    if (req.query.RoomNo) req.body.filters.RoomNo = req.query.RoomNo;
    if (req.query.UserID) req.body.filters.UserID = req.query.UserID;

    req.body.tableName = "HM_Booking";
    const HM_Booking = await CommonReadWithFilters(req, res, next);
    const bookingData = HM_Booking?.value || HM_Booking || [];

    req.body.filters = {};
    req.body.tableName = "HM_Customer";

    const HM_Customer = await CommonReadWithFilters(req, res, next);
    const customerData = HM_Customer?.value || HM_Customer || [];

    const customerMap = {};
    customerData.forEach((cust) => {
      customerMap[String(cust.BookingID)] = cust.CustomerName;
    });

    const commentData = bookingData.map((book) => ({
      Status: book.Status,
      BookingID: book.BookingID,
      CustomerName: customerMap[String(book.BookingID)] || null,
      EndDate : book.EndDate
    }));

    res.send({
      success: true,
      commentData,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error?.message || "Technical error, please contact the administrator",
    });
  }
}

async function putHM_Bookingdeposit(req, res, next) {
  try {
    const {
      Status,
      RoomNo,
      CustomerName,
      DepositAmount,
      DepositCurrency,
      DepositDate,
      DepositMode,
      DepositTransactionID,
      DepositTakenBy,
      BranchCode,
      UserID,
      CustomerEmail,
      MemberID
    } = req.body.data;

    const { BookingID, flag } = req.body.filters;

    if (!BookingID) {
      return res.status(400).send({
        success: false,
        message: "BookingID is required",
      });
    }

    if (!MemberID) {
      return res.status(400).send({
        success: false,
        message: "MemberID is required for document validation",
      });
    }

    // Split all Member IDs
    const aMemberIDs = String(MemberID).split(",").map(id => id.trim()).filter(Boolean);

    let aMissingMembers = [];

    for (const sMemberID of aMemberIDs) {  // Check document for every member

      req.body = {
        tableName: "HM_CustomerDocument",
        filters: {
          MemberID: sMemberID
        },
      };

      const oDocResult = await CommonReadCall(req, res, next);

      // Store missing members
      if (!oDocResult || oDocResult.length === 0) {
        aMissingMembers.push(sMemberID);
      }
    }

    // If any member document missing
    if (aMissingMembers.length > 0) {

      if (CustomerEmail) {
        try {
          req.body = {
            CustomerEmail,
            CustomerName,
            UserID,
            BookingID,
            MemberID
          };

          await documentUploadEmail(req, res, next);

        } catch (emailError) {
          console.error("Email sending failed:", emailError);
        }
      }

      return res.status(400).send({
        success: false,
        document: false,
        message:
          `Documents are missing for one or more members. Please upload the required documents to assign the room.`,
      });
    }

    req.body = {
      tableName: "HM_Booking",
      data: {
        Status,
        RoomNo,
      },
      filters: {
        BookingID,
      },
    };

    await CommonUpdateCall(req, res, next);

    if (flag !== "True") {
      req.body = {
        tableName: "HM_Deposit",
        data: {
          DepositID: randomUUID(),
          BookingID,
          CustomerName,
          DepositAmount,
          DepositCurrency,
          DepositDate,
          DepositMode,
          DepositTransactionID,
          DepositTakenBy,
          BranchCode,
        },
      };

      await CommonCreateCall(req, res, next);
    }

    res.status(200).send({
      success: true,
      message:
        flag === "True"
          ? "Booking updated successfully"
          : "Booking updated and Deposit created successfully!",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Technical error, please contact administrator",
    });
  }
}

async function documentUploadEmail(req, res, next) {
  try {
    req.body.tableName = "EmailContent";
    req.body.filters = { Type: "UploadDocument" };

    const emailContentData = await CommonReadCall(req, res, next);

    if (!emailContentData || emailContentData.length === 0) {
      return res.status(404).send({
        success: false,
        message: "Email content not found",
      });
    }

    const emailContent = emailContentData[0];

    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;

    const to = [req.body.CustomerEmail];
    const toName = req.body.CustomerName;

    const subject = emailContent.Subject;

    const encodedBookingID = Buffer.from(String(req.body.BookingID)).toString("base64");
    const encodedMemberID  = Buffer.from(String(req.body.MemberID)).toString("base64");

    let body = emailContent.Body;

    body = body
      .replaceAll("<BookingID>", req.body.BookingID || "")
      .replaceAll("<CustomerName>", req.body.CustomerName || "Customer")
      .replaceAll("<EncodedMemberID>", encodedMemberID)
      .replaceAll("<EncodedBookingID>", encodedBookingID);

    const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
    const replyTo = emailContent.ReplyToEmailId;

    await CommonSendEmail(
      req,
      from,
      fromName,
      to,
      toName,
      subject,
      body,
      CC,
      replyTo,
    );
  } catch (error) {
    return res
      .status(500)
      .send({ success: false, message: "Internal server error" });
  }
}

async function HM_GetCurrentMonthBarChart(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Booking";
    if (req.query.StartDate && req.query.EndDate) {
      req.body.filters.BookingDate = [req.query.StartDate, req.query.EndDate];
    }
    if (req.query.BranchCode)
      req.body.filters.BranchCode = req.query.BranchCode.split(",");
    const bookingData = await CommonReadWithFilters(req, res, next);
    var results = [];
    var StartDate = new Date(req.query.StartDate);
    var year = StartDate.getFullYear();
    var month = StartDate.getMonth() + 1;
    var totalDays = new Date(year, month, 0).getDate();

    for (let i = 0; i < totalDays; i++) {
      var date = `${year}-${month.toString().padStart(2, "0")}-${(i + 1).toString().padStart(2, "0")}`;

      var currentDate = new Date(date);
      // Count the number of rows where QuotationDate matches the current date
      var count = bookingData.filter((book) => {
        var bookDate = new Date(book.BookingDate);
        return (
          bookDate.getFullYear() === currentDate.getFullYear() &&
          bookDate.getMonth() === currentDate.getMonth() &&
          bookDate.getDate() === currentDate.getDate()
        );
      }).length;
      results.push({
        Date: i + 1,
        Count: count,
      });
    }
    res.send({
      success: true,
      results,
    });
  } catch (error) {
    res.status(500).json({
      error: "Technical error please connect to administrator",
    });
  }
}

async function HM_GetCurrentYearStatusBarChart(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Booking";
    if (req.query.StartDate && req.query.EndDate) {
      req.body.filters.BookingDate = [req.query.StartDate, req.query.EndDate];
    }
    if (req.query.BranchCode)
      req.body.filters.BranchCode = req.query.BranchCode.split(",");
    const bookingData = await CommonReadWithFilters(req, res, next);
    const results = [
      {
        Count: bookingData.filter((book) => book.Status === "New").length,
        Status: "New",
      },
      {
        Count: bookingData.filter((book) => book.Status === "Confirmed").length,
        Status: "Confirmed",
      },
      {
        Count: bookingData.filter((book) => book.Status === "Rejected").length,
        Status: "Rejected",
      },
      {
        Count: bookingData.filter((book) => book.Status === "Assigned").length,
        Status: "Assigned",
      },
      {
        Count: bookingData.filter((book) => book.Status === "Completed").length,
        Status: "Completed",
      },
      {
        Count: bookingData.filter((book) => book.Status === "Cancelled").length,
        Status: "Cancelled",
      },
    ];
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({
      error: "Technical error please connect to administrator",
    });
  }
}

async function HM_GetCurrentYearBarChart(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Booking";

    if (req.query.StartDate && req.query.EndDate) {
      req.body.filters.BookingDate = [req.query.StartDate, req.query.EndDate];
    }
    if (req.query.BranchCode)
      req.body.filters.BranchCode = req.query.BranchCode.split(",");
    var StartDate = new Date(req.body.StartDate);
    const bookingData = await CommonReadWithFilters(req, res, next);

    // Month names
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];

    // Initialize count object with 0
    let monthCounts = {};
    months.forEach((m) => (monthCounts[m] = 0));

    // Loop booking data
    bookingData.forEach((item) => {
      if (item.BookingDate) {
        const date = new Date(item.BookingDate);
        const monthIndex = date.getMonth(); // 0-11
        const monthName = months[monthIndex];
        monthCounts[monthName]++;
      }
    });

    // Convert to array format if needed
    const result = months.map((m) => ({
      month: m,
      count: monthCounts[m],
    }));

    return res.status(200).json(result);
  } catch (error) {
    res.status(500).json({
      error: "Technical error please connect to administrator",
    });
  }
}

async function HM_GetCurrentYearPaymentTypeBarChart(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Booking";
    if (req.query.StartDate && req.query.EndDate) {
      req.body.filters.BookingDate = [req.query.StartDate, req.query.EndDate];
    }
    if (req.query.BranchCode)
      req.body.filters.BranchCode = req.query.BranchCode.split(",");
    const bookingData = await CommonReadWithFilters(req, res, next);
    const results = [
      {
        Count: bookingData.filter((book) => book.PaymentType === "Per Day")
          .length,
        Status: "Per Day",
      },
      {
        Count: bookingData.filter((book) => book.PaymentType === "Per Month")
          .length,
        Status: "Per Month",
      },
      {
        Count: bookingData.filter((book) => book.PaymentType === "Per Year")
          .length,
        Status: "Per Year",
      },
    ];
    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({
      error: "Technical error please connect to administrator",
    });
  }
}

async function HM_EnquiryEmail(req, res, next) {
  try {
    req.body.tableName = "EmailContent";
    req.body.filters = { Type: "HM_Enquiry" };

    const emailContentData = await CommonReadCall(req, res, next);

    if (!emailContentData || emailContentData.length === 0)
      return res
        .status(404)
        .send({ success: false, message: "Email content not found" });

    const emailContent = emailContentData[0];

    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;
    const to = [req.body.data.BranchCreatedEmailID];
    const toName = "";
    const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
    const replyTo = emailContent.ReplyToEmailId || "";

    let subject = emailContent.Subject;
    subject = subject.replaceAll(
      "<BranchName>",
      req.body.data.BranchName || "",
    );

    let body = emailContent.Body;

    body = body
      .replaceAll("<BranchName>", req.body.data.BranchName || "")
      .replaceAll("<CustomerName>", req.body.data.CustomerName || "")
      .replaceAll("<CustomerEmail>", req.body.data.CustomerEmail || "")
      .replaceAll("<CustomerPhone>", req.body.data.CustomerPhone || "")
      .replaceAll("<RoomType>", req.body.data.RoomType || "")
      .replaceAll("<CustomerComment>", req.body.data.CustomerComment || "");

    await CommonSendEmail(
      req,
      from,
      fromName,
      to,
      toName,
      subject,
      body,
      CC,
      replyTo,
    );

    return res.status(200).send({
      success: true,
      message: "Enquiry email sent successfully",
    });
  } catch (error) {
    return res
      .status(500)
      .send({ success: false, message: "Internal server error" });
  }
}

async function HM_BookingCustomerReadCall(req, res, next) {
  try {
    req.body.filters = {};
    if (req.query.BranchCode) {
      req.body.filters.BranchCode = req.query.BranchCode.split(",");
    }

    req.body.tableName = "HM_Booking";
    const HM_Booking = await CommonReadWithFilters(req, res, next);
    const bookingData = HM_Booking?.value || HM_Booking || [];

    req.body.filters = {};
    req.body.tableName = "HM_Customer";

    const HM_Customer = await CommonReadWithFilters(req, res, next);
    const customerData = HM_Customer?.value || HM_Customer || [];

    const customerMap = {};
    customerData.forEach((cust) => {
      customerMap[String(cust.BookingID)] = {
        CustomerName: cust.CustomerName,
        CustomerEmail: cust.CustomerEmail,
        UserID: cust.UserID,
      };
    });

    const commentData = bookingData.map((book) => ({
      Status: book.Status,
      BookingID: book.BookingID,
      CustomerName: customerMap[String(book.BookingID)]?.CustomerName || null,
      CustomerEmail: customerMap[String(book.BookingID)]?.CustomerEmail || null,
      RoomNo: book.RoomNo,
      BranchCode: book.BranchCode,
      BedType: book.BedType,
      Currency: book.Currency,
      UserID: customerMap[String(book.BookingID)]?.UserID || null,
    }));

    res.send({ success: true, commentData });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error?.message || "Technical error, please contact the administrator",
    });
  }
}

async function CustomerAndPayment(req, res, next) {
  try {
    req.body.filters = {};

    if (req.query.UserID) req.body.filters.UserID = req.query.UserID;

    /* -------------------- Booking Data -------------------- */
    req.body.tableName = "HM_Booking";
    const BookingData = await CommonReadCall(req, res, next);

    if (!BookingData || BookingData.length === 0) {
      return res.send({
        success: true,
        BookingData: [],
      });
    }

    const aBookingIDs = BookingData.map((b) => b.BookingID);
    const aCustomerIDs = [
      ...new Set(BookingData.map((b) => b.BookingID).filter(Boolean)),
    ];

    /* -------------------- Facility Data -------------------- */
    req.body.tableName = "HM_BookingFacilityItems";
    req.body.filters = {};

    const FacilityData = await CommonReadCall(req, res, next);

    const oFacilityPriceMap = {};

    FacilityData.forEach((item) => {
      if (aBookingIDs.includes(item.BookingID)) {
        oFacilityPriceMap[item.BookingID] =
          (oFacilityPriceMap[item.BookingID] || 0) +
          Number(item.FacilitiPrice || 0);
      }
    });

    /* -------------------- Customer Data -------------------- */
    req.body.tableName = "HM_Customer";
    req.body.filters = {}; // fetch all customers once

    const CustomerData = await CommonReadCall(req, res, next);

    // Map Customer by BookingID
    const oCustomerMap = {};
    CustomerData.forEach((c) => {
      if (aCustomerIDs.includes(c.BookingID)) {
        oCustomerMap[c.BookingID] = {
          CustomerName: c.CustomerName,
          Salutation: c.Salutation,
        };
      }
    });

    /* -------------------- Enrich Booking Data -------------------- */
    const EnrichedBookingData = BookingData.map((b) => ({
      ...b,
      CustomerName: oCustomerMap[b.BookingID]?.CustomerName || "",
      Salutation: oCustomerMap[b.BookingID]?.Salutation || "",
      FacilityPrice: oFacilityPriceMap[b.BookingID] || 0,
    }));

    /* -------------------- Final Response -------------------- */
    res.send({
      success: true,
      BookingData: EnrichedBookingData,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error?.message || "Technical error, please contact the administrator",
    });
  }
}

exports.HM_Booking = {
  getHM_Booking,
  postHM_Booking,
  putHM_Booking,
  deleteHM_Booking,
  CustomerAndPayment,
  BookingBedTypeRoomReadCall,
  HM_RoomsReadCall,
  HM_CustomerReadCall,
  putHM_Bookingdeposit,
  HM_GetCurrentMonthBarChart,
  HM_GetCurrentYearStatusBarChart,
  HM_GetCurrentYearBarChart,
  HM_GetCurrentYearPaymentTypeBarChart,
  HM_EnquiryEmail,
  HM_BookingCustomerReadCall,
};
