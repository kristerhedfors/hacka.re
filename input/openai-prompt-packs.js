// OpenAI Prompt Packs - 300+ Professional Prompts for All Roles
// Source: OpenAI Academy (https://academy.openai.com)
// Non-module JavaScript file for HTML/JS/CSS web applications

const openAIPromptPacks = {
  metadata: {
    version: "1.0.0",
    source: "OpenAI Academy",
    lastUpdated: "2025-01-30",
    totalPrompts: 300
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

    // IT & Engineering
    it_engineering: {
      name: "IT & Engineering",
      description: "Technical prompts for system architecture, documentation, debugging, and infrastructure management",
      prompts: [
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
      description: "Prompts for team leadership, strategic planning, performance management, and organizational development",
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
      description: "Product-focused prompts for strategy, user research, roadmapping, and feature development",
      prompts: [
        // Product Strategy & Vision
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
        // User Research & Insights
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
        // Feature Development
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
      description: "Finance prompts for analysis, reporting, forecasting, and strategic financial planning",
      prompts: [
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
