const {
  CommonReadCall,
  CommonCreateCall,
  CommonUpdateCall,
  CommonDeleteCall,
  CommonDeleteCallWithMutiple,
  CommonReadWithFilters
} = require("./CommonController");


async function getHMAppVisibility(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_AppVisibility";
    if (req.query.Role)
      req.body.filters.Role = req.query.Role;
    const data = await CommonReadCall(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
}

async function getCurrency(req, res, next) {
  try {
    req.body.tableName = "Currency";
    const data = await CommonReadCall(req, res, next);
    if (data) {
      data.sort((a, b) => {
        const cityA = (a.currency || "").toLowerCase();
        const cityB = (b.currency || "").toLowerCase();
        return cityA > cityB ? 1 : cityA < cityB ? -1 : 0;
      });
    }
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
}

async function getCompanyCodeDetails(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "CompanyCodeDetails";

    if (req.query.branchCode) {
      req.body.filters.branchCode = req.query.branchCode;
    }

    if (req.query.companyCode === "") {
      req.body.filters.companyCode = req.query.companyCode;
    }

    if (req.query.companyCode) {
      req.body.filters.companyCode = req.query.companyCode;
    }

    let data = await CommonReadCall(req, res, next);

    if (data.length === 0) {
      req.body.filters = { defualtBranch: "X" };
      data = await CommonReadCall(req, res, next);

      if (data.length === 0) {
        return res.status(404).send({ success: false, message: "No default branch data found" });
      }
    }
    res.status(200).send({ success: true, data });
  } catch (error) {
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
}

async function getCompanyEmails(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "EmailContent";
    if (req.query.Type) {
      req.body.filters.Type = req.query.Type;
    }

    // If 'branchCode' is present, add the 'BranchCode' filter
    if (req.body.branchCode) {
      req.body.filters.branchCode = req.body.branchCode;
    }

    var data = await CommonReadCall(req, res, next);
    if (req.query.Action) {
      const first = data?.[0];
      const email = first?.CCEmailId || "";
      const toemail = first?.ToEmailID || "";

      data = [{ CCEmailId: email, ToEmailID: toemail }];
    }
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
}

async function getCountry(req, res, next) {
  try {
    req.body.tableName = "Country";
    const data = await CommonReadCall(req, res, next);

    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
}

async function getState(req, res, next) {
  try {
    req.body.tableName = "State";
    const data = await CommonReadCall(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
}

async function getCity(req, res, next) {
  try {
    req.body.tableName = "City";
    const data = await CommonReadCall(req, res, next);

    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({ success: false, message: "Internal Server Error" });
  }
}

async function getBranch(req, res, next) {
  try {
    req.body.tableName = "HM_Branch";
    req.body.filters = {};

    if (req.query.Name) req.body.filters.Name = req.query.Name;
    if (req.query.Pincode) req.body.filters.Pincode = req.query.Pincode;
    if (req.query.City) req.body.filters.City = req.query.City;
    if (req.query.LandMark) req.body.filters.LandMark = req.query.LandMark;

    if (req.query.top) req.body.top = req.query.top;
    if (req.query.skip) req.body.skip = req.query.skip;

    if (req.query.BranchID === "" && req.query.Role === "Admin")
      return res.status(200).send({ success: true, data: [] });

    delete req.query.Role;

    if (req.query.BranchID) {
      req.body.filters.BranchID = req.query.BranchID.split(",");
    }

    // ---------- 1. Fetch Branch ----------
    const data = await CommonReadWithFilters(req, res, next);

    delete req.body.top;
    delete req.body.skip;

    // const HM_RoomCount = data.length;

    let feedbackMap = {};

    if (req.query.flag === "true" && data.length > 0) {

      const branchCodes = data.map(b => b.BranchID);

      // ---------- 2. Fetch Feedback ----------
      req.body.tableName = "HM_Feedback";
      req.body.filters = { BranchCode: branchCodes };
      const allFeedback = await CommonReadWithFilters(req, res, next) || [];

      // ---------- 3. Aggregate feedback (ONE loop) ----------
      for (const row of allFeedback) {
        if (!feedbackMap[row.BranchCode]) {
          feedbackMap[row.BranchCode] = { total: 0, count: 0 };
        }
        if (row.OverallRating && !isNaN(row.OverallRating)) {
          feedbackMap[row.BranchCode].total += Number(row.OverallRating);
          feedbackMap[row.BranchCode].count++;
        }
      }
    }

    // ---------- 4. Attach rating + convert buffer (ONE loop) ----------
    for (const branch of data) {
      const stat = feedbackMap[branch.BranchID];
      branch.AverageRating = stat ? Number((stat.total / stat.count).toFixed(2)) : 0;
      branch.TotalFeedbacks = stat ? stat.count : 0;
      // buffer convert
      for (const key in branch) {
        if (
          (key.startsWith("Photo") || key.startsWith("Attachment")) &&
          Buffer.isBuffer(branch[key])
        ) {
          branch[key] = branch[key].toString("base64");
        }
      }
    }
    return res.send({ success: true, data });
  } catch (error) {
    return res.status(500).send({
      success: false,
      message: "Internal Server Error"
    });
  }
}

async function HM_BranchData(req, res, next) {
  try {
    req.body.tableName = "HM_Branch";
    req.body.filters = {};
    req.body.selectedFields = ["Name", "BranchID", "City", "Country", "LandMark", "Address", "Type", "Value", "GSTIN", "GeoLocation", "CheckinTime", "CheckoutTime", "EmailID", "PropertyType", "STD", "Contact"];
    if (req.query.Name) req.body.filters.Name = req.query.Name;
    if (req.query.Pincode) req.body.filters.Pincode = req.query.Pincode;
    if (req.query.City) req.body.filters.City = req.query.City;
    if (req.query.BranchID) {
      req.body.filters.BranchID = req.query.BranchID.split(",");
    }
    if (req.query.BranchID === "" && req.query.Role === "Admin") return res.status(200).send({ success: true, data: [] })
    delete req.query.Role;

    const data = await CommonReadWithFilters(req, res, next);
   
    res.send({ success: true, data: data });
  } catch (err) {
    res.status(500).send({ success: false, message: err || "Technical error, please contact the administrator", });
  }
}

async function postBranch(req, res, next) {
  try {
    let data = req.body.data;
    var UserID = data.UserID;
    delete data.UserID;
    data.BranchID = await generateBranchCode(data.Name, data.Pincode, data.State, data.City);
    req.body.tableName = "HM_Branch";

    Object.keys(data).forEach((key) => {
      if (typeof data[key] === "string" && key.startsWith("Photo") && !key.endsWith("Name") && !key.endsWith("Type")) {
        data[key] = Buffer.from(data[key], "base64");
      }
      if (typeof data[key] === "string" && key.startsWith("Attachment") && !key.endsWith("Name") && !key.endsWith("Type")) {
        data[key] = Buffer.from(data[key], "base64");
      }
    });

    req.body.data = { ...data };
    await CommonCreateCall(req, res, next);

    req.body.tableName = "HM_Login";
    req.body.filters = { UserID: UserID };
    var LoginData = await CommonReadCall(req, res, next);

    const existingBranchCode = LoginData[0].BranchCode;

    LoginData[0].BranchCode = existingBranchCode ? `${existingBranchCode},${data.BranchID}`
      : data.BranchID;

    req.body.data = { ...LoginData[0] };
    await CommonUpdateCall(req, res, next);

    res.send({ success: true });
  } catch (error) {
    res.status(500).send({ success: false, message: error.message || "Error fetching Branch Data.", });
  }
}

async function generateBranchCode(name, pincode, state, city) {

  if (!name) throw new Error("Branch Name is missing");
  if (!state) throw new Error("State is missing");
  if (!city) throw new Error("City is missing");
  if (!pincode) throw new Error("Pincode is missing");

  const part1 = name.replace(/\s+/g, "").substring(0, 3).toUpperCase();
  const part2 = state.substring(0, 1).toUpperCase();
  const part3 = city.substring(0, 1).toUpperCase();
  const part4 = pincode.toString().slice(-1);

  return part1 + part2 + part3 + part4;
}

async function putBranch(req, res, next) {
  try {
    req.body.tableName = "HM_Branch";
    Object.keys(req.body.data).forEach((key) => {
      if (key.startsWith("Photo") && typeof req.body.data[key] === "string" && !key.endsWith("Name") && !key.endsWith("Type")) {
        req.body.data[key] = Buffer.from(req.body.data[key], "base64");
      }
      if (key.startsWith("Attachment") && typeof req.body.data[key] === "string" && !key.endsWith("Name") && !key.endsWith("Type")) {
        req.body.data[key] = Buffer.from(req.body.data[key], "base64");
      }
    });
    await CommonUpdateCall(req, res, next);
    res.send({ success: true, message: "Updated successfully" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message: error || "Technical error, please contact the administrator",
    });
  }
}

async function deleteBranch(req, res, next) {
  try {
    var UserID = req.body.filters.UserID;
    var BranchID = req.body.filters.BranchID;
    delete req.body.filters.UserID;
    // STEP 1: DELETE FROM HM_Branch
    req.body.tableName = "HM_Branch";
    await CommonDeleteCallWithMutiple(req, res, next);

    // STEP 2: READ LOGIN DATA
    req.body.tableName = "HM_Login";
    req.body.filters = { UserID: UserID };
    var LoginData = await CommonReadCall(req, res, next);

    // STEP 3: REMOVE BranchID FROM LoginData.BranchCode
    let branchList = (LoginData[0].BranchCode || "").split(",")
      .map(s => s.trim())
      .filter(s => s !== "" && s !== BranchID);

    LoginData[0].BranchCode = branchList.join(",");

    // STEP 4: UPDATE LOGIN TABLE
    req.body.data = { ...LoginData[0] };
    await CommonUpdateCall(req, res, next);

    res.send({ success: true, message: "Branch deleted and BranchCode updated successfully" });

  } catch (error) {
    res.status(500).send({
      success: false,
      message: error.message || "Technical error, please contact the administrator"
    });
  }
}

async function getHM_HostelFeatures(req, res, next) {
  try {
    req.body.filters = {};
    req.body.tableName = "HM_HostelFeatures";
    if (req.query.FacilityName) req.body.filters.FacilityName = req.query.FacilityName;
    if (req.query.BranchCode) req.body.filters.BranchCode = req.query.BranchCode.split(",");
    if (req.query.BranchCode === "" && req.query.Role === "Admin") return res.status(200).send({ success: true, data: [] })
    delete req.query.Role;
    const data = await CommonReadWithFilters(req, res, next);
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

async function postHM_HostelFeatures(req, res, next) {
  try {
    let data = req.body.data;
    req.body.tableName = "HM_HostelFeatures";
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
    req.body.data = { ...data };
    const createResult = await CommonCreateCall(req, res, next);
    res.status(200).send({
      success: true,
      message: "Facility saved successfully!",
    });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function putHM_HostelFeatures(req, res, next) {
  try {
    req.body.tableName = "HM_HostelFeatures";
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
    await CommonUpdateCall(req, res, next);
    res.send({ success: true, message: "Updated successfully" });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

async function deleteHM_HostelFeatures(req, res, next) {
  try {
    req.body.tableName = "HM_HostelFeatures";
    const data = await CommonDeleteCall(req, res, next);
    res.send({ success: true, data });
  } catch (error) {
    res.status(500).send({
      success: false,
      message:
        error.message || "Technical error, please contact the administrator",
    });
  }
}

exports.MasterData = {
  getCurrency,
  getCompanyCodeDetails,
  getCompanyEmails,
  getCountry,
  getState,
  getCity,
  getBranch,
  postBranch,
  putBranch,
  deleteBranch,
  getHM_HostelFeatures,
  postHM_HostelFeatures,
  putHM_HostelFeatures,
  deleteHM_HostelFeatures,
  getHMAppVisibility,
  HM_BranchData
};
