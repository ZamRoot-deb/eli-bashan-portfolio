// Single source of truth for every word on the site.
// Source: the owner's previous portfolio (Eli_Bashan_Portfolio_CODE.zip, src/sections/*.tsx)
// cross-checked against Eli_Zamar_Bashan_CV.pdf. Prose uses plain punctuation (no em-dashes).

export type Hue = 'term' | 'amber' | 'magenta' | 'cyan' | 'violet' | 'red' | 'orange' | 'blue'

export const PROFILE = {
  name: 'Eli Zamar Bashan',
  nameLines: ['ELI', 'ZAMAR', 'BASHAN'],
  handle: 'eli',
  host: 'ezb-os',
  roles: ['DFIR Lead', 'AI Engineer'],
  org: 'Virtual InfoSec Africa',
  city: 'Accra, Ghana',
  cityCode: 'ACC',
  timeZone: 'Africa/Accra',
  coords: '5.5560° N, 0.1969° W',
  mapsUrl: 'https://maps.google.com/?q=Accra,Ghana',
  siteUrl: 'https://zamroot-deb.github.io/eli-bashan-portfolio/',
  email: 'elibashan@yahoo.com',
  phone: '+233 (0) 54 145 3098',
  phoneHref: 'tel:+233541453098',
  cvFile: 'Eli_Zamar_Bashan_CV.pdf',
  tagline: "Incidents end. The evidence doesn't, if you know how to read it.",
  degree: 'MSc Cybersecurity & Digital Forensics, KNUST',
  disciplines: ['DFIR', 'Threat Intel', 'OSINT', 'AI Engineering'],
  mandate: ["Leading Ghana's broadest DFIR lab mandate", '13 critical sectors', '24 member banks'],
  status: 'Online, accepting quests',
  level: 8,
  statBars: [
    { label: 'FORENSICS', pct: 96, hue: 'term' as Hue },
    { label: 'AI / LLM', pct: 88, hue: 'amber' as Hue },
    { label: 'RESPONSE', pct: 93, hue: 'term' as Hue },
  ],
}

export const ABOUT = {
  cmd: 'cat /player/bio.txt',
  eyebrow: 'About',
  title: 'Anyone can image a drive. Proving what it means is the work.',
  quote: 'Calm in the middle of the incident, rigorous in what comes after.',
  sub: 'Eight years in digital forensics and incident response.',
  paragraphs: [
    "I am a cybersecurity professional specialising in digital forensics and incident response, with over eight years handling high-impact security incidents, criminal investigations and forensic matters with real-world consequences. I served as a Security Operations Analyst with the FICSOC team supporting Ghana's banking sector, and I currently lead the forensic lab at Virtual InfoSec Africa, an MSSP serving clients across all 13 of Ghana's critical sectors.",
    'The casework includes more than 50 forensic and incident response reports, legal reports used in court and police proceedings, and testimony as an expert witness. Alongside the lab work, I build, train and mentor teams of analysts and responders, and design production platforms across threat intelligence, forensic automation, OSINT investigation, governance and compliance, and AI-assisted health and safety.',
  ],
  scope: ['Mobile', 'Computer', 'Memory', 'Network', 'Cloud', 'Email'],
  principles: [
    {
      code: 'RULE_01',
      title: 'Court-ready by default',
      body: 'Chain of custody, legal compliance and defensible methodology are not afterthoughts bolted on when a case turns serious. Every examination runs as if it will be challenged in court, because five of my reports already have been.',
    },
    {
      code: 'RULE_02',
      title: 'Build the missing tooling',
      body: "When the tool I needed didn't exist for the West African threat landscape, I built it. Five production platforms shipped independently, across threat intelligence, DFIR automation, OSINT, GRC and AI-native safety.",
    },
    {
      code: 'RULE_03',
      title: 'Teach the next responder',
      body: 'Forensics only scales through people. I have trained over 100 professionals and students, mentored junior analysts into casework, and written the SOPs and playbooks my teams run on.',
    },
  ],
}

export interface Platform {
  id: string
  n: string
  name: string
  formerly?: string
  tag: string
  body: string
  stack: string[]
  hue: Hue
  glyph: 'eye' | 'shield' | 'graph' | 'check' | 'helmet'
}

export const PLATFORMS: Platform[] = [
  {
    id: 'heimdall',
    n: '01',
    name: 'Heimdall',
    tag: 'National threat intelligence platform',
    body: 'Ghana-focused threat intelligence platform aggregating IOCs, CVEs, threat actor TTPs, sector exposure data and breach intelligence for national-level defenders. AI threat brief generator, semantic search over 8,500 indexed incidents, and a React-based analyst assistant with 8 specialised tools. Built for the West African threat landscape rather than a global feed calibrated for US and European environments.',
    stack: ['Next.js', 'Python/FastAPI', 'PostgreSQL', 'Celery', 'Redis', 'Ollama', 'Claude API'],
    hue: 'cyan',
    glyph: 'eye',
  },
  {
    id: 'alfacotex',
    n: '02',
    name: 'Alfacotex',
    tag: 'Automated DFIR platform',
    body: 'Consumer-facing DFIR platform with a Tauri-based agent for local forensic collection on Windows and macOS, a YARA detection engine loading 1,500+ rules, an AI examination engine that builds forensic narratives and attack timelines from scan data, a visual attack map, a privacy scanning module and scheduled scans. Evidence is structured into reports with an evidence meter and confidence layer designed to avoid false certainty.',
    stack: ['Next.js', 'FastAPI', 'Rust (Tauri)', 'PostgreSQL', 'YARA', 'Claude API', 'Docker'],
    hue: 'red',
    glyph: 'shield',
  },
  {
    id: 'kutarisa',
    n: '03',
    name: 'Kutarisa',
    tag: 'OSINT investigation platform',
    body: 'Link analysis and OSINT investigation platform built on React Flow with D3 force layout and ELK.js for graph arrangement, a recon API layer for entity enrichment, and a case management system structured around the investigation lifecycle, from recon to case to report.',
    stack: ['Next.js', 'React Flow', 'D3', 'FastAPI', 'PostgreSQL'],
    hue: 'violet',
    glyph: 'graph',
  },
  {
    id: 'via-assurance',
    n: '04',
    name: 'VIA Assurance',
    tag: 'GRC platform',
    body: 'ISO 27001, ISO 9001 and NIST CSF 2.0 governance, risk and compliance platform built for VIA. Covers 17 compliance registers with a shared data view supporting table, card and board layouts, bulk operations, export, grouping and saved views. Audited write services with self-committing audit trails and role-based access control.',
    stack: ['Next.js', 'FastAPI', 'PostgreSQL', 'Docker'],
    hue: 'amber',
    glyph: 'check',
  },
  {
    id: 'safetrexiq',
    n: '05',
    name: 'SafetrexIQ',
    formerly: 'SafeIQos',
    tag: 'AI-native health & safety SaaS',
    body: 'Multi-tenant occupational health and safety platform for a UK-based client, live in production. ISO 45001-aligned incident management with AI-assisted systemic investigation, hierarchy of controls and CAPA workflows. An AI privacy gateway classifies and filters data before any model egress, preserving organisational data sovereignty.',
    stack: ['Next.js', 'FastAPI', 'PostgreSQL', 'Ollama', 'Claude API', 'Docker'],
    hue: 'term',
    glyph: 'helmet',
  },
]

export const BUILDS = {
  cmd: 'ls -la /builds --shipped',
  eyebrow: 'Builds',
  title: 'Five production systems, designed and shipped solo.',
  sub: "Built outside of employer-assigned work. Each one a system I needed to exist, engineered end to end and running in production.",
}

export const CASEWORK = {
  cmd: 'gpg --decrypt /cases/classified.gpg',
  eyebrow: 'Case files',
  title: 'Evidence that has to survive a courtroom, not just a ticket queue.',
  sub: 'Due to NDAs and the nature of the work, client and case details cannot be disclosed. What follows is the scope of the casework. Across it: chain of custody, legal compliance, court-ready evidence packages and forensic opinion for financial institutions, government agencies, educational institutions and mining companies.',
  types: [
    { title: 'Financial fraud & cybercrime', sub: 'Business email compromise, online banking fraud, cryptocurrency theft' },
    { title: 'Insider threat', sub: 'Investigations in banking and government environments' },
    { title: 'Ransomware', sub: 'Attacks against corporate and institutional targets' },
    { title: 'Cyberbullying & harassment', sub: 'Online abuse cases with evidentiary requirements' },
    { title: 'Romance fraud & extortion', sub: 'Digital extortion and social-engineering casework' },
    { title: 'Data breach', sub: 'Investigations with regulatory reporting requirements' },
    { title: 'DDoS & data destruction', sub: 'Availability attacks and deliberate evidence destruction' },
    { title: 'Expert testimony', sub: 'Courtroom interpretation of digital evidence and methodology' },
  ],
  stats: [
    { v: 50, suffix: '+', label: 'Forensic & IR reports' },
    { v: 5, suffix: '', label: 'Legal reports in court' },
    { v: 1, suffix: '', label: 'Expert witness testimony' },
  ],
}

export interface Role {
  period: string
  /** 'YYYY-MM' first month in the role */
  from: string
  /** 'YYYY-MM' last month in the role, null while active */
  to: string | null
  active: boolean
  title: string
  org: string
  place: string
  points: string[]
  hue: Hue
}

export const EXPERIENCE = {
  cmd: 'cat /var/log/quest_log.dat',
  eyebrow: 'Quest log',
  title: 'Quest log.',
  sub: 'Every role since 2019, newest first. One active quest, six cleared.',
}

export const ROLES: Role[] = [
  {
    period: 'Feb 2025 to present',
    from: '2025-02',
    to: null,
    active: true,
    title: 'DFIR Lead',
    org: 'Virtual InfoSec Africa',
    place: 'Accra, Ghana',
    points: [
      "Lead the forensic lab within an MSSP serving clients across all 13 of Ghana's critical sectors: banking, finance, government, telecommunications, energy and healthcare",
      "Coordinate with the FICSOC team providing security oversight for Ghana's 24 member banks, on cases where incidents require forensic follow-up",
      'Direct forensic investigations and incident response on criminal and civil cases with legal evidentiary requirements',
      'Oversee enterprise forensic tooling: Detego, Elcomsoft, Passware, Belkasoft, Magnet Axiom, Cellebrite, FTK, Volatility',
      'Lead OSINT investigations and threat intelligence operations; manage evidence handling and chain of custody',
      'Train and mentor junior DFIR analysts; establish team SOPs, workflows and playbooks',
    ],
    hue: 'amber',
  },
  {
    period: 'Jan 2024 to Jan 2025',
    from: '2024-01',
    to: '2025-01',
    active: false,
    title: 'Digital Forensic Analyst, Level 1',
    org: 'Virtual InfoSec Africa',
    place: 'Accra, Ghana',
    points: [
      'Forensic analysis across mobile, memory, network and computer environments',
      'OSINT, threat intelligence and incident response support',
    ],
    hue: 'term',
  },
  {
    period: 'Aug 2022 to Dec 2023',
    from: '2022-08',
    to: '2023-12',
    active: false,
    title: 'Digital Forensics Examiner / Consultant',
    org: 'Self-Employed',
    place: 'Ghana',
    points: [
      'Independent DFIR consulting for banking, government, education and mining clients',
      'Vulnerability assessments, system hardening and forensic data recovery',
    ],
    hue: 'cyan',
  },
  {
    period: 'Jan 2023 to Dec 2023',
    from: '2023-01',
    to: '2023-12',
    active: false,
    title: 'Volunteer Contributor',
    org: 'Atomic Red Team Community',
    place: 'Remote, US',
    points: [
      'Contributed bug reports and MITRE ATT&CK-aligned script improvements to the global open-source red teaming project',
    ],
    hue: 'red',
  },
  {
    period: 'Jan 2023 to Mar 2023',
    from: '2023-01',
    to: '2023-03',
    active: false,
    title: 'Cybersecurity Administrator',
    org: 'Virtually Testing Foundation',
    place: 'Remote, US',
    points: ['Vulnerability assessments, OSINT investigations and security training delivery'],
    hue: 'violet',
  },
  {
    period: 'Mar 2022 to Aug 2023',
    from: '2022-03',
    to: '2023-08',
    active: false,
    title: 'Laboratory / XRF Technician, IT Support',
    org: 'Sahara Natural Resources',
    place: 'Ghana',
    points: ['Managed IT infrastructure and cybersecurity for laboratory operations'],
    hue: 'orange',
  },
  {
    period: 'Sep 2019 to Sep 2020',
    from: '2019-09',
    to: '2020-09',
    active: false,
    title: 'Information Systems Engineer',
    org: 'Sefwi Wiawso Nursing Training School',
    place: 'Ghana',
    points: [
      'Installed and managed a 150+ workstation lab on Windows Server with network monitoring',
      'Built a student database for 700+ students',
    ],
    hue: 'blue',
  },
]

export const IMPACT = {
  cmd: './achievements --list --unlocked',
  eyebrow: 'Trophies',
  title: 'Trophies unlocked.',
  sub: 'Hover a star. Every number here is delivered work, not a projection.',
  trophies: [
    '13 critical sectors covered',
    '24 member banks under FICSOC oversight',
    '$240K+ potential loss prevented',
    '100+ professionals & students trained',
    'Trained by UNODC & Interpol',
    'Atomic Red Team contributor',
    'I2FIF framework designer',
    'Published columnist, B&FT Ghana',
  ],
  stats: [
    { v: 13, prefix: '', suffix: '', label: 'Critical sectors', body: 'The lab I lead holds the broadest DFIR mandate of its kind in Ghana, alongside a SOC overseeing 24 member banks.' },
    { v: 240, prefix: '$', suffix: 'K+', label: 'Loss prevented', body: 'A hospitality-sector engagement where DFIR-led recovery and response stopped a six-figure loss.' },
    { v: 100, prefix: '', suffix: '+', label: 'People trained', body: 'DFIR training delivered at KNUST, IDL and Palmers University, plus mentorship of junior analysts into live casework.' },
    { v: 5, prefix: '', suffix: '', label: 'Platforms shipped solo', body: 'Production systems across DFIR, threat intelligence, OSINT, GRC and AI-assisted health & safety.' },
  ],
  note: 'Trained by UNODC and Interpol in ransomware investigation and cross-border cybercrime. Designed the Integrated IoT Forensic Investigation Framework (I2FIF). Contributor to Atomic Red Team, an open-source project used by security teams globally.',
}

// Metric nodes for the impact constellation. Every value traces to the CV / previous site.
export interface MetricNode { id: string; value: string; label: string; cluster: string }
export interface MetricCluster { id: string; label: string; hue: Hue }

export const METRIC_CLUSTERS: MetricCluster[] = [
  { id: 'scale', label: 'Scale & mandate', hue: 'cyan' },
  { id: 'casework', label: 'Casework & courts', hue: 'amber' },
  { id: 'people', label: 'People & teaching', hue: 'term' },
  { id: 'builds', label: 'Builds shipped', hue: 'violet' },
  { id: 'recognition', label: 'Recognition', hue: 'magenta' },
]

export const METRICS: MetricNode[] = [
  { id: 'sectors', value: '13', label: 'critical sectors served by the lab', cluster: 'scale' },
  { id: 'banks', value: '24', label: 'member banks under FICSOC oversight', cluster: 'scale' },
  { id: 'loss', value: '$240K+', label: 'potential loss prevented in one engagement', cluster: 'scale' },
  { id: 'years', value: '8+', label: 'years in DFIR and security operations', cluster: 'scale' },
  { id: 'reports', value: '50+', label: 'forensic and incident response reports', cluster: 'casework' },
  { id: 'court', value: '5', label: 'legal reports used in court or police proceedings', cluster: 'casework' },
  { id: 'witness', value: '1', label: 'expert witness testimony', cluster: 'casework' },
  { id: 'casetypes', value: '8', label: 'case types, from BEC fraud to ransomware', cluster: 'casework' },
  { id: 'trained', value: '100+', label: 'professionals and students trained', cluster: 'people' },
  { id: 'unis', value: '3', label: 'universities hosting his DFIR training', cluster: 'people' },
  { id: 'certs', value: '16', label: 'professional certifications', cluster: 'people' },
  { id: 'workstations', value: '150+', label: 'workstation lab built on Windows Server', cluster: 'people' },
  { id: 'platforms', value: '5', label: 'production platforms shipped solo', cluster: 'builds' },
  { id: 'incidents', value: '8,500', label: 'incidents indexed for semantic search (Heimdall)', cluster: 'builds' },
  { id: 'yara', value: '1,500+', label: 'YARA rules in the detection engine (Alfacotex)', cluster: 'builds' },
  { id: 'registers', value: '17', label: 'compliance registers (VIA Assurance)', cluster: 'builds' },
  { id: 'tools', value: '8', label: 'specialised tools in the analyst assistant (Heimdall)', cluster: 'builds' },
  { id: 'unodc', value: 'UNODC', label: 'and Interpol training in ransomware investigation', cluster: 'recognition' },
  { id: 'art', value: 'ART', label: 'Atomic Red Team open-source contributor', cluster: 'recognition' },
  { id: 'i2fif', value: 'I2FIF', label: 'IoT forensic investigation framework designed', cluster: 'recognition' },
  { id: 'bft', value: '3', label: 'articles published in the B&FT (Ghana)', cluster: 'recognition' },
]

export interface StackGroup { id: string; title: string; hue: Hue; items: string[] }

export const STACK = {
  cmd: 'open /inventory --all-slots',
  eyebrow: 'Inventory',
  title: 'The inventory, from disk imaging to LLM pipelines.',
  sub: 'Every tool in the kit, sorted by slot.',
}

export const STACK_GROUPS: StackGroup[] = [
  { id: 'forensics', title: 'Digital forensics', hue: 'term', items: ['Belkasoft', 'Cellebrite', 'Magnet Axiom', 'Detego Forensic Suite', 'Autopsy', 'FTK', 'X-Ways', 'MD Next', 'Volatility 3', 'KAPE', 'Eric Zimmerman Tools', 'Elcomsoft', 'Passware', 'Scalpel', 'Foremost', 'DDrescue'] },
  { id: 'ir', title: 'Incident response & threat intel', hue: 'red', items: ['CyberTriage', 'Velociraptor', 'Arctic Security', 'InQuest', 'LogRhythm', 'Exabeam', 'AlienVault', 'EventTracker', 'Kaspersky EDR', 'CrowdStrike', 'Cortex XDR', 'SIEM investigation'] },
  { id: 'malware', title: 'Malware analysis', hue: 'magenta', items: ['IDA Pro', 'Ghidra', 'YARA rule authoring & engine integration', 'PsExec'] },
  { id: 'osint', title: 'OSINT', hue: 'cyan', items: ['Maltego', 'OSINT Framework', 'Passive DNS', 'BGP/ASN analysis', 'Breach intelligence feeds'] },
  { id: 'ai', title: 'AI engineering', hue: 'violet', items: ['Claude API', 'Ollama local LLM deployment', 'RAG pipeline design', 'ReAct agent architecture', 'Prompt engineering', 'AI privacy gateway design', 'Semantic search with vector embeddings'] },
  { id: 'dev', title: 'Software development', hue: 'amber', items: ['Python', 'FastAPI', 'Next.js / React', 'PostgreSQL', 'Docker', 'Redis', 'Celery', 'Rust (Tauri)', 'Bash', 'PowerShell'] },
  { id: 'pentest', title: 'Penetration testing', hue: 'orange', items: ['Metasploit', 'Burp Suite', 'Nmap'] },
  { id: 'infra', title: 'Infrastructure', hue: 'blue', items: ['Linux', 'Windows Server', 'VPS deployment', 'Nginx', 'Cloud forensics on AWS & Azure'] },
]

export const WRITING = {
  cmd: 'tail -n3 /logs/published.log',
  eyebrow: 'Field logs',
  title: 'Field logs, in print.',
  sub: 'Published articles in the Business & Financial Times (Ghana).',
  articles: [
    'The Cryptocurrency Conundrum',
    "Unravelling Tomorrow's Cyber Saga: Anticipating Current and Future Threats",
    'Exploring the Tech Revolution',
  ],
  education: [
    { degree: 'MSc, Cybersecurity & Digital Forensics', school: 'Kwame Nkrumah University of Science and Technology (KNUST)' },
    { degree: 'BSc (Hons), Computer Science', school: 'Kwame Nkrumah University of Science and Technology (KNUST)' },
    { degree: 'Diploma, Theological & Ministerial Studies', school: 'Cave Adullam Bible Seminary' },
  ],
}

export interface Cert { name: string; issuer: string }

export const CERTS: Cert[] = [
  { name: 'Cellebrite Mobile Forensic Examiner (WeCheck)', issuer: 'cellebrite' },
  { name: 'Detego Certified Forensic Examiner', issuer: 'detego' },
  { name: 'EC-Council Certified Incident Handler', issuer: 'eccouncil' },
  { name: 'EC-Council Certified SOC Analyst', issuer: 'eccouncil' },
  { name: 'EC-Council Certified Security Analyst', issuer: 'eccouncil' },
  { name: 'LogRhythm Certified Security Analyst', issuer: 'logrhythm' },
  { name: 'LogRhythm Certified Platform Administrator', issuer: 'logrhythm' },
  { name: 'Cyberwarfare Labs Certified Cyber Security Analyst', issuer: 'cyberwarfarelabs' },
  { name: 'TCM Security Practical Windows Forensics', issuer: 'tcmsecurity' },
  { name: 'Certified CyberArk Trustee', issuer: 'cyberark' },
  { name: 'Certiprof Certified Cybersecurity Awareness Professional', issuer: 'certiprof' },
  { name: 'Fortinet Certified Associate Cybersecurity', issuer: 'fortinet' },
  { name: 'Fortinet NSE Level 1', issuer: 'fortinet' },
  { name: 'Fortinet NSE Level 2', issuer: 'fortinet' },
  { name: 'ISO/IEC 27001 Information Security Associate', issuer: 'iso' },
  { name: 'ISO/IEC 20000 IT Service Management Associate', issuer: 'iso' },
]

export const ARCADE = {
  cmd: 'ls /arcade --cabinets',
  eyebrow: 'Arcade',
  title: 'Four cabinets. Every one of them is the job, played fast.',
  sub: 'Each run earns XP for the player card up top. Best scores stay on this device.',
  games: [
    { id: 'runner', title: 'Evidence Runner', blurb: 'Sanko sprints through a data centre at night. Jump the malware, grab the evidence.', controls: 'SPACE / TAP to jump', hue: 'amber' as Hue },
    { id: 'threathunt', title: 'Threat Hunt', blurb: 'Nine hosts, one round. Quarantine the threats and spare the legit processes.', controls: '1-9 / CLICK to quarantine', hue: 'red' as Hue },
    { id: 'phish', title: 'Phish or Legit', blurb: 'Eight messages. Swipe left on the phish, right on the real ones.', controls: 'LEFT / RIGHT or SWIPE', hue: 'cyan' as Hue },
    { id: 'custody', title: 'Chain of Custody', blurb: 'Six phases, one defensible order. The court is watching.', controls: '1-6 / CLICK in order', hue: 'violet' as Hue },
  ] as const,
}

export const CONTACT = {
  cmd: './start_new_game --with-you',
  eyebrow: 'Contact',
  title: ['Have an incident, a case,', 'or a hard problem?'],
  coin: 'Insert coin.',
  status: 'Open to casework, consulting and hard problems',
  body: 'References and published work available on request. Expert witness methodology and casework can be discussed under NDA.',
}

export const FOOTER = {
  left: 'Eli Zamar Bashan, DFIR Lead and AI Engineer',
  right: `Accra, ${PROFILE.coords}`,
}

export interface Zone { id: string; label: string; short: string; hue: Hue }

// Order = page order. ids double as the #anchors (bare tokens, artifact-safe).
export const ZONES: Zone[] = [
  { id: 'top', label: 'Title screen', short: 'START', hue: 'term' },
  { id: 'about', label: 'About', short: 'ABOUT', hue: 'term' },
  { id: 'builds', label: 'Builds', short: 'BUILDS', hue: 'cyan' },
  { id: 'cases', label: 'Case files', short: 'CASES', hue: 'amber' },
  { id: 'quests', label: 'Quest log', short: 'QUESTS', hue: 'violet' },
  { id: 'trophies', label: 'Trophies', short: 'TROPHIES', hue: 'amber' },
  { id: 'inventory', label: 'Inventory', short: 'INVENTORY', hue: 'magenta' },
  { id: 'logs', label: 'Field logs', short: 'LOGS', hue: 'blue' },
  { id: 'arcade', label: 'Arcade', short: 'ARCADE', hue: 'red' },
  { id: 'contact', label: 'Contact', short: 'CONTACT', hue: 'term' },
]
