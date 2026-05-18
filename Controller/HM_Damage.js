const {
  CommonReadCall,
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall,
  CommounMultipalUpdate,
  CommonReadWithFilters
} = require("./CommonController");


async function getHM_Damage(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Damage";
    if (req.query.DamageID) req.body.filters.DamageID = req.query.DamageID;
    if (req.query.Status) req.body.filters.Status = req.query.Status;
    if (req.query.StartDate && req.query.EndDate) req.body.filters.Date = [req.query.StartDate, req.query.EndDate]
    if (req.query.RoomNo) req.body.filters.RoomNo = req.query.RoomNo;
    if (req.query.CustomerName) req.body.filters.CustomerName = req.query.CustomerName;
    if (req.query.ItemName) req.body.filters.ItemName = req.query.ItemName;
    if (req.query.Type) req.body.filters.Type = req.query.Type;
    if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
    if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({
      success: true,
      data: []
    })
    var data = await CommonReadWithFilters(req, res, next);
    data.sort((a, b) => {
      const invA = a.DamageID.split('-')[1];
      const invB = b.DamageID.split('-')[1];
      return parseInt(invB) - parseInt(invA);
    });
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({
      success: false, message: error || "Technical error, please contact the administrator",
    });
  }
}

async function postHM_Damage(req, res, next) {
  try {
    var Items = req.body.Items || [];
    // Step 1: Set tableName and read existing HM_Damage data
    req.body.tableName = "HM_Damage";
    const existingInvoices = await CommonReadCall(req, res, next);

    // Step 2: Generate financial year based on InvoiceDate
    const invoiceDate = new Date(req.body.data.InvoiceDate);
    let currentYear = invoiceDate.getFullYear();
    let nextYear = currentYear + 1;

    if (invoiceDate.getMonth() <= 2) {
      currentYear -= 1;
      nextYear -= 1;
    }

    const financialYear = `${currentYear}/${nextYear.toString().slice(-2)}`;

    // Step 3: Generate new InvoiceNo
    const financialYearInvoices = existingInvoices.filter((inv) =>
      inv.DamageID?.startsWith(`${financialYear}-`)
    );

    let nextNumber = "001";
    if (financialYearInvoices.length > 0) {
      const lastNumbers = financialYearInvoices.map((inv) => {
        const match = inv.DamageID.match(/-(\d+)$/);
        return match ? parseInt(match[1], 10) : 0;
      });
      const lastInvoiceNum = Math.max(...lastNumbers);
      nextNumber = String(lastInvoiceNum + 1).padStart(3, "0");
    }

    const newInvoiceNo = `${financialYear}-${nextNumber}`;

    // Step 4: Create invoice with generated InvoiceNo
    const invoiceRecord = {
      ...req.body.data,
      DamageID: newInvoiceNo,
    };

    req.body = {
      tableName: "HM_Damage",
      data: [invoiceRecord]
    };

    const invoiceResponse = await CommonCreateCall(req, res, next);

    if (!invoiceResponse || invoiceResponse.error) {
      return res.status(500).send({
        success: false,
        message: invoiceResponse?.error || "Failed to create Damage Invoice"
      });
    }

    // Step 5: Optionally create associated items with InvoiceNo
    const itemsWithInvoiceNo = (Items || []).map((item) => ({
      ...item,
      DamageID: newInvoiceNo
    }));

    if (itemsWithInvoiceNo.length > 0) {
      req.body = {
        tableName: "HM_DamageItem",
        data: itemsWithInvoiceNo
      };
      const itemResponse = await CommonCreateCall(req, res, next);

      if (!itemResponse || itemResponse.error) {
        return res.status(500).send({
          success: false,
          message: itemResponse?.error || "Failed to create Damage Invoice Items"
        });
      }
    }

    // Step 6: Send success response
    res.status(200).send({
      success: true,
      message: "Damage Invoice saved!",
      InvoiceNo: newInvoiceNo
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: error?.message || "Technical error, please contact the administrator"
    });
  }
}

async function putHM_Damage(req, res, next) {
  try {
    // Ensure correct body structure
    req.body.tableName = "HM_Damage";
    req.body.data = req.body.data;
    req.body.filters = req.body.filters;
    const invoiceUpdateResponse = await CommonUpdateCall(req, res, next);

    if (!invoiceUpdateResponse || invoiceUpdateResponse.error) {
      return res.status(500).send({
        success: false,
        message: invoiceUpdateResponse?.error || "Failed to update Damage Invoice"
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
          tableName: "HM_DamageItem",
          data: itemsToCreate
        };
        const createResponse = await CommonCreateCall(req, res, next);

        if (!createResponse || createResponse.error) {
          return res.status(500).send({
            success: false,
            message: createResponse?.error || "Failed to create Damage Invoice Items"
          });
        }
      }

      // Update existing items
      if (itemsToUpdate.length > 0) {
        req.body = {
          tableName: "HM_DamageItem",
          data: itemsToUpdate
        };
        const updateResponse = await CommounMultipalUpdate(req, res, next);

        if (!updateResponse || updateResponse.error) {
          return res.status(500).send({
            success: false,
            message: updateResponse?.error || "Failed to update Damage Invoice Items"
          });
        }
      }
    }
    res.send({ success: true, message: "Updated successfully" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error?.message || "Technical error, please contact the administrator"
    });
  }
}

async function deleteHM_Damage(req, res, next) {
  try {
    req.body.tableName = "HM_Damage";
    await CommonDeleteCall(req, res, next);

    req.body.tableName = "HM_DamageItem";
    var data = await CommonDeleteCall(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error || "Technical error, please contact the administrator",
    });
  }
}

async function getHM_DamageItem(req, res, next) {
  try {
    // Step 1: Prepare filters
    const companyItemFilters = {};
    if (req.query.DamageID) companyItemFilters.DamageID = req.query.DamageID;
    if (req.query.ItemID) companyItemFilters.ItemID = req.query.ItemID;

    // Step 2: Read HM_DamageItem data
    req.body.tableName = "HM_DamageItem";
    req.body.filters = companyItemFilters;
    const HM_DamageItems = await CommonReadCall(req, res, next);
    if (!HM_DamageItems || HM_DamageItems.error) {
      return res.status(500).send({
        success: false,
        message: HM_DamageItems?.error || "Failed to Delete Damage Invoice Items"
      });
    }


    // Step 4: Read HM_Damage data
    req.body.tableName = "HM_Damage";
    req.body.filters = { DamageID: req.query.DamageID };  // Ensure only DamageID used for header
    const HM_Damage = await CommonReadCall(req, res, next);
    if (!HM_Damage || HM_Damage.error) {
      return res.status(500).send({
        success: false,
        message: HM_Damage?.error || "Failed to Delete Damage Invoice Items"
      });
    }
    // Step 4: Return both
    res.send({ success: true, data: { HM_Damage: HM_Damage, HM_DamageItem: [...HM_DamageItems,] } });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Technical error, please contact the administrator"
    });
  }
}

async function getHM_DamageBoth(req, res, next) {
  try {
    // Step 1: Prepare filters
    req.body.filters = {};
    if (req.query.DamageID) req.body.filters.DamageID = req.query.DamageID;
    if (req.query.UserID) req.body.filters.UserID = req.query.UserID;

    // Step 2: Read HM_DamageItem data
    req.body.tableName = "HM_Damage";
    const HM_Damage = await CommonReadWithFilters(req, res, next);

    if (!HM_Damage || HM_Damage.length === 0) {
      return res.status(200).send({
        success: true,
        message: "No Damage Details found"
      });
    }

    // Step 3: Read HM_DamageItem data
    req.body.tableName = "HM_DamageItem";
    req.body.filters = { DamageID: HM_Damage.map(d => d.DamageID) };  // Ensure only DamageID used for items
    const HM_DamageItems = await CommonReadWithFilters(req, res, next);
    if (!HM_DamageItems || HM_DamageItems.length === 0) {
      return res.status(200).send({
        success: true,
        message: "No Damage Item Details found"
      });
    }
    res.send({ success: true, data: { HM_Damage: HM_Damage, HM_DamageItem: [...HM_DamageItems,] } });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Technical error, please contact the administrator"
    });
  }
}

async function postHM_DamageItem(req, res, next) {
  try {
    req.body.tableName = "HM_DamageItem";
    await CommonCreateCall(req, res, next);
    res.status(200).send({
      success: true,
      message: "Damage Details saved!"
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator"
    });
  }
}

async function putHM_DamageItem(req, res, next) {
  try {
    req.body.tableName = "HM_DamageItem";
    CommonUpdateCall(req, res, next);
    res.status(200).send({
      success: true,
      message: "Damage Details updated!"
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

async function deleteHM_DamageItem(req, res, next) {
  try {
    req.body.tableName = "HM_DamageItem";
    var data = await CommonDeleteCall(req, res, next);
    res.send({
      success: true,
      data
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

async function HM_DamageCommonChartCall(req, res, next) {
  try {
    req.body.tableName = "HM_Damage";
    req.body.filters = {};

    if (req.body.StartDate && req.body.EndDate)
      req.body.filters.InvoiceDate = [req.body.StartDate, req.body.EndDate];

    if (req.body.StartReturnDamageDate && req.body.EndReturnDamageDate)
      req.body.filters.ReturnDamageDate = [req.body.StartReturnDamageDate, req.body.EndReturnDamageDate];

    if (req.body.BranchCode)
      req.body.filters.BranchCode = req.body.BranchCode.split(",");

    // 🔹 Read Parent table (HM_Damage)
    const HM_Damage = await CommonReadWithFilters(req, res, next);

    if (!HM_Damage || HM_Damage.length === 0) {
      return res.status(200).send({
        success: true,
        message: "No Damage Details found"
      });
    }

    // 🔹 Read Child table (HM_DamageItem)
    req.body.tableName = "HM_DamageItem";
    req.body.filters = {};
    req.body.filters.DamageID = HM_Damage.map(d => d.DamageID);

    const data = await CommonReadWithFilters(req, res, next);

    // helper function (unchanged)
    const getCountByKey = (arr, key) => {
      const counts = {};
      arr.forEach(item => {
        if (item[key]) {
          counts[item[key]] = (counts[item[key]] || 0) + 1;
        }
      });

      return Object.keys(counts).map(k => ({
        name: k,
        count: counts[k]
      }));
    };

    const statusCounts = {};
    HM_Damage.forEach(damage => {
      if (damage.Status) {
        statusCounts[damage.Status] = (statusCounts[damage.Status] || 0) + 1;
      }
    });

    const statusChartData = Object.keys(statusCounts).map(k => ({
      name: k,
      count: statusCounts[k]
    }));


    // 🔹 Chart Data
    const chartData = [
      {
        chart: "ItemName",
        data: getCountByKey(data, "ItemName")
      },
      {
        chart: "Type",
        data: getCountByKey(data, "Type")
      },
      {
        chart: "Status",
        data: statusChartData   // ✅ fixed Status logic
      }
    ];

    res.send({
      success: true,
      data: chartData
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator"
    });
  }
}

async function HM_DamageCurrentMonthBarChart(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_Damage";

    var StartDate = req.body.StartDate;
    var EndDate = req.body.EndDate;

    if (StartDate && EndDate) {
      req.body.filters.InvoiceDate = [StartDate, EndDate];
    }

    if (req.body.BranchCode) {
      req.body.filters.BranchCode = req.body.BranchCode.split(",");
    }

    // 1️⃣ Read HM_Damage (Parent)
    const HM_Damage = await CommonReadWithFilters(req, res, next);

    if (!HM_Damage || HM_Damage.length === 0) {
      return res.status(200).send({
        success: true,
        data: [],
        message: "No Damage Details found"
      });
    }

    // 2️⃣ Read HM_DamageItem (Child)
    req.body.tableName = "HM_DamageItem";
    req.body.filters = {};
    req.body.filters.DamageID = HM_Damage.map(d => d.DamageID);

    const bookingData = await CommonReadWithFilters(req, res, next);

    const startDate = new Date(StartDate);
    const endDate = new Date(EndDate);

    let results = [];

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {

      const currentDate = new Date(d);
      let recoveredCount = 0;
      let pendingCount = 0;

      HM_Damage.forEach(damage => {
        const damageDate = new Date(damage.InvoiceDate);

        if (damageDate.getFullYear() === currentDate.getFullYear() && damageDate.getMonth() === currentDate.getMonth() && damageDate.getDate() === currentDate.getDate()) {

          // find related items using DamageID
          const relatedItems = bookingData.filter(item => item.DamageID === damage.DamageID);

          const itemCount = relatedItems.length;

          // use Status from HM_Damage table
          if (damage.Status === "Recovered") recoveredCount += itemCount;
          if (damage.Status === "Pending") pendingCount += itemCount;
        }
      });

      results.push({
        Date: currentDate.toISOString().split("T")[0],
        Recovered: recoveredCount,
        Pending: pendingCount
      });
    }

    res.send({
      success: true,
      data: results,
      message: "Bar chart data fetched successfully"
    });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: "Technical error please contact administrator"
    });
  }
}


exports.HM_Damage = {
  getHM_Damage,
  postHM_Damage,
  putHM_Damage,
  deleteHM_Damage,
  getHM_DamageItem,
  getHM_DamageBoth,
  postHM_DamageItem,
  putHM_DamageItem,
  deleteHM_DamageItem,
  HM_DamageCommonChartCall,
  HM_DamageCurrentMonthBarChart
};