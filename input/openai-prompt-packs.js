// OpenAI Prompt Packs - 300+ Professional Prompts for All Roles
// Source: OpenAI Academy (https://academy.openai.com)
// Non-module JavaScript file for HTML/JS/CSS web applications

const openAIPromptPacks = {
  metadata: {
    version: "1.5.0",
    source: "OpenAI Academy",
    lastUpdated: "2025-09-30",
    totalPrompts: 306
  },

  categories: {
    // General Work Prompts - Any Role
    general: {
      name: "General Work",
      description: "Essential prompts for any professional role covering communication, meetings, problem-solving, and productivity",
      prompts: [
        // Communication & Writing
        {
          name: "Write Professional Email",
          shortDesc: "Craft clear, polite professional emails",
          content: "Write a professional email to [recipient]. The email is about [topic] and should be polite, clear, and concise. Provide a subject line and a short closing."
        },
        {
          name: "Rewrite for Clarity",
          shortDesc: "Simplify complex text for professional settings",
          content: "Rewrite the following text so it is easier to understand. The text will be used in a professional setting. Ensure the tone is clear, respectful, and concise. Text: [paste text]."
        },
        {
          name: "Adapt Message for Audience",
          shortDesc: "Tailor messages for different stakeholder groups",
          content: "Reframe this message for [audience type: executives, peers, or customers]. The message was originally written for [context]. Adjust tone, word choice, and style to fit the intended audience. Text: [paste text]."
        },
        {
          name: "Draft Meeting Invite",
          shortDesc: "Create structured meeting invitations",
          content: "Draft a meeting invitation for a session about [topic]. The meeting will include [attendees/roles] and should outline agenda items, goals, and preparation required. Provide the text in calendar-invite format."
        },
        {
          name: "Summarize Long Email",
          shortDesc: "Extract key points from email threads",
          content: "Summarize this email thread into a short recap. The thread includes several back-and-forth messages. Highlight key decisions, action items, and open questions. Email: [paste text]."
        },
        // Meetings & Collaboration
        {
          name: "Create Meeting Agenda",
          shortDesc: "Structure productive meeting agendas",
          content: "Create a structured agenda for a meeting about [topic]. The meeting will last [time] and include [attendees]. Break the agenda into sections with time estimates and goals for each section."
        },
        {
          name: "Summarize Meeting Notes",
          shortDesc: "Organize rough notes into structured recaps",
          content: "Summarize these meeting notes into a structured recap. The notes are rough and informal. Organize them into categories: key decisions, next steps, and responsibilities. Notes: [paste text]."
        },
        {
          name: "Create Action Items List",
          shortDesc: "Convert meeting notes to task lists",
          content: "Turn the following meeting notes into a clean task list. The tasks should be grouped by owner and include deadlines if mentioned. Notes: [paste text]."
        },
        {
          name: "Prep Meeting Questions",
          shortDesc: "Generate thoughtful meeting questions",
          content: "Suggest thoughtful questions to ask in a meeting about [topic]. The purpose of the meeting is [purpose]. Provide a list of at least 5 questions that show preparation and insight."
        },
        {
          name: "Draft Follow-up Email",
          shortDesc: "Write comprehensive meeting follow-ups",
          content: "Write a professional follow-up email after a meeting about [topic]. Include a recap of key points, assigned responsibilities, and next steps with deadlines. Use a clear and polite tone."
        },
        // Problem-Solving & Decisions
        {
          name: "Identify Root Cause",
          shortDesc: "Analyze workplace issues systematically",
          content: "Analyze the following workplace issue: [describe issue]. The context is that the problem has occurred multiple times. Identify possible root causes and suggest questions to confirm them."
        },
        {
          name: "Compare Options",
          shortDesc: "Evaluate multiple solution alternatives",
          content: "Compare the following two or more possible solutions: [list options]. The decision needs to be made in [timeframe]. Evaluate pros, cons, and potential risks for each option."
        },
        {
          name: "Define Decision Criteria",
          shortDesc: "Create frameworks for decision-making",
          content: "Help define clear decision-making criteria for [describe decision]. The context is that multiple stakeholders are involved. Provide a short list of weighted criteria to guide the choice."
        },
        {
          name: "Risk Assessment",
          shortDesc: "Evaluate potential plan risks",
          content: "Assess the potential risks of the following plan: [describe plan]. The plan is set to start on [date]. List risks by likelihood and impact, and suggest mitigation strategies."
        },
        {
          name: "Recommend Best Option",
          shortDesc: "Provide reasoned recommendations",
          content: "Based on the following background: [describe situation and options], recommend the most suitable option. Explain your reasoning clearly and suggest first steps for implementation."
        },
        // Organization & Productivity
        {
          name: "Prioritize Daily Tasks",
          shortDesc: "Create prioritized to-do lists",
          content: "Create a prioritized to-do list from the following tasks: [paste tasks]. The context is a typical workday with limited time. Suggest which tasks should be done first and why."
        },
        {
          name: "Create Weekly Plan",
          shortDesc: "Build balanced weekly schedules",
          content: "Build a weekly work plan for [describe role or situation]. The week includes deadlines, meetings, and individual focus time. Provide a balanced schedule with recommended priorities."
        },
        {
          name: "Summarize Long Document",
          shortDesc: "Extract key points from lengthy documents",
          content: "Summarize the following document into 5 key points and 3 recommended actions. The document is [type: report, plan, or notes]. Keep the summary concise and professional. Text: [paste document]."
        },
        {
          name: "Brainstorm Solutions",
          shortDesc: "Generate creative problem solutions",
          content: "Brainstorm potential solutions to the following workplace challenge: [describe challenge]. Provide at least 5 varied ideas, noting pros and cons for each."
        },
        {
          name: "Write Project Update",
          shortDesc: "Draft stakeholder project updates",
          content: "Draft a short project update for stakeholders. The project is [describe project]. Include progress made, current blockers, and next steps. Write in a professional, concise style."
        }
      ]
    },

    // Marketing
    marketing: {
      name: "Marketing",
      description: "Comprehensive marketing prompts for campaign planning, content creation, competitive research, and data analysis",
      prompts: [
        // Campaign Planning & Strategy
        {
          name: "Visualize Campaign Timeline",
          shortDesc: "Create multi-channel campaign timelines",
          content: "Build a timeline for our upcoming multi-channel campaign. Key dates and milestones are: [insert info]. Output as a horizontal timeline with phases, owners, and deadlines."
        },
        {
          name: "Brainstorm Campaign Ideas",
          shortDesc: "Generate creative campaign concepts",
          content: "Brainstorm 5 creative campaign ideas for our upcoming [event/launch]. The audience is [insert target], and our goal is [insert goal]. Include a theme, tagline, and 1-2 core tactics per idea."
        },
        {
          name: "Draft Creative Brief",
          shortDesc: "Structure comprehensive creative briefs",
          content: "Create a creative brief for our next paid media campaign. Here's the goal, audience, and offer: [insert info]. Include sections for objective, audience insights, tone, assets needed, and KPIs."
        },
        {
          name: "Build Messaging Framework",
          shortDesc: "Develop product messaging pillars",
          content: "Build a messaging framework for a new product. The product details are: [insert info]. Output a table with 3 pillars: key benefits, proof points, and emotional triggers."
        },
        {
          name: "Create Customer Journey Map",
          shortDesc: "Map comprehensive customer journeys",
          content: "Create a customer journey map for our [product/service]. Our typical customer is [insert profile]. Break it into stages, goals, touchpoints, and potential pain points per stage. Output as a table."
        },
        // Competitive & Market Research
        {
          name: "Competitive Content Analysis",
          shortDesc: "Analyze competitor content strategies",
          content: "Research how top 5 competitors structure their blog content strategy. Include tone, topics, frequency, SEO focus, and CTAs. Provide URLs, takeaways, and a table summarizing common and standout tactics."
        },
        {
          name: "Research Buyer Behavior Trends",
          shortDesc: "Investigate evolving buyer preferences",
          content: "Research 2024 trends in how [type] buyers research and evaluate [industry] products. Include behavior shifts, content preferences, and channel usage. Cite sources and format as a short briefing with bullet-point insights."
        },
        {
          name: "Research Regional Benchmarks",
          shortDesc: "Gather location-specific campaign metrics",
          content: "Research typical CTRs, CPCs, and conversion rates for digital campaigns targeting [location] in 2024. Focus on [ad channels]. Include source links and a table comparing each metric by country."
        },
        {
          name: "Analyze Event Competition",
          shortDesc: "Research competitor event strategies",
          content: "Compile a summary of how our competitors are participating in [insert upcoming event]. Include booth activations, speaking sessions, sponsorships, and media coverage. Output as a table with links and analysis."
        },
        {
          name: "Research Marketing AI Tools",
          shortDesc: "Evaluate marketing technology options",
          content: "Research the most recommended [tools] for marketers by function (e.g. copywriting, planning, analytics, design). Create a table with features, pricing, pros/cons, and primary use case. Include sources."
        },
        // Content & Creative Development
        {
          name: "Draft Product Launch Email",
          shortDesc: "Write compelling launch announcements",
          content: "Write a launch email for our new product. Use the following info about the product and target audience: [insert details]. Make it engaging and persuasive, formatted as a marketing email ready for review."
        },
        {
          name: "Generate Ad Copy Variations",
          shortDesc: "Create A/B test copy options",
          content: "Create 5 ad copy variations for a [channel] campaign. Here's the campaign theme and audience info: [insert context]. Each version should test a different hook or tone."
        },
        {
          name: "Create Social Post Series",
          shortDesc: "Develop multi-post social campaigns",
          content: "Draft a 3-post social media series promoting [event, product, or milestone]. Use this background for context: [paste details]. Each post should include copy and a suggested visual description."
        },
        {
          name: "Write Customer Spotlight",
          shortDesc: "Craft authentic success stories",
          content: "Write a customer spotlight post based on this success story: [paste key details]. Make it conversational, authentic, and aligned to our brand voice. Output as a LinkedIn post draft."
        },
        {
          name: "Create Explainer Video Script",
          shortDesc: "Script concise explainer videos",
          content: "Draft a script for a 60-second explainer video about [product/topic]. Here's what it should cover: [insert info]. Make it punchy and clear, with suggested visuals or animations."
        },
        // Data Analysis & Optimization
        {
          name: "Identify Top Marketing Channels",
          shortDesc: "Analyze channel ROI performance",
          content: "Analyze this marketing performance spreadsheet and identify which channels had the highest ROI. The file includes data from Q1–Q2 campaigns across email, social, paid search, and events. Summarize top 3 channels and create a chart showing ROI by channel."
        },
        {
          name: "Analyze Customer Churn",
          shortDesc: "Identify churn risk patterns",
          content: "Review this customer churn dataset and identify common characteristics of churned customers. Use columns like tenure, product usage, and support tickets to group insights. Output a short summary with a chart or table showing top risk factors."
        },
        {
          name: "Summarize Survey Results",
          shortDesc: "Extract insights from feedback data",
          content: "Summarize insights from this post-campaign customer feedback survey. The file includes satisfaction ratings and open-ended responses. Provide a 3-bullet executive summary and a chart of top satisfaction drivers."
        },
        {
          name: "Forecast Lead Volume",
          shortDesc: "Project future lead generation",
          content: "Use this historical lead volume data from the past 6 quarters to project expected lead volume for the next quarter. Highlight any trends, seasonal patterns, and output a simple forecast chart."
        },
        {
          name: "Optimize Budget Allocation",
          shortDesc: "Recommend budget redistribution",
          content: "Based on this spreadsheet of previous campaign spend and returns, recommend a revised budget allocation for next quarter. Focus on maximizing ROI while reducing spend on underperforming channels. Output as a table with new % allocations."
        },
        // Visual & Brand Communication
        {
          name: "Develop Brand Style Guide",
          shortDesc: "Outline comprehensive brand guidelines",
          content: "Create an outline for a brand style guide for [company/product]. Include sections for typography, color palette, logo usage, tone of voice, imagery style, and do's/don'ts."
        },
        {
          name: "Conceptualize Visual Stories",
          shortDesc: "Create narrative-driven visuals",
          content: "Brainstorm 3 visual storytelling concepts for a brand campaign on [theme]. Include a concept name, visual style, and key narrative elements (e.g., story arc, mood, colors)."
        },
        {
          name: "Create Campaign Moodboard",
          shortDesc: "Design visual inspiration boards",
          content: "Create a moodboard with 4 visuals for our [campaign or brand update]. Theme is [describe theme], and the tone should be [describe tone]. Use photoreal or illustrated style."
        },
        {
          name: "Evaluate Brand Consistency",
          shortDesc: "Audit brand alignment across assets",
          content: "Review the following marketing assets [insert links/files] and evaluate brand consistency in terms of tone, visuals, and messaging. Provide 3 strengths and 3 gaps with recommendations."
        },
        {
          name: "Refresh Brand Identity",
          shortDesc: "Propose brand evolution concepts",
          content: "Suggest 3 creative directions to refresh our brand identity. Include possible color palettes, typography styles, visual motifs, and tone updates that align with [audience/market shift]."
        }
      ]
    },

    // Sales
    sales: {
      name: "Sales",
      description: "Sales-focused prompts for outreach, strategy, competitive intelligence, and performance analysis",
      prompts: [
        // Outreach & Communication
        {
          name: "Personalized Cold Outreach",
          shortDesc: "Craft compelling cold emails",
          content: "Write a short, compelling cold email to a [job title] at [company name] introducing our product. Use the background below to customize it. Background: [insert value props or ICP info]. Format it in email-ready text."
        },
        {
          name: "Rework Demo Follow-up",
          shortDesc: "Enhance post-demo communications",
          content: "Rewrite this follow-up email after a demo to sound more consultative. Original email: [paste here]. Include recap, next steps, and call scheduling CTA. Output as email text."
        },
        {
          name: "Draft Renewal Pitch",
          shortDesc: "Create retention-focused pitches",
          content: "Draft a renewal pitch for [customer name] based on this renewal history and value data: [paste data]. Include key ROI proof points and renewal recommendation. Output as a short pitch and optional follow-up email."
        },
        {
          name: "Rep Activity Summary",
          shortDesc: "Summarize daily sales activities",
          content: "Write a daily update summarizing key rep activities. Inputs: [paste call summaries or CRM exports]. Make it upbeat and concise. Output as 3–5 bullet message."
        },
        {
          name: "Executive Pipeline Update",
          shortDesc: "Brief leadership on pipeline status",
          content: "Summarize our pipeline health this month for execs. Inputs: [paste data]. Include total pipeline, top risks, biggest wins, and forecast confidence. Write it like a short exec update."
        },
        // Sales Strategy & Planning
        {
          name: "Strategic Account Plan",
          shortDesc: "Develop comprehensive account strategies",
          content: "Create an account plan for [customer name]. Use these inputs: company profile, known priorities, current product usage, stakeholders, and renewal date. Output a structured plan with goals, risks, opportunities, and next steps."
        },
        {
          name: "Territory Planning Framework",
          shortDesc: "Design territory coverage strategies",
          content: "Create a territory planning guide for our next fiscal year. Inputs: team headcount, target industries, regions, and historical revenue. Recommend allocation method and sample coverage plan."
        },
        {
          name: "Prioritize Accounts",
          shortDesc: "Rank accounts by potential",
          content: "I have this list of accounts: [paste sample]. Prioritize them based on [criteria: industry, size, funding, tech stack]. Output a ranked list with reasons why."
        },
        {
          name: "Score High-Potential Accounts",
          shortDesc: "Apply weighted scoring models",
          content: "Score accounts based on [insert rules—e.g., company size, engagement score, intent signals]. Data: [Upload account list]. Output top 10 ranked accounts with their score and a note explaining why."
        },
        {
          name: "Regional Market Entry",
          shortDesc: "Evaluate new market opportunities",
          content: "I'm evaluating market entry into [region/country] for our [SaaS solution]. Research local buying behaviors, competitive landscape, economic conditions, and regulatory concerns. Format as a go/no-go market readiness summary with citations and action steps."
        },
        // Competitive Intelligence
        {
          name: "Create Battlecard",
          shortDesc: "Build competitor comparison tools",
          content: "Create a battlecard for [competitor name]. Use these notes: [insert positioning data]. Include strengths, weaknesses, how we win, and quick talk track. Output as table format."
        },
        {
          name: "Competitive Positioning",
          shortDesc: "Analyze competitive differentiation",
          content: "I'm preparing a competitive battlecard for [competitor name]. Research their pricing model, product positioning, recent customer wins/losses, and sales motion. Compare it to ours based on these strengths: [insert]. Output a 1-page summary with citations."
        },
        {
          name: "Sales Enablement One-Pager",
          shortDesc: "Create sales support materials",
          content: "Create a one-pager to help reps pitch [product name] to [persona]. Include key benefits, features, common use cases, and competitor differentiators. Format as copy-ready enablement doc."
        },
        {
          name: "Objection Rebuttals",
          shortDesc: "Prepare objection handling scripts",
          content: "Create rebuttals to these common objections: [insert 2–3 objections]. Make them sound natural and confident, and include a backup stat or story where useful. Output as list."
        },
        {
          name: "Find Customer Proof Points",
          shortDesc: "Research public testimonials",
          content: "Research recent online reviews, social mentions, and testimonials about [our product OR competitor product]. Focus on what customers are praising or criticizing. Summarize top 5 quotes, what persona each came from, and where it was posted. Include links."
        },
        // Data Analysis & Performance
        {
          name: "Pipeline Conversion Analysis",
          shortDesc: "Calculate stage conversion rates",
          content: "Analyze this sales pipeline export. Calculate conversion rates between each stage and identify the biggest drop-off point. Data: [Upload pipeline CSV]. Output a short summary and a table of conversion % by stage."
        },
        {
          name: "Rep Performance Ranking",
          shortDesc: "Identify top performers by metrics",
          content: "From this dataset of rep activities and closed deals, calculate the close rate for each rep and rank them. Data: [Upload rep performance CSV]. Output a ranked list and a sentence for each rep's strength."
        },
        {
          name: "Deal Velocity Trends",
          shortDesc: "Track sales cycle changes",
          content: "Use this CRM export to calculate average deal velocity per quarter (days from lead to close). Data: [Upload with open/close dates]. Show velocity trend in a simple chart and summarize the trendline."
        },
        {
          name: "Campaign Attribution",
          shortDesc: "Match campaigns to revenue",
          content: "Match campaign sources to closed-won deals from this data. Identify which campaign drove the most closed revenue. Data: [Upload campaign + deal export]. Output a ranked list and a short campaign summary."
        },
        {
          name: "Performance Comparison Chart",
          shortDesc: "Visualize rep performance differences",
          content: "Here's a table of rep performance by quarter: [paste data]. Compare top vs bottom performers. Show chart with trends and call out key differences. Output as table + insights."
        },
        // Visual & Sales Collateral
        {
          name: "Sales Process Funnel",
          shortDesc: "Visualize sales stages",
          content: "Create a funnel graphic showing our sales stages: [insert stages]. Make it clean and easy to read for onboarding docs. Output as simple image."
        },
        {
          name: "B2B Sales Funnel Visual",
          shortDesc: "Standard B2B funnel diagram",
          content: "Create an image of a standard B2B SaaS sales funnel with these stages: Prospecting, Discovery, Demo, Proposal, Closed Won/Lost. Use clean, modern icons and text labels. Output should be clear enough for use in a slide or enablement doc."
        },
        {
          name: "Sales Persona Illustrations",
          shortDesc: "Visual representations of key personas",
          content: "Create professional illustrations for 3 personas: (1) CFO of a mid-market company, (2) VP of IT at a global enterprise, and (3) Operations Manager at a logistics firm. Style should be flat and modern, ideal for use in a one-pager or training slide."
        },
        {
          name: "Territory Coverage Map",
          shortDesc: "Visualize sales territories",
          content: "Create a simplified U.S. map showing sales territories split by region: West, Central, East. Use distinctive color zones and label key states. Output should look clean and suitable for a sales kickoff deck."
        },
        {
          name: "Team Celebration Graphic",
          shortDesc: "Recognition and celebration visuals",
          content: "Design a fun, modern graphic to celebrate 'Top Rep of the Month.' Include a placeholder for name/photo and stylized trophy or badge. Style should match internal brand or newsletter vibe."
        }
      ]
    },

    // Engineering Teams
    engineering: {
      name: "Engineering Teams",
      description: "Engineering prompts for code development, debugging, optimization, documentation, research, and system architecture",
      prompts: [
        // Research & Benchmarking
        {
          name: "Evaluate Cloud Providers for Migration",
          shortDesc: "Compare cloud platform options",
          content: "I'm an infrastructure engineer evaluating cloud migration options. Context: We're moving from on-prem to the cloud for a fintech backend. Output: Compare AWS, GCP, and Azure for scalability, pricing, compliance, and developer tooling. Include citations."
        },
        {
          name: "Research Frameworks for Real-Time Apps",
          shortDesc: "Compare real-time development frameworks",
          content: "I'm building a real-time collaboration tool. Context: We need low-latency and scalability. Output: Compare top frameworks (e.g., SignalR, Socket.io, WebRTC) with use cases, pros/cons, and current usage by other SaaS companies. Include sources."
        },
        {
          name: "Benchmark Observability Tools",
          shortDesc: "Compare monitoring and observability platforms",
          content: "Benchmark the top observability tools. Context: We want to move from basic logging to full-stack monitoring. Output: Create a comparison table of features, pricing, integrations for Datadog, New Relic, Prometheus, and OpenTelemetry. Include sources."
        },
        {
          name: "Analyze AI/ML Trends in Logistics",
          shortDesc: "Research industry AI/ML adoption",
          content: "I'm researching AI/ML adoption in logistics systems. Context: Our company is considering integrating predictive routing. Output: A 5-paragraph summary on current trends, vendors, and implementation patterns. Include citations and links."
        },
        {
          name: "Investigate Compliance Best Practices",
          shortDesc: "Research regulatory compliance requirements",
          content: "Research best practices for GDPR/CCPA compliance so we can help kick off discussions with our legal team. Context: Our app stores sensitive user data in the EU and US. Output: A compliance checklist with citations, sorted by regulation. Include links to documentation and regulations."
        },
        // Technical Reviews & Documentation
        {
          name: "Review System Design Doc",
          shortDesc: "Evaluate technical design documents",
          content: "I've drafted a technical design document for [insert project or feature]. Review it for clarity, architectural soundness, and completeness. Highlight any missing considerations or questions reviewers may raise."
        },
        {
          name: "Document Internal API Behavior",
          shortDesc: "Create API documentation",
          content: "I need to document how this internal API works for other developers. Here's the relevant code, schema, and usage examples: [insert materials]. Create clear documentation including endpoints, input/output formats, and expected behavior."
        },
        {
          name: "Draft Runbook for On-Call Engineers",
          shortDesc: "Create operational runbooks",
          content: "I need to create a runbook for on-call engineers supporting [insert system]. Draft one that includes sections for system overview, common alerts, diagnostic steps, and escalation procedures."
        },
        {
          name: "Draft Onboarding Guide for New Hires",
          shortDesc: "Engineer onboarding documentation",
          content: "I need to write an onboarding guide for new engineers joining [insert team]. Create a draft with sections for required tools, access setup, codebase overview, and first tasks. Make it suitable for self-service onboarding."
        },
        {
          name: "Write JIRA Ticket from Spec",
          shortDesc: "Convert specs to task tickets",
          content: "Based on this engineering spec for [insert task or feature], write a JIRA ticket that includes the problem statement, context, goals, acceptance criteria, and technical notes for implementation."
        },
        // Debugging & Optimization
        {
          name: "Debug Failing System in Production",
          shortDesc: "Diagnose production issues",
          content: "A system in production is intermittently failing, and we're struggling to isolate the root cause. Based on the following logs, metrics, and recent changes: [insert context], help identify the most likely causes and suggest next steps for mitigation."
        },
        {
          name: "Analyze Performance Bottlenecks",
          shortDesc: "Identify performance issues",
          content: "Our service is experiencing latency and degraded performance during peak usage. Here are metrics, logs, and relevant traces: [insert context]. Help identify the bottlenecks and recommend specific optimizations."
        },
        {
          name: "Analyze a Data Pipeline Failure",
          shortDesc: "Troubleshoot pipeline issues",
          content: "A critical data pipeline failed in yesterday's run. Here are the logs, data volume trends, and error outputs: [insert context]. Analyze what likely went wrong and provide recommendations to prevent recurrence."
        },
        {
          name: "Suggest Observability Improvements",
          shortDesc: "Enhance monitoring and alerting",
          content: "We currently use [insert tools] for monitoring [insert service]. Review our observability setup and suggest improvements across metrics, logging, alerting, and dashboards to improve issue detection and debugging."
        },
        {
          name: "Brainstorm Edge Cases for Testing",
          shortDesc: "Generate test scenarios",
          content: "We're preparing test cases for [insert feature/system]. Brainstorm potential edge cases and failure scenarios that may not be covered by standard testing, including unusual user inputs, system state changes, and concurrency issues."
        },
        // Data Analysis & Reporting
        {
          name: "Identify Trends in Product Usage Logs",
          shortDesc: "Analyze usage patterns",
          content: "Analyze this CSV of product usage logs. Context: We want to identify usage trends over time and across user segments. Output: Summary stats + line or bar charts highlighting key trends."
        },
        {
          name: "Visualize System Error Rates Over Time",
          shortDesc: "Chart error trends",
          content: "Plot error rates over time from this dataset. Context: It contains application logs from the last month. Output: A time-series chart with callouts for error spikes and a short interpretation."
        },
        {
          name: "Analyze Performance Test Results",
          shortDesc: "Compare performance benchmarks",
          content: "Analyze this set of performance test results. Context: It compares two versions of our backend service. Output: Side-by-side comparison charts + text summary of improvements or regressions."
        },
        {
          name: "Prioritize Bugs Based on Impact",
          shortDesc: "Rank bug severity",
          content: "Analyze this bug report dataset. Context: Each row includes severity, frequency, and affected users. Output: A prioritized list of top bugs with charts showing frequency vs. severity."
        },
        {
          name: "Summarize Feedback from User Surveys",
          shortDesc: "Extract user feedback insights",
          content: "Summarize this user feedback CSV. Context: It includes ratings and open text responses from a recent survey. Output: Key themes, sentiment scores, and charts showing distribution of ratings."
        },
        // System Architecture & Visualization
        {
          name: "Create a Component Diagram",
          shortDesc: "Diagram system components",
          content: "I need to visualize the architecture of [insert system or service]. Generate a component diagram showing key services, data flows, and third-party integrations. Use clear labels and group components logically."
        },
        {
          name: "Visualize System Architecture",
          shortDesc: "Create architecture diagrams",
          content: "Create an image of the system architecture. Context: It's a microservices-based e-commerce platform with services for payments, catalog, and user profiles. Output: Diagram with labeled services and data flow arrows."
        },
        {
          name: "Explain CI/CD Pipeline to Stakeholders",
          shortDesc: "Visualize deployment pipeline",
          content: "Create an image that explains our CI/CD process. Context: This is for a presentation to business stakeholders. Output: Diagram showing dev → build → test → deploy steps with basic icons and short descriptions."
        },
        {
          name: "Model Data Flow in ML Pipeline",
          shortDesc: "Diagram ML data flow",
          content: "Create an image showing data flow in a machine learning pipeline. Context: We collect raw user data, clean it, train models, and serve predictions. Output: A labeled flowchart from raw data to inference."
        },
        {
          name: "Diagram Customer Journey Through App",
          shortDesc: "Map user flows",
          content: "Create a customer journey map through our mobile banking app. Context: Steps include onboarding, account linking, transactions, and support. Output: A visual flowchart with steps, screens, and decision points."
        }
      ]
    },

    // IT & Engineering
    it_engineering: {
      name: "IT & Engineering",
      description: "Technical prompts for system architecture, documentation, debugging, infrastructure management, compliance, and IT operations",
      prompts: [
        // Cloud & Vendor Evaluations
        {
          name: "Compare Cloud Providers",
          shortDesc: "Evaluate cloud platform options",
          content: "Compare AWS, Azure, and GCP for our use case: [insert workload or environment]. Consider cost, uptime, global availability, and ease of integration. Research using 2025 data, and present a table comparing each provider with a recommendation at the end."
        },
        {
          name: "Generate Vendor Comparison Chart",
          shortDesc: "Compare IT vendor solutions",
          content: "Research and compare remote access vendors for enterprise use. Focus on features, pricing, integrations, and support quality. Use 2025 data, and summarize the findings in a comparison table with notes."
        },
        {
          name: "Compare AI Observability Tools",
          shortDesc: "Evaluate observability platforms",
          content: "I'm an IT Manager at [insert company]. I'm evaluating observability platforms. Research current offerings, pricing, supported environments, and key differentiators in 2025. Include citations and summarize insights in a comparison table with a recommendation for a mid-size engineering org."
        },
        {
          name: "Investigate Zero Trust Frameworks",
          shortDesc: "Research zero trust security models",
          content: "I'm a Security Architect working on adopting a zero trust model. Research leading frameworks (e.g., NIST 800-207) and recent updates to best practices in 2024–2025. Include real-world implementation case studies where possible. Provide a summarized comparison and an executive-ready briefing."
        },
        // IT Compliance & Security
        {
          name: "Assess Global Data Residency Laws",
          shortDesc: "Research data sovereignty requirements",
          content: "I'm an IT Compliance Lead planning a global data storage architecture. Research 2025 data residency requirements across the EU, US, APAC, and LATAM. Include regulatory restrictions and preferred cloud regions. Cite official documentation and summarize findings in a table grouped by region."
        },
        {
          name: "Analyze Remote Access Tools",
          shortDesc: "Compare secure remote access solutions",
          content: "As an IT Service Delivery Lead, I need a secure, scalable remote access tool for our hybrid team. Compare current vendors (e.g., BeyondTrust, TeamViewer Tensor, Chrome Remote Desktop) for enterprise use in 2025. Focus on SSO support, encryption, session logging, and pricing. Provide a security-focused executive summary with links to primary sources."
        },
        {
          name: "Generate Compliance Checklist",
          shortDesc: "Create audit control checklists",
          content: "Based on SOC 2 guidelines, create a checklist of IT-specific controls to review for an upcoming internal audit. Use this existing audit prep document as background. Organize the checklist by domain (e.g., access, change management, incident response)."
        },
        {
          name: "Validate Access Controls",
          shortDesc: "Review user permission matrices",
          content: "Review this access matrix of users, roles, and systems. Check whether each user's access level follows our least-privilege policy. Identify any potential overprovisioning, and provide a table listing users with permissions that may need to be scaled back."
        },
        {
          name: "Review API Security Posture",
          shortDesc: "Audit API security practices",
          content: "Review this API schema and a sample set of traffic logs. Identify common API security issues such as poor input validation or lack of authentication. Provide a bullet-point list of findings with suggested fixes."
        },
        // IT Operations & Asset Management
        {
          name: "Draft IT Onboarding Checklist",
          shortDesc: "Create new hire IT setup process",
          content: "Create a checklist for onboarding new hires from an IT perspective. Include key steps for account provisioning, security training, and hardware setup. Use this outline of our current process, and present the checklist organized by day or week."
        },
        {
          name: "Generate Hardware Lifecycle Policy",
          shortDesc: "Define device replacement policies",
          content: "Create a draft policy for managing the lifecycle of company laptops and desktops. Reference this spreadsheet of device ages and current replacement costs. Write a formal document with guidance on replacement timelines, support windows, and environmental considerations."
        },
        {
          name: "Draft Asset Inventory Policy",
          shortDesc: "Document asset tracking procedures",
          content: "Write a formal policy for maintaining and auditing IT asset inventory. Use this list of tools, departments, and stakeholders as a starting point. Include purpose, responsibilities, and process for inventory reconciliation."
        },
        {
          name: "Help Prioritize IT Tickets",
          shortDesc: "Rank support queue by urgency",
          content: "Review this queue of open IT support tickets. Use this prioritization rubric based on impact, urgency, and SLA. Reorder the tickets accordingly and present the list as a prioritized backlog with a short reason for each ranking."
        },
        {
          name: "Track Hardware Lifecycle Risk",
          shortDesc: "Identify EOL devices",
          content: "Use this device inventory file containing purchase dates, models, and OS versions. Highlight which assets are past end-of-life or nearing refresh thresholds. Create a table of at-risk devices and include a narrative summary for IT leadership."
        },
        // IT Communication & Incident Management
        {
          name: "Draft an Incident Postmortem",
          shortDesc: "Document outage analysis",
          content: "Summarize the recent [insert system or service] outage. Include the root cause, timeline of events, user impact, and actions taken. Use information from the incident ticket or war room notes, and format the summary as a shareable internal postmortem report."
        },
        {
          name: "Create a DR Playbook Draft",
          shortDesc: "Design disaster recovery procedures",
          content: "Create a draft disaster recovery playbook for a critical production service. Use this system diagram and our recovery objectives (RTO, RPO). Organize the playbook into steps to take before, during, and after a service outage."
        },
        {
          name: "Write Internal Comms for Downtime",
          shortDesc: "Announce maintenance windows",
          content: "Write a professional internal communication announcing planned downtime for [insert system or tool]. Include timing, affected users, impact on work, and who to contact for questions. Write the message in the tone of an IT team update."
        },
        {
          name: "Translate Error Logs to Plain Language",
          shortDesc: "Explain technical issues to stakeholders",
          content: "Help translate these system error logs into language that can be understood by a non-technical executive. Use definitions where needed, and summarize what each log entry means in a few clear sentences. Present the explanation as an email draft."
        },
        {
          name: "Evaluate SaaS Tool Redundancy",
          shortDesc: "Identify overlapping tools",
          content: "Review our current list of SaaS tools used by IT, engineering, and ops. Use the attached spreadsheet with cost, team usage, and tool functions. Identify overlapping tools and recommend 3–5 candidates for consolidation, explaining why each was chosen in a short summary report."
        },
        // IT Monitoring & Optimization
        {
          name: "Summarize System Health Trends",
          shortDesc: "Analyze system performance logs",
          content: "Analyze the system health logs from the last 30 days. Focus on spikes in CPU/memory, service outages, and recurring error codes. Provide a concise summary of the key issues and add brief commentary on possible causes or needed follow-ups."
        },
        {
          name: "Suggest System Monitoring Improvements",
          shortDesc: "Optimize alerting and metrics",
          content: "Review our monitoring setup for [insert system] based on the current configuration and recent alert history. Identify 2–3 areas for improvement, such as gaps in alert coverage, noise reduction, or metrics tuning. Present the suggestions in a short internal memo."
        },
        {
          name: "Analyze Service Uptime and Incident Frequency",
          shortDesc: "Track reliability metrics",
          content: "Review this CSV with daily uptime % and incident logs for [insert service] over the past quarter. Identify patterns in outages, frequency of issues by severity, and calculate overall uptime. Summarize findings and suggest actions for improvement in a brief report."
        },
        {
          name: "Audit User Access Logs for Anomalies",
          shortDesc: "Detect suspicious access patterns",
          content: "Analyze this user access log export. Identify users or IP addresses with unusual access frequency, after-hours logins, or failed attempts. Flag suspicious patterns and summarize results in a security review format."
        },
        {
          name: "Forecast IT Support Ticket Volume",
          shortDesc: "Predict support demand",
          content: "Analyze this export of support ticket volume by week for the past 12 months. Identify seasonality trends and forecast volume for the next quarter. Visualize the trend and provide commentary for capacity planning."
        },
        // System Architecture & Visualization
        {
          name: "System Architecture Diagram",
          shortDesc: "Create technical architecture visuals",
          content: "Generate a system architecture diagram for our [system/application]. Include components: [list components]. Show data flow, API connections, and database relationships. Output as a clear technical diagram."
        },
        {
          name: "Infrastructure Overview",
          shortDesc: "Document infrastructure topology",
          content: "Create a visual overview of our infrastructure including [cloud provider], load balancers, servers, databases, and networking. Include security zones and data flow. Format as infrastructure diagram."
        },
        {
          name: "API Documentation",
          shortDesc: "Generate comprehensive API docs",
          content: "Create API documentation for [service name]. Include endpoints, methods, parameters, request/response examples, and error codes. Format as developer-friendly documentation with examples."
        },
        {
          name: "Database Schema Design",
          shortDesc: "Design optimized database schemas",
          content: "Design a database schema for [application purpose]. Requirements: [list requirements]. Include tables, relationships, indexes, and explain normalization decisions. Output as SQL DDL and diagram."
        },
        {
          name: "Microservices Architecture",
          shortDesc: "Plan microservices decomposition",
          content: "Design a microservices architecture for migrating our monolithic [application]. Identify service boundaries, communication patterns, and data management strategy. Include migration roadmap."
        },
        // Technical Research & Analysis
        {
          name: "Technology Comparison",
          shortDesc: "Compare technical solutions",
          content: "Compare [technology A] vs [technology B] for our use case: [describe use case]. Include performance, scalability, cost, learning curve, and community support. Output as decision matrix."
        },
        {
          name: "Security Vulnerability Assessment",
          shortDesc: "Analyze security risks",
          content: "Review this code/configuration for security vulnerabilities: [paste code]. Identify potential risks, severity levels, and remediation steps. Follow OWASP guidelines."
        },
        {
          name: "Performance Optimization",
          shortDesc: "Identify performance bottlenecks",
          content: "Analyze this performance data/code: [paste data/code]. Identify bottlenecks and suggest optimizations. Include before/after metrics estimates and implementation priority."
        },
        {
          name: "Tech Stack Evaluation",
          shortDesc: "Assess technology choices",
          content: "Evaluate our current tech stack: [list technologies]. Identify strengths, weaknesses, technical debt, and modernization opportunities. Suggest phased improvement plan."
        },
        {
          name: "Disaster Recovery Plan",
          shortDesc: "Create DR strategies",
          content: "Design a disaster recovery plan for our [system/application]. Include RTO/RPO targets, backup strategies, failover procedures, and testing schedule. Format as actionable DR document."
        },
        // Code & Development
        {
          name: "Code Review Checklist",
          shortDesc: "Systematic code review guide",
          content: "Create a code review checklist for [language/framework]. Include security, performance, maintainability, and testing criteria. Format as reviewer-friendly checklist."
        },
        {
          name: "Unit Test Generation",
          shortDesc: "Generate comprehensive test cases",
          content: "Generate unit tests for this function/class: [paste code]. Include edge cases, error conditions, and mocking strategies. Output in [testing framework] format."
        },
        {
          name: "Refactoring Suggestions",
          shortDesc: "Improve code quality",
          content: "Review this code for refactoring opportunities: [paste code]. Suggest improvements for readability, performance, and maintainability. Provide before/after examples."
        },
        {
          name: "Debug Error Analysis",
          shortDesc: "Troubleshoot technical issues",
          content: "Debug this error message/stack trace: [paste error]. Explain likely causes, diagnostic steps, and potential fixes. Include prevention strategies."
        },
        {
          name: "CI/CD Pipeline Design",
          shortDesc: "Design deployment pipelines",
          content: "Design a CI/CD pipeline for our [application type]. Include build, test, security scanning, and deployment stages. Specify tools and provide pipeline configuration example."
        },
        // Documentation & Communication
        {
          name: "Technical Runbook",
          shortDesc: "Create operational procedures",
          content: "Create a runbook for [system/service]. Include startup/shutdown procedures, monitoring checks, common issues/fixes, and escalation contacts. Format as operations-ready document."
        },
        {
          name: "Incident Response Template",
          shortDesc: "Structure incident management",
          content: "Create an incident response template for [severity level] incidents. Include initial assessment, communication plan, resolution steps, and post-mortem structure."
        },
        {
          name: "Migration Plan",
          shortDesc: "Plan system migrations",
          content: "Create a migration plan for moving from [current system] to [new system]. Include phases, rollback procedures, data validation, and risk mitigation. Output as project plan."
        },
        {
          name: "Technical Decision Record",
          shortDesc: "Document architecture decisions",
          content: "Write an Architecture Decision Record (ADR) for [decision topic]. Include context, options considered, decision rationale, and consequences. Follow ADR best practices."
        },
        {
          name: "System Health Dashboard",
          shortDesc: "Design monitoring dashboards",
          content: "Design a monitoring dashboard for [system]. Include key metrics, thresholds, alerting rules, and visualization suggestions. Specify monitoring tools and queries."
        }
      ]
    },

    // Management & Leadership
    management: {
      name: "Management & Leadership",
      description: "Prompts for team leadership, strategic planning, performance management, organizational development, and day-to-day team management",
      prompts: [
        // Strategic Planning & Alignment
        {
          name: "Draft Quarterly Goals",
          shortDesc: "Create measurable team objectives",
          content: "Draft clear and measurable quarterly goals for my team. Here is the business context, company objectives, and recent performance: [insert context]. Return 3 Objectives with 3-4 Key Results each, in a simple bullet format."
        },
        {
          name: "Executive Update Points",
          shortDesc: "Prepare leadership briefings",
          content: "I need to brief my VP on team progress. Based on this weekly summary: [insert notes], generate concise talking points grouped into achievements, blockers, and asks."
        },
        {
          name: "Skills Gap Analysis",
          shortDesc: "Identify team capability needs",
          content: "I'm trying to assess skill gaps on my team. Here's our current skill matrix and desired future state: [insert info]. Identify key gaps and suggest training or hiring solutions. Return findings in a short table."
        },
        {
          name: "Hiring Roadmap",
          shortDesc: "Plan strategic team growth",
          content: "I need to plan hiring needs for the next two quarters. Here's our current team structure and projected growth: [insert info]. Suggest a phased hiring plan with rationale for each role and proposed timing."
        },
        {
          name: "Reframe Goals After Pivot",
          shortDesc: "Align team with new direction",
          content: "We just experienced a strategic pivot. Here's what changed: [insert details]. Help me reframe our team's goals and narrative to align with the new direction. Provide 2-3 talking points and a revised team goal statement."
        },
        // Coaching & Performance
        {
          name: "1-on-1 Meeting Template",
          shortDesc: "Structure effective 1-on-1s",
          content: "Draft a 1:1 meeting template for my direct reports. I want it to include check-ins on progress, roadblocks, career growth, and feedback. Format it as a bulleted agenda with guiding questions."
        },
        {
          name: "Constructive Feedback Delivery",
          shortDesc: "Frame feedback effectively",
          content: "I want to give constructive feedback to a report who is underperforming. The issue is [insert behavior]. Suggest 2-3 ways to phrase it constructively, with pros and cons of each approach."
        },
        {
          name: "Difficult Conversation Prep",
          shortDesc: "Navigate challenging discussions",
          content: "I have a difficult conversation coming up with a team member about [insert issue]. Help me think through what to say, how to open, and what questions to ask. Return a 3-part conversation guide."
        },
        {
          name: "Cross-Team Conflict Resolution",
          shortDesc: "Mediate inter-team tensions",
          content: "I'm dealing with a conflict between my team and another function. Here's a summary of the tension and recent incidents: [insert info]. Suggest root causes and a 3-step mediation approach I can try."
        },
        {
          name: "Performance Improvement Plan",
          shortDesc: "Structure performance recovery",
          content: "Create a performance improvement plan for an underperforming team member. The issues are: [describe issues]. Include specific goals, timeline, support resources, and success metrics."
        },
        // Team Analytics & Health
        {
          name: "Burnout Risk Assessment",
          shortDesc: "Identify team wellness issues",
          content: "Based on this timesheet data (weekly hours logged per person), flag any early signs of burnout risk. Use a threshold of >45 hours for 2+ weeks. Return a summary of flagged employees and trends in average hours."
        },
        {
          name: "Workload Distribution",
          shortDesc: "Analyze team capacity balance",
          content: "I have a CSV that shows task assignments and completion times per team member for the last 4 weeks. Analyze workload distribution across the team—identify who may be overburdened or underutilized, and summarize in a short paragraph with a chart."
        },
        {
          name: "Team Health Diagnosis",
          shortDesc: "Assess team dysfunction signals",
          content: "I'm noticing signs of disengagement or dysfunction on my team. Based on this description of recent behavior and team dynamics: [insert description], what are the likely causes and what should I do next? Provide a 3-part action plan."
        },
        {
          name: "Engagement Survey Analysis",
          shortDesc: "Interpret team feedback data",
          content: "Analyze this team engagement survey data: [paste results]. Identify key themes, areas of concern, and strengths. Provide actionable recommendations with priority levels."
        },
        {
          name: "Team Velocity Tracking",
          shortDesc: "Monitor team productivity trends",
          content: "Review this sprint/project velocity data: [paste data]. Identify trends, potential issues, and capacity planning insights. Suggest adjustments to improve predictability."
        },
        // Research & Benchmarking
        {
          name: "Hybrid Team Best Practices",
          shortDesc: "Research remote team strategies",
          content: "I lead a hybrid team in [insert industry]. Research effective engagement and collaboration practices from the last 2 years. Focus on techniques proven to improve team trust, reduce burnout, and sustain productivity. Provide a top 5 list with supporting evidence and links."
        },
        {
          name: "Manager Ratio Benchmarks",
          shortDesc: "Compare organizational structures",
          content: "I'm a [insert role, e.g. Senior Engineering Manager] at a [insert company type, e.g., 500-person SaaS company]. I want to benchmark manager-to-IC ratios across similar tech firms. Focus on industry norms, variations by team type (engineering, product, etc.), and recommendations for scaling. Provide citations and a comparison table."
        },
        {
          name: "Upskilling Program Research",
          shortDesc: "Design team development programs",
          content: "I'm designing an upskilling program for a [insert team type, e.g., customer support team]. Find case studies or frameworks from companies that have implemented successful internal training programs. Include how they measured success, duration, and tools used. Summarize in 3–4 paragraphs with links."
        },
        {
          name: "DEI Strategy Examples",
          shortDesc: "Build inclusive team practices",
          content: "I'm helping shape our team's DEI goals. Research how leading companies in [insert industry] structure their DEI initiatives at the team level. Include examples of KPIs, training, and rituals. Return a comparison table with links."
        },
        {
          name: "Burnout Prevention Strategies",
          shortDesc: "Protect team wellbeing",
          content: "I'm seeing signs of burnout on my team. Research recent studies or expert guidance on recognizing burnout in knowledge workers and preventing escalation. Summarize key risk factors and recommend a 3-part action plan with citations."
        },
        // Team Culture & Communication
        {
          name: "Team Growth Journey Visual",
          shortDesc: "Illustrate team evolution",
          content: "Design a visual metaphor for a team's growth journey over a year. Include representations of challenges, milestones, and collaboration. Style should be inspiring, like a timeline or path through a landscape."
        },
        {
          name: "Team Culture Summary",
          shortDesc: "Visualize team values",
          content: "Design an image that represents our team culture. Our values are [insert 3–5 values, e.g. curiosity, impact, accountability]. Use icons or illustrations to match each value, and organize in a clean layout suitable for a wiki or mural board."
        },
        {
          name: "Quarterly Focus Areas",
          shortDesc: "Communicate strategic priorities",
          content: "Create a visual dashboard or poster that shows our team's three strategic priorities this quarter: [insert priorities]. Make it visually engaging and easy to present in an all-hands slide."
        }
      ]
    },

    // Product Management
    product: {
      name: "Product Management",
      description: "Product-focused prompts for strategy, competitive research, user research, roadmapping, feature development, content, UX design, and data analysis",
      prompts: [
        // Competitive & Market Research
        {
          name: "Compare Competitors' Onboarding UX",
          shortDesc: "Analyze competitor onboarding flows",
          content: "Research how 3 key competitors structure their onboarding flow for new users. Include screenshots, key steps, and points of friction or delight. Synthesize a comparison table and recommendations for improvement. Target product: [Insert product]"
        },
        {
          name: "Benchmark Competitor Pricing Strategies",
          shortDesc: "Compare pricing models across competitors",
          content: "I'm a product manager launching a new SaaS product. Research how top 5 competitors in this space structure their pricing tiers, freemium vs. paid, feature gating, and upsell triggers. Use public sources and include URLs. Output: A comparison table with insights and risks."
        },
        {
          name: "Compare Tech Stack Options",
          shortDesc: "Evaluate technology alternatives",
          content: "Compare the pros and cons of integrating [technology/tool A] vs. [technology/tool B] into our product. Focus on scalability, cost, support, and developer experience. Include citations."
        },
        {
          name: "Identify Regulatory Risks for New Features",
          shortDesc: "Research compliance requirements",
          content: "I'm a PM scoping a [feature] for financial services. Research recent regulatory guidance in the US, UK, and EU around the use of [feature] in customer-facing products. Summarize by region with citations. Output: A table of legal considerations to flag for our legal team and product design implications."
        },
        {
          name: "Research Top Product-Led Growth Tactics",
          shortDesc: "Discover PLG strategies",
          content: "Research the top 7 product-led growth strategies used by fast-scaling SaaS companies in the last 2 years. Prioritize those with measurable impact. Include 1–2 examples per tactic and source links. Output: Ranked list with strategy, example, and success metric."
        },
        // Product Strategy & Roadmapping
        {
          name: "Prioritize Product Roadmap Items Based on Impact",
          shortDesc: "Data-driven roadmap prioritization",
          content: "Review this list of upcoming product initiatives. Use the data provided (impact scores, effort estimates, and strategic alignment notes) to suggest priority order. Present the reordered list with justification for each recommendation. [Insert initiative list]"
        },
        {
          name: "Explore Monetization Models",
          shortDesc: "Evaluate pricing strategies",
          content: "We're considering pricing changes. Based on this product value and audience, suggest 3 monetization strategies. Include pros, cons, and examples of companies using each. [Insert product and audience details]"
        },
        {
          name: "Draft a Vision Statement for the Product",
          shortDesc: "Create inspiring product vision",
          content: "Based on this long-term goal and user need, write a concise product vision statement. Keep it inspiring and grounded in real outcomes. [Insert product goal]"
        },
        {
          name: "Brainstorm Feature Ideas from Customer Feedback",
          shortDesc: "Extract feature ideas from feedback",
          content: "Review this batch of customer feedback from the past quarter. Identify pain points and generate a list of 5 feature ideas to address recurring themes. [Insert feedback or summary]"
        },
        {
          name: "Plan A/B Testing Experiments",
          shortDesc: "Design product experiments",
          content: "Review this list of product UI changes and propose 2 A/B test setups. Include hypothesis, success metrics, and potential outcomes. [Insert UI changes or user goals]"
        },
        {
          name: "Product Vision Statement",
          shortDesc: "Craft compelling product visions",
          content: "Create a product vision statement for [product name]. Include target audience, key problem solved, unique value proposition, and long-term impact. Make it inspiring and memorable."
        },
        {
          name: "Feature Prioritization Matrix",
          shortDesc: "Rank features systematically",
          content: "Create a prioritization matrix for these features: [list features]. Use criteria: user impact, development effort, strategic alignment, and revenue potential. Output as scored matrix with recommendations."
        },
        {
          name: "Product Roadmap Narrative",
          shortDesc: "Tell the product story",
          content: "Write a narrative version of our product roadmap for the next [timeframe]. Include themes, major milestones, and how each phase builds on the previous. Make it compelling for stakeholders."
        },
        {
          name: "Market Opportunity Analysis",
          shortDesc: "Assess market potential",
          content: "Analyze the market opportunity for [product/feature]. Include TAM/SAM/SOM, competitor landscape, customer segments, and growth drivers. Format as executive presentation."
        },
        {
          name: "Product Strategy Brief",
          shortDesc: "Document strategic direction",
          content: "Create a one-page product strategy brief for [product]. Include vision, target segments, key differentiators, success metrics, and high-level roadmap. Make it board-ready."
        },
        // Product Content & Communication
        {
          name: "Draft PRD for a New Feature",
          shortDesc: "Create first-draft PRDs",
          content: "Based on this feature idea and customer need, write a first-draft PRD. Include user story, problem statement, solution overview, acceptance criteria, and success metrics. [Insert context or problem]"
        },
        {
          name: "Draft Changelog and Release Notes",
          shortDesc: "User-friendly release notes",
          content: "Using this release summary, draft user-facing changelog notes for our next version release. Use a friendly, clear tone and group by category (e.g., new, improved, fixed). [Insert release notes or ticket list]"
        },
        {
          name: "Create a Go-to-Market FAQ",
          shortDesc: "Internal launch FAQ",
          content: "Draft an internal FAQ for our sales and support teams about our upcoming feature launch. Use this background and anticipated questions. Write in a confident, informative tone. [Insert feature and launch details]"
        },
        {
          name: "Generate a One-Sentence Value Proposition",
          shortDesc: "Concise value messaging",
          content: "Based on this feature description, write 3 versions of a clear, compelling one-sentence value proposition. Tailor each one to a different target audience. [Insert feature description]"
        },
        {
          name: "Draft Pitch Deck for New Product",
          shortDesc: "Stakeholder presentation outline",
          content: "Create a 5-slide outline for a pitch deck introducing our new product to internal stakeholders. Include problem, solution, market, product overview, and timeline. [Insert product idea]"
        },
        // UX & Visual Design
        {
          name: "Visualize a User Journey Map",
          shortDesc: "Create journey visuals",
          content: "Create a user journey map for our [insert user persona] going through [insert experience]. Include emotional highs/lows, touchpoints, and moments of friction. Output as a visual flow."
        },
        {
          name: "Design Onboarding Flow Wireframe",
          shortDesc: "Wireframe onboarding steps",
          content: "Generate a wireframe-style image of a 3-step onboarding flow for a finance app. Steps include: linking an account, setting financial goals, and reviewing suggestions. Style: greyscale wireframe with labels."
        },
        {
          name: "Illustrate Product Comparison Visuals",
          shortDesc: "Before/after UI comparisons",
          content: "Create a side-by-side visual comparison of two app dashboards: one cluttered with too many metrics, and one simplified with actionable insights. Style: dashboard UI, minimalistic, neutral branding."
        },
        {
          name: "Design User Journey Infographics",
          shortDesc: "Journey visualization",
          content: "Generate a user journey infographic showing the onboarding experience for a mobile health-tracking app. Include key milestones, emotions, and friction points. Style: infographic, vertical layout, soft colors."
        },
        {
          name: "User Interview Guide",
          shortDesc: "Structure customer interviews",
          content: "Create an interview guide for [research goal]. Include warm-up questions, main topics, follow-up probes, and wrap-up. Focus on uncovering jobs-to-be-done and pain points."
        },
        {
          name: "Persona Development",
          shortDesc: "Create detailed user personas",
          content: "Develop a user persona based on this research data: [paste insights]. Include demographics, goals, frustrations, preferred tools, and day-in-the-life scenario. Make it actionable for the team."
        },
        {
          name: "User Journey Mapping",
          shortDesc: "Map end-to-end user experiences",
          content: "Create a user journey map for [user action]. Include stages, touchpoints, emotions, pain points, and opportunities. Format as visual journey with actionable insights."
        },
        {
          name: "Survey Question Design",
          shortDesc: "Create effective user surveys",
          content: "Design survey questions to understand [research topic]. Include multiple choice, scale, and open-ended questions. Avoid bias and ensure actionable insights. Max 10 questions."
        },
        {
          name: "Usability Test Plan",
          shortDesc: "Structure usability testing",
          content: "Create a usability test plan for [feature/product]. Include test objectives, scenarios, tasks, success criteria, and observation guide. Format as test protocol."
        },
        // Data Analysis & Insights
        {
          name: "Analyze Product Feedback Themes",
          shortDesc: "Extract feedback patterns",
          content: "Analyze this set of user feedback and identify the 4 most frequent themes. Summarize each with example quotes and suggested product implications. [Insert feedback or data dump]"
        },
        {
          name: "Synthesize Insights from Usage Data",
          shortDesc: "Identify behavioral trends",
          content: "Based on the following product usage data, summarize 3 key behavioral trends and what they suggest about user needs. Recommend 2 follow-up investigations. [Insert data or summary]"
        },
        {
          name: "Identify Product Adoption Risks",
          shortDesc: "Risk analysis for rollouts",
          content: "Review our product rollout plan and highlight 5 risks to successful adoption. Include likelihood, impact, and mitigation recommendations. [Insert rollout plan or summary]"
        },
        {
          name: "Analyze A/B Test Results",
          shortDesc: "Interpret experiment data",
          content: "Review the results of our recent A/B test (test vs. control). Identify statistical significance, key metrics that changed, and recommend next steps. Present insights clearly with graphs if needed. [Upload test data]"
        },
        {
          name: "Compare Feature Adoption Across Customer Segments",
          shortDesc: "Segment-level adoption analysis",
          content: "Use this data to compare how small business vs. enterprise customers adopt our key features. Highlight major differences, usage frequencies, and retention impact. Format output as a table with insights. [Upload CSV or describe dataset]"
        },
        {
          name: "Product Requirements Doc",
          shortDesc: "Write comprehensive PRDs",
          content: "Write a PRD for [feature name]. Include problem statement, user stories, acceptance criteria, success metrics, dependencies, and risks. Make it engineering-ready."
        },
        {
          name: "User Story Creation",
          shortDesc: "Write effective user stories",
          content: "Write user stories for [feature]. Follow format: As a [persona], I want to [action] so that [benefit]. Include acceptance criteria and priority. Create 5-10 stories."
        },
        {
          name: "Feature Spec Review",
          shortDesc: "Evaluate feature specifications",
          content: "Review this feature spec: [paste spec]. Identify gaps, risks, edge cases, and implementation concerns. Suggest improvements for clarity and completeness."
        },
        {
          name: "MVP Definition",
          shortDesc: "Define minimum viable products",
          content: "Define the MVP for [product/feature]. List must-have vs nice-to-have features, success criteria, and learning goals. Include rationale for each inclusion/exclusion."
        },
        {
          name: "Release Notes Draft",
          shortDesc: "Communicate product updates",
          content: "Write release notes for [version/feature]. Include what's new, improvements, fixes, and known issues. Make it user-friendly and highlight value delivered."
        },
        // Analytics & Metrics
        {
          name: "Metrics Framework",
          shortDesc: "Define product KPIs",
          content: "Create a metrics framework for [product/feature]. Include North Star metric, leading/lagging indicators, and measurement plan. Explain how metrics connect to business goals."
        },
        {
          name: "A/B Test Design",
          shortDesc: "Structure product experiments",
          content: "Design an A/B test for [feature/change]. Include hypothesis, success metrics, sample size calculation, duration, and analysis plan. Address potential confounds."
        },
        {
          name: "Feature Adoption Analysis",
          shortDesc: "Measure feature success",
          content: "Analyze this feature adoption data: [paste data]. Calculate adoption rate, retention, and engagement metrics. Identify user segments and recommend improvements."
        },
        {
          name: "Cohort Analysis Setup",
          shortDesc: "Track user behavior over time",
          content: "Set up cohort analysis for [product metric]. Define cohorts, key metrics to track, visualization format, and insights to extract. Include SQL queries if applicable."
        },
        {
          name: "Product Health Dashboard",
          shortDesc: "Monitor product performance",
          content: "Design a product health dashboard. Include key metrics, targets, trend visualizations, and alert thresholds. Specify data sources and update frequency."
        }
      ]
    },

    // Finance
    finance: {
      name: "Finance",
      description: "Finance prompts for analysis, reporting, forecasting, strategic financial planning, benchmarking, and operational finance",
      prompts: [
        // Financial Benchmarking & Market Analysis
        {
          name: "Benchmark Financial Performance",
          shortDesc: "Compare against industry peers",
          content: "Benchmark our financial performance against companies in the [insert industry] sector. Use public data to compare gross margin, net profit, and CAC. Present results in a table with source links."
        },
        {
          name: "Benchmark Expense Ratios vs. Peers",
          shortDesc: "Compare operational efficiency",
          content: "I'm a finance lead at [insert company or industry]. Research current SG&A and R&D expense ratios for 5 comparable companies in the [insert sector, e.g., SaaS, manufacturing, healthcare]. Provide a table with metrics, source links, and a short analysis of how we compare."
        },
        {
          name: "Competitive Fundraising Analysis",
          shortDesc: "Research funding market trends",
          content: "I'm a CFO preparing for our next fundraising round. Research recent funding rounds (past 12 months) in [insert industry]. Summarize deal sizes, valuations, lead investors, and positioning. Format as a briefing memo with source citations and clear bullet-point insights."
        },
        {
          name: "Compare Global Tax Regulations",
          shortDesc: "Analyze international tax compliance",
          content: "I manage global finance compliance. Research and compare corporate tax rates and reporting requirements in [insert countries]. Focus on tax incentives, reporting thresholds, and penalties. Deliver a comparison chart with links to official sources."
        },
        {
          name: "ESG Finance Strategy Benchmark",
          shortDesc: "Research ESG financial integration",
          content: "I'm updating our ESG financial strategy. Research how leading companies in [insert industry] integrate ESG into financial planning and disclosures. Summarize 3–5 examples with their KPIs, reporting cadence, and financial impact. Include references."
        },
        // Financial Planning & Forecasting
        {
          name: "Forecast Revenue Trends",
          shortDesc: "Project future revenue",
          content: "Forecast next quarter's revenue based on the past 6 quarters of data. Use the trends from our [insert dataset or industry] to explain your reasoning. Present the forecast in a table and write a short executive summary."
        },
        {
          name: "Draft Budget Assumptions for Planning",
          shortDesc: "Document planning assumptions",
          content: "Help me draft budget assumptions for our next annual plan. Context: [insert department/region/product info]. Output should include key assumptions, rationale, and any dependencies."
        },
        {
          name: "Model Cash Flow Scenarios",
          shortDesc: "Scenario-based cash planning",
          content: "Model 3 cash flow scenarios based on these variables: [insert inputs such as revenue range, delays, or costs]. Output as a table with assumptions, key drivers, and estimated cash impact."
        },
        {
          name: "Conduct ROI Analysis for Tooling",
          shortDesc: "Evaluate software investments",
          content: "Conduct an ROI analysis for a new [insert software or tool] we're considering. Context: [insert usage or pricing data]. Output should include payback period, assumptions, and a short risk assessment."
        },
        {
          name: "Compare Pricing Strategies",
          shortDesc: "Evaluate pricing models",
          content: "Compare 3 potential pricing strategies for our [insert product or service]. Use prior pricing data from [insert past year] for context. Output should be a side-by-side comparison table with pros, cons, and estimated impact."
        },
        // Financial Communication & Reporting
        {
          name: "Prepare Board Meeting Talking Points",
          shortDesc: "Executive financial briefings",
          content: "Draft financial talking points for an upcoming board meeting. Use our [insert Q2 results or P&L summary] as input. Write the talking points in bullet format, focusing on topline metrics and risk/upsides."
        },
        {
          name: "Write Investor Update Summary",
          shortDesc: "Stakeholder communications",
          content: "Write a summary for our next investor update. Use highlights from [insert performance report or fundraising update]. Format the output as a concise executive email suitable for external stakeholders."
        },
        {
          name: "Draft QBR Financial Slide Content",
          shortDesc: "Quarterly review presentations",
          content: "Draft the financial performance section for our next QBR deck. Use these inputs: [insert Q2 revenue, margin trends, notable cost changes]. Output as slide bullets with 1–2 takeaway lines."
        },
        {
          name: "Translate Variance Analysis",
          shortDesc: "Simplify financial explanations",
          content: "Translate this variance analysis into a manager-friendly summary. Source: [insert analysis]. Write in plain language with a brief explanation of why each variance occurred."
        },
        {
          name: "Summarize Audit Findings",
          shortDesc: "Executive audit summaries",
          content: "Summarize key findings from our internal audit. Use this document: [insert findings]. Output should be a summary for executives, with 3 themes and recommended next steps."
        },
        // Operational Finance & Process Improvement
        {
          name: "Analyze Cost Reduction Opportunities",
          shortDesc: "Identify savings potential",
          content: "Identify cost reduction opportunities from our recent budget report. Use the breakdown from [insert cost center or department] to evaluate. Provide a table with opportunities, projected savings, and any potential risks."
        },
        {
          name: "Evaluate M&A Target Fit",
          shortDesc: "Assess acquisition candidates",
          content: "Evaluate the financial and strategic fit of an M&A target. Use this context: [insert company profile or key metrics]. Output should be a table of pros/cons and a 3-paragraph summary of risk/reward."
        },
        {
          name: "Identify Accounting Process Gaps",
          shortDesc: "Improve close procedures",
          content: "Review our current accounting close checklist and suggest improvements. Use this documentation: [insert SOP or task list]. Output should highlight bottlenecks and recommend process updates."
        },
        {
          name: "Review Vendor Payments for Consolidation",
          shortDesc: "Optimize vendor spend",
          content: "Analyze vendor payments in this data [upload file]. Identify top 10 vendors by spend, spot any duplication (e.g., similar vendor names), and recommend vendors to consolidate. Output a table and short cost-reduction summary."
        },
        {
          name: "Procurement Strategy Cost Levers",
          shortDesc: "Research procurement optimization",
          content: "I'm leading a finance initiative to cut procurement costs. Research strategies used by Fortune 500 companies to reduce procurement spend without harming supplier relationships. Present 3–5 tactics with cost impact examples and cited sources."
        },
        // Financial Dashboards & Visual Storytelling
        {
          name: "Visualize Revenue Growth Funnel",
          shortDesc: "Illustrate revenue stages",
          content: "Create an image of a revenue growth funnel with labeled stages: Acquisition → Activation → Revenue → Retention → Expansion. Use a clean, modern style suitable for an executive finance presentation. Include icons for each stage."
        },
        {
          name: "Illustrate Budget Planning Workflow",
          shortDesc: "Diagram planning process",
          content: "Create a horizontal process flow diagram showing a budget planning cycle: Forecasting → Review → Stakeholder Input → Approval → Tracking → Adjustment. Use corporate-style visuals with subtle color and labels."
        },
        {
          name: "ESG Finance Impact Visual",
          shortDesc: "Show sustainability ROI",
          content: "Create a visual showing how ESG initiatives can impact finance metrics. Show links between sustainability investments and cost savings, risk mitigation, and investor interest. Use a modern, green-themed design with arrows."
        },
        {
          name: "Executive Dashboard Concept",
          shortDesc: "Design KPI dashboard mockup",
          content: "Generate a conceptual image of a finance executive dashboard showing high-level KPIs: Revenue, Gross Margin, Burn Rate, Runway, and Budget vs. Actual. Use a clean layout with panels and placeholder numbers."
        },
        // Financial Analysis & Reporting
        {
          name: "Financial Statement Analysis",
          shortDesc: "Analyze financial performance",
          content: "Analyze these financial statements: [paste data]. Calculate key ratios, identify trends, and highlight areas of concern or opportunity. Format as executive summary with visuals."
        },
        {
          name: "Variance Analysis Report",
          shortDesc: "Explain budget variances",
          content: "Perform variance analysis on this budget vs actual data: [paste data]. Identify significant variances, explain causes, and recommend corrective actions. Format as management report."
        },
        {
          name: "Cash Flow Forecast",
          shortDesc: "Project cash positions",
          content: "Create a cash flow forecast for [timeframe]. Use historical data: [paste data]. Include best/worst case scenarios and identify potential cash crunches. Recommend actions."
        },
        {
          name: "Cost-Benefit Analysis",
          shortDesc: "Evaluate investment decisions",
          content: "Perform cost-benefit analysis for [project/investment]. Include NPV, IRR, payback period, and sensitivity analysis. Make clear go/no-go recommendation with rationale."
        },
        {
          name: "Profitability Analysis",
          shortDesc: "Assess profit drivers",
          content: "Analyze profitability by [product/customer/segment]. Data: [paste data]. Identify most/least profitable areas and recommend focus areas. Include visualizations."
        },
        // Budgeting & Forecasting
        {
          name: "Annual Budget Template",
          shortDesc: "Structure budget planning",
          content: "Create an annual budget template for [department/company]. Include revenue, expenses, headcount, and capital expenditures. Add assumptions and variance tracking columns."
        },
        {
          name: "Revenue Forecast Model",
          shortDesc: "Project future revenues",
          content: "Build a revenue forecast model for [business/product]. Include growth assumptions, seasonality, and market factors. Provide base/upside/downside scenarios."
        },
        {
          name: "Expense Optimization",
          shortDesc: "Identify cost savings",
          content: "Analyze expense data: [paste data]. Identify optimization opportunities, benchmark against industry, and recommend cost reduction initiatives. Prioritize by impact and feasibility."
        },
        {
          name: "Scenario Planning",
          shortDesc: "Model financial scenarios",
          content: "Create scenario models for [situation]. Include best/expected/worst cases, key assumptions, and financial impact. Recommend contingency plans for each scenario."
        },
        {
          name: "Rolling Forecast Process",
          shortDesc: "Implement dynamic forecasting",
          content: "Design a rolling forecast process for [company]. Include update frequency, key metrics, data sources, and stakeholder involvement. Provide implementation roadmap."
        },
        // Strategic Finance
        {
          name: "Business Case Development",
          shortDesc: "Build investment proposals",
          content: "Develop a business case for [initiative]. Include problem statement, solution options, financial analysis, risks, and implementation plan. Make it board-ready."
        },
        {
          name: "Pricing Strategy Analysis",
          shortDesc: "Optimize pricing models",
          content: "Analyze pricing strategy for [product/service]. Include competitive analysis, price elasticity, margin impact, and customer segmentation. Recommend optimal pricing."
        },
        {
          name: "M&A Financial Due Diligence",
          shortDesc: "Evaluate acquisition targets",
          content: "Create a due diligence checklist for evaluating [acquisition target]. Include financial health, synergies, risks, and valuation considerations. Format as comprehensive checklist."
        },
        {
          name: "Capital Structure Optimization",
          shortDesc: "Balance debt and equity",
          content: "Analyze current capital structure and recommend optimization. Consider cost of capital, financial flexibility, and risk profile. Include peer benchmarking."
        },
        {
          name: "Financial KPI Dashboard",
          shortDesc: "Track financial health",
          content: "Design a financial KPI dashboard for [audience]. Include revenue, profitability, liquidity, and efficiency metrics. Specify data sources and update frequency."
        },
        // Compliance & Risk
        {
          name: "Financial Controls Framework",
          shortDesc: "Strengthen internal controls",
          content: "Design internal controls for [process/area]. Include control objectives, activities, monitoring, and documentation requirements. Address segregation of duties."
        },
        {
          name: "Risk Assessment Matrix",
          shortDesc: "Identify financial risks",
          content: "Create a financial risk assessment matrix. Include risk categories, likelihood, impact, current controls, and mitigation strategies. Prioritize by risk score."
        },
        {
          name: "Audit Preparation Checklist",
          shortDesc: "Prepare for audits",
          content: "Create an audit preparation checklist for [audit type]. Include required documents, timeline, responsible parties, and common audit findings to address."
        },
        {
          name: "Treasury Policy Development",
          shortDesc: "Manage cash and investments",
          content: "Draft a treasury policy covering cash management, investments, and foreign exchange. Include objectives, guidelines, approval limits, and reporting requirements."
        },
        {
          name: "Financial Reporting Calendar",
          shortDesc: "Schedule reporting activities",
          content: "Create a financial reporting calendar for [year]. Include close dates, reporting deadlines, review meetings, and filing requirements. Specify responsible parties."
        }
      ]
    },

    // Executives
    executives: {
      name: "Executives",
      description: "Executive prompts for strategic planning, decision support, investor relations, organizational communications, and performance analysis",
      prompts: [
        // Investor & Market Intelligence
        {
          name: "Summarize Investor Trends",
          shortDesc: "Research funding and market dynamics",
          content: "I'm preparing for our investor update. Research the latest funding and market trends in [industry]. Focus on valuation benchmarks, risk sentiment, and notable exits. Present in a concise brief with sources."
        },
        {
          name: "Survey Investor Sentiment",
          shortDesc: "Analyze market appetite and risks",
          content: "Research current investor sentiment for companies in the [industry] space. Pull insights from earnings calls, investor letters, and analyst notes. Focus on risk appetite, funding trends, and growth expectations. Provide a 1-page briefing with source links."
        },
        {
          name: "Benchmark Executive Compensation",
          shortDesc: "Compare leadership pay structures",
          content: "Conduct research on executive compensation benchmarks for [title, e.g. CFO] at [company size and industry]. Include total compensation breakdowns, geographic variations, and trends across public/private companies. Summarize in a 1-page brief with data tables and citations."
        },
        {
          name: "Evaluate M&A Opportunities in a Sector",
          shortDesc: "Research acquisition landscape",
          content: "I'm evaluating M&A options in the [sector/vertical]. Research recent acquisitions (past 24 months), typical deal sizes, common targets, and integration outcomes. Provide company examples, risks, and strategic rationale. Format as an investor-style briefing."
        },
        {
          name: "Assess Future Trends in Your Industry",
          shortDesc: "Forecast strategic shifts",
          content: "I'm an executive at [company/industry]. Conduct deep research on 3–5 emerging trends in [industry/topic] over the next 3 years. Include industry-specific examples, expert citations, and potential implications for strategy and talent planning. Present as an executive summary with bullet points and links to sources."
        },
        // Executive & Organizational Communications
        {
          name: "Draft a Vision Statement",
          shortDesc: "Craft inspiring direction",
          content: "Help me draft a compelling vision statement for our [company/team/initiative]. Our focus areas are: [insert key goals, values, or direction]. Make it inspiring, concise, and easy to communicate across departments."
        },
        {
          name: "Generate Town Hall Talking Points",
          shortDesc: "Prepare all-hands presentations",
          content: "I need talking points for an upcoming company-wide town hall. The theme is [insert theme or announcement]. Make it engaging, clear, and forward-looking. Limit to 5 minutes of content."
        },
        {
          name: "Refresh Internal Comms Strategy",
          shortDesc: "Design communication plans",
          content: "Help me design a new internal communications plan for [company or team]. We're trying to improve alignment, morale, and transparency. Suggest 3 guiding principles and a simple comms calendar."
        },
        {
          name: "Plan a Reorg Comms Sequence",
          shortDesc: "Navigate organizational changes",
          content: "I'm planning communications for a reorg. Provide a step-by-step message plan by audience type (execs, managers, all staff). Include tone guidelines and delivery format per message."
        },
        {
          name: "Draft a Succession Planning Memo",
          shortDesc: "Document leadership transitions",
          content: "Help me draft a succession planning memo for our [leadership team/board]. Include reasoning, timing, and a transparent outline of next steps for internal comms."
        },
        // Strategic Planning & Decision Support
        {
          name: "Create a Pricing Strategy Brief",
          shortDesc: "Evaluate pricing models",
          content: "We're revisiting our pricing strategy for [product/service]. Based on [insert context: goals, customer segments, competitive positioning], suggest 2–3 pricing models and pros/cons of each."
        },
        {
          name: "Prioritize Growth Levers",
          shortDesc: "Identify high-impact opportunities",
          content: "Given our goals [insert business goals], identify 3 high-potential growth levers and estimate effort vs. impact. Include a table with short descriptions and trade-offs."
        },
        {
          name: "Analyze Market Entry Risks",
          shortDesc: "Assess expansion opportunities",
          content: "We are considering entering [new market/region]. Based on current economic, legal, and competitive factors, summarize key risks and mitigation strategies in bullet format."
        },
        {
          name: "Reframe Strategic Trade-offs",
          shortDesc: "Compare investment options",
          content: "We're choosing between [Option A] and [Option B] for our next big investment. Compare trade-offs across cost, time, team capacity, and customer impact. Recommend based on goal fit."
        },
        {
          name: "Design a 3-Year Strategy Outline",
          shortDesc: "Build long-term roadmaps",
          content: "Based on these business priorities [insert high-level goals], help me develop a high-level 3-year strategy. Include major focus areas, risks, and milestones per year."
        },
        // Analytical Performance & Data Insights
        {
          name: "Identify Top and Bottom Performing Segments",
          shortDesc: "Analyze performance variance",
          content: "This is a dataset of performance across [regions/products/customers]. Identify which segments are over- and under-performing relative to the average. Show the metrics driving this and recommend 2 actions based on the findings."
        },
        {
          name: "Analyze Quarterly Business Metrics",
          shortDesc: "Extract board-ready insights",
          content: "I'm reviewing performance data for Q[insert quarter]. Analyze this dataset [upload CSV] for key trends in revenue, churn, and customer acquisition. Highlight 3 insights I should share with the board and suggest follow-up questions I should ask."
        },
        {
          name: "Analyze Customer Journey Drop-off",
          shortDesc: "Diagnose conversion issues",
          content: "I uploaded a funnel dataset showing customer journey stages. Analyze conversion rates between each stage and identify the largest drop-offs. Suggest 2–3 hypotheses and next steps to test or investigate."
        },
        {
          name: "Forecast Next Quarter Based on Historical Trends",
          shortDesc: "Project business metrics",
          content: "Based on this historical data [upload], build a simple forecast for [KPI, e.g. revenue] over the next quarter. Use a basic time-series model and explain any assumptions made. Present as a short briefing I can share with my leadership team."
        },
        {
          name: "Prioritize Strategic Investments",
          shortDesc: "Score and rank initiatives",
          content: "I uploaded a dataset of ongoing or proposed initiatives with cost, impact score, and estimated time to ROI. Help me prioritize these initiatives by building a simple scoring model and plotting effort vs. impact. Summarize the top 3 recommendations."
        },
        // Executive Visualization & Framework Design
        {
          name: "Build a Competitive Landscape Grid",
          shortDesc: "Map market positioning",
          content: "Based on the following list of competitors and their differentiators [paste], create a 2x2 matrix plotting them by [x axis] and [y axis]. Label each quadrant and include our position."
        },
        {
          name: "Design a 2x2 Market Positioning Matrix",
          shortDesc: "Create strategy frameworks",
          content: "Create a 2x2 matrix plotting companies in [industry] by [X-axis: e.g. pricing] and [Y-axis: e.g. innovation]. Label each quadrant, add 6–8 companies, and highlight where we fit. Keep it suitable for a board presentation."
        },
        {
          name: "Show Transformation Timeline",
          shortDesc: "Visualize strategic journey",
          content: "Create a visual timeline showing a company transformation journey from [year 1] to [year 3]. Include key milestones: strategy shifts, team growth, market expansion. Style: simple, bold, professional."
        },
        {
          name: "Visualize Strategic Vision or Flywheel",
          shortDesc: "Illustrate growth engines",
          content: "Create a high-level strategic flywheel or vision diagram for a company focused on [industry or goal]. Show how inputs (e.g. customers, data, feedback) loop into outputs (e.g. growth, innovation). Keep it clean, modern, and executive-ready."
        },
        {
          name: "Illustrate a Future Product Vision",
          shortDesc: "Conceptualize innovation",
          content: "Create a conceptual image of a future product vision for [industry/product]. Highlight features that reflect innovation and customer benefit. Style should be forward-looking, abstract but clear."
        }
      ]
    },

    // Customer Success
    customer_success: {
      name: "Customer Success",
      description: "Customer success prompts for onboarding, retention, account growth, and customer satisfaction",
      prompts: [
        // Customer Onboarding
        {
          name: "Onboarding Playbook",
          shortDesc: "Design customer onboarding",
          content: "Create an onboarding playbook for [customer segment]. Include timeline, milestones, success criteria, and handoff points. Make it scalable and repeatable."
        },
        {
          name: "Welcome Email Sequence",
          shortDesc: "Engage new customers",
          content: "Write a 5-email welcome sequence for new customers. Include product tips, resources, and success stories. Make each email valuable and action-oriented."
        },
        {
          name: "Implementation Plan Template",
          shortDesc: "Structure customer rollouts",
          content: "Create an implementation plan template for [product/service]. Include phases, deliverables, timelines, and RACI matrix. Make it customer-facing and clear."
        },
        {
          name: "Training Curriculum Design",
          shortDesc: "Educate customer teams",
          content: "Design a training curriculum for customer teams. Include learning objectives, modules, exercises, and certification criteria. Mix self-serve and instructor-led options."
        },
        {
          name: "Time-to-Value Analysis",
          shortDesc: "Accelerate customer success",
          content: "Analyze time-to-value for recent customers: [paste data]. Identify bottlenecks and quick wins. Recommend process improvements to accelerate value realization."
        },
        // Account Management
        {
          name: "QBR Presentation Template",
          shortDesc: "Structure quarterly reviews",
          content: "Create a QBR presentation template. Include performance review, ROI demonstration, roadmap discussion, and growth opportunities. Make it executive-friendly."
        },
        {
          name: "Health Score Framework",
          shortDesc: "Monitor account health",
          content: "Design a customer health score framework. Include metrics, weights, thresholds, and action triggers. Explain how scores predict churn and expansion."
        },
        {
          name: "Renewal Playbook",
          shortDesc: "Secure customer renewals",
          content: "Create a renewal playbook for [contract type]. Include timeline, stakeholder mapping, value demonstration, and negotiation strategies. Address common objections."
        },
        {
          name: "Expansion Opportunity Analysis",
          shortDesc: "Identify growth potential",
          content: "Analyze customer data to identify expansion opportunities: [paste data]. Score accounts by potential, readiness, and fit. Recommend outreach priorities and messaging."
        },
        {
          name: "Executive Engagement Plan",
          shortDesc: "Build sponsor relationships",
          content: "Create an executive engagement plan for key accounts. Include touchpoint cadence, content themes, and success metrics. Balance high-touch with scalability."
        },
        // Customer Feedback & Advocacy
        {
          name: "NPS Survey Design",
          shortDesc: "Measure customer loyalty",
          content: "Design an NPS survey program. Include question flow, segmentation, follow-up triggers, and action planning. Specify frequency and response rate targets."
        },
        {
          name: "Customer Interview Guide",
          shortDesc: "Gather deep insights",
          content: "Create a customer interview guide for [purpose]. Include open-ended questions, probing techniques, and synthesis framework. Focus on uncovering unmet needs."
        },
        {
          name: "Case Study Development",
          shortDesc: "Showcase customer success",
          content: "Develop a customer case study for [customer]. Include challenge, solution, results, and quotes. Make it compelling for prospects in similar situations."
        },
        {
          name: "Reference Program Design",
          shortDesc: "Build customer advocates",
          content: "Design a customer reference program. Include recruitment, incentives, matching process, and tracking. Balance customer value with company needs."
        },
        {
          name: "Voice of Customer Report",
          shortDesc: "Synthesize customer feedback",
          content: "Create a Voice of Customer report from this feedback: [paste data]. Identify themes, sentiment, and priorities. Recommend product and service improvements."
        },
        // Retention & Churn Prevention
        {
          name: "Churn Risk Indicators",
          shortDesc: "Predict customer attrition",
          content: "Identify churn risk indicators from this customer data: [paste data]. Build predictive model, set alert thresholds, and recommend intervention strategies."
        },
        {
          name: "Win-Back Campaign",
          shortDesc: "Re-engage lost customers",
          content: "Design a win-back campaign for churned customers. Include segmentation, messaging, offers, and success metrics. Address reasons for departure."
        },
        {
          name: "Customer Success Plan",
          shortDesc: "Define mutual success",
          content: "Create a customer success plan template. Include business objectives, success metrics, milestones, and mutual commitments. Make it collaborative and measurable."
        },
        {
          name: "Adoption Campaign Design",
          shortDesc: "Drive feature utilization",
          content: "Design an adoption campaign for [feature]. Include user segmentation, messaging, enablement content, and success metrics. Use behavioral triggers."
        },
        {
          name: "Escalation Response Process",
          shortDesc: "Handle customer issues",
          content: "Create an escalation response process. Include severity levels, response times, communication templates, and resolution tracking. Ensure customer satisfaction."
        }
      ]
    }
  },

  // Utility functions for easy access
  getAllPrompts: function() {
    let allPrompts = [];
    for (let category in this.categories) {
      this.categories[category].prompts.forEach(prompt => {
        allPrompts.push({
          category: this.categories[category].name,
          categoryDesc: this.categories[category].description,
          ...prompt
        });
      });
    }
    return allPrompts;
  },

  getPromptsByCategory: function(categoryKey) {
    if (this.categories[categoryKey]) {
      return this.categories[categoryKey].prompts;
    }
    return null;
  },

  searchPrompts: function(searchTerm) {
    const term = searchTerm.toLowerCase();
    let results = [];
    
    for (let category in this.categories) {
      this.categories[category].prompts.forEach(prompt => {
        if (prompt.name.toLowerCase().includes(term) || 
            prompt.shortDesc.toLowerCase().includes(term) ||
            prompt.content.toLowerCase().includes(term)) {
          results.push({
            category: this.categories[category].name,
            ...prompt
          });
        }
      });
    }
    return results;
  },

  getCategoryList: function() {
    return Object.keys(this.categories).map(key => ({
      key: key,
      name: this.categories[key].name,
      description: this.categories[key].description,
      count: this.categories[key].prompts.length
    }));
  },

  getRandomPrompt: function(categoryKey = null) {
    let prompts;
    if (categoryKey && this.categories[categoryKey]) {
      prompts = this.categories[categoryKey].prompts;
    } else {
      prompts = this.getAllPrompts();
    }
    return prompts[Math.floor(Math.random() * prompts.length)];
  },

  // Format prompt for direct use
  formatPrompt: function(promptContent, replacements = {}) {
    let formatted = promptContent;
    for (let key in replacements) {
      const placeholder = `[${key}]`;
      formatted = formatted.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacements[key]);
    }
    return formatted;
  }
};

// Example usage for integration:
/*
// Get all prompts
const allPrompts = openAIPromptPacks.getAllPrompts();

// Get prompts by category
const marketingPrompts = openAIPromptPacks.getPromptsByCategory('marketing');

// Search for specific prompts
const emailPrompts = openAIPromptPacks.searchPrompts('email');

// Get category list with counts
const categories = openAIPromptPacks.getCategoryList();

// Get a random prompt
const randomPrompt = openAIPromptPacks.getRandomPrompt();

// Format a prompt with actual values
const formattedPrompt = openAIPromptPacks.formatPrompt(
  marketingPrompts[0].content,
  {
    'event/launch': 'Product Launch Q2 2025',
    'insert target': 'B2B SaaS decision makers',
    'insert goal': 'Generate 500 qualified leads'
  }
);

// For HTML integration, you might use it like:
// <script src="openai-prompt-packs.js"></script>
// <script>
//   const prompts = openAIPromptPacks.getAllPrompts();
//   // Populate your UI with prompts
// </script>
*/
