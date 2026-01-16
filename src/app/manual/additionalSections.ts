// Additional manual sections for introduction and conclusion
export const introductionSection = {
  id: "introduction",
  number: 0,
  title: "Introduction",
  content: `
### About This Manual

This comprehensive guide documents the JRV Global Services Admin Dashboard - a powerful system that directly controls your live customer website at **jrvservices.co**.

**Critical Understanding**: Every change you make in this admin system immediately affects what customers see and experience on your website. This integration ensures real-time updates and eliminates the need for separate website management.

### Public-Facing Content Management

The following admin pages control content that is **directly visible** to customers on jrvservices.co:

**Website Content**:
- **[Landing Pages](/admin/landing-pages)** - SEO-optimized location and car model pages
  - Example: jrvservices.co/kereta-sewa-klia
  - Status: Active pages are live immediately
  - Impact: Google search rankings, customer discovery

- **[Catalog Management](/admin/catalog)** - Car makes and models
  - Appears in: Website search filters, car listings
  - Impact: Customer browsing and filtering options

- **[Fleet - Cars](/admin/fleet/cars)** - Individual vehicle listings
  - Appears in: Available cars for booking
  - Impact: Real-time availability, pricing display
  - Rental rates set here show on website

**Marketing & Social**:
- **[Marketing Assets](/admin/marketing/assets)** - Images and content library
  - Used in: Website banners, promotions, social media
  - AI-generated content stored here

- **[Facebook Posts](/admin/marketing/facebook)** - Social media content
  - Synced with: Facebook business page
  - Impact: Brand consistency across platforms

- **[Instagram Posts](/admin/marketing/instagram)** - Instagram content
  - Synced with: Instagram business account
  - Impact: Social media presence

**Analytics & Tracking**:
- **[Traffic Analytics](/admin/analytics)** - Website visitor data
  - Tracks: All activity on jrvservices.co
  - Monitors: Conversions, page views, user behavior

### How Admin Changes Affect the Frontend Website

**Landing Pages** 🌐:
- When you create or edit a landing page in the admin, it is **instantly published** to jrvservices.co
- The slug you enter becomes the live URL (e.g., \`/kereta-sewa-klia\`)
- SEO metadata (titles, descriptions) directly impacts Google search rankings
- Active/Inactive status controls public visibility

**Catalog & Fleet** 🚗:
- Car models added to the catalog appear in website search filters
- Rental rates set in admin are displayed to customers
- Vehicle availability updates in real-time
- Car photos uploaded here show on the website

**Marketing Content** 📢:
- AI-generated images can be used across the website
- Social media posts created here maintain brand consistency
- Marketing assets are accessible for website campaigns

**Traffic Analytics** 📈:
- Tracks every visitor action on jrvservices.co
- Monitors conversion events (WhatsApp clicks, phone calls)
- Provides insights for optimizing the website
- Shows which pages and car models are most popular

### Who Should Use This Manual

- **Admin Staff**: Day-to-day operations and customer management
- **Marketing Team**: Content creation and campaign management
- **Management**: Analytics review and business insights
- **New Team Members**: Onboarding and training reference

### Manual Structure

This manual is organized into 11 sections covering all aspects of the admin system. Use the sidebar navigation to jump to specific sections, or use the search function to find specific topics.
`,
};

export const conclusionSection = {
  id: "conclusion",
  number: 10,
  title: "Summary & Best Practices",
  content: `
### System Overview

The JRV Admin System provides a centralized platform for managing all aspects of your car rental business with direct integration to your customer-facing website.

### Key Benefits

**Operational Efficiency**:
- Centralized management of all business operations
- Real-time updates across all systems
- Automated workflows reduce manual errors
- Streamlined communication with customers

**Marketing Automation**:
- AI-powered content generation saves hours of work
- Integrated social media management
- SEO optimization built into landing pages
- Performance tracking for data-driven decisions

**Data-Driven Insights**:
- Real-time analytics on customer behavior
- Revenue tracking and optimization
- Geographic targeting capabilities
- Conversion funnel analysis

**Enhanced Customer Experience**:
- Faster booking process
- Better communication channels
- Personalized service delivery
- Improved overall satisfaction

### Best Practices

**Daily Operations**:
1. Check dashboard alerts every morning
2. Review pending agreements and payments
3. Monitor vehicle availability and maintenance schedules
4. Respond to customer inquiries promptly

**Weekly Tasks**:
1. Review revenue reports and trends
2. Update car availability and pricing
3. Create and schedule social media content
4. Analyze traffic analytics for optimization opportunities

**Monthly Activities**:
1. Comprehensive revenue analysis
2. Fleet maintenance planning
3. Marketing campaign performance review
4. Customer satisfaction assessment

### Website Integration Checklist

Before making changes that affect the website:

✅ **Landing Pages**:
- Verify slug is SEO-friendly
- Check both language versions
- Test all links and CTAs
- Set correct status (Active/Inactive)

✅ **Catalog Updates**:
- Ensure accurate pricing
- Upload high-quality images
- Complete all specifications
- Verify availability status

✅ **Marketing Content**:
- Review AI-generated content for accuracy
- Maintain brand voice and tone
- Include proper calls-to-action
- Optimize for target audience

### Important Reminders

⚠️ **Active Landing Pages** are immediately live on jrvservices.co
⚠️ **Pricing changes** in admin reflect instantly on the website
⚠️ **Vehicle status** updates affect customer booking options
⚠️ **Blacklisted customers** are automatically blocked from booking

### Support & Training

For additional support, questions, or training:
- Contact the JRV technical team
- Refer to this manual for step-by-step guidance
- Use the search function to find specific topics quickly

### Continuous Improvement

This manual is a living document. As the system evolves and new features are added, this guide will be updated to reflect the latest capabilities and best practices.

**Remember**: Your actions in this admin system directly impact customer experience on jrvservices.co. Always double-check changes before saving, especially for public-facing content.
`,
};
