const { randomUUID } = require("crypto");
const {
  CommonReadCall,
  CommonCreateCall,
  CommonUpdateCall,
  CommonSendEmail,
  CommonDeleteCall,
  CommounMultipalUpdate,
  CommonReadWithFilters,
} = require("./CommonController");
const { log } = require("console");

async function getHM_ManageInvoice(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_ManageInvoice";
    if (req.query.InvNo) req.body.filters.InvNo = req.query.InvNo;
    if (req.query.CustomerName)
      req.body.filters.CustomerName = req.query.CustomerName;
    if (req.query.Status) req.body.filters.Status = req.query.Status;
    if (req.query.InvoiceStartDate && req.query.InvoiceEndDate)
      req.body.filters.InvoiceDate = [
        req.query.InvoiceStartDate,
        req.query.InvoiceEndDate,
      ];
    if (req.query.BookingID) req.body.filters.BookingID = req.query.BookingID;
    if (req.query.UserID) req.body.filters.UserID = req.query.UserID;
    if (req.query.BranchCode)
      req.body.filters.BranchCode = req.query.BranchCode.split(",");

    if (req.query.BranchCode === "" && req.query.Role === "Admin")
      return res.status(200).send({ success: true, data: [] });
    delete req.query.Role;

    var data = await CommonReadWithFilters(req, res, next);
    data.sort((a, b) => {
      const invA = a.InvNo.split("-")[1];
      const invB = b.InvNo.split("-")[1];
      return parseInt(invB) - parseInt(invA);
    });
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

async function postHM_ManageInvoice(req, res, next) {
  try {
    var Items = req.body.Items || [];
    var data = req.body.data || {};
    const branchCode = data.BranchCode;

    if (!branchCode) {
      return res.status(400).send({
        success: false,
        message: "BranchCode is required for Invoice Number generation",
      });
    }

    if (!data.BookingID) {
      return res.status(400).send({
        success: false,
        message: "BookingID are required",
      });
    }

    req.body = {
      tableName: "HM_ManageInvoice",
      filters: { BranchCode: branchCode },
    };

    const existingInvoices = await CommonReadCall(req, res, next);
    const invoiceDate = new Date(data.InvoiceDate);
    let currentYear = invoiceDate.getFullYear();
    let nextYear = currentYear + 1;

    // FY starts from April
    if (invoiceDate.getMonth() <= 2) {
      currentYear -= 1;
      nextYear -= 1;
    }

    const financialYear = `${currentYear}/${nextYear.toString().slice(-2)}`;
    const prefix = `${branchCode}/${financialYear}-`;

    const branchFyInvoices = (existingInvoices || []).filter((inv) =>
      inv.InvNo?.startsWith(prefix),
    );

    let nextNumber = "001";
    if (branchFyInvoices.length > 0) {
      const lastInvoiceNum = Math.max(
        ...branchFyInvoices.map((inv) => {
          const match = inv.InvNo.match(/-(\d+)$/);
          return match ? parseInt(match[1], 10) : 0;
        }),
      );
      nextNumber = String(lastInvoiceNum + 1).padStart(3, "0");
    }

    const newInvoiceNo = `${prefix}${nextNumber}`;
    const invoiceRecord = {
      ...data,
      InvNo: newInvoiceNo,
    };

    req.body = {
      tableName: "HM_ManageInvoice",
      data: [invoiceRecord],
    };

    const invoiceResponse = await CommonCreateCall(req, res, next);

    if (!invoiceResponse || invoiceResponse.error) {
      return res.status(500).send({
        success: false,
        message: invoiceResponse?.error || "Failed to create Manage Invoice",
      });
    }

    req.body = {
      tableName: "HM_ManageInvoice",
      filters: {
        BookingID: data.BookingID,
      },
    };

    const bookingInvoices = await CommonReadCall(req, res, next);

    if (bookingInvoices && bookingInvoices.length > 0) {
      for (const invoice of bookingInvoices) {
        req.body = {
          tableName: "HM_Payment",
          data: { Used: "X", InvNo: newInvoiceNo },
          filters: {
            BookingID: invoice.BookingID || data.BookingID,
          },
        };

        const paymentUpdateResponse = await CommonUpdateCall(req, res, next);
        if (!paymentUpdateResponse || paymentUpdateResponse.error) {
          return res.status(500).send({
            success: false,
            message:
              paymentUpdateResponse?.error || "Failed to update HM_Payment",
          });
        }
      }
    }

    const itemsWithInvoiceNo = Items.map((item) => ({
      ...item,
      InvNo: newInvoiceNo,
    }));

    if (itemsWithInvoiceNo.length > 0) {
      req.body = {
        tableName: "HM_ManageInvoiceItem",
        data: itemsWithInvoiceNo,
      };
      const itemResponse = await CommonCreateCall(req, res, next);

      if (!itemResponse || itemResponse.error) {
        return res.status(500).send({
          success: false,
          message:
            itemResponse?.error || "Failed to create Manage Invoice Items",
        });
      }
    }

    for (let item of Items) {
      if (
        item.Particulars &&
        item.Particulars.includes("Refund Processed for Invoice No")
      ) {
        const match = item.Particulars.match(
          /Invoice No\s*:\s*([A-Z0-9\/\-]+)/i,
        );

        if (match && match[1]) {
          const refundInvNo = match[1];
          const refundAmount = Math.abs(Number(item.Total || 0)).toFixed(2);

          req.body = {
            tableName: "HM_ManageInvoice",
            data: {
              RefundProcessed: refundAmount,
            },
            filters: { InvNo: refundInvNo },
          };

          const refundUpdate = await CommonUpdateCall(req, res, next);

          if (!refundUpdate || refundUpdate.error) {
            console.error("Failed to update RefundProcessed for:", refundInvNo);
          }
        }
      }
    }

    // Step 6: Send success response
    res.status(200).send({
      success: true,
      message: "Manage Invoice saved!",
      InvoiceNo: newInvoiceNo,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error?.message || "Technical error, please contact the administrator",
    });
  }
}

async function putHM_ManageInvoice(req, res, next) {
  try {
    // Ensure correct body structure
    req.body.tableName = "HM_ManageInvoice";
    req.body.data = req.body.data;
    req.body.filters = req.body.filtres; // fixed typo from `filtres`
    const invoiceUpdateResponse = await CommonUpdateCall(req, res, next);

    if (!invoiceUpdateResponse || invoiceUpdateResponse.error) {
      return res.status(500).send({
        success: false,
        message:
          invoiceUpdateResponse?.error || "Failed to update Manage Invoice",
      });
    }

    // Handle invoice items
    if (Array.isArray(req.body.Items) && req.body.Items.length > 0) {
      const itemsToCreate = [];
      const itemsToUpdate = [];

      for (const item of req.body.Items) {
        const { filters, ...cleanedItem } = item;

        if (filters?.flag === "create") {
          itemsToCreate.push(cleanedItem.data);
        } else {
          itemsToUpdate.push(item); // includes data + filters
        }
      }

      // Create new items
      if (itemsToCreate.length > 0) {
        req.body = {
          tableName: "HM_ManageInvoiceItem",
          data: itemsToCreate,
        };
        const createResponse = await CommonCreateCall(req, res, next);

        if (!createResponse || createResponse.error) {
          return res.status(500).send({
            success: false,
            message:
              createResponse?.error || "Failed to create Manage Invoice Items",
          });
        }
      }

      // Update existing items
      if (itemsToUpdate.length > 0) {
        req.body = {
          tableName: "HM_ManageInvoiceItem",
          data: itemsToUpdate,
        };
        const updateResponse = await CommounMultipalUpdate(req, res, next);

        if (!updateResponse || updateResponse.error) {
          return res.status(500).send({
            success: false,
            message:
              updateResponse?.error || "Failed to update Manage Invoice Items",
          });
        }
      }
    }
    res.send({ success: true, message: "Updated successfully" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error?.message || "Technical error, please contact the administrator",
    });
  }
}

async function deleteHM_ManageInvoice(req, res, next) {
  try {
    req.body.tableName = "HM_ManageInvoice";
    await CommonDeleteCall(req, res, next);

    req.body.tableName = "HM_ManageInvoiceItem";
    var data = await CommonDeleteCall(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

async function getHM_ManageInvoiceItem(req, res, next) {
  try {
    // Step 1: Prepare filters
    const companyItemFilters = {};
    if (req.query.InvNo) companyItemFilters.InvNo = req.query.InvNo;
    if (req.query.ItemID) companyItemFilters.ItemID = req.query.ItemID;

    // Step 2: Read ManageInvoiceItem data
    req.body.tableName = "HM_ManageInvoiceItem";
    req.body.filters = companyItemFilters;
    const ManageInvoiceItem = await CommonReadCall(req, res, next);

    if (!ManageInvoiceItem || ManageInvoiceItem.error) {
      return res.status(500).send({
        success: false,
        message: ManageInvoiceItem?.error || "Failed to Read Invoice Items",
      });
    }

    // Step 3: Read ManageInvoice (Invoice Header)
    req.body.tableName = "HM_ManageInvoice";
    req.body.filters = { InvNo: req.query.InvNo };
    const ManageInvoice = await CommonReadCall(req, res, next);

    const invoiceHeader = ManageInvoice[0];

    // Skip penalty if not required
    if (
      invoiceHeader.Status !== "Submitted" &&
      invoiceHeader.Status !== "Invoice Sent"
    ) {
      return res.send({
        success: true,
        data: { ManageInvoice, ManageInvoiceItem },
      });
    }

    // Calculate penalty
    const PayByDate = new Date(invoiceHeader.PayByDate);
    let today = new Date();

    if (today > PayByDate) {
      const daysDiff = Math.floor((today - PayByDate) / (1000 * 60 * 60 * 24));

      // Read penalty amount from branch
      req.body.tableName = "HM_Branch";
      req.body.filters = { BranchID: invoiceHeader.BranchCode };
      const BranchData = await CommonReadCall(req, res, next);

      const penaltyPerDay = BranchData[0]?.Penalty || 0;
      const Penalty = daysDiff * penaltyPerDay;

      const existingPenaltyItem = ManageInvoiceItem.find(
        (row) => row.Particulars === "Penalty Charges",
      );

      const penaltyObj = {
        InvNo: req.query.InvNo,
        Particulars: "Penalty Charges",
        Total: Penalty.toFixed(2),
        SAC: "996322",
        UnitText: "Fix Bid",
        StartDate: formatDateLocal(PayByDate),
        EndDate: formatDateLocal(today),
        GSTCalculation: "YES",
        Discount: "0.00",
        Currency: invoiceHeader.Currency || "INR",
      };

      // Create or Update penalty row
      if (!existingPenaltyItem) {
        // INSERT
        req.body.tableName = "HM_ManageInvoiceItem";
        req.body.data = penaltyObj;
        const createRes = await CommonCreateCall(req, res, next);

        // Push newly added object to array (with generated ID if available)
        if (createRes?.insertId) penaltyObj.ItemID = createRes.insertId;
        ManageInvoiceItem.push(penaltyObj);
      } else {
        // UPDATE
        req.body.tableName = "HM_ManageInvoiceItem";
        req.body.data = penaltyObj;
        req.body.filters = { ItemID: existingPenaltyItem.ItemID };
        await CommonUpdateCall(req, res, next);

        // Update inside array
        const index = ManageInvoiceItem.findIndex(
          (item) => item.ItemID === existingPenaltyItem.ItemID,
        );
        if (index !== -1) {
          ManageInvoiceItem[index] = { ...existingPenaltyItem, ...penaltyObj };
        }
      }
    }

    res.send({ success: true, data: { ManageInvoice, ManageInvoiceItem } });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function postHM_ManageInvoiceItem(req, res, next) {
  try {
    req.body.tableName = "HM_ManageInvoiceItem";
    await CommonCreateCall(req, res, next);
    res.status(200).send({
      success: true,
      message: "Manage Invoice Details saved!",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

async function putHM_ManageInvoiceItem(req, res, next) {
  try {
    req.body.tableName = "HM_ManageInvoiceItem";
    await CommonUpdateCall(req, res, next);
    res.status(200).send({
      success: true,
      message: "Manage Invoice Details updated!",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

async function deleteHM_ManageInvoiceItem(req, res, next) {
  try {
    req.body.tableName = "HM_ManageInvoiceItem";
    var data = await CommonDeleteCall(req, res, next);
    res.send({
      success: true,
      data,
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

async function getHM_InvoicePaymentDetail(req, res, next) {
  try {
    const filters = {};
    if (req.query.InvNo) filters.InvNo = req.query.InvNo;

    req.body.tableName = "HM_InvoicePaymentDetail";
    req.body.filters = filters;
    const InvoicePaymentDetail = await CommonReadCall(req, res, next);

    const paymentFilters = { ...filters, Used: "X" };
    req.body.tableName = "HM_Payment";
    req.body.filters = paymentFilters;
    const PaymentDetail = await CommonReadCall(req, res, next);

    req.body.tableName = "HM_ManageInvoice";
    req.body.filters = filters;
    const ManageInvoiceData = await CommonReadCall(req, res, next);

    // Convert ManageInvoiceData to Map for fast lookup
    const invoiceMap = {};
    (ManageInvoiceData || []).forEach((inv) => {
      invoiceMap[inv.InvNo] = inv;
    });

    //  Mapping Functions
    function mapInvoiceDetail(data) {
      return (data || []).map((item) => ({
        InvNo: item.InvNo,
        TransactionId: item.TransactionId,
        ReceivedDate: item.ReceivedDate,
        ReceivedAmount: item.ReceivedAmount,
        TotalAmount: item.TotalAmount,
        DueAmount: item.DueAmount || "0",
        Currency: item.Currency,
        ConversionRate: "",
        AmountInINR: "",
        Used: "",
      }));
    }

    function mapPaymentData(data) {
      if (!data || !data.length) return [];

      const result = [];

      // Group by Invoice
      const paymentGroups = {};
      data.forEach((item) => {
        if (!paymentGroups[item.InvNo]) paymentGroups[item.InvNo] = [];
        paymentGroups[item.InvNo].push(item);
      });

      Object.keys(paymentGroups).forEach((invNo) => {
        const inv = invoiceMap[invNo] || {};
        const totalAmount = Number(inv.TotalAmount) || 0;

        let runningPaid = 0;

        // sort payments by date
        paymentGroups[invNo].sort(
          (a, b) => new Date(a.Date) - new Date(b.Date),
        );

        paymentGroups[invNo].forEach((item) => {
          const receivedAmount = Number(item.Amount) || 0;
          runningPaid += receivedAmount;

          const dueAmount = totalAmount - runningPaid;

          result.push({
            InvNo: item.InvNo,
            TransactionId: item.BankTransactionID,
            ReceivedDate: item.Date,
            ReceivedAmount: receivedAmount,
            TotalAmount: totalAmount,
            DueAmount: dueAmount > 0 ? dueAmount : 0,
            Currency: item.Currency,
            ConversionRate: "",
            AmountInINR: "",
            Used: "X",
          });
        });
      });
      return result;
    }

    const mergedData = [
      ...mapInvoiceDetail(InvoicePaymentDetail),
      ...mapPaymentData(PaymentDetail),
    ];

    // Remove duplicates and prioritize Used = "X"
    const uniqueMap = new Map();

    mergedData.forEach((item) => {
      const key = `${item.InvNo}_${item.TransactionId}`;

      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, item);
      } else {
        const existing = uniqueMap.get(key);

        // If new record is Used = X then replace
        if (item.Used === "") {
          uniqueMap.set(key, item);
        }
      }
    });

    const finalData = Array.from(uniqueMap.values());

    // Sort by date
    finalData.sort((a, b) => {
      const dateA = new Date(a.ReceivedDate);
      const dateB = new Date(b.ReceivedDate);
      return dateA - dateB;
    });

    res.send({ success: true, data: finalData });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Technical error",
    });
  }
}

async function postHM_InvoicePaymentDetail(req, res, next) {
  try {
    const inputData = { ...req.body.data };

    // READ EXISTING PAYMENT
    req.body.tableName = "HM_Payment";
    req.body.filters = { BookingID: inputData.BookingID, Used: "X" };
    const paymentData = await CommonReadCall(req, res, next);

    // STEP 1: CREATE PAYMENT ENTRY (HM_Payment)
    const paymentPayload = {
      PaymentID: randomUUID(),
      Currency: inputData.Currency,
      CustomerName: inputData.CustomerName,
      BookingID: inputData.BookingID,
      BankTransactionID: inputData.TransactionId,
      PaymentType: inputData.PaymentType,
      Amount: inputData.ReceivedAmount,
      BankName: inputData.PaymentType,
      Date: inputData.ReceivedDate,
      BookingID: inputData.BookingID,
      BranchCode: inputData.BranchCode,
      InvNo: inputData.InvNo,
      EntryDate : inputData.EntryDate
    };

    //  CONDITION: mark Used only if no prior payment exists
    if (!paymentData || paymentData.length === 0) {
      paymentPayload.Used = "X";
    }

    req.body = { tableName: "HM_Payment", data: paymentPayload };

    const paymentResponse = await CommonCreateCall(req, res, next);
    if (!paymentResponse || paymentResponse.error) {
      return res.status(500).send({
        success: false,
        message: paymentResponse?.error || "Failed to create Payment entry",
      });
    }

    // STEP 2: REMOVE FIELDS BEFORE INVOICE PAYMENT DETAIL
    delete inputData.CustomerName;
    delete inputData.BookingID;
    delete inputData.PaymentType;
    delete inputData.BranchCode;

    // STEP 3: CREATE INVOICE PAYMENT DETAIL
    req.body = { tableName: "HM_InvoicePaymentDetail", data: inputData };

    const invoicePaymentResponse = await CommonCreateCall(req, res, next);

    if (!invoicePaymentResponse || invoicePaymentResponse.error) {
      return res.status(500).send({
        success: false,
        message:
          invoicePaymentResponse?.error ||
          "Failed to create Invoice Payment Detail",
      });
    }

    // STEP 4: UPDATE MANAGE INVOICE STATUS
    const dueAmount = parseFloat(inputData.DueAmount) || 0;
    const invNo = inputData.InvNo;

    const status = dueAmount === 0 ? "Payment Received" : "Payment Partially";

    req.body = {
      tableName: "HM_ManageInvoice",
      data: { DueAmount: dueAmount, Status: status },
      filters: { InvNo: invNo },
    };

    const updateResponse = await CommonUpdateCall(req, res, next);

    if (!updateResponse || updateResponse.error) {
      return res.status(500).send({
        success: false,
        message: updateResponse?.error || "Failed to update Manage Invoice",
      });
    }

    // FINAL RESPONSE
    res.status(200).send({
      success: true,
      message: "Manage Invoice payment details saved and status updated!",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function getAllInvoiceData(req, res, next) {
  try {
    const data = req.body.data;
    req.body.filters = {};

    if (data.BookingID) req.body.filters.BookingID = data.BookingID;

    // EXISTING INVOICES
    req.body.tableName = "HM_ManageInvoice";
    const ManageInvoice = await CommonReadCall(req, res, next);
    const invoiceIndex = ManageInvoice.length;

    // BOOKINGS
    req.body.tableName = "HM_Booking";
    const BookingRaw = await CommonReadCall(req, res, next);

    if (!BookingRaw.length) {
      return res.send({ success: true, data: {} });
    }

    const bookingStartDate = new Date(BookingRaw[0].StartDate);
    bookingStartDate.setHours(0, 0, 0, 0);

    // CYCLE TYPE DETECTION
    const isYearly = BookingRaw.some(
      (b) => b.PaymentType?.toLowerCase() === "per year",
    );

    const { cycleStart, cycleEnd } = isYearly
      ? getYearlyCycle(bookingStartDate, invoiceIndex)
      : getMonthlyCycle(bookingStartDate, invoiceIndex);

    // BOOKING CALCULATION
    const BookingData = calculateBookingCycleAmounts(
      BookingRaw,
      cycleStart,
      cycleEnd,
      invoiceIndex,
    );

    //  FACILITY ITEMS
    req.body.tableName = "HM_BookingFacilityItems";
    req.body.filters = {
      BookingID: data.BookingID,
    };

    let BookingFacilityItems = await CommonReadCall(req, res, next);

    const bookingPaymentType = BookingRaw[0]?.PaymentType || "";
    BookingFacilityItems = BookingFacilityItems.map((item) => ({
      ...item,
      PaymentType: bookingPaymentType,
    }));

    BookingFacilityItems = calculateFacilityCycleAmounts(
      BookingFacilityItems,
      cycleStart,
      cycleEnd,
      invoiceIndex,
    );

    // CUSTOMER
    req.body.tableName = "HM_Customer";
    req.body.filters = { BookingID: data.BookingID };
    const ManageCustomer = await CommonReadCall(req, res, next);

    // PAYMENT (ONLY FIRST INVOICE)
    let PerMonthTotalRent = 0;
    if (invoiceIndex === 0) {
      req.body.tableName = "HM_Payment";
      req.body.filters = { BookingID: data.BookingID };
      const ManagePayment = await CommonReadCall(req, res, next);

      PerMonthTotalRent = ManagePayment.reduce(
        (sum, pay) => sum + (Number(pay.Amount) || 0),
        0,
      );
    }

    res.send({
      success: true,
      data: {
        ManageInvoice,
        BookingData,
        BookingFacilityItems,
        ManageCustomer,
        PerMonthTotalRent,
      },
    });
  } catch (err) {
    res.status(500).send({
      success: false,
      message:
        err.message || "Technical error, please contact the administrator",
    });
  }
}

function getMonthlyCycle(baseDate, index) {
  const cycleStart = new Date(baseDate);
  cycleStart.setMonth(cycleStart.getMonth() + index);

  const cycleEnd = new Date(cycleStart);
  cycleEnd.setMonth(cycleEnd.getMonth() + 1);
  cycleEnd.setDate(cycleEnd.getDate() - 1);

  cycleStart.setHours(0, 0, 0, 0);
  cycleEnd.setHours(0, 0, 0, 0);

  return { cycleStart, cycleEnd };
}

function getYearlyCycle(baseDate, index) {
  const cycleStart = new Date(baseDate);
  cycleStart.setFullYear(cycleStart.getFullYear() + index);

  const cycleEnd = new Date(cycleStart);
  cycleEnd.setFullYear(cycleEnd.getFullYear() + 1);
  cycleEnd.setDate(cycleEnd.getDate() - 1);

  cycleStart.setHours(0, 0, 0, 0);
  cycleEnd.setHours(0, 0, 0, 0);

  return { cycleStart, cycleEnd };
}

function calculateTotalMonths(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  let months =
    (end.getFullYear() - start.getFullYear()) * 12 +
    (end.getMonth() - start.getMonth());

  if (months === 0) {
    return 1;
  }

  if (end.getDate() >= start.getDate()) {
    months += 1;
  }

  return months;
}

function calculateDays(start, end) {
  return Math.floor((end - start) / 86400000) + 1;
}

function calculateDaysforday(start, end) {
  return Math.floor((end - start) / 86400000);
}

function calculateYearDays(start, end) {
  return Math.floor((end - start) / 86400000) + 1;
}

function calculateBookingCycleAmounts(bookings,cycleStart,cycleEnd,invoiceIndex) {
  const result = [];

  bookings.forEach((booking) => {
    const sDate = new Date(booking.StartDate);
    const eDate = new Date(booking.EndDate);
    sDate.setHours(0, 0, 0, 0);
    eDate.setHours(0, 0, 0, 0);

    const unit = booking.PaymentType?.toLowerCase();

    // ========= PER DAY  SINGLE INVOICE =========
    if (["per day"].includes(unit)) {
      if (invoiceIndex > 0) return;

      const usedDays = Math.floor((eDate - sDate) / 86400000);

      let amount = 0;
      if (unit === "per day") {
        amount = truncate2((Number(booking.RoomPrice) || 0) * usedDays);
      }

      booking.StartDate = formatDateLocal(sDate);
      booking.EndDate = formatDateLocal(eDate);
      booking.UsedDays = usedDays;
      booking.BookingPrice = amount;
      booking.Discount = Number(booking.Discount) || 0;
      result.push(booking);
      return;
    }

    if (eDate < cycleStart || sDate > cycleEnd) return;

    const effectiveStart = sDate > cycleStart ? sDate : cycleStart;
    const effectiveEnd = eDate < cycleEnd ? eDate : cycleEnd;

    let bookingAmount = 0;

    // ========= PER MONTH =========
    if (unit === "per month") {
      const totalMonths = calculateTotalMonths(sDate, eDate);
      bookingAmount = truncate2(Number(booking.TotalRoomprice) / totalMonths);
    }

    // ========= PER YEAR (YEAR-WISE) =========
    else if (unit === "per year") {
      const totalYears = Math.ceil(calculateTotalMonths(sDate, eDate) / 12);
      if (invoiceIndex >= totalYears) return;
      bookingAmount = truncate2(Number(booking.TotalRoomprice) / totalYears);
    }

    booking.StartDate = formatDateLocal(effectiveStart);
    booking.EndDate = formatDateLocal(effectiveEnd);
    booking.UsedDays = Math.floor((effectiveEnd - effectiveStart) / 86400000);

    booking.BookingPrice = bookingAmount;
    booking.Discount = invoiceIndex === 0 ? Number(booking.Discount) || 0 : 0;
    result.push(booking);
  });

  return result;
}

function getDaysInMonth(date) {
    return new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0
    ).getDate();
}

 function calculateFacilityCycleAmounts(items, cycleStart, cycleEnd, invoiceIndex) {
    const result = [];
    items.forEach((item) => {
        const sDate = new Date(item.StartDate);
        const eDate = new Date(item.EndDate);
        sDate.setHours(0, 0, 0, 0);
        eDate.setHours(0, 0, 0, 0);

        const unit = item.UnitText?.toLowerCase();
        const selectionMode = item.SelectionMode?.toUpperCase();
        const chargeType = item.FacilityChargeType?.toUpperCase();
        const bookingUnit = item.PaymentType?.toLowerCase();

        const qty = Number(item.Quantity) || 1;
        const price = Number(item.BasicFacilityPrice) || 0;
        const totalPrice = Number(item.FacilitiPrice) || price;
        const totalHour = Number(item.TotalHour) || 1;

        let effectiveStart = sDate;
        let effectiveEnd = eDate;
        let facilityAmount = 0;

        if (bookingUnit !== "per day") {
            const overlaps = !(eDate < cycleStart || sDate > cycleEnd);
            if (!overlaps) return;

            effectiveStart = sDate > cycleStart ? sDate : cycleStart;
            effectiveEnd = eDate < cycleEnd ? eDate : cycleEnd;
        }

        const calcStart = bookingUnit === "per day" ? sDate : effectiveStart;
        const calcEnd = bookingUnit === "per day" ? eDate : effectiveEnd;

        const usedDays = calculateDays(calcStart, calcEnd);
        const usedDaysForDay = calculateDaysforday(calcStart, calcEnd);

        const calculateYearAmount = (multiplier = 1) => {
            const years = Math.ceil(calculateTotalMonths(sDate, eDate) / 12);
            const yearlyPrice = totalPrice / years;
            const overlapDays = calculateDays(calcStart, calcEnd);

            if (overlapDays >= 364) {
                return round2(multiplier * yearlyPrice);
            }

            return round2(
                multiplier * (yearlyPrice / 365) * overlapDays
            );
        };

        // PERSON_QTY
        if (selectionMode === "PERSON_QTY") {

            if (chargeType === "DAILY") {

                if (bookingUnit === "per year") {
                    facilityAmount = calculateYearAmount();
                } else if (bookingUnit === "per day") {
                    facilityAmount = truncate2(price * usedDaysForDay);
                } else if (bookingUnit === "per month") {
                      const daysInMonth = getDaysInMonth(calcStart);
                      facilityAmount = truncate2(
                          price * daysInMonth * calculateTotalMonths(calcStart, calcEnd)
                      );
                  }

                item.CalculatedUnits = qty;
            }

            else if (chargeType === "ENTIRE BOOKING") {

                if (invoiceIndex > 0) return;

                facilityAmount = truncate2(price);
                item.CalculatedUnits = qty;

                item.StartDate = formatDateLocal(sDate);
                item.EndDate = formatDateLocal(eDate);
            }
        }

        // QTY
        else if (selectionMode === "QTY") {

            if (invoiceIndex > 0) return;

            switch (unit) {

                case "unit price":
                    facilityAmount = truncate2(qty * price);
                    break;

                case "per day":
                    facilityAmount = truncate2(qty * price * usedDaysForDay);
                    break;

                case "per hour":
                    facilityAmount = truncate2(
                        qty * price * totalHour * usedDaysForDay
                    );
                    break;

                case "per month":
                    facilityAmount = truncate2(
                        qty * price * calculateTotalMonths(calcStart, calcEnd)
                    );
                    break;

                case "per year":
                    facilityAmount = calculateYearAmount(qty);
                    break;
            }

            item.CalculatedQty = qty;
        }

        // SINGLE / PERSON
        else if (selectionMode === "SINGLE" || selectionMode === "PERSON") {

            switch (unit) {

                case "per day":
                    facilityAmount = truncate2(price * usedDaysForDay);
                    break;

                case "per hour":
                    facilityAmount = truncate2(
                        price * totalHour * usedDaysForDay
                    );
                    break;

                case "per month":
                    facilityAmount = truncate2(
                        price * calculateTotalMonths(calcStart, calcEnd)
                    );
                    break;

                case "per year":
                    facilityAmount = calculateYearAmount();
                    break;
            }
        }

       if (!(selectionMode === "PERSON_QTY" && chargeType === "ENTIRE BOOKING")) {
            item.StartDate = formatDateLocal(calcStart);
            item.EndDate = formatDateLocal(calcEnd);
        }

        item.UsedDays = usedDays;
        item.FacilityPrice = facilityAmount;
        result.push(item);
    });
    return result;
}

function round2(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function truncate2(value) {
  return Math.floor((Number(value) + Number.EPSILON) * 100) / 100;
}

function formatDateLocal(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function getHM_InvoiceFullData(req, res, next) {
  try {
    const { BookingID } = req.query;
    if (!req.query.BookingID) {
      return res.status(400).send({
        success: false,
        message: "BookingID is required",
      });
    }

    /*  STEP 1: READ MANAGE INVOICE  */
    req.body.tableName = "HM_ManageInvoice";
    req.body.filters = { BookingID };

    const invoices = await CommonReadWithFilters(req, res, next);
    if (!invoices || !invoices.length) {
      return res.send({ success: true, data: [] });
    }

    /*  STEP 2: EXTRACT INV NOs  */
    const invNos = invoices.map((i) => i.InvNo);

    /*  STEP 3: READ PAYMENT DETAILS  */
    req.body.tableName = "HM_ManageInvoiceItem";
    req.body.filters = { InvNo: invNos };

    const invoicePaymentDetails = await CommonReadWithFilters(req, res, next);

    /*  STEP 4: READ PAYMENTS  */
    req.body.tableName = "HM_Payment";
    req.body.filters = { InvNo: invNos };
    const payments = await CommonReadWithFilters(req, res, next);

    /*  STEP 5: MAP DATA  */
    const paymentDetailMap = {};
    invoicePaymentDetails.forEach((p) => {
      if (!paymentDetailMap[p.InvNo]) paymentDetailMap[p.InvNo] = [];
      paymentDetailMap[p.InvNo].push(p);
    });

    const paymentMap = {};
    payments.forEach((p) => {
      if (!paymentMap[p.InvNo]) paymentMap[p.InvNo] = [];
      paymentMap[p.InvNo].push(p);
    });

    const finalData = invoices.map((inv) => ({
      ...inv,
      InvoicePaymentDetail: paymentDetailMap[inv.InvNo] || [],
      Payments: paymentMap[inv.InvNo] || [],
    }));
    res.send({ success: true, data: finalData });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Technical error, please contact administrator",
    });
  }
}

exports.HM_ManageInvoice = {
  getHM_ManageInvoice,
  postHM_ManageInvoice,
  putHM_ManageInvoice,
  getHM_ManageInvoiceItem,
  postHM_ManageInvoiceItem,
  putHM_ManageInvoiceItem,
  deleteHM_ManageInvoiceItem,
  getHM_InvoicePaymentDetail,
  postHM_InvoicePaymentDetail,
  deleteHM_ManageInvoice,
  getAllInvoiceData,
  getHM_InvoiceFullData,
};
