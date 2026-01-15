
import React from 'react';
import ReactPDF, { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import path from 'path';

// Register a standard font
Font.register({
    family: 'Helvetica',
    fonts: [
        { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf' }, // Regular
        { src: 'https://fonts.gstatic.com/s/helveticaneue/v70/1Ptsg8zYS_SKggPNyC0IT4ttDfA.ttf', fontWeight: 'bold' }, // Bold (using same for now as fallback)
    ]
});

const styles = StyleSheet.create({
    page: {
        padding: 40,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
    },
    title: {
        fontSize: 28,
        marginBottom: 10,
        textAlign: 'center',
        color: '#111827',
    },
    subtitle: {
        fontSize: 14,
        marginBottom: 40,
        textAlign: 'center',
        color: '#6B7280',
    },
    sectionTitle: {
        fontSize: 20,
        marginTop: 25,
        marginBottom: 10,
        color: '#1F2937',
        borderBottom: '1px solid #E5E7EB',
        paddingBottom: 5,
    },
    text: {
        fontSize: 11,
        lineHeight: 1.5,
        color: '#374151',
        marginBottom: 8,
        textAlign: 'justify',
    },
    bulletPoint: {
        fontSize: 11,
        lineHeight: 1.5,
        color: '#374151',
        marginLeft: 15,
        marginBottom: 4,
    },
    imageContainer: {
        marginVertical: 15,
        alignItems: 'center',
        border: '1px solid #E5E7EB',
        borderRadius: 4,
        padding: 5,
        backgroundColor: '#F9FAFB',
    },
    screenshot: {
        width: '100%',
        height: 300,
        objectFit: 'contain',
    },
    caption: {
        fontSize: 9,
        color: '#6B7280',
        marginTop: 5,
        textAlign: 'center',
        fontStyle: 'italic',
    }
});

// Manual Content Data
const manualSections = [
    {
        title: "1. Dashboard Overview",
        image: "01_dashboard.png",
        content: [
            "The Dashboard serves as the command center for the entire JRV Admin system. It provides a high-level snapshot of critical business metrics.",
            "**Key Features:**",
            "- **Financial Summary Cards**: Real-time display of Total Revenue, Active Agreements, and Outstanding Payments.",
            "- **Urgent Alerts**: A notification banner (dismissible) highlights overdue returns or critical maintenance needs immediately upon login.",
            "- **Analytics Preview**: A mini-chart showing website traffic trends for the last 7 days."
        ]
    },
    {
        title: "2. Revenue Management",
        image: "02_revenue.png",
        content: [
            "Navigate to this page via the 'Revenue' sidebar item. This module tracks financial performance.",
            "**Functionality:**",
            "- **Revenue Charts**: Visual bar charts comparing monthly revenue year-over-year.",
            "- **Top Performers**: A list of the highest-revenue generating vehicles.",
            "- **Export Data**: 'Download CSV' button allows you to export raw financial data for external accounting."
        ]
    },
    {
        title: "3. Fleet Management (Cars)",
        image: "05_cars.png",
        content: [
            "The central hub for managing your vehicle inventory. Frontend Impact: Changes here directly update the 'Cars' listing page.",
            "**Key Actions:**",
            "- **Add New Car**: Click '+ New Car' to open the creation wizard.",
            "- **Search & Filter**: Use the search bar to find cars by plate or model. Filter by status (Available/Rented).",
            "- **Edit Vehicle**: Click on any row to modify details, pricing, or upload new images.",
            "- **Availability Toggle**: The 'Active' toggle instantly shows/hides a car from the public website."
        ]
    },
    {
        title: "4. Agreements & Bookings",
        image: "03_agreements.png",
        content: [
            "Manage all customer rentals here. This ensures legal compliance and tracks vehicle possession.",
            "**Workflow:**",
            "- **Create Agreement**: Click '+ New Agreement' to start a rental. Select a customer and vehicle.",
            "- **Status Tracking**: Agreements move from 'Draft' -> 'Active' -> 'Completed'.",
            "- **PDF Generation**: Click the 'PDF' icon on any row to generate and download the official signed contract.",
            "- **WhatsApp Reminders**: Use the 'WhatsApp' icon to send an instant return reminder to the client."
        ]
    },
    {
        title: "5. Fleet Maintenance",
        image: "06_maintenance.png",
        content: [
            "A proactive system to keep your fleet road-worthy and safe.",
            "**Features:**",
            "- **Mileage Verification**: Click 'Update Odometer' to input the latest reading for any car.",
            "- **Service Status**: Color-coded indicators (Green/Yellow/Red) show the health of Oil, Tyres, and Brakes.",
            "- **Reset Service**: When maintenance is done, click the 'Reset' button on the specific component to restart its interval tracking."
        ]
    },
    {
        title: "6. Insurance & Road Tax",
        image: "07_insurance.png",
        content: [
            "Ensure all vehicles are legally compliant.",
            "**Overview:**",
            "- **Expiry Tracking**: Table lists all cars with their Insurance and Road Tax expiry dates.",
            "- **Urgency Sorting**: Defaults to showing the soonest-expiring items first.",
            "- **Renewal**: After renewing a policy, click the 'Edit' icon to update the dates. This automatically clears any overdue alerts."
        ]
    },
    {
        title: "7. Car Catalog",
        image: "08_catalog.png",
        content: [
            "The master database of vehicle makes and models. Use this to ensure data consistency.",
            "**Usage:**",
            "- **Standardization**: Create a 'Honda City' model once here, and select it from a dropdown when adding new cars.",
            "- **Specs Management**: Define standard specs (Engine, Seats, Transmission) for each model."
        ]
    },
    {
        title: "8. AI Marketing Studio",
        image: "09_marketing_ai.png",
        content: [
            "Generate marketing copy and visuals using AI.",
            "**Tools:**",
            "- **Caption Generator**: Input a car name and vibe (e.g., 'Luxury') to generate Instagram captions.",
            "- **Image Enhancer**: Upload a raw car photo to have AI improve lighting and background.",
            "- **Impact**: Use generated assets directly in the Facebook/Instagram modules."
        ]
    },
    {
        title: "9. Social Media (Facebook/Instagram)",
        image: "10_facebook.png",
        content: [
            "Manage your social presence directly from the admin panel.",
            "**Functions:**",
            "- **Post Scheduling**: Queue posts to be published at a later date.",
            "- **Sync**: 'Sync Feed' button pulls the latest live posts from your connected accounts to display on the frontend 'News' section.",
            "- **Frontend Impact**: Posts managed here appear on the public 'News & Promotions' page."
        ]
    },
    {
        title: "10. Landing Pages (SEO)",
        image: "12_landing_pages.png",
        content: [
            "Create specialized landing pages for SEO campaigns (e.g., 'Car Rental in KL').",
            "**Editor:**",
            "- **Rich Text Editor**: Write long-form content with headers and images.",
            "- **Slug Control**: Define custom URLs for better search engine ranking.",
            "- **Publishing**: 'Publish' button makes the page live at `jrv.com/pages/[slug]`."
        ]
    },
    {
        title: "11. Traffic Analytics",
        image: "13_traffic.png",
        content: [
            "Monitor how users interact with your public website.",
            "**Metrics:**",
            "- **Session Tracking**: View unique daily visitors.",
            "- **Event Log**: Track specific actions like 'Clicked WhatsApp' or 'Viewed Car'.",
            "- **Date Range**: Use the customized calendar to analyze traffic during specific campaigns."
        ]
    },
    {
        title: "12. User Blacklist",
        image: "04_blacklist.png",
        content: [
            "Risk management tool to prevent bad rentals.",
            "**Operation:**",
            "- **Add to Blacklist**: Enter an ID/Passport number and reason (e.g., 'Late Payment', 'Damaged Car').",
            "- **Automatic Check**: The 'New Agreement' form automatically checks this list and warns you if a customer is potential trouble."
        ]
    }
];

const ManualDocument = () => (
    <Document>
        <Page size="A4" style={styles.page}>
            <Text style={styles.title}>JRV Admin System Manual</Text>
            <Text style={styles.subtitle}>Comprehensive Guide v1.8.1</Text>
            <Text style={{ fontSize: 10, textAlign: 'center', marginBottom: 20, color: '#9CA3AF' }}>Generated on {new Date().toLocaleDateString()}</Text>

            {manualSections.map((section, index) => (
                <View key={index} wrap={false} style={{ marginBottom: 20 }}>
                    <Text style={styles.sectionTitle}>{section.title}</Text>

                    <View style={styles.imageContainer}>
                        {/* Note: In a real environment, verify paths are correct relative to execution */}
                        <Image
                            style={styles.screenshot}
                            src={path.join('/Users/raj/.gemini/antigravity/brain/35b3cc22-026e-40dd-b1c7-02a755b39b11', section.image)}
                        />
                        <Text style={styles.caption}>Figure {index + 1}: {section.title.split('. ')[1]}</Text>
                    </View>

                    {section.content.map((line, i) => {
                        if (line.startsWith('-')) {
                            // Render Bold text simply for now (simulated markdown parsing)
                            const cleanLine = line.replace('-', '').trim();
                            const parts = cleanLine.split('**');
                            return (
                                <Text key={i} style={styles.bulletPoint}>
                                    • {parts.map((part, pi) => pi % 2 === 1 ? <Text style={{ fontWeight: 'bold' }}>{part}</Text> : part)}
                                </Text>
                            )
                        } else if (line.startsWith('**')) {
                            return <Text key={i} style={[styles.text, { fontWeight: 'bold' }]}>{line.replace(/\*\*/g, '')}</Text>
                        }
                        return <Text key={i} style={styles.text}>{line}</Text>;
                    })}
                </View>
            ))}
        </Page>
    </Document>
);

const renderPDF = async () => {
    console.log("Generating PDF...");
    try {
        await ReactPDF.renderToFile(<ManualDocument />, '/Users/raj/Documents/Others/jrv-admin/JRV_Admin_Manual.pdf');
        console.log("✅ PDF Generated: JRV_Admin_Manual.pdf");
    } catch (error) {
        console.error("❌ PDF Generation Failed:", error);
    }
};

renderPDF();
