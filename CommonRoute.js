require('dotenv').config();

const express = require("express");
const app = express();
const bcrypt = require("bcrypt");
const saltRounds = 10;
const cors = require("cors");
const bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ limit: '500mb', extended: true }));
app.use(express.json());


app.use(cors({
  origin: "*", // Allow requests from any origin (or specify frontend URL)
  methods: "GET, POST, PUT, DELETE",
  allowedHeaders: "Content-Type, name, password"
}));

const { getDepartmentRule, SalaryDetailsFunction, getMessagesBetweenUsers } = require('./Controller/CommonController');

const { MasterData } = require("./Controller/MasterDataController");
const { HM_Rooms } = require("./Controller/HM_Rooms");
const { HM_Customer } = require("./Controller/HM_Customer");
const { HM_Booking } = require("./Controller/HM_Booking");
const { HM_Payment } = require("./Controller/HM_Payment");
const { HM_Feedback } = require("./Controller/HM_Feedback");
const { HM_Login } = require("./Controller/HM_Login");
const { HM_CustomerDocument } = require("./Controller/HM_CustomerDocument");
const { HM_BedType } = require("./Controller/HM_BedType");
const { HM_ExtraFacilities } = require("./Controller/HM_ExtraFacilities");
const { HM_BookingFacilityItems } = require("./Controller/HM_BookingFacilityItems");
const { HM_BedTypeDetails } = require("./Controller/HM_BedTypeDetails");
const { HM_Facilities } = require("./Controller/HM_Facilities");
const { HM_ManageInvoice } = require("./Controller/HM_ManageInvoice");
const { HM_Coupon } = require("./Controller/HM_Coupon");
const { HM_Complaint } = require("./Controller/HM_Complaint");
const { HM_Damage } = require("./Controller/HM_Damage");
const { HM_Support } = require("./Controller/HM_Support");
const { HM_Bug } = require("./Controller/HM_Bug");
const { HM_MemberDocument } = require("./Controller/HM_MemberCustomerDocument");
const { HM_Advertisement } = require("./Controller/HM_Advertisement");
const { Razorpay } = require("./Controller/RazorpayController");
const { Subscription } = require("./Controller/SubscriptionController");


const authenticate = async (req, res, next) => {
  const { name, password } = req.headers;

  if (!name || !password) {
    return res.status(401).send("Unauthorized: Missing credentials");
  }

  const storedHashedUsername = process.env.USERNAME_HASH;
  const storedHashedPassword = process.env.PASSWORD_HASH;

  const isNameValid = await bcrypt.compare(storedHashedUsername, name);
  const isPasswordValid = await bcrypt.compare(storedHashedPassword, password);

  if (isNameValid && isPasswordValid) {
    next();
  } else {
    res.status(401).send("Unauthorized: Invalid credentials");
  }
};


// HM Services
app.get("/HM_Rooms", authenticate, HM_Rooms.getHM_Rooms);
app.post("/HM_Rooms", authenticate, HM_Rooms.postHM_Rooms);
app.put("/HM_Rooms", authenticate, HM_Rooms.putHM_Rooms);
app.delete("/HM_Rooms", authenticate, HM_Rooms.deleteHM_Rooms);

//Rezorpay Services
app.post("/create-order", authenticate, Razorpay.createOrder);
app.post("/verify-payment", authenticate, Razorpay.verifyPayment);

//Subscription Services
app.get("/Subscription", authenticate, Subscription.getSubscription);
app.post("/Subscription", authenticate, Subscription.postSubscription);
app.put("/Subscription", authenticate, Subscription.putSubscription);
app.delete("/Subscription", authenticate, Subscription.deleteSubscription);
app.get("/SubscriptionPayment", authenticate, Subscription.getSubscriptionPayment);
app.post("/SubscriptionPayment", authenticate, Subscription.postSubscriptionPayment);
app.put("/SubscriptionPayment", authenticate, Subscription.putSubscriptionPayment);
app.delete("/SubscriptionPayment", authenticate, Subscription.deleteSubscriptionPayment);
app.get("/Package", authenticate, Subscription.getPackage);
app.post("/Package", authenticate, Subscription.postPackage);
app.put("/Package", authenticate, Subscription.putPackage);
app.delete("/Package", authenticate, Subscription.deletePackage);

app.get("/HM_Customer", authenticate, HM_Customer.getHM_Customer);
app.post("/HM_Customer", authenticate, HM_Customer.postHM_Customer);
app.put("/HM_Customer", authenticate, HM_Customer.putHM_Customer);
app.delete("/HM_Customer", authenticate, HM_Customer.deleteHM_Customer);
app.get("/getBranchHotelData", authenticate, HM_Customer.getBranchHotelData);
app.get("/HM_Member", authenticate, HM_Customer.getHM_Members);

app.get("/HM_Booking", authenticate, HM_Booking.getHM_Booking);
app.post("/HM_Booking", authenticate, HM_Booking.postHM_Booking);
app.put("/HM_Booking", authenticate, HM_Booking.putHM_Booking);
app.delete("/HM_Booking", authenticate, HM_Booking.deleteHM_Booking);
app.get("/CustomerAndPayment", authenticate, HM_Booking.CustomerAndPayment);
app.get("/BookingBedTypeRoomReadCall", authenticate, HM_Booking.BookingBedTypeRoomReadCall);
app.get("/HM_RoomsReadCall", authenticate, HM_Booking.HM_RoomsReadCall);
app.get("/HM_CustomerReadCall", authenticate, HM_Booking.HM_CustomerReadCall);
app.get("/HM_BookingCustomerReadCall", authenticate, HM_Booking.HM_BookingCustomerReadCall);
app.put("/HM_BookingDeposit", authenticate, HM_Booking.putHM_Bookingdeposit);
app.get("/HM_GetCurrentMonthBarChart", authenticate, HM_Booking.HM_GetCurrentMonthBarChart);
app.get("/HM_GetCurrentYearStatusBarChart", authenticate, HM_Booking.HM_GetCurrentYearStatusBarChart);
app.get("/HM_GetCurrentYearBarChart", authenticate, HM_Booking.HM_GetCurrentYearBarChart);
app.get("/HM_GetCurrentYearPaymentTypeBarChart", authenticate, HM_Booking.HM_GetCurrentYearPaymentTypeBarChart);
app.post("/HM_EnquiryEmail", authenticate, HM_Booking.HM_EnquiryEmail);

app.get('/HM_BedType', authenticate, HM_BedType.getHM_BedType);
app.post('/HM_BedType', authenticate, HM_BedType.postHM_BedType);
app.put('/HM_BedType', authenticate, HM_BedType.putHM_BedType);
app.delete('/HM_BedType', authenticate, HM_BedType.deleteHM_BedType);

app.get('/HM_ExtraFacilities', authenticate, HM_ExtraFacilities.getHM_ExtraFacilities);
app.post('/HM_ExtraFacilities', authenticate, HM_ExtraFacilities.postHM_ExtraFacilities);
app.put('/HM_ExtraFacilities', authenticate, HM_ExtraFacilities.putHM_ExtraFacilities);
app.delete('/HM_ExtraFacilities', authenticate, HM_ExtraFacilities.deleteHM_ExtraFacilities);
app.get('/HM_ExtraFacilitiesDelete', authenticate, HM_ExtraFacilities.getBookingFacilityItemsForDelete);

app.get("/HM_BookingFacilityItems", authenticate, HM_BookingFacilityItems.getHM_BookingFacilityItems);
app.post("/HM_BookingFacilityItems", authenticate, HM_BookingFacilityItems.postHM_BookingFacilityItems);
app.put("/HM_BookingFacilityItems", authenticate, HM_BookingFacilityItems.putHM_BookingFacilityItems);
app.delete("/HM_BookingFacilityItems", authenticate, HM_BookingFacilityItems.deleteHM_BookingFacilityItems);

app.get("/HM_Payment", authenticate, HM_Payment.getHM_Payment);
app.post("/HM_Payment", authenticate, HM_Payment.postHM_Payment);
app.put("/HM_Payment", authenticate, HM_Payment.putHM_Payment);
app.delete("/HM_Payment", authenticate, HM_Payment.deleteHM_Payment);
app.post("/HM_PaymentDetail", authenticate, HM_Payment.postHM_PaymentDetails);
app.get("/HM_Deposit", authenticate, HM_Payment.getHM_Deposit);
app.put("/HM_Deposit", authenticate, HM_Payment.putHM_Deposit);

app.get("/HM_Feedback", authenticate, HM_Feedback.getHM_Feedback);
app.post("/HM_Feedback", authenticate, HM_Feedback.postHM_Feedback);
app.put("/HM_Feedback", authenticate, HM_Feedback.putHM_Feedback);
app.delete("/HM_Feedback", authenticate, HM_Feedback.deleteHM_Feedback);

app.get("/HM_Login", authenticate, HM_Login.getHM_Login);
app.post("/HM_Login", authenticate, HM_Login.postHM_Login);
app.put("/HM_Login", authenticate, HM_Login.putHM_Login);
app.delete("/HM_Login", authenticate, HM_Login.deleteHM_Login);
app.post("/HostelSendOTP", authenticate, HM_Login.HostelSendOTPEmail);
app.post("/EmailOTP", authenticate, HM_Login.OTPEmail);
app.get("/HM_VerifyOTP", authenticate, HM_Login.VerifyCustomerOTP);
app.get("/HM_CustomerContact", authenticate, HM_Login.HM_CustomerContact);
app.get("/HM_StaffContact", authenticate, HM_Login.HM_StaffContact);
app.get("/HM_LoginReadCall", authenticate, HM_Login.HM_LoginReadCall);
app.get("/HM_Logindata", authenticate, HM_Login.HM_Customerdata);

app.get("/HM_CustomerDocument", authenticate, HM_CustomerDocument.getHM_CustomerDocument);
app.post("/HM_CustomerDocument", authenticate, HM_CustomerDocument.postHM_CustomerDocument);
app.put("/HM_CustomerDocument", authenticate, HM_CustomerDocument.putHM_CustomerDocument);
app.delete("/HM_CustomerDocument", authenticate, HM_CustomerDocument.deleteHM_CustomerDocument);

app.get("/HM_Advertisement", authenticate, HM_Advertisement.getHM_Advertisement);
app.post("/HM_Advertisement", authenticate, HM_Advertisement.postHM_Advertisement);
app.put("/HM_Advertisement", authenticate, HM_Advertisement.putHM_Advertisement);
app.delete("/HM_Advertisement", authenticate, HM_Advertisement.deleteHM_Advertisement);

app.get('/HM_Complaint', authenticate, HM_Complaint.getHM_Complaint);
app.post('/HM_Complaint', authenticate, HM_Complaint.postHM_Complaint);
app.put('/HM_Complaint', authenticate, HM_Complaint.putHM_Complaint);
app.delete('/HM_Complaint', authenticate, HM_Complaint.deleteHM_Complaint);

app.get("/HM_MemberDocument", authenticate, HM_MemberDocument.getHM_MemberDocument);
app.post("/HM_MemberDocument", authenticate, HM_MemberDocument.postHM_MemberDocument);
app.put("/HM_MemberDocument", authenticate, HM_MemberDocument.putHM_MemberDocument);
app.delete("/HM_MemberDocument", authenticate, HM_MemberDocument.deleteHM_MemberDocument);
app.get("/HM_MemberDoc", authenticate, HM_MemberDocument.getHM_MemberDoc);
app.put("/HM_Document", authenticate, HM_MemberDocument.putHM_Document);

app.get('/HM_Damage', authenticate, HM_Damage.getHM_Damage);
app.post('/HM_Damage', authenticate, HM_Damage.postHM_Damage);
app.put('/HM_Damage', authenticate, HM_Damage.putHM_Damage);
app.delete('/HM_Damage', authenticate, HM_Damage.deleteHM_Damage);
app.get('/HM_DamageItem', authenticate, HM_Damage.getHM_DamageItem);
app.get('/getHM_DamageBoth', authenticate, HM_Damage.getHM_DamageBoth);
app.post('/HM_DamageItem', authenticate, HM_Damage.postHM_DamageItem);
app.put('/HM_DamageItem', authenticate, HM_Damage.putHM_DamageItem);
app.delete('/HM_DamageItem', authenticate, HM_Damage.deleteHM_DamageItem);
app.post('/HM_DamageChart', authenticate, HM_Damage.HM_DamageCommonChartCall);
app.post('/HM_DamageCurrentMonthBarChart', authenticate, HM_Damage.HM_DamageCurrentMonthBarChart);

app.get('/HM_Facilities', authenticate, HM_Facilities.getHM_Facilities);
app.post('/HM_Facilities', authenticate, HM_Facilities.postHM_Facilities);
app.put('/HM_Facilities', authenticate, HM_Facilities.putHM_Facilities);
app.delete('/HM_Facilities', authenticate, HM_Facilities.deleteHM_Facilities);
app.get('/HM_FacilityType', authenticate, HM_Facilities.getHM_FacilityType);
app.get('/HM_AmenitiName', authenticate, HM_Facilities.getHM_AmenitiName);

app.get('/HM_BedTypeDetails', authenticate, HM_BedTypeDetails.getHM_BedTypeDetails);
app.post('/HM_BedTypeDetails', authenticate, HM_BedTypeDetails.postHM_BedTypeDetails);
app.put('/HM_BedTypeDetails', authenticate, HM_BedTypeDetails.putHM_BedTypeDetails);
app.delete('/HM_BedTypeDetails', authenticate, HM_BedTypeDetails.deleteHM_BedTypeDetails);

app.get('/HM_Support', authenticate, HM_Support.getHM_Support);
app.post('/HM_Support', authenticate, HM_Support.postHM_Support);
app.put('/HM_Support', authenticate, HM_Support.putHM_Support);
app.delete('/HM_Support', authenticate, HM_Support.deleteHM_Support);
app.get('/HM_Supportdata', authenticate, HM_Support.getSupportData);

app.get('/HM_Bug', authenticate, HM_Bug.getHM_Bug);
app.post('/HM_Bug', authenticate, HM_Bug.postHM_Bug);
app.put('/HM_Bug', authenticate, HM_Bug.putHM_Bug);
app.delete('/HM_Bug', authenticate, HM_Bug.deleteHM_Bug);
app.get('/HM_Bugdata', authenticate, HM_Bug.getBugData);

app.get("/mini/Currency", authenticate, MasterData.getCurrency);
app.get("/Currency", authenticate, MasterData.getCurrency);
app.get("/CompanyCodeDetails", authenticate, MasterData.getCompanyCodeDetails);
app.get("/EmailContent", authenticate, MasterData.getCompanyEmails);
app.get("/Country", authenticate, MasterData.getCountry);
app.get("/State", authenticate, MasterData.getState);
app.get("/City", authenticate, MasterData.getCity);
app.get("/HM_Branch", authenticate, MasterData.getBranch);
app.get("/HM_BranchData", authenticate, MasterData.HM_BranchData);
app.post("/HM_Branch", authenticate, MasterData.postBranch);
app.put("/HM_Branch", authenticate, MasterData.putBranch);
app.delete("/HM_Branch", authenticate, MasterData.deleteBranch);
app.get("/HM_HostelFeatures", authenticate, MasterData.getHM_HostelFeatures);
app.post("/HM_HostelFeatures", authenticate, MasterData.postHM_HostelFeatures);
app.put("/HM_HostelFeatures", authenticate, MasterData.putHM_HostelFeatures);
app.delete("/HM_HostelFeatures", authenticate, MasterData.deleteHM_HostelFeatures);
app.get("/HM_AppVisibility", authenticate, MasterData.getHMAppVisibility);
app.get("/HM_LoginUser", authenticate, MasterData.getLoginData);

app.get("/HM_ManageInvoice", authenticate, HM_ManageInvoice.getHM_ManageInvoice);
app.post("/HM_ManageInvoice", authenticate, HM_ManageInvoice.postHM_ManageInvoice);
app.put("/HM_ManageInvoice", authenticate, HM_ManageInvoice.putHM_ManageInvoice);
app.delete("/HM_ManageInvoice", authenticate, HM_ManageInvoice.deleteHM_ManageInvoice);
app.get("/HM_ManageInvoiceItem", authenticate, HM_ManageInvoice.getHM_ManageInvoiceItem);
app.post("/HM_ManageInvoiceItem", authenticate, HM_ManageInvoice.postHM_ManageInvoiceItem);
app.put("/HM_ManageInvoiceItem", authenticate, HM_ManageInvoice.putHM_ManageInvoiceItem);
app.delete("/HM_ManageInvoiceItem", authenticate, HM_ManageInvoice.deleteHM_ManageInvoiceItem);
app.get("/HM_InvoicePaymentDetail", authenticate, HM_ManageInvoice.getHM_InvoicePaymentDetail);
app.post("/HM_InvoicePaymentDetail", authenticate, HM_ManageInvoice.postHM_InvoicePaymentDetail);
app.post("/HM_getAllInvoiceData", authenticate, HM_ManageInvoice.getAllInvoiceData);
app.get("/HM_getInvoiceData", authenticate, HM_ManageInvoice.getHM_InvoiceFullData)

//HM_Coupon Service
app.get("/HM_Coupon", authenticate, HM_Coupon.getHM_Coupon);
app.post("/HM_Coupon", authenticate, HM_Coupon.postHM_Coupon);
app.put("/HM_Coupon", authenticate, HM_Coupon.putHM_Coupon);
app.delete("/HM_Coupon", authenticate, HM_Coupon.deleteHM_Coupon);
app.post("/CouponCodeEmail", authenticate, HM_Coupon.CouponCodeEmail);
app.get("/HM_CouponFacilityCount", authenticate, HM_Coupon.getHM_CouponMaxUsesFacilityCheck);
app.get("/HM_CouponBookingCount", authenticate, HM_Coupon.getHM_CouponMaxUsesBookingCheck);


app.listen(3001, () => {
  console.log(`Server running at http://localhost:3001`);
});

module.exports = app;
