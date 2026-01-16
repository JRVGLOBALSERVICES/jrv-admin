// Complete manual content extracted from markdown
export interface ManualSection {
  id: string;
  number: number;
  title: string;
  content: string;
}

export const manualContent: ManualSection[] = [
  {
    id: 'dashboard',
    number: 1,
    title: 'Dashboard Overview',
    content: `
![Dashboard](/images/dashboard_alert_modal_1768550515584.png)

The Dashboard is the central hub of the JRV Admin system, providing real-time insights and quick access to critical functions.

### Key Metrics Displayed:

**Financial Overview**:

- **Total Revenue**: Real-time revenue tracking
- **Pending Payments**: Outstanding amounts
- **Monthly Growth**: Percentage change vs. previous period

**Operational Metrics**:

- **Active Rentals**: Current ongoing agreements
- **Available Cars**: Fleet availability status
- **Maintenance Due**: Vehicles requiring service

**Customer Insights**:

- **New Customers**: Recent registrations
- **Returning Customers**: Loyalty metrics
- **Customer Satisfaction**: Rating average

### Quick Actions:

The dashboard provides one-click access to:

- Create new agreement
- Add new customer
- Register new vehicle
- Schedule maintenance
- View pending tasks

### Alert System:

The dashboard features an intelligent alert system that notifies admins of:

- Agreements expiring within 48 hours
- Vehicles due for maintenance
- Insurance renewals needed
- Overdue payments
- Low fuel/mileage alerts

**Alert Modal Features**:

- Priority indicators (High, Medium, Low)
- Direct action buttons
- Dismiss or snooze options
- Detailed information on click

---
`
  },
  {
    id: 'revenue',
    number: 2,
    title: 'Revenue Management',
    content: `
![Revenue Page](/images/revenue_page_deep_1768551134134.webp)

The Revenue page provides comprehensive financial tracking and reporting capabilities.

### Revenue Dashboard Features:

**Time Period Filters**:

- Today
- This Week
- This Month
- This Year
- Custom Date Range

**Revenue Breakdown**:

- **Rental Income**: Core rental revenue
- **Additional Services**: GPS, child seats, insurance upgrades
- **Late Fees**: Penalty charges
- **Fuel Charges**: Refueling costs
- **Damage Charges**: Repair costs

**Payment Status Tracking**:

- **Paid**: Completed transactions (green indicator)
- **Pending**: Awaiting payment (yellow indicator)
- **Overdue**: Late payments (red indicator)
- **Refunded**: Returned payments (blue indicator)

### Revenue Analytics:

**Charts and Visualizations**:

- Daily revenue trends
- Month-over-month comparison
- Revenue by car category
- Payment method distribution
- Branch performance comparison

**Export Options**:

- Export to Excel
- Generate PDF report
- Email report to stakeholders
- Schedule automated reports

### Payment Management:

**Actions Available**:

- Mark as paid
- Send payment reminder
- Process refund
- Apply discount
- Add late fee

---
`
  },
  {
    id: 'agreements',
    number: 3,
    title: 'Agreements Management',
    content: `
![Agreements Page](/images/agreements_top_filters_1768551256841.png)

The Agreements page manages all rental contracts and bookings.

### Agreement Status Types:

**Active Agreements**:

- Currently ongoing rentals
- Real-time tracking
- Modification options available

**Pending Agreements**:

- Future bookings
- Awaiting confirmation
- Can be edited or cancelled

**Completed Agreements**:

- Historical records
- Final invoices generated
- Customer feedback collected

**Cancelled Agreements**:

- Cancelled bookings
- Cancellation reason tracked
- Refund status visible

### Agreement Details:

Each agreement contains:

**Customer Information**:

- Full name and contact details
- IC/Passport number
- License verification status
- Blacklist check status

**Rental Details**:

- Pick-up date, time, and location
- Return date, time, and location
- Car model and registration number
- Rental duration (days/hours)

**Financial Information**:

- Base rental rate
- Additional services
- Deposit amount
- Total cost
- Payment status

**Additional Services**:

- GPS navigation
- Child seat
- Additional driver
- Insurance upgrade
- Fuel prepayment

### Agreement Actions:

**Modify Agreement**:

- Extend rental period
- Change vehicle (if available)
- Add/remove services
- Update contact information

**Process Return**:

- Record return time
- Inspect vehicle condition
- Calculate final charges
- Process payment
- Generate invoice

**Cancel Agreement**:

- Select cancellation reason
- Calculate refund amount
- Update availability
- Notify customer

### Filtering and Search:

**Filter Options**:

- Status (Active, Pending, Completed, Cancelled)
- Date range
- Car model
- Branch location
- Payment status
- Customer name

**Search Capabilities**:

- Agreement ID
- Customer name
- IC/Passport number
- Car registration number
- Phone number

---
`
  },
  {
    id: 'blacklist',
    number: 4,
    title: 'Blacklist Manager',
    content: `
![Blacklist Manager](/images/blacklist_manager_page_1768551322918.png)

The Blacklist Manager helps prevent rentals to problematic customers.

### Blacklist Entry Information:

**Customer Details**:

- Full name
- IC/Passport number
- Phone number
- Email address
- Previous rental history

**Blacklist Reason**:

- Late payment/Non-payment
- Vehicle damage
- Traffic violations
- Fraudulent documents
- Rude behavior
- Other (with notes)

**Severity Level**:

- **High**: Permanent ban
- **Medium**: Temporary restriction (with expiry date)
- **Low**: Warning only (can rent with approval)

### Blacklist Actions:

**Add to Blacklist**:

1. Enter customer IC/Passport number
2. Select reason from dropdown
3. Set severity level
4. Add detailed notes
5. Upload supporting documents (optional)
6. Set expiry date (for temporary bans)
7. Save entry

**Remove from Blacklist**:

1. Search for customer
2. Review blacklist history
3. Add removal reason
4. Confirm removal
5. Customer can now rent again

**Automatic Checks**:

- System automatically checks blacklist during booking
- Alerts appear if customer is blacklisted
- Prevents agreement creation for high-severity entries
- Requires manager approval for medium-severity entries

### Blacklist Reports:

- Total blacklisted customers
- Blacklist by reason breakdown
- Expiring temporary bans
- Recent additions/removals

---
`
  },
  {
    id: 'fleet',
    number: 5,
    title: 'Fleet Management',
    content: `
### 5.1 Cars

![Cars Fleet](/images/catalog_list_view_1768552278459.png)

The Cars section manages the entire vehicle fleet.

#### Car Information:

**Basic Details**:

- Registration number
- Make and model
- Year of manufacture
- Color
- Transmission type (Auto/Manual)
- Fuel type (Petrol/Diesel/Hybrid/Electric)
- Seating capacity

**Status Indicators**:

- **Available**: Ready for rental (green)
- **Rented**: Currently on rental (blue)
- **Maintenance**: Under service (yellow)
- **Out of Service**: Not available (red)

**Rental Information**:

- Daily rental rate
- Weekly rate
- Monthly rate
- Deposit amount
- Mileage limit
- Fuel policy

**Vehicle Specifications**:

- Engine capacity
- Horsepower
- Features (GPS, Bluetooth, etc.)
- Safety features
- Fuel efficiency

#### Car Actions:

**Add New Car**:
![Add Model Form](/images/add_model_form_1768552296697.png)

1. Click "+ Add Car"
2. Enter registration number
3. Select make and model from catalog
4. Set rental rates
5. Upload car photos
6. Add features and specifications
7. Set initial status
8. Save vehicle

**Edit Car**:

- Update rental rates
- Change status
- Modify features
- Update photos
- Edit specifications

**View Car History**:

- Rental history
- Maintenance records
- Revenue generated
- Customer feedback
- Incident reports

**Deactivate Car**:

- Mark as out of service
- Specify reason
- Set expected return date
- Update availability

---

### 5.2 Maintenance

![Maintenance Dashboard](/images/maintenance_dashboard_top_1768551768547.png)

The Maintenance section tracks all vehicle servicing and repairs.

#### Maintenance Types:

**Scheduled Maintenance**:

- Regular servicing (every 5,000 km or 6 months)
- Oil change
- Tire rotation
- Brake inspection
- Air filter replacement

**Unscheduled Maintenance**:

- Breakdown repairs
- Accident damage
- Customer-reported issues
- Wear and tear repairs

**Inspections**:

- Pre-rental inspection
- Post-rental inspection
- Annual roadworthiness test
- Insurance inspection

#### Maintenance Record:

![Maintenance Edit Modal](/images/maintenance_edit_modal_1768551802996.png)

**Each maintenance entry includes**:

- Vehicle registration number
- Maintenance type
- Service date
- Mileage at service
- Service provider
- Cost breakdown
- Parts replaced
- Next service due date
- Notes and observations

#### Maintenance Actions:

**Schedule Maintenance**:

1. Select vehicle
2. Choose maintenance type
3. Set service date
4. Select service provider
5. Estimate cost
6. Update car status to "Maintenance"
7. Save schedule

**Record Completed Maintenance**:

1. Open scheduled maintenance
2. Enter actual cost
3. Upload invoice
4. List parts replaced
5. Set next service date
6. Update car status to "Available"
7. Save record

**Maintenance Alerts**:

- Vehicles due for service (based on mileage or date)
- Overdue maintenance
- Warranty expiration
- Parts replacement needed

---

### 5.3 Insurance

![Insurance Page](/images/insurance_page_deep_1768551890811.webp)

The Insurance section manages all vehicle insurance policies.

#### Insurance Information:

**Policy Details**:

- Policy number
- Insurance provider
- Policy type (Comprehensive/Third Party)
- Coverage amount
- Start date
- Expiry date
- Premium amount
- Payment frequency

**Coverage Details**:

- Accident damage
- Theft protection
- Third-party liability
- Personal accident cover
- Windscreen protection
- Roadside assistance

**Claim Information**:

- Claim number
- Claim date
- Incident description
- Claim amount
- Claim status
- Settlement amount

#### Insurance Actions:

**Add Insurance Policy**:

1. Select vehicle
2. Enter policy number
3. Choose insurance provider
4. Set coverage type
5. Enter premium amount
6. Set start and expiry dates
7. Upload policy document
8. Save policy

**Renew Insurance**:

1. Select expiring policy
2. Update policy number (if changed)
3. Enter new premium
4. Set new expiry date
5. Upload renewed policy
6. Save renewal

**File Insurance Claim**:

1. Select vehicle and policy
2. Enter incident details
3. Upload photos/reports
4. Submit claim to insurer
5. Track claim status
6. Record settlement

**Insurance Alerts**:

- Policies expiring within 30 days
- Overdue renewals
- Pending claims
- Settlement received

---
`
  },
  {
    id: 'catalog',
    number: 6,
    title: 'Catalog Management',
    content: `
![Catalog Selection](/images/new_car_catalog_selection_1768552426575.png)

The Catalog manages the master list of car makes and models available for rental.

### Catalog Structure:

**Car Makes**:

- Perodua
- Proton
- Toyota
- Honda
- Nissan
- Mazda
- Other brands

**Car Models** (per make):

- Model name
- Category (Economy, Compact, Sedan, SUV, MPV, Luxury)
- Typical seating capacity
- Transmission options
- Fuel type options
- Standard features

### Catalog Actions:

**Add New Model to Catalog**:

1. Click "+ Add Model"
2. Select car make
3. Enter model name
4. Choose category
5. Set specifications
6. Upload model image
7. Add standard features
8. Save to catalog

**Edit Catalog Entry**:

- Update model information
- Change category
- Modify standard features
- Update model image

**Deactivate Model**:

- Mark as discontinued
- Prevents selection for new cars
- Existing cars remain unaffected

### Catalog Usage:

When adding a new car to the fleet:

1. Select make from catalog
2. Select model from filtered list
3. System auto-fills specifications
4. Admin can override defaults
5. Ensures consistency across fleet

---
`
  },
  {
    id: 'marketing',
    number: 7,
    title: 'Marketing Tools',
    content: `
### 7.1 AI Studio

![AI Studio](/images/ai_studio_main_page_1768552515794.png)

The AI Studio uses artificial intelligence to generate marketing content.

#### AI Image Generation:

**Purpose**: Create custom car rental promotional images

**How to Generate Images**:

1. Navigate to AI Studio > Generate Image
2. Enter descriptive prompt:
   - Example: "Proton X50 parked at KLIA airport terminal, sunset lighting, professional photography"
3. Select image style:
   - Photorealistic
   - Artistic
   - Minimalist
4. Choose aspect ratio:
   - Square (1:1) - for Instagram
   - Landscape (16:9) - for Facebook
   - Portrait (9:16) - for Stories
5. Click "Generate"
6. Wait 10-30 seconds for AI processing
7. Review generated image
8. Regenerate if needed
9. Save to Marketing Assets

**Best Practices for Prompts**:

- Be specific about car model and location
- Mention lighting conditions (sunset, golden hour, studio)
- Include style keywords (professional, premium, lifestyle)
- Specify environment (urban, highway, airport, beach)

#### AI Post Generation:

**Purpose**: Create social media post captions and content

**How to Generate Posts**:

1. Navigate to AI Studio > Generate Post
2. Select post type:
   - Promotional offer
   - New car announcement
   - Customer testimonial
   - Seasonal campaign
   - Event coverage
3. Enter key details:
   - Car model (if applicable)
   - Promotion details
   - Target audience
   - Tone (Professional, Casual, Exciting)
4. Select language:
   - Bahasa Melayu
   - English
   - Both
5. Click "Generate"
6. Review generated content
7. Edit as needed
8. Save to Marketing Assets or post directly

**Generated Content Includes**:

- Main caption text
- Hashtags
- Call-to-action
- Emoji suggestions

---

### 7.2 Marketing Assets

![Marketing Assets](/images/marketing_asset_library_1768553075740.png)

The Marketing Assets library stores all generated and uploaded marketing content.

#### Asset Types:

**Images**:

- AI-generated car photos
- Promotional banners
- Social media graphics
- Event photos
- Customer testimonials

**Text Content**:

- Post captions
- Ad copy
- Email templates
- SMS messages

**Videos**:

- Promotional videos
- Car walkarounds
- Customer testimonials
- Event coverage

#### Asset Management:

**Asset Information**:

- Asset type badge (Image/Text/Video)
- Creation date
- Dimensions/Duration
- File size
- Usage count
- Tags

**Actions Available**:

- **View**: Preview asset
- **Download**: Save to computer
- **Edit**: Modify asset
- **Use**: Post to social media
- **Delete**: Remove from library

**Organization Features**:

- Search by keyword
- Filter by type
- Filter by date
- Sort by usage
- Tag management

**Usage Tracking**:

- Where asset was used
- Performance metrics
- Engagement stats
- ROI tracking

---

### 7.3 Facebook Posts

![Facebook Posts](/images/facebook_posts_list_1768553131447.png)

Manage Facebook content directly from the admin panel.

#### Facebook Post Management:

**Post List View**:

- Post date
- Post type (Photo, Video, Link, Text)
- Content preview
- Engagement metrics (Likes, Comments, Shares)
- Status (Published, Scheduled, Draft)

**Import from Facebook**:
![New Post Modal](/images/facebook_new_post_modal_1768553167183.png)

1. Click "Import from FB"
2. System fetches recent posts
3. Select posts to import
4. Posts saved to database
5. Can be reused or edited

**Create New Post**:

1. Click "+ New Post"
2. Enter post title (internal reference)
3. Paste Facebook post URL (for importing)
4. Select post type:
   - Facebook Post
   - Facebook Reel
5. Add description
6. System extracts cover image automatically
7. Save post

**Edit Existing Post**:

- Update title
- Change description
- Replace cover image
- Modify post type

**Post Actions**:

- **Preview**: See how post appears
- **Edit**: Modify post details
- **Delete**: Remove from database

---

### 7.4 Instagram Posts

![Instagram Posts](/images/instagram_posts_list_1768553336073.png)

Manage Instagram content and track performance.

#### Instagram Post Management:

**Post List View**:

- Post date
- Post type (Post/Reel)
- Caption preview
- Engagement metrics
- Status

**Import from Instagram**:

1. Click "Import from IG"
2. System syncs with Instagram
3. Fetches recent posts
4. Select posts to import
5. Posts saved with metadata

**Create New Post**:
![Instagram New Post](/images/instagram_new_post_modal_1768553352588.png)

1. Click "+ New Post"
2. Enter title (internal reference)
3. Paste Instagram post URL
4. Select type (Post/Reel)
5. Add description/caption
6. System extracts cover image
7. Save post

**Post Details**:

- Caption text
- Hashtags used
- Location tag
- Tagged accounts
- Engagement metrics
- Post URL

**Post Actions**:

- **Preview**: View post
- **Edit**: Update details
- **Delete**: Remove from database
- **Repost**: Share again

---
`
  },
  {
    id: 'landing',
    number: 8,
    title: 'Landing Pages',
    content: `
![Landing Pages List](/images/landing_pages_list_1768553397383.png)

Landing Pages are SEO-optimized pages for specific locations and car models.

### Landing Page Structure:

**Page Types**:

- Location pages (e.g., KLIA/KLIA2, Seremban, Port Dickson)
- Car model pages (e.g., Myvi, Bezza, Vios)
- Service pages (e.g., Economy Car Rental, Monthly Rental)

**Page Status**:

- **Active**: Live and accessible
- **Inactive**: Created but not published
- **Deleted**: Soft-deleted, can be restored

### Landing Page Editor:

![Landing Page Edit](/images/landing_page_edit_top_1768553659889.png)

#### Page Configuration:

**Slug (URL)**:

- Permanent URL identifier
- Example: \`/kereta-sewa-klia-klia2\`
- SEO-friendly format

**Menu Label**:

- Display name in navigation
- Example: "KLIA / KLIA2"

**Category**:

- Location
- Make (car brand)
- Service type

**Auto-fill Content & Images** 🤖:

- AI-powered feature
- Analyzes slug and category
- Generates SEO-optimized content
- Creates image prompts
- Works for both languages
- Saves hours of manual work

#### Visual Assets (Max 3):

**AI Image Generation**:

- Enter descriptive prompt
- Click "Generate Image"
- AI creates custom image
- Can regenerate if needed
- Images auto-optimized

**Direct Image URL**:

- Use existing images
- Paste Cloudinary URL
- Override AI generation

**Image Preview**:

- Shows final appearance
- Ensures proper sizing

#### Page Content (Multilingual):

![Page Content](/images/landing_page_edit_content_bm_1768553692511.png)

**Language Tabs**:

- Bahasa Melayu
- English
- Independent content management

**SEO Fields**:

**Page Title (Meta Title)**:

- Browser tab title
- Search result title
- 50-60 characters optimal
- Include keywords

**Meta Description**:

- Search result snippet
- 150-160 characters
- Compelling CTA
- Affects click-through rate

**Content Fields**:

**H1 Heading**:

- Main page title
- Visible to users
- One per page (SEO best practice)

**Intro Text**:

- Opening paragraph
- 2-3 sentences
- Engages readers

**CTA Text & Link**:

- Button label (e.g., "Tempah Sekarang")
- Destination URL (WhatsApp link)
- Primary conversion point

**Body Content (RAW JSON)**:

- Structured data format
- Define multiple sections
- "Why Choose Us"
- Feature lists
- Testimonials
- FAQ sections
- Front-end renders dynamically

### Creating a New Landing Page:

1. Click "Create New Page"
2. Enter slug (URL path)
3. Set status to "Active"
4. Enter menu label
5. Select category
6. Click "Auto-fill Content & Images" 🤖
7. Review generated content
8. Adjust as needed
9. Add/generate images
10. Save page

### SEO Benefits:

- Proper meta tags
- Structured content
- Mobile-responsive
- Fast loading
- Keyword optimization
- Local SEO targeting

---
`
  },
  {
    id: 'analytics',
    number: 9,
    title: 'Traffic Analytics',
    content: `
![Traffic Analytics](/images/traffic_analytics_top_1768553838837.png)

Traffic Analytics provides Google Analytics-style insights into website performance.

### Top Metrics Dashboard:

#### Real-Time Metrics:

**Active Users (5M)**:

- Users active in last 5 minutes
- Real-time engagement
- Monitor campaign launches

**Unique Users (125)**:

- Distinct visitors
- Percentage change vs. previous period
- Audience growth tracking

**Returning Users (6)**:

- Previous visitors returning
- Brand loyalty indicator
- Normal to be lower for rentals

**Page Views (623)**:

- Total pages viewed
- Overall site activity
- Engagement indicator

**WhatsApp Clicks (5)**:

- Direct conversion tracking
- Primary lead generation
- High-intent actions

**Phone Calls (2)**:

- Phone number clicks
- Secondary conversion
- Often high-intent customers

**Conversions (102)**:

- Total conversion events
- Most important metric
- Directly tied to revenue

### Traffic Distribution:

![Traffic Sources](/images/traffic_analytics_bottom_sections_1768553868400.png)

**Traffic Sources**:

- **Google Ads**: Paid traffic
- **Search Partners**: Extended network
- **Google Organic**: Free search traffic
- **Facebook**: Social traffic
- **Instagram**: Social traffic
- **TikTok**: Social traffic
- **Direct**: URL typing/bookmarks

**Ads Campaigns**:

- Campaign ID links
- Conversion counts
- Performance indicators
- ROI tracking

### Content Performance:

**Top Models**:

- Most viewed car models
- Perodua Bezza (17 views)
- Perodua Myvi G3
- Toyota Vios
- Proton Exora
- Honda Civic
- Direct "EDIT" links for quick updates

**Top Pages**:

- Most visited pages
- Homepage
- Seremban location
- KLIA/KLIA2 airport
- Economy Car Rental
- Model-specific pages

### User Engagement:

**Event Actions**:

- **page_view** (5,234): Page loads
- **scroll** (3,891): Content engagement
- **consent_rejected/granted**: Cookie tracking
- **car_image_click**: Visual interest
- **whatsapp_click** (892): Conversions
- **phone_click** (234): Call actions
- **location_consent_granted**: GPS permissions

**Traffic Referrers**:

- Google (primary)
- Direct traffic
- Yahoo search
- Bing search
- Referring websites

### Geographic Analytics:

**Top Regions**:

- Selangor (highest)
- Kuala Lumpur
- Negeri Sembilan
- Kelantan
- Melaka
- Johor
- Pahang

**Top Cities (GPS)**:

- Kuala Lumpur
- Shah Alam
- Petaling Jaya
- Cyberjaya
- Putrajaya
- Seremban

**Device Breakdown**:

- Mobile: 89%
- Desktop: 11%
- Mobile-first design critical

**Top ISPs**:

- Maxis
- Digi
- TM Technology
- U Mobile
- Celcom

### Recent Visitor Sessions:

![Live Sessions](/images/traffic_analytics_live_locations_1768553891372.png)

**Session Information**:

- Time of visit
- Location (City, State)
- Device type
- New vs. Returning
- Traffic source (Paid/Organic/Direct)
- Campaign ID (for paid)
- Number of actions
- Entry page
- Session duration
- "DETAILS →" link

### Session Timeline Detail:

![Session Detail](/images/session_detail_modal_1768553960677.png)

**Session Header**:

- Session ID
- Footprint count
- IP address
- Device type
- Location details
- Traffic source

**Timeline Events**:

**Page Views**:

- Timestamp
- Page name
- URL path
- Duration

**Scroll Tracking**:

- 25% scroll: Started reading
- 50% scroll: Engaged
- 75% scroll: Deep engagement
- 100% scroll: Read entire page

**Interactions**:

- CTA clicks
- WhatsApp clicks
- Car image clicks
- Phone clicks

**Conversions**:

- Highlighted events
- Exact conversion moment
- Triggering element

### Live Exact Locations:

**Real-time Geographic Tracking**:

- Exact timestamp
- City/Region
- Verified physical address
- Example: "Jl. KHA, Jl Seri Setia, 43300 Seri Kembangan, Selangor"

**Business Value**:

- Identify high-demand areas
- Plan new branch locations
- Understand customer proximity
- Optimize service coverage

### Analytics Insights:

**Data-Driven Decisions**:

- Identify best ROI channels
- Understand customer journey
- Optimize landing pages
- Allocate budget effectively

**Real-Time Monitoring**:

- Track campaign performance
- Identify issues quickly
- Respond to traffic changes
- Monitor competitors

**Conversion Optimization**:

- See exact conversion points
- Identify friction points
- Test different CTAs
- Improve conversion rate

**Geographic Targeting**:

- Focus on high-performing regions
- Identify expansion opportunities
- Understand local preferences
- Optimize for mobile carriers

---

## Conclusion

The JRV Admin System provides comprehensive tools for managing all aspects of a car rental business, from fleet management to marketing automation. The integration of AI-powered features significantly reduces manual work while maintaining high-quality output.

### Key Benefits:

**Operational Efficiency**:

- Centralized management
- Real-time updates
- Automated workflows
- Reduced manual errors

**Marketing Automation**:

- AI content generation
- Social media integration
- SEO optimization
- Performance tracking

**Data-Driven Insights**:

- Real-time analytics
- Customer behavior tracking
- Revenue optimization
- Geographic targeting

**Customer Experience**:

- Faster booking process
- Better communication
- Personalized service
- Improved satisfaction

For additional support or questions, please contact the JRV technical team.
`
  },
];
