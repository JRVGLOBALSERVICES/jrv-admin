import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
  Font,
} from "@react-pdf/renderer";

// ✅ 1. DYNAMIC URL HELPER
// Uses NEXT_PUBLIC_APP_URL to find the fonts (e.g. https://jrv-admin.vercel.app)
const getBaseUrl = () => {
  let url = process.env.NEXT_PUBLIC_APP_URL;

  if (!url) {
    if (process.env.NEXT_PUBLIC_SITE_URL)
      url = process.env.NEXT_PUBLIC_SITE_URL;
    else url = "http://localhost:3000";
  }

  return url.replace(/\/$/, ""); // Remove trailing slash if present
};

const BASE_URL = getBaseUrl();

// ✅ 2. REGISTER FONTS
// Ensure Inter_28pt-Regular.ttf and Inter_28pt-Bold.ttf are in /public/fonts/
Font.register({
  family: "Inter",
  fonts: [
    { src: `${BASE_URL}/fonts/Inter_28pt-Regular.ttf` },
    { src: `${BASE_URL}/fonts/Inter_28pt-Bold.ttf`, fontWeight: "bold" },
  ],
});

Font.register({
  family: "Signature",
  src: `${BASE_URL}/fonts/Pacifico-Regular.ttf`,
});

export type AgreementPdfData = {
  customer_name: string;
  id_number: string;
  mobile: string;
  plate_number: string;
  car_type: string;
  date_start: string;
  date_end: string;
  total_price: string;
  deposit_price: string;
  agent_email?: string | null;
  ic_url?: string | null;
};

const TERMS: string[] = [
  "Customer must provide all necessary document for rental purpose.",
  "Fuel level should be the same during pickup and return.",
  "Car should not cross the country borders.",
  "Only registered customer and additional driver can drive the vehicle.",
  "Any criminal activity is prohibited, and any consequences due to criminal activity will be bared by customer.",
  "Customers are prohibited to rent the vehicle to any other 3rd party renter.",
  "Drinking alcohol while driving and bringing pets in the car is prohibited.",
  "To extend the contract of rental, customer must notify company a day earlier.",
  "No refund will be provided for early return.",
  "In cases of accident, renter must first inform the company immediately and should not SIGN any authorization letter from any “call-men” unless told by the company representative.",
  "Renter should not use any other tow truck than the ones provided by the company.",
  "In cases of major accident, renter must pay 3 months of rental or till the car is returned from the workshop upon insurance claim completion.",
  "In cases of minor accident, renter must pay for the damages and the rent will continue for each day the car is not out of the workshop.",
  "If vehicle is under total lost, renter must pay 4 months of rental till the company claims the sum assured from the insurance agency.",
  "In cases of any wrong parking, speeding, red light summon, renter will be obliged to pay the summon amount in given time period.",
  "In cases whereby renter fails to pay within the given date upon extension of rental, a collateral (eg: Mobile Phone, any personal belongings) valued within or higher than amount owed, must be provided by renter to the JRV Services agent in charge.",
];

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#F4E7D8",
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 28,
    fontFamily: "Inter",
    fontSize: 9,
    color: "#111",
  },
  topLogoWrap: { alignItems: "center", marginBottom: 2 },
  logo: { width: 120, height: 90, objectFit: "contain" },
  title: {
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "bold",
    marginBottom: 10,
    letterSpacing: 0.4,
  },
  kv: { alignItems: "center", marginBottom: 6 },
  kvLine: {
    textAlign: "center",
    fontFamily: "Inter",
    fontWeight: "bold",
    fontSize: 11,
    marginBottom: 6,
  },
  kvValue: {
    fontFamily: "Inter",
    fontWeight: "normal",
    fontSize: 11,
    textTransform: "uppercase",
  },
  para: {
    marginVertical: 6,
    lineHeight: 1.22,
    textAlign: "center",
    fontSize: 10,
  },
  divider: {
    height: 3,
    backgroundColor: "#111",
    opacity: 0.25,
    marginVertical: 7,
  },
  sectionTitle: {
    textAlign: "center",
    fontSize: 16,
    fontFamily: "Inter",
    fontWeight: "bold",
    marginBottom: 8,
  },
  termsGrid: { flexDirection: "row", gap: 12 },
  termsCol: { flex: 1 },
  bulletRow: { flexDirection: "row", marginBottom: 3 },
  bulletDot: { width: 10, textAlign: "center", fontSize: 10 },
  bulletText: { flex: 1, fontSize: 10, lineHeight: 1.18 },
  signatures: {
    marginTop: 90,
    flexDirection: "row",
    gap: 20,
  },
  sigCol: { flex: 1, alignItems: "center" },
  sigText: {
    fontFamily: "Signature",
    fontSize: 20,
    color: "#1f4fd8",
    marginBottom: 6,
  },
  sigText2: {
    fontFamily: "Signature",
    fontSize: 20,
    color: "transparent",
    marginBottom: 6,
  },
  sigLine: {
    width: "100%",
    height: 1,
    backgroundColor: "#111",
    opacity: 0.5,
    marginBottom: 4,
  },
  sigLabel: {
    fontFamily: "Inter",
    fontWeight: "bold",
    fontSize: 8.5,
    letterSpacing: 0.3,
  },
  icPage: {
    backgroundColor: "#FFF",
    padding: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  icContainer: {
    width: "100%",
    height: 400,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    border: "2px dashed #ccc",
    borderRadius: 8,
  },
  icImage: {
    width: "90%",
    height: "90%",
    objectFit: "contain",
  },
  watermark: {
    position: "absolute",
    top: "40%",
    left: "10%",
    width: "80%",
    fontSize: 50,
    fontFamily: "Inter",
    fontWeight: "bold",
    color: "red",
    opacity: 0.3,
    transform: "rotate(-45deg)",
    textAlign: "center",
  },
});

function agentInitial(email?: string | null) {
  const e = String(email ?? "").trim();
  if (!e) return "";
  return e.slice(0, 3).toUpperCase();
}

function diffDays(startIso: string, endIso: string) {
  const a = new Date(startIso).getTime();
  const b = new Date(endIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  return Math.ceil((b - a) / (24 * 60 * 60 * 1000));
}

export function AgreementPdf({ data }: { data: AgreementPdfData }) {
  const durationDays =
    data.date_start && data.date_end
      ? diffDays(data.date_start, data.date_end)
      : 0;
  const mid = Math.ceil(TERMS.length / 2);
  const left = TERMS.slice(0, mid);
  const right = TERMS.slice(mid);
  const depositText =
    Number(data.deposit_price || "0") > 0
      ? `The deposit of RM ${data.deposit_price} will be refundable within 7 working days from return date.`
      : `The deposit is RM ${data.deposit_price}.`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.topLogoWrap}>
          <Image style={styles.logo} src={`${BASE_URL}/logo.png`} />
        </View>
        <Text style={styles.title}>JRV RENTAL AGREEMENT</Text>
        <View style={styles.kv}>
          <Text style={styles.kvLine}>
            RENTER: <Text style={styles.kvValue}>{data.customer_name}</Text>
          </Text>
          <Text style={styles.kvLine}>
            IDENTIFICATION: <Text style={styles.kvValue}>{data.id_number}</Text>
          </Text>
          <Text style={styles.kvLine}>
            CAR TYPE: <Text style={styles.kvValue}>{data.car_type}</Text>
          </Text>
          <Text style={styles.kvLine}>
            NUMBER PLATE:{" "}
            <Text style={styles.kvValue}>{data.plate_number}</Text>
          </Text>
          <Text style={styles.kvLine}>
            RESERVATION DATE:{" "}
            <Text style={styles.kvValue}>
              {data.date_start} – {data.date_end}
            </Text>
          </Text>
        </View>
        <Text style={styles.para}>
          The current agreement is presented for the rental of {data.car_type}{" "}
          with registration number of {data.plate_number}. The price for{" "}
          {durationDays} day(s) is RM {data.total_price}. {depositText}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>TERMS & CONDITIONS</Text>
        <View style={styles.termsGrid}>
          <View style={styles.termsCol}>
            {left.map((t, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{t}</Text>
              </View>
            ))}
          </View>
          <View style={styles.termsCol}>
            {right.map((t, i) => (
              <View key={i} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.signatures}>
          <View style={styles.sigCol}>
            {data.agent_email ? (
              <Text style={styles.sigText}>
                {agentInitial(data.agent_email)}
              </Text>
            ) : null}
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>AGENT SIGNATURE</Text>
          </View>
          <View style={styles.sigCol}>
            {data.agent_email ? (
              <Text style={styles.sigText2}>
                {agentInitial(data.agent_email)}
              </Text>
            ) : null}
            <View style={styles.sigLine} />
            <Text style={styles.sigLabel}>CLIENT SIGNATURE</Text>
          </View>
        </View>
      </Page>

      {/* Second Page: IC Image */}
      {data.ic_url && (
        <Page size="A4" style={styles.icPage}>
          <Text style={styles.title}>CUSTOMER IDENTIFICATION</Text>
          <View style={styles.icContainer}>
            <Image src={data.ic_url} style={styles.icImage} />
            <Text style={styles.watermark}>JRV USE ONLY</Text>
          </View>
          <Text style={[styles.para, { marginTop: 20 }]}>
            This document is strictly for internal use by JRV Global Services.
          </Text>
        </Page>
      )}
    </Document>
  );
}
