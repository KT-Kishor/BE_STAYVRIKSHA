const { randomUUID } = require("crypto");
const bcrypt = require("bcrypt");
const {
  CommonReadCall,
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall,
  CommounMultipalUpdate,
  CommonSendEmail,
  CommonReadWithFilters,
} = require("./CommonController");

var Stayvriksha = require("../sqlStayvriksha");
var DemoStayvriksha = require("../sqlDevstayvriksha");

async function getHM_Customer(req, res, next) {
  try {
    // 🔹 Step 1: Determine which DB to use
    const origin = req.get("origin") || "";

    if (origin.split("//")[1] === "stayvriksha.in" || origin.split("//")[1] === "www.stayvriksha.in") {
				dbConnProd = Stayvriksha;
			} else {
				dbConnProd = DemoStayvriksha;
			}

    if (req.query.BranchCode === "" && req.query.Role === "Admin")
      return res.status(200).send({ success: true, Customers: [] });
    delete req.query.Role;

    req.body.filters = req.body.filters || {};

    // Helper to normalize single/array values
    const normalizeToArray = (value) => {
      return Array.isArray(value) ? value : [value];
    };

    if (req.query.BranchCode)
      req.body.filters.BranchCode = normalizeToArray(
        req.query.BranchCode.split(","),
      );

    if (req.query.CustomerName)
      req.body.filters.CustomerName = normalizeToArray(req.query.CustomerName);

    if (req.query.BookingID)
      req.body.filters.BookingID = normalizeToArray(req.query.BookingID);

    if (req.query.Status)
      req.body.filters.Status = normalizeToArray(req.query.Status);

    if (req.query.RoomNo)
      req.body.filters.RoomNo = normalizeToArray(req.query.RoomNo);

    if (req.query.MemberID)
      req.body.filters.MemberID = normalizeToArray(
        req.query.MemberID.split(","),
      );

    if (req.query.StartDate && req.query.EndDate) {
      req.body.filters.StartDate = [req.query.StartDate, req.query.EndDate];
    }

     if ((req.query.BookingID && !req.query.MemberID) || (!req.query.BookingID && !req.query.UserID)) {
      let query = `
        SELECT
          C.BookingID,
          C.CustomerName,
          C.Gender,
          C.STDCode,
          C.MobileNo,
          C.CustomerEmail,
          C.OTP,
          C.TimeDate,
          B.StartDate,
          B.EndDate,
          B.Status,
          B.BranchCode,
          B.BedType,
          B.RoomNo,
          B.BookingDate,
          B.PaymentType,
          B.MemberID,
          B.UserID
        FROM HM_Customer C
        LEFT JOIN HM_Booking B
          ON C.BookingID = B.BookingID
      `;

      const whereClauses = [];

      if (req.body.filters.BranchCode) {
        const list = req.body.filters.BranchCode.map((v) => `'${v}'`).join(",");
        whereClauses.push(`B.BranchCode IN (${list})`);
      }

      if (req.body.filters.CustomerName) {
        const list = req.body.filters.CustomerName.map((v) => `'${v}'`).join(
          ",",
        );
        whereClauses.push(`C.CustomerName IN (${list})`);
      }

      if (req.body.filters.BookingID) {
        const list = req.body.filters.BookingID.map((v) => `'${v}'`).join(",");
        whereClauses.push(`B.BookingID IN (${list})`);
      }

      if (req.body.filters.Status) {
        const list = req.body.filters.Status.map((v) => `'${v}'`).join(",");
        whereClauses.push(`B.Status IN (${list})`);
      }

      if (req.body.filters.RoomNo) {
        const list = req.body.filters.RoomNo.map((v) => `'${v}'`).join(",");
        whereClauses.push(`B.RoomNo IN (${list})`);
      }

      if (req.body.filters.MemberID) {
        const conditions = req.body.filters.MemberID.map((id) => {
          if (id.includes("_")) {
            return `B.MemberID = '${id}'`;
          } else {
            return `B.MemberID LIKE '${id}'`; 
          }
        });
        whereClauses.push(`(${conditions.join(" OR ")})`);
      }

      if (req.body.filters.StartDate) {
        const [start, end] = req.body.filters.StartDate;
        whereClauses.push(
          `(B.StartDate <= '${end}' AND B.EndDate >= '${start}')`,
        );
      }

      if (whereClauses.length > 0) {
        query += ` WHERE ` + whereClauses.join(" AND ");
      }

      query += ` ORDER BY C.CustomerName ASC`;

      const customers = await executeQuery(query, dbConnProd);

      return res.send({
        success: true,
        Customers: customers,
      });
    }

    req.body.filters = {};
    req.body.tableName = "HM_Customer";

    if (req.query.BookingID) req.body.filters.BookingID = req.query.BookingID;

    if (req.query.UserID) req.body.filters.UserID = req.query.UserID;

    const customers = await CommonReadWithFilters(req, res, next);

    if (!customers || customers.length === 0) {
      return res.status(404).send({
        success: false,
        message: "No customers found",
      });
    }

    // 🔹 OTP validation
    if (req.query.OTP) {
      const user = customers[0];

      if (!user.OTP) {
        return res
          .status(400)
          .send({ success: false, message: "OTP not generated" });
      }

      const isValid = await bcrypt.compare(req.query.OTP, user.OTP);

      if (!isValid) {
        return res
          .status(400)
          .send({ success: false, message: "Incorrect OTP" });
      }

      const diff = (new Date() - new Date(user.TimeDate)) / 60000;

      if (diff > 10) {
        return res.status(400).send({ success: false, message: "OTP expired" });
      }
    }

    let documentsQuery = "SELECT * FROM HM_CustomerDocument";
    let bookingsQuery = "SELECT * FROM HM_Booking";
    let paymentsQuery = "SELECT * FROM HM_Payment";
    let facilityQuery = "SELECT * FROM HM_BookingFacilityItems";
    let membersQuery = "SELECT * FROM HM_Members";

    // 🔹 Booking filter
    const bookingIDs = customers
      .map((c) => `'${c.BookingID}'`)
      .filter(Boolean)
      .join(",");

    if (bookingIDs) {
      bookingsQuery += ` WHERE BookingID IN (${bookingIDs})`;
      paymentsQuery += ` WHERE BookingID IN (${bookingIDs})`;
      facilityQuery += ` WHERE BookingID IN (${bookingIDs})`;
    }

    let ids = [];
    if (req.query.MemberID) {
      ids = req.query.MemberID.split(",")
        .map((id) => id.trim())
        .filter(Boolean);
    } else {
      ids = customers.map((c) => c.MemberID).filter((id) => id);
    }

    let memberCondition = "";

    if (ids.length > 0) {
      const conditions = ids.map((id) => {
        if (id.includes("_")) {
          return `TRIM(MemberID) = '${id}'`;
        } else {
          return `TRIM(MemberID) LIKE '${id}'`; 
        }
      });

      memberCondition = conditions.join(" OR ");
    }

    if (memberCondition) {
      documentsQuery += ` WHERE (${memberCondition})`;
      membersQuery += ` WHERE (${memberCondition})`;
    }

    const [documents, bookings, payments, facility, members] =
      await Promise.all([
        executeQuery(documentsQuery, dbConnProd),
        executeQuery(bookingsQuery, dbConnProd),
        executeQuery(paymentsQuery, dbConnProd),
        executeQuery(facilityQuery, dbConnProd),
        executeQuery(membersQuery, dbConnProd),
      ]);

    // 🔹 Convert file buffer
    documents.forEach((doc) => {
      if (doc.File && Buffer.isBuffer(doc.File)) {
        doc.File = doc.File.toString("base64");
      }
    });

    const mergedData = customers.map((cust) => ({
      ...cust,
      Documents: documents,
      Members: members,
      Bookings: bookings.filter((b) => b.BookingID === cust.BookingID),
      Payments: payments.filter((p) => p.BookingID === cust.BookingID),
      FacilityItems: facility.filter((f) => f.BookingID === cust.BookingID),
    }));

    return res.send({
      success: true,
      Customers:
        (req.query.BookingID || req.query.UserID) && mergedData.length === 1
          ? mergedData[0]
          : mergedData,
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Technical error",
      error: error.message,
    });
  }
}

async function executeQuery(query, dbConnProd, queryParams = []) {
  return new Promise((resolve, reject) => {
    dbConnProd.getConnection((err, connection) => {
      if (err) {
        return reject({
          message: "Connection error, please contact the administrator",
          error: err.message,
        });
      }

      connection.query(query, queryParams, (err, results) => {
        connection.release();

        if (err) {
          return reject({
            message: "Technical error, please contact the administrator",
            error: err.message,
          });
        }

        resolve(results);
      });
    });
  });
}

async function postHM_Customer(req, res, next) {
  try {
    let customerList = req.body.data;
    const pdfAttachment = req.body.pdfAttachment;
    const propertyName =  req.body.data[0].Area || "";
    delete req.body.data[0].Area;
    req.body.tableName = "HM_Customer";

    if (!Array.isArray(customerList) || customerList.length === 0)
      throw new Error("No customer data provided.");

    var BookingData = customerList[0]?.Booking;

    if (BookingData && BookingData.length > 0) {
      var CouponCode = BookingData[0]?.CouponCode;
      if (CouponCode) {
        var UserID = BookingData[0]?.UserID;

        // Read coupon details
        req.body.tableName = "HM_Coupon";
        req.body.filters = { CouponCode: CouponCode };
        const couponData = await CommonReadCall(req, res, next);

        if (!couponData || couponData.length === 0)
          throw new Error("Invalid Coupon Code.");

        // Read past booking data
        req.body.tableName = "HM_Booking";
        req.body.filters = { UserID: UserID, CouponCode: CouponCode };
        const HM_BookingData = await CommonReadCall(req, res, next);

        let totalCouponCount = 0;

        if (HM_BookingData && HM_BookingData.length > 0) {
          totalCouponCount = HM_BookingData.reduce((sum, item) => {
            return sum + (parseFloat(item.CouponCount) || 0);
          }, 0);
        }

        // Check limit
        if (totalCouponCount >= parseFloat(couponData[0].PerUserLimit))
          throw new Error("Coupon Code usage limit exceeded.");

        // Add CouponCount to NEW Booking Data (Correct place!)
        customerList = customerList.map((a) => ({
          ...a,
          Booking: (a.Booking || []).map((b) => ({
            ...b,
            CouponCount: b.CouponCode && b.CouponCode.trim() !== "" ? "1" : "0",
          })),
        }));
      }
    }

    // ================= FETCH EXISTING BOOKINGS =================
    req.body.tableName = "HM_Booking";
    req.body.filters={}
    const existingBookings = await CommonReadCall(req, res, next) || [];

    // Generate Financial Year
    const today = new Date();
    let currentYear = today.getFullYear();
    let nextYear = currentYear + 1;

    if (today.getMonth() <= 2) {
      currentYear -= 1;
      nextYear -= 1;
    }

    const financialYear = `${currentYear}/${nextYear.toString().slice(-2)}`;

    const customerPayload = [];
    const documentPayload = [];
    const bookingPayload = [];
    const bookingFacility = [];
    const paymentDetails = [];
    const createdBookings = [];

    for (const cust of customerList) {
      const documents = cust?.Documents || [];
      const bookings = cust?.Booking || [];
      const facility = cust?.FacilityItems || [];
      const payment = cust?.PaymentDetails || [];

      // Remove association keys
      delete cust?.Documents;
      delete cust?.Booking;
      delete cust?.FacilityItems;
      delete cust?.PaymentDetails;

      for (const book of bookings) {
        const branchCode = book.BranchCode || "BLR01";

        // filter existing bookings by FY + branch
        const fyBranchBookings = existingBookings.filter((bk) =>
          bk.BookingID?.startsWith(`${branchCode}_${financialYear}-`),
        );

        // next sequence number
        let nextNumber = "001";
        if (fyBranchBookings.length > 0) {
          const lastNumbers = fyBranchBookings.map((bk) => {
            const match = bk.BookingID.match(/-(\d+)$/);
            return match ? parseInt(match[1], 10) : 0;
          });
          const lastSeq = Math.max(...lastNumbers);
          nextNumber = String(lastSeq + 1).padStart(3, "0");
        }

        // final booking id
        const BookingID = `${branchCode}_${financialYear}-${nextNumber}`;

        createdBookings.push({ BookingID });
        customerPayload.push({
          ...cust,
          BookingID,
        });

        // ================= DOCUMENTS =================
        documents.forEach((doc) => {
          documentPayload.push({
            DocumentID: randomUUID(),
            DocumentType: (doc.DocumentType || "").toLowerCase(),
            File: doc.File,
            FileName: doc.FileName,
            FileType: doc.FileType,
            BookingID,
          });
        });

        // add to booking payload
        bookingPayload.push({
          ...book,
          BookingID,
        });

        // add facility items assigned to this booking only
        facility
          .filter((f) => f.RefBooking === book.RefTempID)
          .forEach((f) => {
            bookingFacility.push({
              ...f,
              FacilityID: randomUUID(),
              BookingID,
            });
          });

        // add payment items assigned to this booking
        payment
          .filter((p) => p.RefBooking === book.RefTempID)
          .forEach((p) => {
            paymentDetails.push({
              ...p,
              PaymentID: randomUUID(),
              BookingID,
            });
          });
        // add newly assigned booking to existing list for next iteration
        existingBookings.push({ BookingID });
      }
    }

    req.body.filters = {
      BranchCode: bookingPayload?.[0]?.BranchCode || "",
      ACType:
        bookingPayload?.[0]?.BedType.split("-").slice(1).join("-").trim() || "",
      Name: bookingPayload?.[0]?.BedType.split("-")[0].trim() || "",
    };
    req.body.tableName = "HM_BedType";
    const bedTypeResult = await CommonReadWithFilters(req, res, next);
    const BedType = Array.isArray(bedTypeResult)
      ? bedTypeResult[0]
      : bedTypeResult;
    const noOfPerson = Number(BedType?.NoOfPerson) || 0;
    const maxBeds = Number(BedType?.MaxBeds) || 0;
    const totalCapacity = noOfPerson * maxBeds;

    // Read booking table
    req.body.filters = {
      BranchCode: bookingPayload?.[0]?.BranchCode || "",
      BedType: bookingPayload?.[0]?.BedType || "",
      Status: ["New", "Assigned"],
    };
    req.body.tableName = "HM_Booking";
    const HM_Booking = (await CommonReadWithFilters(req, res, next)) || [];
    // Condition
    if (HM_Booking.length >= totalCapacity) {
      return res
        .status(400)
        .json({ success: false, message: "This room is already booked" });
    }

    // else continue booking...

    req.body.tableName = "HM_Customer";
    req.body.data = customerPayload;
    await CommonCreateCall(req, res, next);

    if (documentPayload.length > 0) {
      req.body.tableName = "HM_CustomerDocument";
      req.body.data = documentPayload;
      await CommonCreateCall(req, res, next);
    }

    if (bookingPayload.length > 0) {
      req.body.tableName = "HM_Booking";
      req.body.data = bookingPayload;
      await CommonCreateCall(req, res, next);
    }

    if (bookingFacility.length > 0) {
      req.body.tableName = "HM_BookingFacilityItems";
      req.body.data = bookingFacility;
      await CommonCreateCall(req, res, next);
    }

    if (paymentDetails.length > 0) {
      // Filter records where PaymentType !== "PayOnCheckIn"
      const validPayments = paymentDetails.filter(
        (item) => item.PaymentType !== "PayOnCheckIn",
      );

      if (validPayments.length > 0) {
        req.body.tableName = "HM_Payment";
        req.body.data = validPayments;
        await CommonCreateCall(req, res, next);
      }
    }

    for (let i = 0; i < bookingPayload.length; i++) {
      const data = bookingPayload[i];
      const customer = customerList[i];

      req.body = {
        UserName: customer.CustomerName,
        BookingID: data.BookingID,
        toEmailID: customer.CustomerEmail || "",
        BedType: data.BedType,
        RentPrice: formatAmount(data.RentPrice),
        BookingDate: formatDate(data.BookingDate),
        StartDate: formatDate(data.StartDate),
        EndDate: formatDate(data.EndDate),
        Guests: data.NoOfPersons || "1",
        MemberID : data.MemberID || "",
        PropertyName : propertyName || ""
      };

      await BookingSubmitEmail(req, res, next, pdfAttachment);
    }

    res.send({
      success: true,
      message: `Successfully created ${customerPayload.length} record(s).`,
      BookingDetails: createdBookings,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact administrator.",
      error: error.message,
    });
  }
}

function formatAmount(amount) {
  if (!amount) return "0.00";

  return Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
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

async function BookingSubmitEmail(req, res, next, pdfAttachment) {
  try {
    req.body.tableName = "EmailContent";
    req.body.filters = { Type: "BookingSubmit" };

    var emailContentData = await CommonReadCall(req, res, next);
    if (!emailContentData || emailContentData.length === 0) {
      return res
        .status(404)
        .send({ success: false, message: "Email content not found" });
    }

    var emailContent = emailContentData[0];

    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;

    const to = [req.body.toEmailID];
    const toName = req.body.UserName;

    let subject = emailContent.Subject;
    subject = subject.replaceAll("<PropertyName>", req.body.PropertyName || "");
    
    const encodedCustomerID = Buffer.from(String(req.body.BookingID)).toString(
      "base64",
    );

    let attachments = [];

    if (pdfAttachment && pdfAttachment.content) {
      attachments.push({
        filename: pdfAttachment.fileName || "BookingVoucher.pdf",
        content: Buffer.from(pdfAttachment.content, "base64"),
        contentType: pdfAttachment.mimeType || "application/pdf",
      });
    }

    // Ensure replacements are applied
    let body = `<p>Dear ${req.body.UserName},</p>
                    <p>${emailContent.Body}</p>`;

    body = body
      .replaceAll("<BookingID>", req.body.BookingID)
      .replaceAll("<CustomerName>", req.body.UserName)
      .replaceAll("<BookingDate>", req.body.BookingDate)
      .replaceAll("<StartDate>", req.body.StartDate)
      .replaceAll("<EndDate>", req.body.EndDate)
      .replaceAll("<RentPrice>", req.body.RentPrice)
      .replaceAll("<BedType>", req.body.BedType)
      .replaceAll("<Guests>", req.body.Guests)
      .replaceAll("<MemberID>", req.body.MemberID)
      .replaceAll("<PropertyName>", req.body.PropertyName || "")
      .replaceAll("<EncodedCustomerID>", encodedCustomerID);

    const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
    const replyTo = emailContent.ReplyToEmailId;

   await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo, attachments);
  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal server error" });
  }
}

async function putHM_Customer(req, res, next) {
  try {
    const payload = req.body.data?.[0];
    const filters = req.body.filters;
    // const pdfAttachment = req.body.pdfAttachment;

    if (!payload) {
      return res.status(400).send({
        success: false,
        message: "Invalid payload",
      });
    }

    let cancelledBookings = [];
    let completedBookings = [];

    // 1️⃣ Update HM_Customer  (Always updates because customer data is required)
    if (payload.CustomerName && payload.UserID) {
      req.body.tableName = "HM_Customer";
      req.body.data = {
        Salutation: payload.Salutation,
        CustomerName: payload.CustomerName,
        UserID: payload.UserID,
        STDCode: payload.STDCode,
        MobileNo: payload.MobileNo,
        Gender: payload.Gender,
        DateOfBirth: payload.DateOfBirth,
        CustomerEmail: payload.CustomerEmail,
        Country: payload.Country,
        State: payload.State,
        City: payload.City,
        PermanentAddress: payload.PermanentAddress,
      };
      req.body.filters = filters;
      await CommonUpdateCall(req, res, next);
    }
    delete req.body.filters;
    // 2️⃣ Update HM_Booking  (Only when Booking exists)
    if (payload.Booking && payload.Booking.length > 0) {
      req.body.tableName = "HM_Booking";

      req.body.data = payload.Booking.map((booking) => {
        if (booking.Status === "Cancelled")
          cancelledBookings.push({ ...booking });
        if (booking.Status === "Completed")
          completedBookings.push({ ...booking });

        const dbBooking = { ...booking };
        delete dbBooking.CustomerName;
        delete dbBooking.CustomerEmail;

        return {
          data: dbBooking,
          filters: filters,
        };
      });

      await CommounMultipalUpdate(req, res, next);
    }

    // 3️⃣ Update or Create HM_CustomerDocument
    if (payload.Documents && payload.Documents.length > 0) {
      for (const doc of payload.Documents) {
        if (doc.DocumentID) {
          // ------- UPDATE -------
          req.body.tableName = "HM_CustomerDocument";
          req.body.data = [
            {
              data: doc,
              filters: { DocumentID: doc.DocumentID },
            },
          ];
          await CommounMultipalUpdate(req, res, next);
        } else {
          // ------- CREATE -------
          req.body.tableName = "HM_CustomerDocument";
          doc.DocumentID = randomUUID();
          req.body.data = doc;
          await CommonCreateCall(req, res, next);
        }
      }
    }

    // 4️⃣ MEMBERS (CREATE + UPDATE)
    if (payload.Members && payload.Members.length > 0) {
      const currentBookingID = payload.Booking?.[0]?.BookingID || "";

      req.body.tableName = "HM_Members";
      req.body.filters = { BookingID: currentBookingID };
      const existingMembers = (await CommonReadCall(req, res, next)) || [];

      let memberCounter = existingMembers.length;

      const updateMembers = [];
      const newMembers = [];

      for (const mem of payload.Members) {
        if (mem.MemberID && mem.MemberID.trim() !== "") {
          updateMembers.push({
            data: {
              MemberID: mem.MemberID,
              UserID: mem.UserID,
              Salutation: mem.Salutation,
              Name: mem.Name,
              DateOfBirth: mem.DateOfBirth,
              Relation: mem.Relation || "",
              Gender: mem.Gender || "",
            },
            filters: { MemberID: mem.MemberID },
          });
        } else {
          newMembers.push({
            MemberID: payload.MemberID,
            UserID: payload.UserID || "",
            Salutation: mem.Salutation,
            Name: mem.Name,
            DateOfBirth: mem.DateOfBirth,
            Relation: mem.Relation || "",
            Gender: mem.Gender || "",
          });
        }
      }

      if (updateMembers.length > 0) {
        req.body.tableName = "HM_Members";
        req.body.data = updateMembers;
        await CommounMultipalUpdate(req, res, next);
      }

      if (newMembers.length > 0) {
        req.body.tableName = "HM_Members";
        req.body.data = newMembers;
        await CommonCreateCall(req, res, next);
      }
    }

    // 5️⃣ Update or Create HM_BookingFacilityItems
    if (payload.FacilityItems && payload.FacilityItems.length > 0) {
      for (const item of payload.FacilityItems) {
        if (item.FacilityID) {
          // ------- UPDATE -------
          req.body.tableName = "HM_BookingFacilityItems";
          req.body.data = [
            {
              data: item,
              filters: { FacilityID: item.FacilityID }, // specific filter for that item
            },
          ];
          await CommounMultipalUpdate(req, res, next);
        } else {
          // ------- CREATE -------
          req.body.tableName = "HM_BookingFacilityItems";
          item.FacilityID = randomUUID();
          req.body.data = item;
          await CommonCreateCall(req, res, next);
        }
      }
    }

    // 6️⃣ Update HM_Payment (Only when PaymentDetails exist)
    if (payload.PaymentDetails && payload.PaymentDetails.length > 0) {
      req.body.tableName = "HM_Payment";
      req.body.data = payload.PaymentDetails.map((b) => ({
        data: b,
        filters: filters,
      }));
      await CommounMultipalUpdate(req, res, next);
    }

    //  7️⃣ SEND CANCEL MAIL
    for (const booking of cancelledBookings) {
      req.body = {
        UserName: payload.CustomerName || "Customer",
        toEmailID: payload.CustomerEmail || "",
        BedType: booking.BedType,
        RentPrice: formatAmount(booking.RentPrice),
        BookingDate: formatDate(booking.BookingDate),
        StartDate: formatDate(booking.StartDate),
        EndDate: formatDate(booking.EndDate),
        Guests: booking.NoOfPersons || "1",
      };

      await BookingCancelledEmail(req, res, next);
    }

    // 8️⃣ SEND CHECKOUT COMPLETED MAIL
    for (const booking of completedBookings) {
      req.body = {
        CustomerName: booking.CustomerName || "Customer",
        toEmailID: booking.CustomerEmail || "",
        BookingID: booking.BookingID,
        RoomNo: booking.RoomNo,
        CheckoutDate: formatDate(booking.EndDate),
      };

      await CheckoutCompletedEmail(req, res, next);
    }

    // if (payload.Booking && payload.Booking.length > 0) {
    //   for (const booking of payload.Booking) {
    //     req.body = {
    //       UserName: payload.CustomerName || "Customer",
    //       BookingID: booking.BookingID,
    //       toEmailID: payload.CustomerEmail || "",
    //       BedType: booking.BedType,
    //       RentPrice: formatAmount(booking.RentPrice),
    //       BookingDate: formatDate(booking.BookingDate),
    //       StartDate: formatDate(booking.StartDate),
    //       EndDate: formatDate(booking.EndDate),
    //       Guests: booking.NoOfPersons || "1",
    //       MemberID : booking.MemberID || ""
    //     };

    //     await BookingSubmitEmail(req, res, next, pdfAttachment);
    //   }
    // }

    return res.status(200).send({
      success: true,
      message: "Customer details updated successfully!",
    });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Technical error, please contact admin",
      error: error.message,
    });
  }
}

async function BookingCancelledEmail(req, res, next) {
  try {
    req.body.tableName = "EmailContent";
    req.body.filters = { Type: "BookingCancelled" };

    const emailContentData = await CommonReadCall(req, res, next);
    if (!emailContentData || emailContentData.length === 0) return;

    const emailContent = emailContentData[0];

    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;
    const to = [req.body.toEmailID];
    const toName = req.body.UserName;
    const subject = emailContent.Subject;

    let body = `<p>Dear ${req.body.UserName},</p>
                <p>${emailContent.Body}</p>`;

    body = body
      .replaceAll("<BookingDate>", req.body.BookingDate)
      .replaceAll("<StartDate>", req.body.StartDate)
      .replaceAll("<EndDate>", req.body.EndDate)
      .replaceAll("<RentPrice>", req.body.RentPrice)
      .replaceAll("<BedType>", req.body.BedType)
      .replaceAll("<Guests>", req.body.Guests || "1");

    const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
    const replyTo = emailContent.ReplyToEmailId;

    await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo);
  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal server error" });
  }
}

async function CheckoutCompletedEmail(req, res, next) {
  try {
    req.body.tableName = "EmailContent";
    req.body.filters = { Type: "HM_CheckoutNotification" };

    const emailContentData = await CommonReadCall(req, res, next);
    if (!emailContentData || emailContentData.length === 0) return;

    const emailContent = emailContentData[0];

    const from = emailContent.FormEmailId;
    const fromName = emailContent.FormName;
    const to = [req.body.toEmailID];
    const toName = req.body.CustomerName;
    const subject = emailContent.Subject;
    const encodedBookingID = Buffer.from(String(req.body.BookingID)).toString(
      "base64",
    );

    let body = emailContent.Body;

    body = body
      .replaceAll("<CustomerName>", req.body.CustomerName)
      .replaceAll("<BookingID>", encodedBookingID)
      .replaceAll("<RoomNo>", req.body.RoomNo)
      .replaceAll("<CheckoutDate>", req.body.CheckoutDate)
      .replaceAll("<Booking>", req.body.BookingID);

    const CC = emailContent.CCEmailId ? emailContent.CCEmailId.split(",") : [];
    const replyTo = emailContent.ReplyToEmailId;

    await CommonSendEmail(req, from, fromName, to, toName, subject, body, CC, replyTo);
  } catch (error) {
    return res.status(500).send({ success: false, message: "Internal server error" });
  }
}

async function deleteHM_Customer(req, res, next) {
  try {
    req.body.tableName = "HM_Customer";
    var data = await CommonDeleteCall(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

async function getBranchHotelData(req, res, next) {
  try {
    req.body.filters = {};
    if (req.query.BranchCode)
      req.body.filters.BranchCode = req.query.BranchCode.split(",");

    req.body.tableName = "HM_BedType";
    const HM_BedType = await CommonReadWithFilters(req, res, next);

    req.body.tableName = "HM_Rooms";
    const HM_Rooms = await CommonReadWithFilters(req, res, next);

    req.body.tableName = "HM_Payment";
    const HM_Payment = await CommonReadWithFilters(req, res, next);

    req.body.tableName = "HM_Branch";
    req.body.filters = {};
    if (req.query.BranchID)
      req.body.filters.BranchID = req.query.BranchID.split(",");
    const HM_Branch = await CommonReadWithFilters(req, res, next);

    res.send({ success: true, HM_BedType, HM_Rooms, HM_Branch, HM_Payment });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Technical error, please contact admin",
      error: error.message,
    });
  }
}

async function getHM_Members(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Members";
    if (req.query.BookingID) req.body.filters.BookingID = req.query.BookingID;
    if (req.query.UserID) req.body.filters.UserID = req.query.UserID;
    if (req.query.BranchCode)
      req.body.filters.BranchCode = req.query.BranchCode.split(",");

    // Step 1: Get Members
    const members = await CommonReadWithFilters(req, res, next);

    // Step 2: Extract MemberIDs
    const memberIDs = members.map((m) => m.MemberID);

    // Step 3: Get Documents
    let documents = [];
    if (memberIDs.length > 0) {
      req.body = {
        tableName: "HM_CustomerDocument",
        filters: {
          MemberID: memberIDs,
        },
      };

      documents = await CommonReadWithFilters(req, res, next);
    }

    // Step 4: Map documents to members + convert File to base64
    const mappedData = members.map((member) => {
      const memberDocs = documents
        .filter((doc) => doc.MemberID === member.MemberID)
        .map((doc) => {
          let fileData = doc.File;
          if (fileData && Buffer.isBuffer(fileData)) {
            fileData = fileData.toString("base64");
          }
          return {
            ...doc,
            File: fileData,
          };
        });

      return {
        ...member,
        Documents: memberDocs,
      };
    });

    res.send({ success: true, data: mappedData });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

exports.HM_Customer = {
  getHM_Customer,
  postHM_Customer,
  putHM_Customer,
  deleteHM_Customer,
  getBranchHotelData,
  getHM_Members,
};
