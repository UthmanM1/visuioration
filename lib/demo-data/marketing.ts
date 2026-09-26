export const demoBrands = ["Northstar Retail", "Vertex Labs", "Summit Advisory", "Axiom Commerce", "Northline Operations"];

export const solutions = [
  {
    slug: "data-visualization",
    name: "Data visualization",
    summary: "Build charts that answer a question, not just display a column.",
    intro: "Pick a measure and a dimension. Visuioration suggests the chart that fits the shape of your data, then lets you refine every axis, filter and label.",
    points: [
      { title: "Chart suggestions from data shape", body: "Time series become lines, parts of a whole become stacked bars or donuts, and two measures become a scatter plot." },
      { title: "Eight chart types, one builder", body: "Line, bar, area, donut, scatter, table, KPI and heatmap share the same controls, so switching views never loses your configuration." },
      { title: "Readable by default", body: "Direct labels, sensible number formatting and colour palettes that remain legible for colour-blind readers." },
    ],
  },
  {
    slug: "ai-insights",
    name: "AI insights",
    summary: "Ask what changed and get an explanation you can check.",
    intro: "Ask a question in plain language. Every answer shows the numbers it used and links back to the rows and charts behind it.",
    points: [
      { title: "Answers with evidence", body: "Responses cite the metric, period and comparison used, with a supporting chart beneath each explanation." },
      { title: "Driver breakdowns", body: "See which region, category or channel contributed most to a change, and by how much." },
      { title: "Suggested next questions", body: "Each answer ends with where to look next, so analysis keeps moving instead of stopping at a chart." },
    ],
  },
  {
    slug: "reporting",
    name: "Reporting",
    summary: "Turn a dashboard into a report your leadership will read.",
    intro: "Assemble reports from sections — summary, KPIs, charts, insights and recommendations — that stay connected to the data they came from.",
    points: [
      { title: "Section-based builder", body: "Add, remove and reorder sections. Charts refresh when the dataset does." },
      { title: "Presentation mode", body: "Present any report full-screen, one section at a time, without exporting a deck." },
      { title: "Shareable links", body: "Publish a clean, read-only version with its own link, separate from your workspace." },
    ],
  },
  {
    slug: "data-storytelling",
    name: "Data storytelling",
    summary: "Explain the why behind the numbers, in order.",
    intro: "Good reports read like an argument: what happened, why it happened, and what to do. Visuioration structures analysis that way from the start.",
    points: [
      { title: "Narrative structure", body: "Sections follow a clear sequence from headline to evidence to recommendation." },
      { title: "Commentary beside charts", body: "Every chart can carry a written takeaway, so readers never have to guess what to notice." },
      { title: "Consistent numbers", body: "Figures in text are pulled from the same data as the charts, so they never drift apart." },
    ],
  },
];

export const industries = [
  {
    slug: "retail",
    name: "Retail",
    summary: "Regional, category and channel performance in one view.",
    challenge: "Retail teams juggle store, online and marketplace data that rarely lines up by week, region or product.",
    uses: ["Regional revenue and store productivity", "Category mix and margin shifts", "Online vs in-store conversion", "Promotion and seasonal impact"],
    metrics: ["Revenue", "Orders", "Average order value", "Conversion", "Sell-through"],
  },
  {
    slug: "finance",
    name: "Finance",
    summary: "Variance analysis and board reporting without the spreadsheet chase.",
    challenge: "Finance teams spend the first week of every month reconciling exports before they can explain a single variance.",
    uses: ["Budget vs actual variance", "Cost centre trends", "Cash and working capital views", "Board pack preparation"],
    metrics: ["Revenue", "Gross margin", "Operating expense", "Variance to plan", "Cash runway"],
  },
  {
    slug: "marketing",
    name: "Marketing",
    summary: "Spend, acquisition and return on one timeline.",
    challenge: "Channel data lives in separate ad platforms, each reporting success on its own terms.",
    uses: ["Customer acquisition cost by channel", "Campaign performance over time", "Funnel conversion by device", "Cohort retention"],
    metrics: ["CAC", "ROAS", "Conversion", "New customers", "Retention"],
  },
  {
    slug: "operations",
    name: "Operations",
    summary: "Throughput, service levels and bottlenecks, visible early.",
    challenge: "Operations problems show up in customer complaints before they show up in a report.",
    uses: ["Fulfilment time by site", "Stock availability", "Staffing against demand", "Exception tracking"],
    metrics: ["On-time delivery", "Fill rate", "Cycle time", "Backlog", "Cost per order"],
  },
];

export const articles = [
  {
    slug: "better-business-dashboards",
    title: "How to build better business dashboards",
    summary: "A dashboard should answer the three questions its reader asks every Monday. Everything else belongs somewhere else.",
    category: "Dashboards",
    readTime: "7 min read",
    date: "12 August 2026",
    sections: [
      { heading: "Start with the reader, not the data", body: "Before choosing a chart, write down who opens the dashboard and what they decide afterwards. A regional manager deciding where to send stock needs a different view from a CFO checking the quarter. If you cannot name the decision, the dashboard will become a gallery of every metric someone once asked for." },
      { heading: "Put the answer at the top", body: "The first row should state the current position against a meaningful comparison: this month against last month, or actual against plan. Four KPIs with their change and a small trend line usually beat twelve tiles that all compete for attention." },
      { heading: "Group by question", body: "Arrange the rest of the page as a sequence of questions. How are we doing overall? Where is it coming from? What changed? Each group gets one primary chart and, at most, one supporting table." },
      { heading: "Remove what nobody uses", body: "Review usage after a month. Charts nobody opens or discusses should move to a secondary tab. A shorter dashboard is read more often, and a dashboard that is read is worth more than one that is complete." },
    ],
  },
  {
    slug: "useful-kpi",
    title: "What makes a useful KPI?",
    summary: "A useful KPI is one somebody can influence, understand without a glossary, and compare against something that matters.",
    category: "Metrics",
    readTime: "5 min read",
    date: "28 July 2026",
    sections: [
      { heading: "It connects to a decision", body: "If a number moves and nobody changes what they do, it is a statistic, not a KPI. Conversion rate is useful to a product team because they can change checkout; it is less useful to a warehouse team who cannot." },
      { heading: "It has a comparison", body: "A figure on its own tells you little. Show it against the previous period, the same period last year, or a target, and say which one you chose." },
      { heading: "It is defined once", body: "Revenue should mean the same thing on every dashboard. Keep definitions in one place and link to them from the metric itself." },
      { heading: "It comes in balanced pairs", body: "Pair speed with quality and growth with cost. Customer acquisition cost next to new customers stops one team from optimising one number at the expense of the other." },
    ],
  },
  {
    slug: "data-storytelling-executives",
    title: "Data storytelling for executives",
    summary: "Executives read the first sentence and the first chart. Make both count.",
    category: "Storytelling",
    readTime: "6 min read",
    date: "9 July 2026",
    sections: [
      { heading: "Lead with the conclusion", body: "Open with what happened and what you recommend. The analysis is the support, not the introduction. \"Revenue fell 8.4% in March, mostly in the West; we recommend a mobile checkout review\" is a complete message in one line." },
      { heading: "One chart, one point", body: "Each chart should have a title that states its takeaway, not its contents. \"West drove most of March's decline\" is more useful than \"Revenue by region, March\"." },
      { heading: "Show the size of things", body: "Percentages hide scale. A 40% jump in a category worth 2% of revenue matters less than a 5% dip in one worth a third. Put money next to percentages." },
      { heading: "End with what to investigate", body: "Close with the open questions. It invites the right follow-up conversation and signals that the analysis is honest about what it does not yet know." },
    ],
  },
  {
    slug: "visualize-customer-retention",
    title: "How to visualize customer retention",
    summary: "Cohort heatmaps, retention curves and when to use each.",
    category: "Visualization",
    readTime: "8 min read",
    date: "18 June 2026",
    sections: [
      { heading: "Use cohorts, not averages", body: "An average retention rate blends new and old customers together and hides whether things are improving. Group customers by the month they first purchased and follow each group separately." },
      { heading: "Heatmaps for patterns", body: "A cohort heatmap puts acquisition month on one axis and months since first purchase on the other. Diagonal bands reveal seasonal effects; vertical bands reveal a problem in a specific month." },
      { heading: "Curves for comparison", body: "When you need to compare two or three cohorts directly — before and after a loyalty launch, for example — plot retention curves on the same axis." },
      { heading: "Label the scale", body: "Heatmap colour is hard to read precisely. Print the percentage in each cell, and use a single-hue scale so darker always means higher." },
    ],
  },
  {
    slug: "choosing-the-right-chart",
    title: "Choosing the right chart",
    summary: "Match the chart to the comparison you want the reader to make.",
    category: "Visualization",
    readTime: "6 min read",
    date: "2 June 2026",
    sections: [
      { heading: "Change over time", body: "Use a line for continuous trends and columns for discrete periods you want to compare individually." },
      { heading: "Comparing categories", body: "Horizontal bars, sorted, are the most readable way to compare more than five categories. Keep labels on the bars rather than in a legend." },
      { heading: "Parts of a whole", body: "Donuts work for up to five slices with clearly different sizes. Beyond that, use a stacked bar or a sorted table." },
      { heading: "Relationships", body: "Scatter plots show whether two measures move together. Add a label to the outliers — they are usually why someone asked." },
    ],
  },
  {
    slug: "ai-assisted-analysis",
    title: "AI-assisted business analysis",
    summary: "Where language models help analysts, and where they need a human check.",
    category: "AI",
    readTime: "7 min read",
    date: "20 May 2026",
    sections: [
      { heading: "Good at the first draft", body: "Language models are useful for summarising a change, suggesting which breakdowns to check, and writing the first version of commentary. They save the time spent staring at a blank page." },
      { heading: "Insist on evidence", body: "An answer is only useful if you can see the numbers behind it. Any AI-assisted tool should show the query, the period and the comparison it used." },
      { heading: "Keep calculations deterministic", body: "Let the database compute the numbers and let the model explain them. Asking a model to do arithmetic invites small, confident errors." },
      { heading: "Review before sharing", body: "Treat generated commentary like a junior analyst's draft: read it, check it against the chart, and edit it before it reaches a decision-maker." },
    ],
  },
];

export const caseStudies = [
  {
    company: "Northstar Retail Group",
    sector: "Retail",
    problem: "Leadership struggled to consolidate performance data across 132 stores and three online channels.",
    solution: "Visuioration created a unified visual intelligence workspace with a shared sales dataset, a leadership dashboard and a quarterly report built from it.",
    before: ["Fragmented spreadsheets", "Manual reporting", "Delayed insights"],
    after: ["Unified dashboard", "Automated visual analysis", "Presentation-ready reports"],
  },
  {
    company: "Summit Advisory",
    sector: "Consulting",
    problem: "Consultants rebuilt the same client charts in slides for every steering committee.",
    solution: "A reusable report template per engagement, published as a shareable link that updates when client data does.",
    before: ["Slide rebuilds every fortnight", "Version confusion", "Charts detached from source"],
    after: ["One living report per client", "Single shared link", "Charts tied to data"],
  },
  {
    company: "Axiom Commerce",
    sector: "E-commerce",
    problem: "Marketing and finance reported different acquisition costs for the same campaigns.",
    solution: "A single marketing dataset with shared metric definitions, used by both teams' dashboards.",
    before: ["Two CAC figures", "Monthly reconciliation", "Disputed budgets"],
    after: ["One agreed definition", "Weekly channel review", "Faster budget decisions"],
  },
];
