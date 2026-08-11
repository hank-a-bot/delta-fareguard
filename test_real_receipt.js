const { parseDeltaReceiptText } = require('./src/backend/gmailEngine');

const userReceiptText = `
Date of Purchase:
Aug 11, 2026

Atlanta, GA ► Portland, ME
Passenger Information
HENRY AMBROSE ASSAF
Confirmation Number:HZRE7W
Skymiles Number: 9014745773
Ticket Number:0062454448433
Flight

DATE AND FLIGHT
STATUS
CLASS
SEAT/CABIN
ATL ► PWM | Thu 27Aug2026 | 2479
OPEN
SU
Delta Comfort
PWM ► ATL | Sun 30Aug2026 | 1515
OPEN
NV
Delta Main

Detailed Charges

Miles
Miles Redeemed
54,900 miles

Air Transportation Charges
Base Fare
$0.00 USD

Taxes, Fees and Charges
United States - September 11th Security Fee(Passenger Civil Aviation Security Service Fee) (AY)
$11.20 USD
Total Taxes, Fees & Charges
$11.20 USD

Total
54,900 miles
+
$11.20 USD

Applied eCredit (0062429512306)
$11.20 USD
`;

const parsed = parseDeltaReceiptText(userReceiptText);
console.log('PARSED REAL USER RECEIPT:', JSON.stringify(parsed, null, 2));
