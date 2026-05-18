const { randomUUID } = require("crypto");
const {
  CommonReadWithFilters,
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall
} = require("./CommonController");

async function getHM_Payment(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Payment";
    if (req.query.BookingID) req.body.filters.BookingID = req.query.BookingID;
    if (req.query.CustomerName) req.body.filters.CustomerName = req.query.CustomerName;
    if (req.query.InvNo) req.body.filters.InvNo = req.query.InvNo;
    if (req.query.Used) req.body.filters.Used = req.query.Used;
    if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
    if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({ success: true, data: [] })
    if (req.query.StartDate && req.query.EndDate) { req.body.filters.Date = [req.query.StartDate, req.query.EndDate] }

    const commentData = await CommonReadWithFilters(req, res, next);
    res.send({ success: true, commentData });
  }
  catch (error) {
    res.status(500).send({ success: false, message: error || "Technical error, please contact the administrator", });
  }
}

async function postHM_Payment(req, res, next) {
  try {
    let data = req.body.data;
    data.PaymentID = randomUUID();
    const invNo = data.InvNo;

    req.body = { tableName: "HM_Payment", data: [data]};

    const paymentResponse = await CommonCreateCall(req, res, next);
    if (!paymentResponse || paymentResponse.error) {
      return res.status(500).send({
        success: false,
        message: paymentResponse?.error || "Failed to create HM_Payment"
      });
    }

    const invoicePaymentPayload = {
      InvNo: data.InvNo,
      TransactionId: data.BankTransactionID,
      ReceivedDate: data.Date,           
      ReceivedAmount: data.Amount || "0",
      TotalAmount: data.Amount || "0",
      DueAmount: "0",
      Currency: data.Currency || "INR"
    };

    req.body = { tableName: "HM_InvoicePaymentDetail", data: [invoicePaymentPayload] };

    const invoicePaymentResponse = await CommonCreateCall(req, res, next);
    if (!invoicePaymentResponse || invoicePaymentResponse.error) {
      return res.status(500).send({
        success: false,
        message: invoicePaymentResponse?.error || "Failed to create Invoice Payment Detail"
      });
    }

    req.body = {
      tableName: "HM_ManageInvoice",
      data: {
        RefundProcessed: data.Amount
      },
      filters: { InvNo: invNo }
    };

    await CommonUpdateCall(req, res, next);
    res.status(200).send({
      success: true,
      message: "Payment details saved and invoice updated successfully!",
      PaymentID: data.PaymentID
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Technical error, please contact the administrator"
    });
  }
}

async function putHM_Payment(req, res, next) {
  try {
    req.body.tableName = "HM_Payment";
    await CommonUpdateCall(req, res, next);
    res.status(200).send({ success: true, message: "Payment details updated!" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error || "Technical error, please contact the administrator",
    });
  }
}

async function deleteHM_Payment(req, res, next) {
  try {
    req.body.tableName = "HM_Payment";
    var data = await CommonDeleteCall(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({ success: false, message: error || "Technical error, please contact the administrator", });
  }
}

async function getHM_Deposit(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Deposit";
    if (req.query.BookingID) req.body.filters.BookingID = req.query.BookingID;
    if (req.query.CustomerName) req.body.filters.CustomerName = req.query.CustomerName;
    if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
    if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({ success: true, data: [] })
    if (req.query.StartDate && req.query.EndDate) { req.body.filters.DepositDate = [req.query.StartDate, req.query.EndDate] }
    if (req.query.StartDate && req.query.EndDate) { req.body.filters.ReturnDepositDate = [req.query.StartDate, req.query.EndDate] }

    const commentData = await CommonReadWithFilters(req, res, next);
    res.send({ success: true, commentData });
  }
  catch (error) {
    res.status(500).send({ success: false, message: error || "Technical error, please contact the administrator", });
  }
}

async function putHM_Deposit(req, res, next) {
  try {
    var FilterDate = req.body.filters;
    req.body.filters = {};
    req.body.filters = { BookingID: req.body.data.BookingID };
    req.body.tableName = "HM_Booking";
    var readData = await CommonReadWithFilters(req, res, next);
    if (readData.length > 0) {
      if (readData[0].Status !== "Completed") {
        return res.status(400).send({ success: false, message: "Until checkout is completed, deposit details cannot be updated." });
      }
    }
    req.body.filters = FilterDate;
    req.body.tableName = "HM_Deposit";
    await CommonUpdateCall(req, res, next);
    res.status(200).send({ success: true, message: "Deposit details updated!" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error || "Technical error, please contact the administrator",
    });
  }
}

async function postHM_PaymentDetails(req, res, next) {
    try {
      let data = req.body.data;
      data.PaymentID = randomUUID();
      req.body = { tableName: "HM_Payment", data: [data]};

      await CommonCreateCall(req, res, next);
      res.status(200).send({
            success: true,
            message: "Payment data saved successfully!",
      });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: error.message || "Technical error, please contact the administrator",
        });
    }
}


exports.HM_Payment = {
  getHM_Payment,
  postHM_Payment,
  putHM_Payment,
  deleteHM_Payment,
  getHM_Deposit,
  putHM_Deposit,
  postHM_PaymentDetails
};
