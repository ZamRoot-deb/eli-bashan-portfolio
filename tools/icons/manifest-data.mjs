// Single source of truth for which icon file(s) back each STACK_GROUPS item
// and each CERTS issuer. Consumed by build-manifest.mjs (writes src/icons.ts)
// and build-sheet.mjs (renders the contact sheet). Keep in sync with
// src/content.ts - STACK_GROUPS item strings are the exact manifest keys.

export const STACK_ICONS = {
  // forensics
  Belkasoft: { files: ['icons/belkasoft.png'], kind: 'brand' },
  Cellebrite: { files: ['icons/cellebrite.png'], kind: 'brand' },
  'Magnet Axiom': { files: ['icons/magnet-axiom.svg'], kind: 'brand' },
  'Detego Forensic Suite': { files: ['icons/detego.png'], kind: 'brand' },
  Autopsy: { files: ['icons/autopsy.svg'], kind: 'brand' },
  FTK: { files: ['icons/ftk.png'], kind: 'brand' },
  'X-Ways': { files: ['icons/x-ways.svg'], kind: 'concept' },
  'MD Next': { files: ['icons/md-next.svg'], kind: 'concept' },
  'Volatility 3': { files: ['icons/volatility.png'], kind: 'brand' },
  KAPE: { files: ['icons/kape.svg'], kind: 'concept' },
  'Eric Zimmerman Tools': { files: ['icons/eric-zimmerman-tools.svg'], kind: 'concept' },
  Elcomsoft: { files: ['icons/elcomsoft.svg'], kind: 'brand' },
  Passware: { files: ['icons/passware.png'], kind: 'brand' },
  Scalpel: { files: ['icons/scalpel.svg'], kind: 'concept' },
  Foremost: { files: ['icons/foremost.svg'], kind: 'concept' },
  DDrescue: { files: ['icons/ddrescue.svg'], kind: 'brand' },

  // ir
  CyberTriage: { files: ['icons/cybertriage.png'], kind: 'brand' },
  Velociraptor: { files: ['icons/velociraptor.png'], kind: 'brand' },
  'Arctic Security': { files: ['icons/arctic-security.png'], kind: 'brand' },
  InQuest: { files: ['icons/inquest.png'], kind: 'brand' },
  LogRhythm: { files: ['icons/logrhythm.png'], kind: 'brand' },
  Exabeam: { files: ['icons/exabeam.png'], kind: 'brand' },
  AlienVault: { files: ['icons/alienvault.png'], kind: 'brand' },
  EventTracker: { files: ['icons/eventtracker.svg'], kind: 'concept' },
  'Kaspersky EDR': { files: ['icons/kaspersky.svg'], kind: 'brand' },
  CrowdStrike: { files: ['icons/crowdstrike.png'], kind: 'brand' },
  'Cortex XDR': { files: ['icons/paloaltonetworks.svg'], kind: 'brand' },
  'SIEM investigation': { files: ['icons/siem-investigation.svg'], kind: 'concept' },

  // malware
  'IDA Pro': { files: ['icons/ida-pro.png'], kind: 'brand' },
  Ghidra: { files: ['icons/ghidra.svg'], kind: 'concept' },
  'YARA rule authoring & engine integration': { files: ['icons/yara.svg'], kind: 'brand' },
  PsExec: { files: ['icons/psexec.svg'], kind: 'concept' },

  // osint
  Maltego: { files: ['icons/maltego.png'], kind: 'brand' },
  'OSINT Framework': { files: ['icons/osint-framework.svg'], kind: 'concept' },
  'Passive DNS': { files: ['icons/passive-dns.svg'], kind: 'concept' },
  'BGP/ASN analysis': { files: ['icons/bgp-asn-analysis.svg'], kind: 'concept' },
  'Breach intelligence feeds': { files: ['icons/breach-intelligence-feeds.svg'], kind: 'concept' },

  // ai
  'Claude API': { files: ['icons/claude.svg'], kind: 'brand' },
  'Ollama local LLM deployment': { files: ['icons/ollama.svg'], kind: 'brand' },
  'RAG pipeline design': { files: ['icons/rag-pipeline-design.svg'], kind: 'concept' },
  'ReAct agent architecture': { files: ['icons/react-agent-architecture.svg'], kind: 'concept' },
  'Prompt engineering': { files: ['icons/prompt-engineering.svg'], kind: 'concept' },
  'AI privacy gateway design': { files: ['icons/ai-privacy-gateway-design.svg'], kind: 'concept' },
  'Semantic search with vector embeddings': { files: ['icons/semantic-search-vector-embeddings.svg'], kind: 'concept' },

  // dev
  Python: { files: ['icons/python.svg'], kind: 'brand' },
  FastAPI: { files: ['icons/fastapi.svg'], kind: 'brand' },
  'Next.js / React': { files: ['icons/nextjs.svg', 'icons/react.svg'], kind: 'brand' },
  PostgreSQL: { files: ['icons/postgresql.svg'], kind: 'brand' },
  Docker: { files: ['icons/docker.svg'], kind: 'brand' },
  Redis: { files: ['icons/redis.svg'], kind: 'brand' },
  Celery: { files: ['icons/celery.svg'], kind: 'brand' },
  'Rust (Tauri)': { files: ['icons/rust.svg', 'icons/tauri.svg'], kind: 'brand' },
  Bash: { files: ['icons/bash.svg'], kind: 'brand' },
  PowerShell: { files: ['icons/powershell.svg'], kind: 'brand' },

  // pentest
  Metasploit: { files: ['icons/metasploit.svg'], kind: 'brand' },
  'Burp Suite': { files: ['icons/burpsuite.svg'], kind: 'brand' },
  Nmap: { files: ['icons/nmap.png'], kind: 'brand' },

  // infra
  Linux: { files: ['icons/linux.svg'], kind: 'brand' },
  'Windows Server': { files: ['icons/windows-server.svg'], kind: 'brand' },
  'VPS deployment': { files: ['icons/vps-deployment.svg'], kind: 'concept' },
  Nginx: { files: ['icons/nginx.svg'], kind: 'brand' },
  'Cloud forensics on AWS & Azure': { files: ['icons/aws.png', 'icons/azure.svg'], kind: 'brand' },
}

export const CERT_ICONS = {
  cellebrite: { files: ['icons/cellebrite.png'], kind: 'brand' },
  detego: { files: ['icons/detego.png'], kind: 'brand' },
  eccouncil: { files: ['icons/eccouncil.png'], kind: 'brand' },
  logrhythm: { files: ['icons/logrhythm.png'], kind: 'brand' },
  cyberwarfarelabs: { files: ['icons/cyberwarfarelabs.png'], kind: 'brand' },
  tcmsecurity: { files: ['icons/tcmsecurity.png'], kind: 'brand' },
  cyberark: { files: ['icons/cyberark.svg'], kind: 'concept' },
  certiprof: { files: ['icons/certiprof.png'], kind: 'brand' },
  fortinet: { files: ['icons/fortinet.svg'], kind: 'brand' },
  iso: { files: ['icons/iso.png'], kind: 'brand' },
}
